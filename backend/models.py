from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, timezone
from bson import ObjectId


class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


# ─── Note Models ──────────────────────────────────────────────────────────────

class NoteCreate(BaseModel):
    title: str
    subject: str
    description: Optional[str] = None


class NoteOut(BaseModel):
    id: str
    title: str
    subject: str
    description: Optional[str] = None
    filename: str
    file_type: str
    chunk_count: int = 0
    created_at: datetime
    updated_at: datetime


# ─── Chat Models ──────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str
    message_id: Optional[str] = None
    upvotes: int = 0
    downvotes: int = 0
    created_at: Optional[datetime] = None


class ChatRequest(BaseModel):
    note_id: str
    session_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    session_id: str
    message_id: str
    answer: str
    sources: list[dict] = []
    upvotes: int = 0
    downvotes: int = 0


# ─── Vote Models ──────────────────────────────────────────────────────────────

class VoteRequest(BaseModel):
    vote_type: str  # "upvote" | "downvote"


class VoteResponse(BaseModel):
    message_id: str
    upvotes: int
    downvotes: int


# ─── Session Models ───────────────────────────────────────────────────────────

class SessionOut(BaseModel):
    session_id: str
    note_id: str
    note_title: str
    messages: list[ChatMessage] = []
    created_at: datetime
    updated_at: datetime

