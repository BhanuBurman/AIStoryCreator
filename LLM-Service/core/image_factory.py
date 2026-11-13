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

# 1. Zero-setup immediate generator with uncensored safety bypass
class PollinationsImageGenerator(BaseImageGenerator):
    def __init__(self, output_dir: str = "./generated_images", model: str = "flux"):
        self.output_dir = output_dir
        self.model = model
        os.makedirs(output_dir, exist_ok=True)

    def generate(self, prompt: str, negative_prompt: str = "") -> Dict[str, Any]:
        encoded_prompt = urllib.parse.quote(prompt)
        # safe=false disables strict censorship filters on Pollinations
        url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?model={self.model}&nologo=true&safe=false&width=1024&height=768"
        
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

# 2. Venice AI 100% Uncensored Cloud Generator (Flux & SDXL)
class VeniceImageGenerator(BaseImageGenerator):
    def __init__(self, api_key: str = "", output_dir: str = "./generated_images", model: str = "fluently-xl"):
        self.api_key = api_key or os.environ.get("VENICE_API_KEY", "")
        self.output_dir = output_dir
        self.model = model
        os.makedirs(output_dir, exist_ok=True)

    def generate(self, prompt: str, negative_prompt: str = "") -> Dict[str, Any]:
        if not self.api_key:
            # Fallback to Pollinations uncensored if no key
            return PollinationsImageGenerator(self.output_dir, "flux").generate(prompt, negative_prompt)
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "prompt": prompt,
            "negative_prompt": negative_prompt or "ugly, blurry, lowres",
            "width": 1024,
            "height": 768,
            "hide_watermark": True,
            "return_binary": True
        }
        res = requests.post("https://api.venice.ai/api/v1/image/generate", json=payload, headers=headers, timeout=90)
        if res.status_code == 200:
            filename = f"img_venice_{uuid.uuid4().hex[:8]}.webp"
            filepath = os.path.join(self.output_dir, filename)
            with open(filepath, "wb") as f:
                f.write(res.content)
            return {
                "provider": "venice",
                "model": self.model,
                "prompt": prompt,
                "local_path": filepath,
                "filename": filename,
                "url": f"/generated_images/{filename}",
                "status": "success"
            }
        raise RuntimeError(f"Venice generation failed: {res.text}")

# 3. Local ComfyUI / Automatic1111 / SD-WebUI Generator (100% Uncensored Offline)
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
    model_name = config.get("model_name", "flux")
    api_key = config.get("api_key", "")
    
    if provider == "pollinations":
        return PollinationsImageGenerator(output_dir=output_dir, model=model_name)
    elif provider == "venice":
        return VeniceImageGenerator(api_key=api_key, output_dir=output_dir, model=model_name)
    elif provider in ("sd_webui", "forge", "automatic1111", "comfyui"):
        return LocalWebUIGenerator(base_url=config.get("base_url", "http://127.0.0.1:7860"), output_dir=output_dir)
    else:
        return PollinationsImageGenerator(output_dir=output_dir, model="flux")
