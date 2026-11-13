import requests
import json
import uuid
import time
from typing import Dict, Any, Optional
from .state import StoryState, StoryOutline, CompletedBeat
from .session_manager import session_manager
from config import LLM_SERVICE_URL

class StoryWorkflowOrchestrator:
    """Orchestrates multi-beat story generation, visual prompt synthesis, and rendering."""

    def __init__(self, llm_service_url: str = LLM_SERVICE_URL):
        self.llm_service_url = llm_service_url.rstrip("/")

    def start_new_story(self, user_concept: str, genre_tone: Optional[str] = None) -> StoryState:
        session_id = str(uuid.uuid4())[:8]
        now = time.strftime("%Y-%m-%d %H:%M:%S")

        # Step 1: Request Outline from LLM-Service
        outline_payload = {
            "user_input": user_concept,
            "genre_tone": genre_tone or "Rich speculative fiction or dark fantasy"
        }
        res = requests.post(f"{self.llm_service_url}/api/llm/outline", json=outline_payload, timeout=90)
        if res.status_code != 200:
            raise RuntimeError(f"LLM-Service outline generation failed: {res.text}")

        res_data = res.json()
        raw_outline = res_data.get("outline", {})

        # Build StoryOutline
        outline = StoryOutline(
            title=raw_outline.get("title", user_concept.title()),
            logline=raw_outline.get("logline", "A gripping cinematic tale."),
            genre=raw_outline.get("genre", "Drama"),
            tone=raw_outline.get("tone", "Atmospheric"),
            setting=raw_outline.get("setting", {"world_name": "Unknown", "description": "Atmospheric realm"}),
            characters=raw_outline.get("characters", []),
            plot_beats=raw_outline.get("plot_beats", [])
        )

        state = StoryState(
            session_id=session_id,
            user_concept=user_concept,
            genre_tone=genre_tone,
            outline=outline,
            current_beat_index=0,
            completed_beats=[],
            chat_history=[
                {"role": "assistant", "content": f"I have outlined **{outline.title}**. We have 5 narrative beats ready. Would you like to generate Act 1 or adjust anything first?"}
            ],
            status="outlined",
            created_at=now,
            updated_at=now
        )

        session_manager.save(state)
        return state

    def generate_next_beat(self, session_id: str, custom_guidance: Optional[str] = None) -> StoryState:
        state = session_manager.get(session_id)
        if not state or not state.outline:
            raise ValueError(f"Story session '{session_id}' not found or has no outline.")

        if state.current_beat_index >= len(state.outline.plot_beats):
            state.status = "completed"
            session_manager.save(state)
            return state

        beat_plan = state.outline.plot_beats[state.current_beat_index]

        # Assemble character summary
        chars_summary = "; ".join([
            f"{c.name} ({c.role}): {c.appearance}. Inner conflict: {c.internal_conflict}"
            for c in state.outline.characters
        ])

        # Setting summary
        setting_text = f"{state.outline.setting.world_name} - {state.outline.setting.description}"

        # Previous context
        if state.completed_beats:
            last_beat = state.completed_beats[-1]
            previous_context = f"Previous Scene (Act {last_beat.act} - {last_beat.beat_title}): {last_beat.prose[-400:]}"
        else:
            previous_context = "Beginning of story. No previous events."

        current_beat_goal = f"Act {beat_plan.act}: {beat_plan.beat_title} - {beat_plan.description}"
        if custom_guidance:
            current_beat_goal += f" | Director guidance: {custom_guidance}"

        # 1. Generate Scene Prose
        write_payload = {
            "title": state.outline.title,
            "genre": state.outline.genre,
            "tone": state.outline.tone,
            "characters_summary": chars_summary,
            "setting": setting_text,
            "current_beat": current_beat_goal,
            "previous_context": previous_context
        }

        scene_res = requests.post(f"{self.llm_service_url}/api/llm/write-scene", json=write_payload, timeout=90)
        if scene_res.status_code != 200:
            raise RuntimeError(f"Scene generation failed: {scene_res.text}")
        prose = scene_res.json().get("prose", "")

        # 2. Synthesize Photorealistic Image Prompt
        synth_payload = {
            "scene_text": prose[:1500],
            "character_details": chars_summary
        }
        synth_res = requests.post(f"{self.llm_service_url}/api/llm/synthesize-image-prompt", json=synth_payload, timeout=60)
        img_prompt = ""
        neg_prompt = ""
        if synth_res.status_code == 200:
            s_data = synth_res.json().get("synthesis", {})
            img_prompt = s_data.get("image_prompt", "")
            neg_prompt = s_data.get("negative_prompt", "")

        # 3. Generate Image
        image_url = None
        image_local_path = None
        if img_prompt:
            try:
                img_gen_res = requests.post(
                    f"{self.llm_service_url}/api/image/generate",
                    json={"prompt": img_prompt, "negative_prompt": neg_prompt},
                    timeout=90
                )
                if img_gen_res.status_code == 200:
                    img_data = img_gen_res.json()
                    image_url = img_data.get("url")
                    image_local_path = img_data.get("local_path")
            except Exception as e:
                print(f"Image generation warning: {e}")

        # Store completed beat
        completed_beat = CompletedBeat(
            act=beat_plan.act,
            beat_title=beat_plan.beat_title,
            description=beat_plan.description,
            prose=prose,
            image_prompt=img_prompt,
            negative_prompt=neg_prompt,
            image_url=image_url,
            image_local_path=image_local_path
        )

        state.completed_beats.append(completed_beat)
        state.current_beat_index += 1
        if state.current_beat_index >= len(state.outline.plot_beats):
            state.status = "completed"
        else:
            state.status = "in_progress"

        session_manager.save(state)
        return state

    def regenerate_beat(self, session_id: str, act_number: int, custom_guidance: Optional[str] = None) -> StoryState:
        state = session_manager.get(session_id)
        if not state or not state.outline:
            raise ValueError(f"Story session '{session_id}' not found.")

        # Find the beat
        target_index = -1
        for idx, b in enumerate(state.completed_beats):
            if b.act == act_number:
                target_index = idx
                break

        if target_index == -1:
            raise ValueError(f"Beat Act {act_number} has not been generated yet.")

        beat_plan = state.outline.plot_beats[target_index]
        chars_summary = "; ".join([f"{c.name}: {c.appearance}" for c in state.outline.characters])
        setting_text = f"{state.outline.setting.world_name} - {state.outline.setting.description}"

        if target_index > 0:
            prev = state.completed_beats[target_index - 1]
            previous_context = f"Previous Scene (Act {prev.act}): {prev.prose[-400:]}"
        else:
            previous_context = "Beginning of story."

        beat_goal = f"Act {beat_plan.act}: {beat_plan.beat_title} - {beat_plan.description}"
        if custom_guidance:
            beat_goal += f" | Revision notes: {custom_guidance}"

        write_payload = {
            "title": state.outline.title,
            "genre": state.outline.genre,
            "tone": state.outline.tone,
            "characters_summary": chars_summary,
            "setting": setting_text,
            "current_beat": beat_goal,
            "previous_context": previous_context
        }

        scene_res = requests.post(f"{self.llm_service_url}/api/llm/write-scene", json=write_payload, timeout=90)
        prose = scene_res.json().get("prose", "")

        synth_res = requests.post(f"{self.llm_service_url}/api/llm/synthesize-image-prompt", json={
            "scene_text": prose[:1500],
            "character_details": chars_summary
        }, timeout=60)
        s_data = synth_res.json().get("synthesis", {})
        img_prompt = s_data.get("image_prompt", "")
        neg_prompt = s_data.get("negative_prompt", "")

        img_gen_res = requests.post(
            f"{self.llm_service_url}/api/image/generate",
            json={"prompt": img_prompt, "negative_prompt": neg_prompt},
            timeout=90
        )
        img_data = img_gen_res.json()

        state.completed_beats[target_index] = CompletedBeat(
            act=beat_plan.act,
            beat_title=beat_plan.beat_title,
            description=beat_plan.description,
            prose=prose,
            image_prompt=img_prompt,
            negative_prompt=neg_prompt,
            image_url=img_data.get("url"),
            image_local_path=img_data.get("local_path")
        )

        session_manager.save(state)
        return state

    def run_autopilot(self, session_id: str) -> StoryState:
        state = session_manager.get(session_id)
        if not state or not state.outline:
            raise ValueError(f"Story session '{session_id}' not found.")

        while state.current_beat_index < len(state.outline.plot_beats):
            state = self.generate_next_beat(session_id)
        return state

orchestrator = StoryWorkflowOrchestrator()
