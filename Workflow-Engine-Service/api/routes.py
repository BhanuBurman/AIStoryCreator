from typing import Optional, Dict, Any, List
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import requests

from workflow.state import StoryState
from workflow.session_manager import session_manager
from workflow.story_graph import orchestrator
from config import LLM_SERVICE_URL

router = APIRouter()

class StartStoryRequest(BaseModel):
    user_concept: str = Field(..., description="Story prompt, seed, or title")
    genre_tone: Optional[str] = Field("Atmospheric, literary fiction", description="Tone and genre")
    auto_generate_first_beat: Optional[bool] = False

class NextBeatRequest(BaseModel):
    custom_guidance: Optional[str] = Field(None, description="Creative direction or adjustments for this scene")

class RegenerateBeatRequest(BaseModel):
    act_number: int = Field(..., ge=1, le=5)
    custom_guidance: Optional[str] = Field(None, description="Changes desired for this revision")

class ChatMessageRequest(BaseModel):
    message: str = Field(..., description="User message to story director")

@router.get("/stories")
def list_stories():
    """List all story sessions."""
    return session_manager.list_all()

@router.get("/story/{session_id}")
def get_story(session_id: str):
    """Retrieve complete story state including beats, characters, and visuals."""
    state = session_manager.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Story session '{session_id}' not found.")
    return state

@router.delete("/story/{session_id}")
def delete_story(session_id: str):
    """Delete a story session."""
    deleted = session_manager.delete(session_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Story session '{session_id}' not found.")
    return {"status": "deleted", "session_id": session_id}

@router.post("/story/start")
def start_story(req: StartStoryRequest):
    """Initialize a new story, generate 5-beat blueprint, and optionally start Act 1."""
    try:
        state = orchestrator.start_new_story(req.user_concept, req.genre_tone)
        if req.auto_generate_first_beat:
            state = orchestrator.generate_next_beat(state.session_id)
        return state
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/story/{session_id}/next-beat")
def generate_next_beat(session_id: str, req: NextBeatRequest = None):
    """Generate the next beat (prose + photorealistic prompt + image)."""
    guidance = req.custom_guidance if req else None
    try:
        state = orchestrator.generate_next_beat(session_id, custom_guidance=guidance)
        return state
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/story/{session_id}/regenerate-beat")
def regenerate_beat(session_id: str, req: RegenerateBeatRequest):
    """Regenerate a specific beat with author notes."""
    try:
        state = orchestrator.regenerate_beat(session_id, req.act_number, req.custom_guidance)
        return state
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/story/{session_id}/autopilot")
def run_autopilot(session_id: str):
    """Complete all remaining beats sequentially with photography prompts & visuals."""
    try:
        state = orchestrator.run_autopilot(session_id)
        return state
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/story/{session_id}/chat")
def chat_with_director(session_id: str, req: ChatMessageRequest):
    """Chat with the Story Director in the context of this story."""
    state = session_manager.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Story not found")

    # Add user message
    state.chat_history.append({"role": "user", "content": req.message})

    # Prepare context for LLM-Service
    system_instruction = (
        f"You are the Story Director and Creative Co-author of the story '{state.outline.title if state.outline else 'In Progress'}'. "
        f"Logline: {state.outline.logline if state.outline else 'None'}. "
        f"Genre: {state.outline.genre if state.outline else 'Fiction'}, Tone: {state.outline.tone if state.outline else 'Atmospheric'}. "
        f"Current Act: {state.current_beat_index + 1} of 5. Completed Acts: {len(state.completed_beats)}. "
        f"Provide literary advice, propose exciting narrative twists, or help refine character motivations."
    )

    try:
        res = requests.post(
            f"{LLM_SERVICE_URL}/api/llm/chat",
            json={
                "messages": state.chat_history[-10:],
                "system_instruction": system_instruction
            },
            timeout=60
        )
        assistant_reply = res.json().get("message", "Let's explore your story further.")
    except Exception as e:
        assistant_reply = f"I'm here to assist your narrative journey. How would you like to steer the next scene? (Note: LLM communication note: {e})"

    state.chat_history.append({"role": "assistant", "content": assistant_reply})
    session_manager.save(state)

    return {
        "session_id": session_id,
        "reply": assistant_reply,
        "chat_history": state.chat_history
    }
