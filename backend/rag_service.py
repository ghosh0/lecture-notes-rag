import os
import uuid
import shutil
from pathlib import Path
from typing import Optional

from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_chroma import Chroma
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    TextLoader,
    UnstructuredWordDocumentLoader,
)
from langchain.chains import ConversationalRetrievalChain
from langchain.memory import ConversationBufferWindowMemory
from langchain.prompts import PromptTemplate, SystemMessagePromptTemplate, HumanMessagePromptTemplate, ChatPromptTemplate

from config import get_settings

settings = get_settings()

UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


# ─── System Prompt ────────────────────────────────────────────────────────────

SYSTEM_TEMPLATE = """You are an expert academic tutor and study assistant. Your role is to help students understand their lecture notes deeply and thoroughly.

You have access to the student's lecture notes as context. Use ONLY the provided context to answer questions. If the answer is not found in the notes, clearly state that and suggest what the student might look for.

Guidelines:
- Explain concepts clearly using simple language first, then build up to technical details
- Use examples, analogies, and step-by-step breakdowns when helpful
- If a student seems confused, offer to explain from a different angle
- Highlight key formulas, definitions, and important points
- Always be encouraging and supportive
- If the question is about something not in the notes, say so honestly

Context from lecture notes:
{context}

Chat History:
{chat_history}
"""

HUMAN_TEMPLATE = """Student Question: {question}

Please provide a clear, detailed explanation based on the lecture notes."""

system_message_prompt = SystemMessagePromptTemplate.from_template(SYSTEM_TEMPLATE)
human_message_prompt = HumanMessagePromptTemplate.from_template(HUMAN_TEMPLATE)

QA_PROMPT = ChatPromptTemplate.from_messages([system_message_prompt, human_message_prompt])


# ─── RAG Service ──────────────────────────────────────────────────────────────

class RAGService:
    def __init__(self):
        self.embeddings = GoogleGenerativeAIEmbeddings(
            model="models/embedding-001",
            google_api_key=settings.gemini_api_key,
        )
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=settings.gemini_api_key,
            temperature=0.3,
            convert_system_message_to_human=True,
        )
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200,
            length_function=len,
        )
        # In-memory session memories keyed by session_id
        self._memories: dict[str, ConversationBufferWindowMemory] = {}

    def _get_collection_name(self, note_id: str) -> str:
        """Each note gets its own ChromaDB collection."""
        return f"note_{note_id.replace('-', '_')}"

    def _get_vectorstore(self, note_id: str) -> Chroma:
        return Chroma(
            collection_name=self._get_collection_name(note_id),
            embedding_function=self.embeddings,
            persist_directory=settings.chroma_persist_dir,
        )

    def _get_memory(self, session_id: str, chat_history: list[dict]) -> ConversationBufferWindowMemory:
        """Get or create conversation memory for a session."""
        if session_id not in self._memories:
            memory = ConversationBufferWindowMemory(
                memory_key="chat_history",
                return_messages=True,
                k=10,  # keep last 10 exchanges
                output_key="answer",
            )
            # Seed memory from stored history
            for i in range(0, len(chat_history) - 1, 2):
                if i + 1 < len(chat_history):
                    human_msg = chat_history[i]
                    ai_msg = chat_history[i + 1]
                    if human_msg["role"] == "user" and ai_msg["role"] == "assistant":
                        memory.chat_memory.add_user_message(human_msg["content"])
                        memory.chat_memory.add_ai_message(ai_msg["content"])
            self._memories[session_id] = memory
        return self._memories[session_id]

    async def ingest_file(self, file_path: str, note_id: str, file_type: str) -> int:
        """Load, split, and embed a document into ChromaDB."""
        # Load document
        if file_type == "pdf":
            loader = PyPDFLoader(file_path)
        elif file_type in ("doc", "docx"):
            loader = UnstructuredWordDocumentLoader(file_path)
        else:
            loader = TextLoader(file_path, encoding="utf-8")

        documents = loader.load()

        # Add metadata
        for doc in documents:
            doc.metadata["note_id"] = note_id

        # Split into chunks
        chunks = self.text_splitter.split_documents(documents)

        if not chunks:
            return 0

        # Store in ChromaDB
        vectorstore = Chroma(
            collection_name=self._get_collection_name(note_id),
            embedding_function=self.embeddings,
            persist_directory=settings.chroma_persist_dir,
        )
        vectorstore.add_documents(chunks)

        return len(chunks)

    async def delete_note_embeddings(self, note_id: str):
        """Remove all embeddings for a note."""
        try:
            vectorstore = self._get_vectorstore(note_id)
            vectorstore.delete_collection()
        except Exception:
            pass

    async def chat(
        self,
        note_id: str,
        question: str,
        session_id: str,
        chat_history: list[dict],
    ) -> dict:
        """Run RAG pipeline and return answer + sources."""
        vectorstore = self._get_vectorstore(note_id)
        retriever = vectorstore.as_retriever(
            search_type="mmr",
            search_kwargs={"k": 5, "fetch_k": 10},
        )

        memory = self._get_memory(session_id, chat_history)

        chain = ConversationalRetrievalChain.from_llm(
            llm=self.llm,
            retriever=retriever,
            memory=memory,
            combine_docs_chain_kwargs={"prompt": QA_PROMPT},
            return_source_documents=True,
            verbose=False,
        )

        result = await chain.ainvoke({"question": question})

        answer = result.get("answer", "")
        source_docs = result.get("source_documents", [])

        sources = []
        seen = set()
        for doc in source_docs:
            page = doc.metadata.get("page", "")
            source_key = f"{doc.metadata.get('source', '')}:{page}"
            if source_key not in seen:
                seen.add(source_key)
                sources.append({
                    "page": page,
                    "content_preview": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                })

        return {"answer": answer, "sources": sources}


# Singleton instance
_rag_service: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service

