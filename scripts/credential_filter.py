"""
Credential patterns. Real user prompts sometimes contain pasted keys and tokens; any prompt that
matches is dropped from the training data so no credential is ever stored or published.
"""

import re

SECRET = re.compile(
    "|".join(
        [
            r"\b(?:sk|pk|tk)\.eyJ[A-Za-z0-9_-]{10,}",  # Mapbox tokens
            r"\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}",  # JWTs
            r"\bsk-(?:ant-|proj-)?[A-Za-z0-9_-]{20,}",  # OpenAI / Anthropic keys
            r"\bAKIA[0-9A-Z]{16}\b",  # AWS access key ids
            r"\bgh[pousr]_[A-Za-z0-9]{36,}",  # GitHub tokens
            r"\bgithub_pat_[A-Za-z0-9_]{40,}",
            r"\bxox[abprs]-[A-Za-z0-9-]{10,}",  # Slack tokens
            r"\bAIza[0-9A-Za-z_-]{35}",  # Google API keys
            r"\bhf_[A-Za-z0-9]{30,}",  # Hugging Face tokens
            r"\b(?:rk|sk)_(?:live|test)_[A-Za-z0-9]{20,}",  # Stripe keys
            r"-----BEGIN [A-Z ]*PRIVATE KEY-----",
            r"(?:api[_-]?key|secret|token|password|passwd)[\"'\s:=]{1,6}[A-Za-z0-9_\-+/]{24,}",
        ]
    ),
    re.I,
)


def has_secret(text: str) -> bool:
    return bool(SECRET.search(text or ""))
