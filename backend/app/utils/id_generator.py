"""
Centralized ID generator for all PsyicHub entities.

Format: <PREFIX>_<timestamp_hex>_<uuid_segment>
Example: PAT_194a3b7c_8f4e2d1a9b3c

- Prefixed → instantly identifiable, no cross-entity collision
- Timestamp hex → sortable, debuggable
- 12 hex chars from uuid4 → 48 bits of randomness per second
"""
import time
import uuid

PREFIXES = {
    "PAT",
    "SES",
    "APT",
    "WAL",
    "WTX",
    "TKT",
    "MSG",
    "REQ",
    "VRQ",
    "DOC",
    "AUD",
    "PRC",
    "RST",
    "LNK",
    "ASM",
    "SCU",
    "SCR",
    "SQR",
    "SGM",
    "SSA",
    "SRP",
}

def generate_id(prefix: str) -> str:
    """
    Generate a collision-proof, prefixed, sortable ID.

    Raises ValueError if prefix is not in the registry.
    """
    if prefix not in PREFIXES:
        raise ValueError(f"Unknown ID prefix '{prefix}'. Register it in PREFIXES first.")
    ts_hex = format(int(time.time()), "08x")
    uid = uuid.uuid4().hex[:12]
    return f"{prefix}_{ts_hex}_{uid}"
