# Core package for LLM and Image Factories
from .llm_factory import get_text_model, MockStoryChatModel
from .image_factory import get_image_generator, BaseImageGenerator
from .prompts import (
    STORY_WRITER_PROMPT,
    OUTLINER_PROMPT,
    IMAGE_PROMPT_SYNTHESIZER,
    CHAT_DIRECTOR_PROMPT
)

__all__ = [
    "get_text_model",
    "MockStoryChatModel",
    "get_image_generator",
    "BaseImageGenerator",
    "STORY_WRITER_PROMPT",
    "OUTLINER_PROMPT",
    "IMAGE_PROMPT_SYNTHESIZER",
    "CHAT_DIRECTOR_PROMPT"
]
