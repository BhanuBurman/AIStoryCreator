import os
import re
import json
import yaml
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from core.llm_factory import get_text_model, MockStoryChatModel
from core.image_factory import get_image_generator
from core.prompts import (
    STORY_WRITER_PROMPT,
    OUTLINER_PROMPT,
    IMAGE_PROMPT_SYNTHESIZER,
    CHAT_DIRECTOR_PROMPT,
    GENERAL_ASSISTANT_PROMPT,
    UNCENSORED_CREATIVE_PROMPT,
    CODE_EXPERT_PROMPT
)

router = APIRouter()

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "config.yaml")

def load_config() -> dict:
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {
        "text_model": {"provider": "ollama", "model_name": "qwen2.5:3b", "base_url": "http://localhost:11434", "temperature": 0.8},
        "image_model": {"provider": "pollinations", "model_name": "flux", "output_dir": "./generated_images"}
    }

def save_config(cfg: dict):
    with open(CONFIG_PATH, "w", encoding="utf-8") as f:
        yaml.safe_dump(cfg, f, default_flow_style=False)

def extract_json_from_llm_response(text: str) -> dict:
    """Helper to cleanly extract JSON even if LLM wraps it in markdown code blocks."""
    text = text.strip()
    # Try finding ```json ... ``` blocks
    code_block_match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", text)
    if code_block_match:
        text = code_block_match.group(1).strip()
    
    # Try finding outer braces { ... }
    json_match = re.search(r"(\{[\s\S]*\})", text)
    if json_match:
        text = json_match.group(1).strip()

    try:
        return json.loads(text)
    except Exception as e:
        # Fallback minimal JSON
        return {"raw_output": text, "parse_error": str(e)}

# --- Pydantic Schemas ---

class OutlineRequest(BaseModel):
    user_input: str = Field(..., description="Story title, concept or prompt")
    genre_tone: Optional[str] = Field("Dark fantasy or speculative fiction", description="Preferred tone or genre")

class SceneWriteRequest(BaseModel):
    title: str
    genre: str = "Fantasy"
    tone: str = "Atmospheric"
    characters_summary: str
    setting: str
    current_beat: str
    previous_context: str = "None (Beginning of story)"

class ImagePromptSynthRequest(BaseModel):
    scene_text: str
    character_details: str

class ImageGenerateRequest(BaseModel):
    prompt: str
    negative_prompt: Optional[str] = "cartoon, 3D render, CGI, anime, plastic smooth skin, deformed fingers, extra limbs, oversaturated, text, watermark"

class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]  # role: user/assistant, content: text
    system_instruction: Optional[str] = None
    model_name: Optional[str] = None
    provider: Optional[str] = None
    temperature: Optional[float] = None
    generate_image: Optional[bool] = False

class ConfigUpdateRequest(BaseModel):
    text_model: Optional[Dict[str, Any]] = None
    image_model: Optional[Dict[str, Any]] = None

# --- Endpoints ---

@router.get("/config")
def get_service_config():
    """Return active text and image model configurations."""
    return load_config()

@router.put("/config")
def update_service_config(req: ConfigUpdateRequest):
    """Dynamically update model provider and parameters."""
    cfg = load_config()
    if req.text_model:
        cfg["text_model"] = {**cfg.get("text_model", {}), **req.text_model}
    if req.image_model:
        cfg["image_model"] = {**cfg.get("image_model", {}), **req.image_model}
    save_config(cfg)
    return {"status": "updated", "config": cfg}

