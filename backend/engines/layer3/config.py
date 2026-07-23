"""Layer 3 — Config Loader

Reads from:
  1. `configuration` Supabase table (runtime overrides)
  2. Environment variables (feature toggles + service creds)

All values have safe defaults so Layer 3 can run without any configuration rows.
"""
import json
import os
from typing import Any


def _read_config_value(db, key: str, default: Any) -> Any:
    """Read a single config key from the configuration table."""
    try:
        result = (
            db.table("configuration")
            .select("config_value")
            .eq("config_key", key)
            .single()
            .execute()
        )
        if result.data:
            val = result.data["config_value"]
            if isinstance(val, str):
                val = json.loads(val)
            return val
    except Exception:
        pass
    return default


def _clean_env(key: str, default: str) -> str:
    """Read an env var, stripping stray surrounding quotes.

    Docker's --env-file / Compose env_file parsing does not strip quotes the
    way a shell or python-dotenv would, so a value like KEY="5" in .env is
    injected into os.environ as the literal string '"5"'. This breaks
    int()/float() casts and corrupts URIs, so every env read in this module
    goes through here regardless of source.
    """
    v = os.environ.get(key, default)
    return v.strip().strip('"').strip("'") if isinstance(v, str) else v


def load_config(db) -> dict:
    """
    Returns a consolidated config dict for Layer 3.
    All values sourced from the configuration table or env vars, with defaults.
    """
    # ── Manual .env loading (fallback if server didn't load it into os.environ) ──
    # Check current dir, then parent, up to project root
    search_path = os.path.dirname(os.path.abspath(__file__))
    for _ in range(5):
        env_path = os.path.join(search_path, ".env")
        if os.path.exists(env_path):
            try:
                with open(env_path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            k = k.strip()
                            v = v.strip().strip('"').strip("'")
                            if k and k not in os.environ:
                                os.environ[k] = v
            except Exception:
                pass
            break
        search_path = os.path.dirname(search_path)
        if not search_path or search_path == os.path.dirname(search_path):
            break

    cfg = {}

    # ── Weights & Thresholds ──────────────────────────────────────
    cfg["tier_weights"] = _read_config_value(db, "fraud.tier_weights", [0.3, 0.3, 0.4])
    if not (isinstance(cfg["tier_weights"], list) and len(cfg["tier_weights"]) == 3):
        cfg["tier_weights"] = [0.3, 0.3, 0.4]
    cfg["tier_weights"] = [float(x) for x in cfg["tier_weights"]]

    cfg["high_threshold"] = float(_read_config_value(db, "fraud.high_threshold", 0.70))
    cfg["medium_threshold"] = float(_read_config_value(db, "fraud.medium_threshold", 0.30))

    # ── Tier 1 windows ────────────────────────────────────────────
    cfg["velocity_window_days"] = int(_read_config_value(db, "fraud.velocity_window_days", 7))
    cfg["velocity_max_claims"] = int(_read_config_value(db, "fraud.velocity_max_claims", 5))
    cfg["provider_velocity_window_days"] = int(
        _read_config_value(db, "fraud.provider_velocity_window_days", 7)
    )
    cfg["provider_velocity_max_claims"] = int(
        _read_config_value(db, "fraud.provider_velocity_max_claims", 20)
    )
    cfg["amount_sigma_threshold"] = float(
        _read_config_value(db, "fraud.amount_sigma_threshold", 3.0)
    )

    # ── Tier 2 ────────────────────────────────────────────────────
    cfg["similarity_lookback_days"] = int(
        _read_config_value(db, "fraud.similarity_lookback_days", 365)
    )
    cfg["similarity_top_k"] = int(_read_config_value(db, "fraud.similarity_top_k", 5))
    cfg["similarity_score_threshold"] = float(
        _read_config_value(db, "fraud.similarity_score_threshold", 0.80)
    )

    # ── Tier 3 ───────────────────────────────────────────────────
    cfg["graph_lookback_days"] = int(_read_config_value(db, "fraud.graph_lookback_days", 365))
    cfg["graph_hops"] = int(_read_config_value(db, "fraud.graph_hops", 2))
    cfg["graph_component_alert_threshold"] = int(
        _read_config_value(db, "fraud.graph_component_alert_threshold", 6)
    )

    # ── Env-var Feature Toggles (all default OFF for Pass 1) ──────
    def _feature_bool(key: str, default: bool = False) -> bool:
        # DB config overrides default if it exists
        db_val = _read_config_value(db, key, None)
        
        # Env var overrides everything
        v = _clean_env(key, "")
        if not v and db_val is not None:
            v = str(db_val)
            
        v = v.strip().lower()
        if v in ("1", "true", "yes"):
            return True
        if v in ("0", "false", "no"):
            return False
        return default

    cfg["enable_qdrant"] = _feature_bool("FRAUD_LAYER3_ENABLE_QDRANT", False)
    cfg["enable_neo4j"] = _feature_bool("FRAUD_LAYER3_ENABLE_NEO4J", False)
    cfg["enable_jina_media"] = _feature_bool("FRAUD_LAYER3_ENABLE_JINA_MEDIA", False)
    cfg["enable_rerank"] = _feature_bool("FRAUD_LAYER3_ENABLE_RERANK", False)
    cfg["jina_max_files_per_claim"] = int(_clean_env("FRAUD_LAYER3_JINA_MAX_FILES_PER_CLAIM", "1"))
    cfg["media_max_mb"] = int(_clean_env("FRAUD_LAYER3_MEDIA_MAX_MB", "8"))
    cfg["external_max_seconds"] = int(_clean_env("FRAUD_LAYER3_EXTERNAL_MAX_SECONDS", "8"))
    cfg["qdrant_top_k"] = int(_clean_env("FRAUD_LAYER3_QDRANT_TOP_K", "5"))

    # ── Service Credentials (used in Pass 2) ─────────────────────
    cfg["cohere_api_key"] = _clean_env("COHERE_API_KEY", "")
    cfg["cohere_embed_model"] = _clean_env("COHERE_EMBED_MODEL", "embed-english-v3.0")
    cfg["cohere_rerank_model"] = _clean_env("COHERE_RERANK_MODEL", "")
    cfg["jina_api_key"] = _clean_env("JINA_API_KEY", "")
    cfg["jina_embed_model"] = _clean_env("JINA_EMBED_MODEL", "")
    cfg["qdrant_url"] = _clean_env("QDRANT_URL", "")
    cfg["qdrant_api_key"] = _clean_env("QDRANT_API_KEY", "")
    cfg["qdrant_collection_claims"] = _clean_env("QDRANT_COLLECTION_CLAIMS", "claims_v1")
    cfg["qdrant_collection_text"] = _clean_env("QDRANT_COLLECTION_TEXT", "claims_v1_text")
    cfg["qdrant_collection_media"] = _clean_env("QDRANT_COLLECTION_MEDIA", "claims_v1_media")
    cfg["qdrant_timeout_seconds"] = int(_clean_env("QDRANT_TIMEOUT_SECONDS", "5"))
    cfg["neo4j_uri"] = _clean_env("NEO4J_URI", "")
    cfg["neo4j_user"] = _clean_env("NEO4J_USER", "neo4j")
    cfg["neo4j_password"] = _clean_env("NEO4J_PASSWORD", "")
    cfg["neo4j_database"] = _clean_env("NEO4J_DATABASE", "neo4j")
    cfg["neo4j_timeout_seconds"] = int(_clean_env("NEO4J_TIMEOUT_SECONDS", "5"))

    return cfg
