from typing import Any, List, Optional
import os
import json
import re
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage
from langchain_core.outputs import ChatResult, ChatGeneration

class MockStoryChatModel(BaseChatModel):
    """Fallback / Mock LLM for zero-download instant testing when local models are not running."""
    model_name: str = "mock-story-model"
    temperature: float = 0.7

    @property
    def _llm_type(self) -> str:
        return "mock_story_llm"

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        full_prompt = " ".join([m.content for m in messages if isinstance(m.content, str)])
        
        # Check if Outliner prompt was called
        if "story architect" in full_prompt.lower() or "5-beat story blueprint" in full_prompt.lower() or "plot_beats" in full_prompt.lower():
            title = "The Obsidian Clockmaker"
            if "Title / Idea:" in full_prompt:
                match = re.search(r"Title / Idea:\s*(.+)", full_prompt)
                if match:
                    extracted = match.group(1).split("\n")[0].strip()
                    if extracted and len(extracted) > 2:
                        title = extracted
            
            content = json.dumps({
                "title": title,
                "logline": "In a drowned steampunk metropolis, an exiled horologist uncovers a mechanism that counts down to the day the sea will reverse.",
                "genre": "Gothic Steampunk Noir",
                "tone": "Atmospheric, melancholic, suspenseful",
                "setting": {
                    "world_name": "New Oakhaven - The Drowned Spires",
                    "description": "Black brass viaducts spanning flooded canals choked with coal fog and gaslamp reflections."
                },
                "characters": [
                    {
                        "name": "Corvin Drake",
                        "role": "Protagonist",
                        "appearance": "Gaunt 40s man with oil-stained knuckles, silver-streaked hair, and brass-rimmed ocular loupes.",
                        "internal_conflict": "Haunted by the explosion that took his apprentice, terrified of trusting again."
                    },
                    {
                        "name": "Lady Vane",
                        "role": "Antagonist",
                        "appearance": "Porcelain skin, sharp emerald eyes beneath an ebony silk veil, clad in tailored velvet overcoat.",
                        "internal_conflict": "Obsessed with freezing time before her hereditary wasting disease claims her."
                    }
                ],
                "plot_beats": [
                    {"act": 1, "beat_title": "The Inciting Disturbance", "description": "Corvin receives a waterlogged pocket watch that ticks counter-clockwise and radiates impossible heat."},
                    {"act": 2, "beat_title": "Rising Complications", "description": "Vane's clockwork enforcers ransack the lower harbor, hunting the bearer of the chronometer."},
                    {"act": 3, "beat_title": "The Turning Point", "description": "Corvin dismantles the core and reveals the city's sea-walls are powered by an ancient captive pulse."},
                    {"act": 4, "beat_title": "The Climax", "description": "A duel atop the Great Bell Tower amidst a raging tidal tempest as the floodgates buckle."},
                    {"act": 5, "beat_title": "The Aftermath & Echo", "description": "Corvin resets the dial with his bare hands, saving the city while remaining forever displaced in time."}
                ]
            }, indent=2)

        # Check if Image Prompt Synthesizer was called
        elif "cinematographer" in full_prompt.lower() or "image_prompt" in full_prompt.lower():
            content = json.dumps({
                "image_prompt": "Cinematic 35mm candid photograph of a gaunt watchmaker with brass-rimmed ocular loupe in a fog-shrouded victorian clock tower, rain streaming down arched stained-glass windows, warm amber gaslight reflecting on wet cobblestones below, shallow depth of field, authentic skin texture, Kodak Portra 400, sharp focus, 8k documentary still.",
                "negative_prompt": "cartoon, 3D render, CGI, anime, plastic smooth skin, deformed fingers, extra limbs, oversaturated, text, watermark"
            }, indent=2)

        # Scene prose writer
        elif "CORE WRITING PRINCIPLES" in full_prompt or "Show, Don't Tell" in full_prompt:
            content = (
                "The rain tasted of sulfur and iron. Corvin gripped the brass calipers with trembling, "
                "soot-stained fingers as the gear train clicked with erratic ferocity. Outside the rain-streaked "
                "clerestory windows of the bell tower, New Oakhaven lay suffocated beneath green gaslamp haze "
                "and swollen black waters. Every breath drew cold fog deep into his chest, carrying the wet rot "
                "of submerged piers. 'Listen,' he muttered to the empty workshop, though the copper automaton in the "
                "corner offered only the dull hum of dying coils. The casing of the timepiece burned hot against his palm—a "
                "heat that defied cold physics, throbbing like a frantic newborn pulse."
            )
        else:
            content = (
                "Welcome to AI Story Creator. I am your Story Director co-author. "
                "Pitch me any concept, character, or moral dilemma and I will outline the 5-beat spine."
            )

        message = AIMessage(content=content)
        generation = ChatGeneration(message=message)
        return ChatResult(generations=[generation])


def get_text_model(config: dict) -> BaseChatModel:
    """Factory that instantiates any text model provider seamlessly."""
    provider = config.get("provider", "ollama").lower()
    model_name = config.get("model_name", "qwen2.5:3b")
    temperature = config.get("temperature", 0.7)
    base_url = config.get("base_url")
    api_key = config.get("api_key") or os.environ.get("OPENAI_API_KEY", "")

    if provider == "ollama":
        from langchain_ollama import ChatOllama
        return ChatOllama(
            model=model_name,
            base_url=base_url or "http://localhost:11434",
            temperature=temperature
        )
    elif provider in ("lmstudio", "vllm", "local_openai"):
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name,
            base_url=base_url or "http://localhost:1234/v1",
            api_key=api_key or "not-needed",
            temperature=temperature
        )
    elif provider == "groq":
        # Free cloud inference (Zero local download required)
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name or "llama-3.3-70b-versatile",
            base_url="https://api.groq.com/openai/v1",
            api_key=api_key or os.environ.get("GROQ_API_KEY", ""),
            temperature=temperature
        )
    elif provider == "openrouter":
        # Any open-source or proprietary model via OpenRouter
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name or "meta-llama/llama-3.3-70b-instruct",
            base_url="https://openrouter.ai/api/v1",
            api_key=api_key or os.environ.get("OPENROUTER_API_KEY", ""),
            temperature=temperature
        )
    elif provider == "deepseek":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name or "deepseek-chat",
            base_url="https://api.deepseek.com",
            api_key=api_key or os.environ.get("DEEPSEEK_API_KEY", ""),
            temperature=temperature
        )
    elif provider == "venice":
        # 100% Uncensored Cloud LLM (Dolphin, Llama 3.3, Hermes)
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name or "llama-3.3-70b",
            base_url="https://api.venice.ai/api/v1",
            api_key=api_key or os.environ.get("VENICE_API_KEY", ""),
            temperature=temperature
        )
    elif provider == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=model_name or "gpt-4o-mini",
            temperature=temperature,
            api_key=api_key or os.environ.get("OPENAI_API_KEY")
        )
    elif provider in ("mock", "demo", "offline"):
        return MockStoryChatModel(model_name=model_name, temperature=temperature)
    else:
        raise ValueError(f"Unsupported text provider: {provider}")
