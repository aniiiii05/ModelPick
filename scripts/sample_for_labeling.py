"""
Samples real user prompts for labelling in ModelPick's own taxonomy (task type + complexity 1-5).

The public datasets' own tags don't line up with ModelPick's seven tasks (LMArena's "creative
generation" holds coding requests; "no tags" holds titles and fragments), so their labels cap any
classifier trained on them. These prompts are labelled with the same rubric the app's LLM reader
uses (src/lib/extract.ts) and stored in src/data/training/silver.json.

Sources are pooled by LMArena's own tags only to spread the sample across kinds of task; the
labeller decides each label.

Usage:
  python scripts/sample_for_labeling.py OUT_DIR --arena SHARD [SHARD ...] --search SEARCH_PARQUET
      [--exclude silver.json] [--start-id N] [--want code=550,math=300,creative=450,other=1100,search=600]
Writes OUT_DIR/batch-N.json files of {id, t}, 500 prompts each.

Waves used for silver.json:
  1. seed 1029, shards 0000+0003, default --want, ids 0-2999
  2. seed 2026, shards 0000+0001+0003+0005, --exclude silver.json --start-id 3000
     --want code=1700,math=1200,creative=1200,other=2300,search=1600, ids 3000-10999
"""

import argparse
import json
import random

import pyarrow.parquet as pq

from credential_filter import has_secret

ap = argparse.ArgumentParser()
ap.add_argument("out_dir")
ap.add_argument("--arena", nargs="+", default=[])
ap.add_argument("--search")
ap.add_argument("--exclude")
ap.add_argument("--start-id", type=int, default=0)
ap.add_argument("--seed", type=int, default=1029)
ap.add_argument("--want", default="code=550,math=300,creative=450,other=1100,search=600")
args = ap.parse_args()

rng = random.Random(args.seed)
MAX_CHARS = 400
BATCH = 500


def clean(text):
    return " ".join((text or "").split())[:MAX_CHARS]


def usable(text):
    words = [w for w in text.split() if any(c.isalpha() for c in w)]
    return len(words) >= 2 and sum(c.isascii() for c in text) / max(1, len(text)) > 0.9 and not has_secret(text)


seen = set()
if args.exclude:
    seen = {r["t"].lower() for r in json.load(open(args.exclude, encoding="utf-8"))}

pools = {"code": [], "math": [], "creative": [], "other": [], "search": []}
for path in args.arena:
    t = pq.read_table(path, columns=["full_conversation", "category_tag", "is_code", "language"])
    for conv, tags, is_code, lang in zip(*(t.column(n).to_pylist() for n in ["full_conversation", "category_tag", "is_code", "language"])):
        if lang != "en" or not conv:
            continue
        text = clean(" ".join(p.get("text") or "" for p in conv[0]["user"]["content"] if p.get("type") == "text"))
        if not usable(text):
            continue
        tags = tags or {}
        if (tags.get("math_v0.1") or {}).get("math"):
            pools["math"].append(text)
        elif is_code:
            pools["code"].append(text)
        elif (tags.get("creative_writing_v0.1") or {}).get("creative_writing"):
            pools["creative"].append(text)
        else:
            pools["other"].append(text)

if args.search:
    t = pq.read_table(args.search, columns=["messages_a", "languages"])
    for msgs, langs in zip(t.column("messages_a").to_pylist(), t.column("languages").to_pylist()):
        if langs and "English" not in langs and "en" not in langs:
            continue
        first = next((m for m in msgs if m.get("role") == "user"), None)
        text = clean(first.get("content") if first else "")
        if usable(text):
            pools["search"].append(text)

want = {k: int(v) for k, v in (kv.split("=") for kv in args.want.split(","))}
picked = []
for name, n in want.items():
    pool = pools[name]
    rng.shuffle(pool)
    taken = 0
    for text in pool:
        if taken == n:
            break
        if text.lower() in seen:
            continue
        seen.add(text.lower())
        picked.append(text)
        taken += 1
    print(f"{name}: pool {len(pool)}, took {taken}")

rng.shuffle(picked)
for b in range(0, len(picked), BATCH):
    rows = [{"id": args.start_id + b + i, "t": t} for i, t in enumerate(picked[b : b + BATCH])]
    with open(f"{args.out_dir}/batch-{(args.start_id + b) // BATCH}.json", "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=0)
print(f"{len(picked)} prompts in {(len(picked) + BATCH - 1) // BATCH} batches")
