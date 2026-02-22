"""Layer 3 — Qdrant Client
Handles text and media collections mapping vectors from Cohere/Jina to claims/documents.
"""
import time
import uuid
from typing import Optional, Tuple, List, Dict, Any

try:
    from qdrant_client import QdrantClient
    from qdrant_client.http.models import Distance, VectorParams, PointStruct, UpdateStatus, Filter, FieldCondition, MatchValue
    QDRANT_AVAILABLE = True
except ImportError:
    QDRANT_AVAILABLE = False


class QdrantConnector:
    def __init__(self, cfg: dict):
        self.cfg = cfg
        self.client: Optional[QdrantClient] = None
        
        url = cfg.get("qdrant_url")
        api_key = cfg.get("qdrant_api_key")
        timeout = cfg.get("qdrant_timeout_seconds", 5)
        
        if QDRANT_AVAILABLE and url:
            try:
                self.client = QdrantClient(url=url, api_key=api_key, timeout=timeout)
            except Exception:
                self.client = None

    def _ensure_collection(self, collection_name: str, vector_size: int) -> bool:
        """Create collection lazily if it doesn't exist. Return False if size mismatch."""
        if not self.client:
            return False
            
        try:
            collections = self.client.get_collections()
            names = [c.name for c in collections.collections]
            
            if collection_name not in names:
                self.client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
                )
                return True
            else:
                info = self.client.get_collection(collection_name)
                # Ensure vector config size matches
                if hasattr(info.config.params, "vectors") and \
                   hasattr(info.config.params.vectors, "size") and \
                   info.config.params.vectors.size != vector_size:
                    return False
                return True
        except Exception:
            # Fallback on failure to create/check
            return False

    def _to_qdrant_point_id(self, original_id: str) -> str:
        """Deterministically format any string ID (like a claim ID or sha256 hash) to a valid UUID format."""
        try:
            return str(uuid.UUID(original_id))
        except Exception:
            return str(uuid.uuid5(uuid.NAMESPACE_OID, original_id))

    def point_exists(self, collection_name: str, point_id: str) -> Tuple[bool, Optional[str], int]:
        """Check if a point exists (idempotency check) via exact UUID get."""
        start_ms = int(time.time() * 1000)
        if not self.client:
            return False, "Qdrant not initialized", int(time.time()*1000) - start_ms
            
        try:
            pt_uuid = self._to_qdrant_point_id(point_id)
            pts = self.client.retrieve(
                collection_name=collection_name,
                ids=[pt_uuid],
                with_payload=False,
                with_vectors=False
            )
            elapsed = int(time.time() * 1000) - start_ms
            return len(pts) > 0, None, elapsed
        except Exception as e:
            elapsed = int(time.time() * 1000) - start_ms
            return False, f"Check error: {str(e)}", elapsed

    def retrieve_point(self, collection_name: str, point_id: str) -> Tuple[Optional[List[float]], dict, Optional[str], int]:
        """Retrieve vector of a point, if it exists, via exact UUID get."""
        start_ms = int(time.time() * 1000)
        if not self.client:
            return None, {}, "Qdrant not initialized", int(time.time()*1000) - start_ms
            
        try:
            pt_uuid = self._to_qdrant_point_id(point_id)
            pts = self.client.retrieve(
                collection_name=collection_name,
                ids=[pt_uuid],
                with_payload=True,
                with_vectors=True
            )
            elapsed = int(time.time() * 1000) - start_ms
            if len(pts) > 0:
                pt = pts[0]
                vec = pt.vector if isinstance(pt.vector, list) else (pt.vector.get("") if isinstance(pt.vector, dict) else pt.vector)
                return vec, pt.payload or {}, None, elapsed
            return None, {}, None, elapsed
        except Exception as e:
            elapsed = int(time.time() * 1000) - start_ms
            return None, {}, f"Retrieve error: {str(e)}", elapsed

    def upsert_point(self, collection_name: str, point_id: str, vector: List[float], payload: dict) -> Tuple[bool, Optional[str], int]:
        """Upsert a single point, lazily creating collection if needed."""
        start_ms = int(time.time() * 1000)
        if not self.client:
            return False, "Qdrant not initialized", int(time.time()*1000) - start_ms
            
        if not self._ensure_collection(collection_name, len(vector)):
            return False, "Collection size mismatch or creation failed", int(time.time()*1000) - start_ms

        try:
            valid_uuid = self._to_qdrant_point_id(point_id)
            payload["original_id"] = point_id # keep original ID for reference

            res = self.client.upsert(
                collection_name=collection_name,
                points=[PointStruct(id=valid_uuid, vector=vector, payload=payload)]
            )
            elapsed = int(time.time() * 1000) - start_ms
            if res.status == UpdateStatus.COMPLETED or res.status == "completed":
                return True, None, elapsed
            return False, f"Upsert status: {res.status}", elapsed
        except Exception as e:
            elapsed = int(time.time() * 1000) - start_ms
            return False, f"Upsert error: {str(e)}", elapsed

    def search_points(self, collection_name: str, vector: List[float], top_k: int, filter_dict: Optional[dict] = None) -> Tuple[List[dict], Optional[str], int]:
        """Search similar vectors."""
        start_ms = int(time.time() * 1000)
        if not self.client:
            return [], "Qdrant not initialized", int(time.time()*1000) - start_ms
            
        try:
            # Construct a basic filter if provided (only supported equal matches for now)
            q_filter = None
            if filter_dict:
                must_conds = []
                for k, v in filter_dict.items():
                    must_conds.append(FieldCondition(key=k, match=MatchValue(value=v)))
                q_filter = Filter(must=must_conds)

            res = self.client.query_points(
                collection_name=collection_name,
                query=vector,
                limit=top_k,
                query_filter=q_filter,
                with_payload=True
            ).points
            
            results = []
            for hit in res:
                results.append({
                    "id": hit.payload.get("original_id", str(hit.id)),
                    "score": float(hit.score),
                    "payload": hit.payload
                })
                
            elapsed = int(time.time() * 1000) - start_ms
            return results, None, elapsed
            
        except Exception as e:
            elapsed = int(time.time() * 1000) - start_ms
            return [], f"Search error: {str(e)}", elapsed