@router.post("/llm/outline")
def generate_story_outline(req: OutlineRequest):
    """Generate 5-beat story blueprint via OUTLINER_PROMPT."""
    cfg = load_config()
    text_cfg = cfg.get("text_model", {})
    
    prompt = OUTLINER_PROMPT.format(
        user_input=req.user_input,
        genre_tone=req.genre_tone or "Creative & fitting"
    )

    try:
        model = get_text_model(text_cfg)
        response = model.invoke([HumanMessage(content=prompt)])
        parsed_json = extract_json_from_llm_response(response.content)
        return {
            "status": "success",
            "provider": text_cfg.get("provider"),
            "model": text_cfg.get("model_name"),
            "outline": parsed_json
        }
    except Exception as e:
        # Graceful fallback to mock model if local server unreachable
        fallback_model = MockStoryChatModel()
        response = fallback_model.invoke([HumanMessage(content=prompt)])
        parsed_json = extract_json_from_llm_response(response.content)
        return {
            "status": "fallback_success",
            "warning": f"Primary model ({text_cfg.get('provider')}) failed ({str(e)}). Served via high-fidelity fallback.",
            "provider": "fallback",
            "outline": parsed_json
        }

@router.post("/llm/write-scene")
def write_scene_prose(req: SceneWriteRequest):
    """Generate literary prose for a beat using STORY_WRITER_PROMPT."""
    cfg = load_config()
    text_cfg = cfg.get("text_model", {})

    prompt = STORY_WRITER_PROMPT.format(
        title=req.title,
        genre=req.genre,
        tone=req.tone,
        characters_summary=req.characters_summary,
        setting=req.setting,
        current_beat=req.current_beat,
        previous_context=req.previous_context
    )

    try:
        model = get_text_model(text_cfg)
        response = model.invoke([HumanMessage(content=prompt)])
        return {
            "status": "success",
            "provider": text_cfg.get("provider"),
            "prose": response.content.strip()
        }
    except Exception as e:
        fallback_model = MockStoryChatModel()
        response = fallback_model.invoke([HumanMessage(content=prompt)])
        return {
            "status": "fallback_success",
            "warning": f"Primary model ({text_cfg.get('provider')}) unavailable ({str(e)}).",
            "provider": "fallback",
            "prose": response.content.strip()
        }

@router.post("/llm/synthesize-image-prompt")
def synthesize_image_prompt(req: ImagePromptSynthRequest):
    """Translate scene excerpt into photorealistic photography prompt."""
    cfg = load_config()
    text_cfg = cfg.get("text_model", {})

    prompt = IMAGE_PROMPT_SYNTHESIZER.format(
        scene_text=req.scene_text,
        character_details=req.character_details
    )

    try:
        model = get_text_model(text_cfg)
        response = model.invoke([HumanMessage(content=prompt)])
        parsed_json = extract_json_from_llm_response(response.content)
        return {
            "status": "success",
            "provider": text_cfg.get("provider"),
            "synthesis": parsed_json
        }
    except Exception as e:
        fallback_model = MockStoryChatModel()
        response = fallback_model.invoke([HumanMessage(content=prompt)])
        parsed_json = extract_json_from_llm_response(response.content)
        return {
            "status": "fallback_success",
            "warning": f"Primary model ({text_cfg.get('provider')}) failed: {str(e)}",
            "provider": "fallback",
            "synthesis": parsed_json
        }

@router.post("/image/generate")
def generate_image(req: ImageGenerateRequest):
    """Generate image using the active image engine (Pollinations, SD, etc.)."""
    cfg = load_config()
    image_cfg = cfg.get("image_model", {})

    generator = get_image_generator(image_cfg)
    result = generator.generate(
        prompt=req.prompt,
        negative_prompt=req.negative_prompt or ""
    )
    return result

