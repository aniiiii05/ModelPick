"""
Builds src/data/training/external.json from public, labelled prompt datasets.

Every label comes from the source dataset's own annotation; the mapping to ModelPick's
task types and 1-5 complexity is fixed below and documented in src/data/training/SOURCES.md.
Rows without a source label for a field get null for that field rather than a guess.

Usage (Python 3.10+, pyarrow only for Search Arena):
  python scripts/build_dataset.py [path/to/search-arena-24k.parquet]
The Search Arena parquet is ~400 MB, so it is read from a local copy:
  https://huggingface.co/datasets/lmarena-ai/search-arena-24k (refs/convert/parquet)
"""

import json
import random
import sys
import time
import urllib.parse
import urllib.request

from credential_filter import has_secret

ROWS_API = "https://datasets-server.huggingface.co/rows"
OUT = "src/data/training/external.json"
MAX_CHARS = 700  # long pastes would otherwise dominate token counts
rng = random.Random(42)


def rows(dataset, config, split, offset, length=100):
    q = urllib.parse.urlencode(dict(dataset=dataset, config=config, split=split, offset=offset, length=length))
    for attempt in range(4):
        try:
            with urllib.request.urlopen(f"{ROWS_API}?{q}", timeout=60) as r:
                return [x["row"] for x in json.load(r)["rows"]]
        except Exception as e:  # rate limits and timeouts: back off and retry
            if attempt == 3:
                print(f"  skip {dataset} @{offset}: {e}")
                return []
            time.sleep(2 + attempt * 3)


def sample_pages(dataset, config, split, total, pages):
    offsets = rng.sample(range(0, max(1, total - 100), 100), min(pages, total // 100 or 1))
    for off in offsets:
        yield from rows(dataset, config, split, off)


def clip(text):
    text = " ".join(text.split())
    return text[:MAX_CHARS]


out = []


def add(text, task, c, src):
    text = clip(text)
    if len(text) >= 8 and not has_secret(text):
        out.append({"t": text, "task": task, "c": c, "src": src})


# ── LMArena Human Preference 140k (CC BY 4.0) ─────────────────────────────────
# Real user prompts. LMArena tags each one: is_code, math, creative_writing, and seven
# "hard prompt" criteria (specificity, domain knowledge, complexity, problem solving,
# creativity, technical accuracy, real world). Images in the first turn mark vision.
# Complexity = number of criteria met: 0-1 → 1, 2 → 2, 3-4 → 3, 5 → 4, 6-7 → 5
# (LMArena counts 6+ criteria as a "hard prompt").
# A prompt with no tag and no criteria is plain conversation → chat.
CRITERIA_TO_C = {0: 1, 1: 1, 2: 2, 3: 3, 4: 3, 5: 4, 6: 5, 7: 5}
print("arena-human-preference-140k")
for r in sample_pages("lmarena-ai/arena-human-preference-140k", "default", "train", 135000, 90):
    if r.get("language") != "en":
        continue
    turns = r.get("full_conversation") or []
    if not turns:
        continue
    content = turns[0]["user"]["content"]
    text = " ".join(p.get("text") or "" for p in content if p.get("type") == "text")
    has_image = any(p.get("image") or p.get("type") == "image" for p in content)
    tags = r.get("category_tag") or {}
    crit = tags.get("criteria_v0.1") or {}
    k = sum(1 for v in crit.values() if v is True)
    c = CRITERIA_TO_C[k]
    if has_image:
        task = "vision"
    elif (tags.get("math_v0.1") or {}).get("math"):
        task = "math"
    elif r.get("is_code"):
        task = "coding"
    elif (tags.get("creative_writing_v0.1") or {}).get("creative_writing"):
        task = "writing"
    elif k == 0:
        task = "chat"
    else:
        task = None  # real prompt, but no source label for its task type
    if task:
        add(text, task, c, "arena-140k")
    elif k > 0:
        add(text, None, c, "arena-140k")

# ── Search Arena 24k (prompts CC BY 4.0) ──────────────────────────────────────
# Prompts people sent to search-augmented models, with LMArena's primary_intent label.
# Intents that need retrieval map to research; the rest are not used for task type.
RESEARCH_INTENTS = {"Factual Lookup", "Info Synthesis", "Recommendation", "Analysis", "Explanation"}
if len(sys.argv) > 1:
    import pyarrow.parquet as pq

    print("search-arena-24k")
    t = pq.read_table(sys.argv[1], columns=["messages_a", "primary_intent", "languages", "turn"])
    intents = {}
    for msgs, intent, langs, turn in zip(*(t.column(n).to_pylist() for n in ["messages_a", "primary_intent", "languages", "turn"])):
        intents[intent] = intents.get(intent, 0) + 1
        if langs and "English" not in langs and "en" not in langs:
            continue
        first = next((m for m in msgs if m.get("role") == "user"), None)
        if first and intent in RESEARCH_INTENTS:
            add(first.get("content") or "", "research", None, "search-arena-24k")
    print("  intents:", sorted(intents.items(), key=lambda x: -x[1]))

# ── MATH (MIT) ────────────────────────────────────────────────────────────────
# Competition problems with the dataset's own difficulty "Level 1".."Level 5" → complexity.
print("hendrycks_math")
for cfg in ["algebra", "counting_and_probability", "geometry", "intermediate_algebra", "number_theory", "prealgebra", "precalculus"]:
    for r in sample_pages("EleutherAI/hendrycks_math", cfg, "train", 1000, 1):
        lvl = r.get("level", "")
        if lvl.startswith("Level ") and lvl[6:].isdigit():
            add(r["problem"], "math", int(lvl[6:]), "hendrycks-math")

# ── GSM8K (MIT) ───────────────────────────────────────────────────────────────
# Grade-school word problems needing 2-8 steps: math, complexity 2.
print("gsm8k")
for r in sample_pages("openai/gsm8k", "main", "train", 7400, 2):
    add(r["question"], "math", 2, "gsm8k")

# ── MBPP (CC BY 4.0) ──────────────────────────────────────────────────────────
# "Mostly Basic Python Problems", entry-level by design: coding, complexity 2.
print("mbpp")
for r in sample_pages("google-research-datasets/mbpp", "full", "train", 370, 2):
    add(r["text"], "coding", 2, "mbpp")

# Balance: no source may flood a class. Keep at most CAP rows per (task, source).
CAP = 260
rng.shuffle(out)
seen, kept = {}, []
for row in out:
    key = (row["task"], row["src"])
    seen[key] = seen.get(key, 0) + 1
    if seen[key] <= CAP:
        kept.append(row)

counts = {}
for row in kept:
    counts[(row["task"], row["src"])] = counts.get((row["task"], row["src"]), 0) + 1
for k, v in sorted(counts.items(), key=lambda x: str(x[0])):
    print(f"  {k}: {v}")
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(kept, f, ensure_ascii=False, indent=0)
print(f"Wrote {len(kept)} rows to {OUT}")
