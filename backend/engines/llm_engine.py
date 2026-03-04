from typing import List, Dict, Any
import requests
from config import get_settings

class GroqEngine:
    """Lightweight wrapper for Groq LLM API"""
    
    def __init__(self):
        self.api_key = get_settings().groq_api_key
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
        self.model = "qwen/qwen3-32b" # Requested Qwen model
        
    def generate(self, messages: List[Dict[str, str]], tools: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Sends context/messages to Groq and optionally provides function tools.
        """
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": 0.2, # Keep it deterministic for admin tasks
            "max_tokens": 1500
        }
        
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = "auto"

        response = requests.post(self.base_url, headers=headers, json=payload)
        if not response.ok:
            print("GROQ API ERROR:", response.text)
        response.raise_for_status()
        
        return response.json()
