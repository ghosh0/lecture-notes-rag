<div align="center">

# 🎓 LectureRAG

### *An End-to-End Retrieval-Augmented Generation (RAG) System with Peer-Review Feedback for Academic Lecture Notes*

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![LangChain](https://img.shields.io/badge/LangChain-0.3-1C3C3C?style=for-the-badge&logo=langchain&logoColor=white)](https://www.langchain.com/)
[![ChromaDB](https://img.shields.io/badge/ChromaDB-Vector_Store-FF6600?style=for-the-badge)](https://www.trychroma.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Async_Motor-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-1.5_Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

</div>

---

## 📌 Executive Summary

**LectureRAG** is a full-stack, domain-grounded study companion designed to solve the problem of information recall and concept comprehension in higher education. Students frequently struggle to synthesize long, multi-week lecture materials into actionable study guidance. Off-the-shelf general-purpose LLMs hallucinate course-specific terminology and lack awareness of a professor's individual syllabi and slide decks.

This system addresses these challenges through a **Retrieval-Augmented Generation (RAG)** pipeline powered by Google Gemini, paired with an asynchronous FastAPI microservice, persistent local vector indexing via ChromaDB, and a modern, responsive React interface. Crucially, it incorporates a **peer-feedback mechanism (upvoting and downvoting)** allowing student cohorts to crowdsource the verification of AI responses, flagging inaccuracies and surfacing the highest-confidence explanations.

---

## 🏛️ System Architecture

```
                           ┌─────────────────────────────────────────┐
                           │            CLIENT LAYER                 │
                           │   React 18 + TailwindCSS + shadcn/ui    │
                           └────────────────────┬────────────────────┘
                                                │  HTTP / REST
                                                ▼
                           ┌─────────────────────────────────────────┐
                           │          APPLICATION LAYER              │
                           │           FastAPI (AsyncIO)             │
                           └──────┬───────────────────────────┬──────┘
                                  │                           │
          Document Ingestion &    │                           │  Conversational Retrieval
          Embedding Pipeline      ▼                           ▼  Chain (MMR Search)
       ┌───────────────────────────────┐         ┌────────────────────────────────┐
       │      LangChain Orchestration  │         │      LangChain Query Engine    │
       │  - PyPDF / Text / Docx Loader │         │  - WindowBuffer Memory (k=10)  │
       │  - RecursiveCharTextSplitter  │         │  - Custom Grounding Prompts    │
       └──────────────┬────────────────┘         └────────────┬───────────────────┘
                      │                                       │
                      ▼                                       ▼
       ┌───────────────────────────────┐         ┌────────────────────────────────┐
       │   Google Generative AI API    │         │      ChromaDB Vector Store     │
       │  - models/embedding-001       │         │  - Isolated note collections   │
       │  - gemini-1.5-flash           │         │  - Cosine Distance Metric      │
       └───────────────────────────────┘         └────────────────────────────────┘
                                  │
                                  ▼
                           ┌─────────────────────────────────────────┐
                           │             PERSISTENCE LAYER           │
                           │     MongoDB (Async Motor Client)        │
                           │  - Notes Metadata & Chunk Metrics       │
                           │  - Chat Sessions & Message History      │
                           │  - Peer Voting Counters & Telemetry     │
                           └─────────────────────────────────────────┘
```

---

## 🔑 Key Engineering Highlights & Decisions

### 1. Isolated Vector Store Collections
* **Decision**: Rather than pooling all course notes into a single monolithic index with metadata filters, ChromaDB collections are dynamically provisioned per note (`note_{note_id}`).
* **Rationale**: Eliminates cross-document interference, bounds retrieval latency, guarantees document boundary enforcement, and enables zero-latency bulk deletions when a note is purged.

### 2. Retrieval Strategy: Maximal Marginal Relevance (MMR)
* **Decision**: Deployed MMR retrieval ($k=5$, $\text{fetch\_k}=10$) instead of simple similarity search.
* **Rationale**: Simple cosine similarity often retrieves adjacent chunks containing redundant phrasing. MMR optimizes for both relevance to the student's query and diversity across the document source, ensuring comprehensive coverage of complex lecture topics.

### 3. Asynchronous I/O Pipeline
* **Decision**: Built on FastAPI and `motor` (asynchronous MongoDB driver).
* **Rationale**: Parsing multi-megabyte PDFs and performing embedding generation are I/O bound operations. An asynchronous architecture prevents worker starvation during concurrent uploads and streaming model calls.

### 4. Human-in-the-Loop Feedback & Voting
* **Decision**: Atomic upvote and downvote counters on assistant messages stored directly in MongoDB.
* **Rationale**: In academic contexts, hallucinated facts can lead to exam penalties. The peer-voting feedback loop flags questionable explanations, giving students crowd-verified signals of response veracity.

### 5. Memory Management with Token Safety
* **Decision**: `ConversationBufferWindowMemory` bounded to the last 10 exchanges ($k=10$).
* **Rationale**: Prevents prompt bloat and context window exhaustion while maintaining sufficient conversational coherence for follow-up questions.

---

## 🛠️ Technology Stack

| Layer | Technology | Justification |
|---|---|---|
| **Frontend Framework** | **React 18** (Vite bundler) | Component-driven architecture, fast HMR, optimized production bundles |
| **UI Components & Styling** | **TailwindCSS** + **shadcn/ui** | Atomic CSS, accessible Radix primitives, consistent dark-mode design |
| **API Client** | **Axios** + **React Dropzone** | Chunked upload progress tracking, centralized error interceptors |
| **Backend Framework** | **FastAPI** (Python 3.11) | High throughput, asynchronous lifespan management, automated OpenAPI documentation |
| **LLM & Embeddings** | **Google Gemini 1.5 Flash** + `embedding-001` | High-efficiency 1M context window, state-of-the-art reasoning, zero infrastructure cost |
| **RAG Framework** | **LangChain** (`ConversationalRetrievalChain`) | Standardized prompt templating, conversational memory abstractions, retrieval routing |
| **Vector Database** | **ChromaDB** | Serverless, embedded, zero-cost vector indexing persisted to disk |
| **Document Database** | **MongoDB** + **Motor** | Document-oriented schema suited for polymorphic chat messages and nested metadata |

---

## 📁 Repository Structure

```
lecture-notes-rag/
├── backend/
│   ├── config.py                 # Pydantic BaseSettings loading from .env
│   ├── database.py               # Async MongoDB connection lifecycle (Motor)
│   ├── main.py                   # FastAPI initialization, CORS, and router registration
│   ├── models.py                 # Pydantic schemas for requests, responses, and DB entities
│   ├── rag_service.py            # LangChain vector indexing, retrieval, and LLM chains
│   ├── requirements.txt          # Python dependencies pinned for reproducibility
│   ├── .env.example              # Sample environment configuration template
│   └── routes/
│       ├── chat.py               # Conversational query endpoints and session management
│       ├── notes.py              # File upload, document ingestion, and note CRUD
│       └── votes.py              # Upvote/downvote peer validation endpoints
├── frontend/
│   ├── index.html                # Application HTML entrypoint
│   ├── vite.config.js            # Vite build configuration with path aliases
│   ├── tailwind.config.js        # Design tokens, color scales, and keyframes
│   ├── package.json              # Client dependencies and build scripts
│   └── src/
│       ├── App.jsx               # Root client component and route declarations
│       ├── index.css             # Tailwind base layers and custom typography styles
│       ├── components/
│       │   ├── ChatInterface.jsx # Real-time chat UI with code highlighting & voting
│       │   ├── Navbar.jsx        # Navigation header
│       │   ├── NotesList.jsx     # Responsive grid displaying notes and session archives
│       │   ├── UploadModal.jsx   # Drag-and-drop file ingestion dialog with progress bar
│       │   └── ui/               # shadcn/ui components (Button, Dialog, Toast, etc.)
│       ├── pages/
│       │   ├── HomePage.jsx      # Note repository dashboard with search & subject filtering
│       │   └── ChatPage.jsx      # Split-view chat screen with collapsible history drawer
│       └── lib/
│           ├── api.js            # Axios client with resource-scoped endpoints
│           └── utils.js          # Shared formatting and class-merging utilities
├── start-backend.bat             # One-click Windows runner for Python backend
├── start-frontend.bat            # One-click Windows runner for React frontend
└── README.md                     # Engineering documentation
```

---

## 🔌 API Specification

### Lecture Notes
| Endpoint | Method | Payload / Params | Description |
|---|---|---|---|
| `/api/notes/upload` | `POST` | `multipart/form-data` (`file`, `title`, `subject`, `description`) | Ingests document, extracts text, chunks, embeds into ChromaDB, and indexes in MongoDB. |
| `/api/notes/` | `GET` | — | Retrieves all notes sorted by creation date descending. |
| `/api/notes/{note_id}` | `GET` | `note_id: str` | Retrieves metadata and chunk statistics for a single note. |
| `/api/notes/{note_id}` | `DELETE` | `note_id: str` | Cascades deletion of document file, vector collection, and chat sessions. |

### Conversational RAG
| Endpoint | Method | Payload / Params | Description |
|---|---|---|---|
| `/api/chat/` | `POST` | `ChatRequest` (`note_id`, `session_id?`, `message`) | Queries RAG pipeline, updates conversation memory, and appends to session. |
| `/api/chat/sessions/{note_id}`| `GET` | `note_id: str` | Returns all conversation sessions for a target note. |
| `/api/chat/session/{session_id}`| `GET` | `session_id: str` | Retrieves full message history and metadata for a session. |
| `/api/chat/session/{session_id}`| `DELETE` | `session_id: str` | Purges session history and releases in-memory conversation buffer. |

### Peer Feedback
| Endpoint | Method | Payload / Params | Description |
|---|---|---|---|
| `/api/votes/{session_id}/{message_id}` | `POST` | `VoteRequest` (`vote_type: "upvote" \| "downvote"`) | Atomically increments feedback counter on target assistant message. |

---

## ⚡ Getting Started

### 1. Prerequisites
* **Python 3.11+**
* **Node.js 18+ & npm**
* **MongoDB** (Local instance or [MongoDB Atlas Free Tier](https://www.mongodb.com/cloud/atlas))
* **Google Gemini API Key** (Free tier available at [Google AI Studio](https://aistudio.google.com/app/apikey))

### 2. Environment Setup

Configure the backend environment file:
```bash
# In backend/.env
GEMINI_API_KEY=your_gemini_api_key_here
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB_NAME=lecture_notes_rag
CHROMA_PERSIST_DIR=./chroma_db
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

Configure the frontend environment file (optional):
```bash
# In frontend/.env
VITE_API_BASE_URL=http://localhost:8000
```

### 3. Running the Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate    # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start Uvicorn ASGI server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
* Interactive Swagger API documentation: **`http://localhost:8000/docs`**
* Alternative ReDoc documentation: **`http://localhost:8000/redoc`**

### 4. Running the Frontend

```bash
cd frontend

# Install client packages
npm install

# Start Vite development server
npm run dev
```
* Web application available at: **`http://localhost:5173`**

*(On Windows, you can also launch both services using `start-backend.bat` and `start-frontend.bat`)*.

---

## 🧪 Verification & Testing

1. **Upload Validation**: Submit a PDF lecture document (e.g., *Operating Systems - Memory Management*). Verify chunking status and count displayed on the note card.
2. **Context Grounding**: Ask a syllabus-specific question. Verify that the response cites exact page sources.
3. **Out-of-Scope Negative Test**: Inquire about unrelated topics (e.g., *"What is the recipe for chocolate cake?"*). The system prompt enforces explicit boundary checking and politely declines without hallucinating.
4. **Peer Review**: Upvote and downvote the assistant response. Refresh the page or view session history to confirm vote persistence in MongoDB.

---

## 🔮 Production Roadmap

- [ ] **Hybrid Search**: Combine dense embeddings (ChromaDB) with BM25 sparse keyword search via Reciprocal Rank Fusion (RRF).
- [ ] **Cross-Encoder Reranking**: Integrate Cohere or BGE reranker to score candidate chunks prior to context window injection.
- [ ] **Authentication & RBAC**: JWT-based authentication to partition personal notes vs. cohort-shared course materials.
- [ ] **Streaming Responses**: Server-Sent Events (SSE) for token-by-token streaming in the React UI.

---

<div align="center">
Built with ❤️ for student learning and accessible academic AI tooling.
</div>
