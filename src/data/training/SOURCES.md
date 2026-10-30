# Training and catalog data sources

Checked 2026-10-29. Rebuild the external set with `python scripts/build_dataset.py <search-arena.parquet>`,
then retrain with `npm run train`. Results land in `metrics.json`.

## Prompt datasets (`external.json`)

| Dataset | License | Used for | How labels map to ModelPick |
|---|---|---|---|
| [lmarena-ai/arena-human-preference-140k](https://huggingface.co/datasets/lmarena-ai/arena-human-preference-140k) | CC BY 4.0 | real user prompts, English | LMArena tags: `math` → math, `is_code` → coding, `creative_writing` → writing; no tag and none of the 7 hard-prompt criteria → chat |
| [lmarena-ai/search-arena-24k](https://huggingface.co/datasets/lmarena-ai/search-arena-24k) | CC BY 4.0 (prompts) | prompts sent to search-augmented models | `primary_intent` Factual Lookup, Info Synthesis, Recommendation, Analysis, Explanation → research |
| [EleutherAI/hendrycks_math](https://huggingface.co/datasets/EleutherAI/hendrycks_math) | MIT | competition math | math; dataset Level 1-5 kept as a complexity label |
| [openai/gsm8k](https://huggingface.co/datasets/openai/gsm8k) | MIT | grade-school word problems | math, complexity 2 |
| [google-research-datasets/mbpp](https://huggingface.co/datasets/google-research-datasets/mbpp) | CC BY 4.0 | entry-level Python tasks | coding, complexity 2 |

At most 260 rows per (task, source); prompts clipped to 700 characters; rows with fewer than four words dropped.

What the data showed:
- External task labels raise accuracy on held-out real user prompts from 47% to 71% (5-fold CV).
  Weighted 20:1 against them, the hand-labelled prompts keep the app's own taxonomy (81% on those).
- External complexity labels (LMArena criteria counts, MATH levels) made difficulty predictions worse
  on the hand-labelled set, so complexity is learned from the hand-labelled prompts only.
- LMArena's text arena data has no image prompts, so vision still rests on the hand-labelled prompts.
- Not used: Dolly 15k (CC BY-SA), No Robots (CC BY-NC), FreshQA (not accessible).

## Rubric-labelled real prompts (`silver.json`)

The datasets' own tags only loosely match ModelPick's seven tasks: LMArena's "creative generation" intent
holds coding requests, and "no tags" holds titles and fragments. A model scored against those tags looks
better than it is: the previous classifier scored 71% against tags but 50% against labels in ModelPick's
own taxonomy.

So 11,000 real English prompts from four LMArena shards and Search Arena (`scripts/sample_for_labeling.py`,
two waves; the script header records the seeds and quotas) were labelled by Claude labellers following one
written rubric, the same task and complexity definitions the app's AI reader uses (`src/lib/extract.ts`).
Sampling was spread across LMArena's coding, maths, creative and untagged pools and Search Arena so every
kind of task is well represented; the labeller decided each label. `scripts/merge_labels.py` checks and
merges them: 10,952 kept (chat 2,766, research 2,482, writing 1,989, coding 1,950, reasoning 915, maths 839,
vision 11). Vision labels were dropped unless the prompt refers to an image the person supplies; real chat
logs hold almost no image prompts, so vision still rests on the hand-labelled set.

Agreement check, 300 of those prompts relabelled blind (`llm-eval.json`):
- A second labeller agreed on the task 90.3% of the time and on difficulty within one step 100%. That is
  the practical ceiling for any classifier on this data.
- A Claude Haiku labeller with the same rubric agreed 85.0% (90.0% on the 271 prompts both reference
  labellers agreed on). This is the accuracy to expect from the app with `ANTHROPIC_API_KEY` set.

Offline models (5-fold CV on the rubric-labelled prompts):
- With the first 2,969 prompts: Naive Bayes 60%, logistic regression 56%, both averaged 60%.
- With all 10,952: Naive Bayes 66%, logistic regression 64%, both averaged 66%. Shipped: both averaged,
  over words seen in at least 10 prompts (65.8% real, 80.2% hand-labelled, difficulty within one step 85%,
  242 KB compressed so it fits a Cloudflare Worker).
- Linear classifiers on sentence embeddings (5-fold CV, same folds), all 10,952 prompts:
  BGE-small 66.5% real / 84.5% hand-labelled; BGE-base 68.3% / 86.5%. On the first 2,969 prompts both
  were about 66% / 87%. BGE-base is the best offline reader measured, 2.5 points over the shipped word
  model on real prompts; using it at runtime would mean calling Cloudflare Workers AI on every request.
- One prompt containing a pasted Mapbox access token was removed (10,951 kept); `scripts/credential_filter.py`
  now drops any prompt matching a credential pattern at sampling, merge and dataset-build time.

## Model data (`../benchmarks.ts`, `../models.ts`, `../plans.ts`)

Each file names its sources at the top. Fields that rest on third-party sites rather than a vendor
page carry a `verify` note (models) or `note` (plans), and the app shows it.
