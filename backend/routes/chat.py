import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from database import get_db
from models import ChatRequest, ChatResponse, SessionOut, ChatMessage
from rag_service import get_rag_service

router = APIRouter(prefix="/api/chat", tags=["chat"])


@router.post("/", response_model=ChatResponse)
async def chat(request: ChatRequest, db=Depends(get_db)):
    # Verify note exists
    note = await db["notes"].find_one({"note_id": request.note_id})
    if not note:
        raise HTTPException(404, "Note not found")

    # Get or create session
    session_id = request.session_id
    chat_history = []

    if session_id:
        session = await db["sessions"].find_one({"session_id": session_id})
        if session:
            chat_history = session.get("messages", [])
        else:
            session_id = None  # Reset if session not found

    if not session_id:
        session_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        await db["sessions"].insert_one({
            "session_id": session_id,
            "note_id": request.note_id,
            "note_title": note["title"],
            "messages": [],
            "created_at": now,
            "updated_at": now,
        })

    # Run RAG
    rag = get_rag_service()
    try:
        result = await rag.chat(
            note_id=request.note_id,
            question=request.message,
            session_id=session_id,
            chat_history=chat_history,
        )
    except Exception as e:
        raise HTTPException(500, f"RAG pipeline error: {str(e)}")

    # Store messages
    now = datetime.now(timezone.utc)
    user_message_id = str(uuid.uuid4())
    ai_message_id = str(uuid.uuid4())

    user_msg = {
        "message_id": user_message_id,
        "role": "user",
        "content": request.message,
        "upvotes": 0,
        "downvotes": 0,
        "created_at": now,
    }
    ai_msg = {
        "message_id": ai_message_id,
        "role": "assistant",
        "content": result["answer"],
        "sources": result["sources"],
        "upvotes": 0,
        "downvotes": 0,
        "created_at": now,
    }

    await db["sessions"].update_one(
        {"session_id": session_id},
        {
            "$push": {"messages": {"$each": [user_msg, ai_msg]}},
            "$set": {"updated_at": now},
        },
    )

    return ChatResponse(
        session_id=session_id,
        message_id=ai_message_id,
        answer=result["answer"],
        sources=result["sources"],
        upvotes=0,
        downvotes=0,
    )


@router.get("/sessions/{note_id}", response_model=list[SessionOut])
async def get_sessions(note_id: str, db=Depends(get_db)):
    sessions = []
    cursor = db["sessions"].find({"note_id": note_id}).sort("updated_at", -1)
    async for s in cursor:
        messages = [
            ChatMessage(
                role=m["role"],
                content=m["content"],
                message_id=m.get("message_id"),
                upvotes=m.get("upvotes", 0),
                downvotes=m.get("downvotes", 0),
                created_at=m.get("created_at"),
            )
            for m in s.get("messages", [])
        ]
        sessions.append(SessionOut(
            session_id=s["session_id"],
            note_id=s["note_id"],
            note_title=s["note_title"],
            messages=messages,
            created_at=s["created_at"],
            updated_at=s["updated_at"],
        ))
    return sessions


@router.get("/session/{session_id}", response_model=SessionOut)
async def get_session(session_id: str, db=Depends(get_db)):
    s = await db["sessions"].find_one({"session_id": session_id})
    if not s:
        raise HTTPException(404, "Session not found")
    messages = [
        ChatMessage(
            role=m["role"],
            content=m["content"],
            message_id=m.get("message_id"),
            upvotes=m.get("upvotes", 0),
            downvotes=m.get("downvotes", 0),
            created_at=m.get("created_at"),
        )
        for m in s.get("messages", [])
    ]
    return SessionOut(
        session_id=s["session_id"],
        note_id=s["note_id"],
        note_title=s["note_title"],
        messages=messages,
        created_at=s["created_at"],
        updated_at=s["updated_at"],
    )


@router.delete("/session/{session_id}")
async def delete_session(session_id: str, db=Depends(get_db)):
    result = await db["sessions"].delete_one({"session_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(404, "Session not found")
    
    # Clear in-memory memory for this session
    rag = get_rag_service()
    if session_id in rag._memories:
        del rag._memories[session_id]
    
    return {"message": "Session deleted"}

