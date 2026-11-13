import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.llm_factory import get_text_model, MockStoryChatModel
from core.image_factory import get_image_generator, PollinationsImageGenerator
from core.prompts import STORY_WRITER_PROMPT, OUTLINER_PROMPT, IMAGE_PROMPT_SYNTHESIZER
from api.routes import extract_json_from_llm_response

def test_mock_llm_outliner():
    model = MockStoryChatModel()
    prompt = OUTLINER_PROMPT.format(user_input="The Chrono Alchemist", genre_tone="Steampunk Noir")
    from langchain_core.messages import HumanMessage
    res = model.invoke([HumanMessage(content=prompt)])
    assert res.content is not None
    data = extract_json_from_llm_response(res.content)
    assert "plot_beats" in data
    assert len(data["plot_beats"]) == 5
    assert "characters" in data
    print("✓ Outliner prompt and JSON parser passed")

def test_mock_llm_scene_writer():
    model = MockStoryChatModel()
    prompt = STORY_WRITER_PROMPT.format(
        title="The Chrono Alchemist",
        genre="Steampunk",
        tone="Dark",
        characters_summary="Corvin: gaunt watchmaker",
        setting="Drowned spires",
        current_beat="Act 1: Inciting Disturbance",
        previous_context="None"
    )
    from langchain_core.messages import HumanMessage
    res = model.invoke([HumanMessage(content=prompt)])
    assert len(res.content) > 50
    print("✓ Scene writer prompt passed")

def test_mock_image_prompt_synthesizer():
    model = MockStoryChatModel()
    prompt = IMAGE_PROMPT_SYNTHESIZER.format(
        scene_text="The rain fell like needles onto Corvin's brass loupe.",
        character_details="Corvin: gaunt 40s man"
    )
    from langchain_core.messages import HumanMessage
    res = model.invoke([HumanMessage(content=prompt)])
    data = extract_json_from_llm_response(res.content)
    assert "image_prompt" in data
    assert "35mm" in data["image_prompt"] or "photograph" in data["image_prompt"].lower()
    print("✓ Image prompt synthesizer passed")

def test_image_factory():
    gen = get_image_generator({"provider": "pollinations", "model_name": "flux"})
    assert isinstance(gen, PollinationsImageGenerator)
    print("✓ Image generator factory passed")

if __name__ == "__main__":
    test_mock_llm_outliner()
    test_mock_llm_scene_writer()
    test_mock_image_prompt_synthesizer()
    test_image_factory()
    print("\nAll LLM-Service tests passed successfully!")
