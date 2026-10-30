import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from bson import ObjectId

from database import get_db
from models import NoteCreate, NoteOut
from rag_service import get_rag_service

router = APIRouter(prefix="/api/notes", tags=["notes"])

UPLOAD_DIR = Path("./uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {
    "application/pdf": "pdf",
    "text/plain": "txt",
    "application/msword": "doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
}


@router.post("/upload", response_model=NoteOut)
async def upload_note(
    file: UploadFile = File(...),
    title: str = Form(...),
    subject: str = Form(...),
    description: Optional[str] = Form(None),
    db=Depends(get_db),
):
    # Validate file type
    content_type = file.content_type or ""
    file_ext = Path(file.filename or "").suffix.lower().lstrip(".")
    
    file_type = ALLOWED_TYPES.get(content_type)
    if not file_type:
        # Fall back to extension
        if file_ext in ("pdf", "txt", "doc", "docx"):
            file_type = file_ext
        else:
            raise HTTPException(400, "Unsupported file type. Use PDF, TXT, DOC, or DOCX.")

    note_id = str(uuid.uuid4())
    filename = f"{note_id}.{file_type}"
    file_path = UPLOAD_DIR / filename

    # Save file to disk
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    # Ingest into ChromaDB
    rag = get_rag_service()
    try:
        chunk_count = await rag.ingest_file(str(file_path), note_id, file_type)
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(500, f"Failed to process file: {str(e)}")

    now = datetime.now(timezone.utc)
    note_doc = {
        "_id": ObjectId(),
        "note_id": note_id,
        "title": title,
        "subject": subject,
        "description": description,
        "filename": filename,
        "file_type": file_type,
        "chunk_count": chunk_count,
        "created_at": now,
        "updated_at": now,
    }

    await db["notes"].insert_one(note_doc)

    return NoteOut(
        id=note_id,
        title=title,
        subject=subject,
        description=description,
        filename=filename,
        file_type=file_type,
        chunk_count=chunk_count,
        created_at=now,
        updated_at=now,
    )


@router.get("/", response_model=list[NoteOut])
async def list_notes(db=Depends(get_db)):
    notes = []
    cursor = db["notes"].find({}).sort("created_at", -1)
    async for doc in cursor:
        notes.append(NoteOut(
            id=doc["note_id"],
            title=doc["title"],
            subject=doc["subject"],
            description=doc.get("description"),
            filename=doc["filename"],
            file_type=doc["file_type"],
            chunk_count=doc.get("chunk_count", 0),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        ))
    return notes


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(note_id: str, db=Depends(get_db)):
    doc = await db["notes"].find_one({"note_id": note_id})
    if not doc:
        raise HTTPException(404, "Note not found")
    return NoteOut(
        id=doc["note_id"],
        title=doc["title"],
        subject=doc["subject"],
        description=doc.get("description"),
        filename=doc["filename"],
        file_type=doc["file_type"],
        chunk_count=doc.get("chunk_count", 0),
        created_at=doc["created_at"],
        updated_at=doc["updated_at"],
    )


@router.delete("/{note_id}")
async def delete_note(note_id: str, db=Depends(get_db)):
    doc = await db["notes"].find_one({"note_id": note_id})
    if not doc:
        raise HTTPException(404, "Note not found")

    # Delete file
    file_path = UPLOAD_DIR / doc["filename"]
    if file_path.exists():
        file_path.unlink()

    # Delete ChromaDB embeddings
    rag = get_rag_service()
    await rag.delete_note_embeddings(note_id)

    # Delete from MongoDB
    await db["notes"].delete_one({"note_id": note_id})
    await db["sessions"].delete_many({"note_id": note_id})

    return {"message": "Note deleted successfully"}

