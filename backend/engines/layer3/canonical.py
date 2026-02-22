"""Layer 3 — Canonical Normalizers & Claim Text Builder

Provides:
- normalize_phone: strips to digits only
- normalize_name: lowercase, single-spaced
- normalize_invoice: uppercase, stripped
- build_canonical_text: deterministic short text for similarity comparison
- is_valid_sha256: validates a 64-hex-char hash is not a placeholder
"""
import re
import unicodedata


def normalize_phone(raw: str) -> str:
    """Return digits only from a phone string."""
    if not raw:
        return ""
    return re.sub(r"\D", "", str(raw))


def normalize_name(raw: str) -> str:
    """Lowercase, strip, collapse whitespace, remove diacritics."""
    if not raw:
        return ""
    s = str(raw)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower().strip()
    s = re.sub(r"\s+", " ", s)
    return s


def normalize_invoice(raw: str) -> str:
    """Uppercase and strip the invoice number."""
    if not raw:
        return ""
    return str(raw).upper().strip()


def build_canonical_text(claim: dict, line_items: list[dict] | None = None) -> str:
    """
    Build a deterministic, short text string representing this claim's substance.
    Used for local similarity comparison (and in Pass 2, for Cohere embedding).
    """
    parts = []

    if claim.get("incident_type"):
        parts.append(f"type:{claim['incident_type']}")

    if claim.get("incident_description"):
        desc = str(claim["incident_description"]).strip()
        parts.append(f"desc:{desc[:300]}")

    if claim.get("provider_name"):
        parts.append(f"provider:{normalize_name(claim['provider_name'])}")

    if claim.get("invoice_number"):
        parts.append(f"invoice:{normalize_invoice(claim['invoice_number'])}")

    if claim.get("claimed_amount") is not None:
        parts.append(f"amount:{float(claim['claimed_amount']):.2f}")

    if line_items:
        items_text = []
        for item in line_items[:5]:
            desc = str(item.get("description", "")).strip()
            amt = item.get("claimed_amount")
            if desc:
                items_text.append(f"{desc}:{amt}" if amt else desc)
        if items_text:
            parts.append("items:" + "|".join(items_text))

    return " ".join(parts)


_SHA256_RE = re.compile(r"^[0-9a-fA-F]{64}$")
_UNIFORM_RE = re.compile(r"^(.)\1{63}$")


def is_valid_sha256(hash_str: str) -> bool:
    """
    Returns True if hash_str is a 64 hex-char string that is NOT
    a uniform placeholder like 0000...0000 or aaaa...aaaa.
    """
    if not hash_str or not isinstance(hash_str, str):
        return False
    if not _SHA256_RE.match(hash_str):
        return False
    if _UNIFORM_RE.match(hash_str.lower()):
        return False
    return True
