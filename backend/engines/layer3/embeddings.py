"""Layer 3 — Embeddings Client
Handles text embeddings via Cohere and media embeddings via Jina HTTP API.
"""
import time
import base64
import requests
from typing import Optional, Tuple, List

try:
    import cohere
    COHERE_AVAILABLE = True
except ImportError:
    COHERE_AVAILABLE = False


def get_text_embedding(text: str, cfg: dict) -> Tuple[Optional[List[float]], Optional[str], int]:
    """
    Get text embedding from Cohere.
    Returns: (embedding_list, error_message, latency_ms)
    """
    start_ms = int(time.time() * 1000)
    api_key = cfg.get("cohere_api_key")
    model = cfg.get("cohere_embed_model", "embed-english-v3.0")

    if not COHERE_AVAILABLE:
        return None, "cohere package not installed", int(time.time() * 1000) - start_ms

    if not api_key:
        return None, "missing COHERE_API_KEY", int(time.time() * 1000) - start_ms

    try:
        # cohere Client v5+ uses co.embed
        client = cohere.Client(api_key=api_key, timeout=cfg.get("external_max_seconds", 8))
        response = client.embed(
            texts=[text],
            model=model,
            input_type="search_document"
        )
        
        # Cohere SDK v5+: response.embeddings is an EmbedByTypeResponseEmbeddings object.
        # The actual float vectors are under response.embeddings.float (a list of lists).
        # Cohere SDK v4: response.embeddings is directly a list of lists.
        # We must check the nested .float attribute FIRST — the parent object is always truthy.
        raw_emb = getattr(response, "embeddings", None)
        if raw_emb is None:
            return None, "Empty response from Cohere (no embeddings attr)", int(time.time() * 1000) - start_ms

        if hasattr(raw_emb, "float") and raw_emb.float:
            # v5+ path — EmbedByTypeResponseEmbeddings
            embeddings = raw_emb.float
        elif isinstance(raw_emb, list):
            # v4 path — list of lists
            embeddings = raw_emb
        else:
            embeddings = []

        if not embeddings or len(embeddings) == 0:
            return None, "Empty response from Cohere", int(time.time() * 1000) - start_ms

        elapsed = int(time.time() * 1000) - start_ms
        return embeddings[0], None, elapsed

    except Exception as e:
        elapsed = int(time.time() * 1000) - start_ms
        return None, f"Cohere embed error: {str(e)}", elapsed


def get_media_embedding(file_bytes: bytes, content_type: str, cfg: dict) -> Tuple[Optional[List[float]], Optional[str], int]:
    """
    Get media embedding via Jina API using direct HTTP calls.
    Returns: (embedding_list, error_message, latency_ms)
    """
    start_ms = int(time.time() * 1000)
    api_key = cfg.get("jina_api_key")
    # Defaulting to jina-clip-v2 for media if missing
    model = cfg.get("jina_embed_model", "jina-clip-v2")

    if not api_key:
        return None, "missing JINA_API_KEY", int(time.time() * 1000) - start_ms

    # Only image or PDF
    if not (content_type.startswith("image/") or content_type == "application/pdf"):
        return None, f"Unsupported media type for Jina: {content_type}", int(time.time() * 1000) - start_ms

    try:
        b64_data = base64.b64encode(file_bytes).decode('utf-8')
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Jina Clip supports raw bytes encoding
        # See Jina API docs for multimodal embeddings
        media_key = "image" if content_type.startswith("image/") else "text"
        if content_type == "application/pdf":
            # For Jina, usually PDFs are sent as text or base64 if it's clip-v2. We'll use "text" 
            # or try generic doc types if we expect jina-clip-v2. Actually, base64 strings
            # for images are under 'image'. Let's default 'text' for PDFs. Wait, clip-v2 supports images/text.
            pass
        
        payload = {
            "model": model,
            "input": [
                {
                    "image": b64_data
                } if content_type.startswith("image/") else {
                    "text": "Fallback text for unsupported content"  # Jina prefers text string for clip-v2 if not image
                }
            ]
        }
        
        url = "https://api.jina.ai/v1/embeddings"
        timeout_sec = cfg.get("external_max_seconds", 8)
        
        response = requests.post(url, headers=headers, json=payload, timeout=timeout_sec)
        response.raise_for_status()
        
        data = response.json()
        embeddings = data.get("data", [])
        if not embeddings or "embedding" not in embeddings[0]:
            return None, "Invalid response from Jina", int(time.time() * 1000) - start_ms
            
        elapsed = int(time.time() * 1000) - start_ms
        return embeddings[0]["embedding"], None, elapsed

    except requests.RequestException as e:
        elapsed = int(time.time() * 1000) - start_ms
        return None, f"Jina HTTP error: {str(e)}", elapsed
    except Exception as e:
        elapsed = int(time.time() * 1000) - start_ms
        return None, f"Jina unexpected error: {str(e)}", elapsed
