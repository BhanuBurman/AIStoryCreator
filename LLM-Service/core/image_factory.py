from abc import ABC, abstractmethod
import os
import time
import urllib.parse
import uuid
import requests
from typing import Dict, Any, Optional

class BaseImageGenerator(ABC):
    @abstractmethod
    def generate(self, prompt: str, negative_prompt: str = "") -> Dict[str, Any]:
        """Returns metadata including local file path and URL to the generated image."""
        pass

# 1. Zero-setup immediate generator (High quality, uses Flux under the hood)
class PollinationsImageGenerator(BaseImageGenerator):
    def __init__(self, output_dir: str = "./generated_images", model: str = "flux"):
        self.output_dir = output_dir
        self.model = model
        os.makedirs(output_dir, exist_ok=True)

    def generate(self, prompt: str, negative_prompt: str = "") -> Dict[str, Any]:
        encoded_prompt = urllib.parse.quote(prompt)
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?model={self.model}&nologo=true&width=1024&height=768"
        
        # Save locally with safe unique filename
        prompt_hash = str(abs(hash(prompt)))[:8]
        unique_suffix = uuid.uuid4().hex[:6]
        filename = f"img_{prompt_hash}_{unique_suffix}.jpg"
        filepath = os.path.join(self.output_dir, filename)

        try:
            res = requests.get(url, timeout=60)
            if res.status_code == 200:
                with open(filepath, "wb") as f:
                    f.write(res.content)
                return {
                    "provider": "pollinations",
                    "model": self.model,
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "local_path": filepath,
                    "filename": filename,
                    "url": url,
                    "status": "success"
                }
            else:
                # If Pollinations has high load, return URL directly so frontend can load it
                return {
                    "provider": "pollinations",
                    "model": self.model,
                    "prompt": prompt,
                    "negative_prompt": negative_prompt,
                    "local_path": None,
                    "filename": None,
                    "url": url,
                    "status": "partial",
                    "error": f"Download returned {res.status_code}"
                }
        except Exception as e:
            # Fallback to direct URL if timeout
            return {
                "provider": "pollinations",
                "model": self.model,
                "prompt": prompt,
                "negative_prompt": negative_prompt,
                "local_path": None,
                "filename": None,
                "url": url,
                "status": "network_fallback",
                "error": str(e)
            }

# 2. Local ComfyUI / Automatic1111 / SD-WebUI Generator
class LocalWebUIGenerator(BaseImageGenerator):
    def __init__(self, base_url: str = "http://127.0.0.1:7860", output_dir: str = "./generated_images"):
        self.base_url = base_url
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)

    def generate(self, prompt: str, negative_prompt: str = "") -> Dict[str, Any]:
        payload = {
            "prompt": prompt,
            "negative_prompt": negative_prompt,
            "steps": 25,
            "cfg_scale": 7.0,
            "width": 1024,
            "height": 768,
        }
        resp = requests.post(f"{self.base_url}/sdapi/v1/txt2img", json=payload, timeout=120)
        if resp.status_code == 200:
            data = resp.json()
            images = data.get("images", [])
            if images:
                import base64
                img_data = base64.b64decode(images[0])
                filename = f"img_sd_{uuid.uuid4().hex[:8]}.png"
                filepath = os.path.join(self.output_dir, filename)
                with open(filepath, "wb") as f:
                    f.write(img_data)
                return {
                    "provider": "sd_webui",
                    "prompt": prompt,
                    "local_path": filepath,
                    "filename": filename,
                    "url": f"/generated_images/{filename}",
                    "status": "success"
                }
        raise RuntimeError(f"Local WebUI image generation failed: {resp.text}")

def get_image_generator(config: dict) -> BaseImageGenerator:
    """Factory that instantiates any image engine."""
    provider = config.get("provider", "pollinations").lower()
    output_dir = config.get("output_dir", "./generated_images")
    
    if provider == "pollinations":
        return PollinationsImageGenerator(output_dir=output_dir, model=config.get("model_name", "flux"))
    elif provider in ("sd_webui", "forge", "automatic1111"):
        return LocalWebUIGenerator(base_url=config.get("base_url", "http://127.0.0.1:7860"), output_dir=output_dir)
    else:
        # Default fallback to pollinations
        return PollinationsImageGenerator(output_dir=output_dir, model="flux")