@router.get("/llm/models")
def list_available_models():
    """List all locally installed Ollama models and persona presets."""
    local_models = []
    try:
        res = requests.get("http://127.0.0.1:11434/api/tags", timeout=3)
        if res.status_code == 200:
            for item in res.json().get("models", []):
                local_models.append({
                    "name": item.get("name"),
                    "size": item.get("size"),
                    "parameter_size": item.get("details", {}).get("parameter_size", "Unknown"),
                    "provider": "ollama"
                })
    except Exception:
        pass

    return {
        "local_models": local_models,
        "presets": [
            {
                "id": "general",
                "name": "General Assistant (ChatGPT / Claude)",
                "description": "Insightful, articulate, comprehensive across coding, science & all topics.",
                "prompt": GENERAL_ASSISTANT_PROMPT
            },
            {
                "id": "uncensored",
                "name": "100% Uncensored Creative",
                "description": "Raw, unfiltered creative partner for gritty fiction and deep dialogue.",
                "prompt": UNCENSORED_CREATIVE_PROMPT
            },
            {
                "id": "code",
                "name": "Software Engineer & Code Architect",
                "description": "Production-grade code, algorithm design, bug hunting, and architecture.",
                "prompt": CODE_EXPERT_PROMPT
            },
            {
                "id": "story",
                "name": "Story Director & Novelist",
                "description": "Narrative pacing, 5-beat plotting, character arcs, and world-building.",
                "prompt": CHAT_DIRECTOR_PROMPT
            }
        ]
    }

@router.post("/llm/chat")
def chat_with_assistant(req: ChatRequest):
    """Interactive conversational chat like ChatGPT/Claude, with optional image rendering."""
    cfg = load_config()
    text_cfg = dict(cfg.get("text_model", {}))
    image_cfg = dict(cfg.get("image_model", {}))

    # Allow request-level overrides for instant model switching
    if req.model_name:
        text_cfg["model_name"] = req.model_name
    if req.provider:
        text_cfg["provider"] = req.provider
    if req.temperature is not None:
        text_cfg["temperature"] = req.temperature

    # Check if the user's latest prompt asks for an image
    last_user_msg = ""
    for msg in reversed(req.messages):
        if msg.get("role") == "user":
            last_user_msg = msg.get("content", "").strip()
            break

    # If it's an image command or image mode is toggled
    is_image_cmd = any(last_user_msg.lower().startswith(p) for p in ("/image ", "/draw ", "/imagine ", "/photo "))
    if req.generate_image or is_image_cmd:
        image_prompt = last_user_msg
        for prefix in ("/image ", "/draw ", "/imagine ", "/photo "):
            if image_prompt.lower().startswith(prefix):
                image_prompt = image_prompt[len(prefix):].strip()
                break

        try:
            generator = get_image_generator(image_cfg)
            img_result = generator.generate(
                prompt=image_prompt,
                negative_prompt="cartoon, 3D render, CGI, anime, plastic smooth skin, deformed fingers, text, watermark"
            )
            return {
                "status": "success",
                "provider": text_cfg.get("provider"),
                "model_name": text_cfg.get("model_name"),
                "message": f"I've generated a photorealistic 35mm image for: **\"{image_prompt}\"**",
                "image": img_result
            }
        except Exception as e:
            return {
                "status": "partial",
                "provider": text_cfg.get("provider"),
                "model_name": text_cfg.get("model_name"),
                "message": f"Image generation encountered an issue: {str(e)}"
            }

    # Otherwise standard conversational completion
    messages = [SystemMessage(content=req.system_instruction or GENERAL_ASSISTANT_PROMPT)]
    for msg in req.messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")
        if role == "assistant":
            messages.append(AIMessage(content=content))
        elif role == "system":
            messages.append(SystemMessage(content=content))
        else:
            messages.append(HumanMessage(content=content))

    try:
        model = get_text_model(text_cfg)
        response = model.invoke(messages)
        return {
            "status": "success",
            "provider": text_cfg.get("provider"),
            "model_name": text_cfg.get("model_name"),
            "message": response.content
        }
    except Exception as e:
        fallback_model = MockStoryChatModel()
        response = fallback_model.invoke(messages)
        return {
            "status": "fallback_success",
            "warning": f"Model failed: {str(e)}",
            "provider": "fallback",
            "model_name": "mock",
            "message": response.content
        }
