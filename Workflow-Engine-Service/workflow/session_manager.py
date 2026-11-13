import os
import json
import time
from typing import Dict, List, Optional
from .state import StoryState
from config import STORAGE_DIR

class SessionManager:
    """Manages active story states with persistence."""
    def __init__(self, storage_dir: str = STORAGE_DIR):
        self.storage_dir = storage_dir
        self.sessions: Dict[str, StoryState] = {}
        self._load_all_from_disk()

    def _file_path(self, session_id: str) -> str:
        return os.path.join(self.storage_dir, f"{session_id}.json")

    def _load_all_from_disk(self):
        if not os.path.exists(self.storage_dir):
            return
        for fname in os.listdir(self.storage_dir):
            if fname.endswith(".json"):
                try:
                    fpath = os.path.join(self.storage_dir, fname)
                    with open(fpath, "r", encoding="utf-8") as f:
                        data = json.load(f)
                    session = StoryState(**data)
                    self.sessions[session.session_id] = session
                except Exception as e:
                    print(f"Error loading session file {fname}: {e}")

    def save(self, session: StoryState):
        session.updated_at = time.strftime("%Y-%m-%d %H:%M:%S")
        self.sessions[session.session_id] = session
        fpath = self._file_path(session.session_id)
        with open(fpath, "w", encoding="utf-8") as f:
            f.write(session.model_dump_json(indent=2))

    def get(self, session_id: str) -> Optional[StoryState]:
        return self.sessions.get(session_id)

    def list_all(self) -> List[Dict]:
        results = []
        for s in self.sessions.values():
            results.append({
                "session_id": s.session_id,
                "title": s.outline.title if s.outline else s.user_concept[:30],
                "genre": s.outline.genre if s.outline else "Unknown",
                "status": s.status,
                "completed_beats_count": len(s.completed_beats),
                "total_beats": len(s.outline.plot_beats) if s.outline else 5,
                "created_at": s.created_at,
                "updated_at": s.updated_at
            })
        return sorted(results, key=lambda x: x.get("updated_at") or "", reverse=True)

    def delete(self, session_id: str) -> bool:
        if session_id in self.sessions:
            del self.sessions[session_id]
        fpath = self._file_path(session_id)
        if os.path.exists(fpath):
            os.remove(fpath)
            return True
        return False

session_manager = SessionManager()
