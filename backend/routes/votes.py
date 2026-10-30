from fastapi import APIRouter, HTTPException, Depends

from database import get_db
from models import VoteRequest, VoteResponse

router = APIRouter(prefix="/api/votes", tags=["votes"])


@router.post("/{session_id}/{message_id}", response_model=VoteResponse)
async def vote(
    session_id: str,
    message_id: str,
    request: VoteRequest,
    db=Depends(get_db),
):
    if request.vote_type not in ("upvote", "downvote"):
        raise HTTPException(400, "vote_type must be 'upvote' or 'downvote'")

    session = await db["sessions"].find_one({"session_id": session_id})
    if not session:
        raise HTTPException(404, "Session not found")

    messages = session.get("messages", [])
    target_msg = None
    for msg in messages:
        if msg.get("message_id") == message_id:
            target_msg = msg
            break

    if not target_msg:
        raise HTTPException(404, "Message not found")

    if target_msg.get("role") != "assistant":
        raise HTTPException(400, "Can only vote on assistant messages")

    # Increment the appropriate counter
    field = "messages.$.upvotes" if request.vote_type == "upvote" else "messages.$.downvotes"

    await db["sessions"].update_one(
        {"session_id": session_id, "messages.message_id": message_id},
        {"$inc": {field: 1}},
    )

    # Return updated counts
    updated = await db["sessions"].find_one({"session_id": session_id})
    for msg in updated.get("messages", []):
        if msg.get("message_id") == message_id:
            return VoteResponse(
                message_id=message_id,
                upvotes=msg.get("upvotes", 0),
                downvotes=msg.get("downvotes", 0),
            )

    raise HTTPException(500, "Failed to retrieve updated vote counts")

