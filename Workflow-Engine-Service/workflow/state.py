from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

class Character(BaseModel):
    name: str
    role: str
    appearance: str
    internal_conflict: str

class Setting(BaseModel):
    world_name: str
    description: str

class BeatPlan(BaseModel):
    act: int
    beat_title: str
    description: str

class CompletedBeat(BaseModel):
    act: int
    beat_title: str
    description: str
    prose: str
    image_prompt: Optional[str] = None
    negative_prompt: Optional[str] = None
    camera_specs: Optional[str] = None
    lighting_setup: Optional[str] = None
    film_stock: Optional[str] = None
    image_url: Optional[str] = None
    image_local_path: Optional[str] = None

class StoryOutline(BaseModel):
    title: str
    logline: str
    genre: str
    tone: str
    setting: Setting
    characters: List[Character]
    plot_beats: List[BeatPlan]

class StoryState(BaseModel):
    session_id: str
    user_concept: str
    genre_tone: Optional[str] = "Dark fantasy or speculative fiction"
    outline: Optional[StoryOutline] = None
    current_beat_index: int = 0
    completed_beats: List[CompletedBeat] = []
    chat_history: List[Dict[str, str]] = []
    status: str = "initialized" # initialized, outlined, in_progress, completed
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
