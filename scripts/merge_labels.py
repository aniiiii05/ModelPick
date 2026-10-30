"""
Merges labelled batches (from sample_for_labeling.py + RUBRIC.md) into src/data/training/silver.json.
Usage: python scripts/merge_labels.py LABEL_DIR
"""
import glob
import json
import re
import sys

from credential_filter import has_secret

d = sys.argv[1]
prompts = {r["id"]: r["t"] for f in glob.glob(f"{d}/batch-*.json") for r in json.load(open(f, encoding="utf-8"))}
labels = {}
for f in sorted(glob.glob(f"{d}/labels-*.json")):
    for r in json.load(open(f, encoding="utf-8")):
        labels[r["id"]] = r

TASKS = {"coding", "math", "reasoning", "writing", "research", "vision", "chat"}
# "vision" means understanding an image the person supplies. Labellers split image *generation*
# requests between vision and chat, so a vision label only stands when the prompt refers to a supplied image.
SUPPLIED = re.compile(r"\b(this|the|my|attached|uploaded|above|following)\s+(image|photo|picture|screenshot|pic|scan|diagram|chart)\b|\b(in|from) (the|this) (image|photo|picture|screenshot)\b", re.I)

out, dropped, bad, secret = [], 0, 0, 0
for i, t in prompts.items():
    if has_secret(t):
        secret += 1
        continue
    r = labels.get(i)
    if not r or r.get("task") not in TASKS or not isinstance(r.get("c"), int) or not 1 <= r["c"] <= 5:
        bad += 1
        continue
    if r["task"] == "vision" and not SUPPLIED.search(t):
        dropped += 1
        continue
    out.append({"t": t, "task": r["task"], "c": r["c"], "src": "arena-silver"})

counts = {}
for r in out:
    counts[r["task"]] = counts.get(r["task"], 0) + 1
print(f"prompts {len(prompts)}, labelled {len(labels)}, missing/invalid {bad}, vision without a supplied image {dropped}, containing a credential {secret}")
print("kept", len(out), dict(sorted(counts.items(), key=lambda x: -x[1])))
json.dump(out, open("src/data/training/silver.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
