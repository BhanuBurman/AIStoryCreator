import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from workflow.state import StoryState, StoryOutline, Setting, Character, BeatPlan, CompletedBeat
from workflow.session_manager import SessionManager

def test_session_manager(tmp_path_dir="./test_storage"):
    os.makedirs(tmp_path_dir, exist_ok=True)
    mgr = SessionManager(storage_dir=tmp_path_dir)
    
    state = StoryState(
        session_id="test_sess_01",
        user_concept="A forgotten starship",
        outline=StoryOutline(
            title="The Derelict Solitude",
            logline="A lone scavenger enters an ancient ship.",
            genre="Sci-Fi",
            tone="Eerie",
            setting=Setting(world_name="Oort Cloud", description="Frozen space graveyard"),
            characters=[
                Character(name="Kaelen", role="Protagonist", appearance="Worn vacsuit", internal_conflict="Loneliness")
            ],
            plot_beats=[
                BeatPlan(act=1, beat_title="The Signal", description="A beacon blinks")
            ]
        ),
        current_beat_index=0,
        completed_beats=[]
    )
    
    mgr.save(state)
    retrieved = mgr.get("test_sess_01")
    assert retrieved is not None
    assert retrieved.outline.title == "The Derelict Solitude"
    assert len(mgr.list_all()) >= 1
    
    mgr.delete("test_sess_01")
    assert mgr.get("test_sess_01") is None
    print("✓ SessionManager persistence and retrieval passed")
    
    # Cleanup
    if os.path.exists(tmp_path_dir):
        import shutil
        shutil.rmtree(tmp_path_dir, ignore_errors=True)

if __name__ == "__main__":
    test_session_manager()
    print("\nAll Workflow-Engine-Service tests passed successfully!")
