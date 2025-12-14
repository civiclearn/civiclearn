import json

INPUT_FILE = "questions.json"          # your current CR bank
OUTPUT_FILE = "questions.normalized.json"

with open(INPUT_FILE, "r", encoding="utf-8") as f:
    data = json.load(f)

normalized = []

for item in data:
    # Case 1: already CSP-style → keep as-is
    if "q" in item and isinstance(item.get("options"), list) and isinstance(item["options"][0], dict):
        normalized.append(item)
        continue

    # Case 2: old CR format → convert
    question_text = item.get("question", "").strip()
    raw_options = item.get("options", [])
    correct_index = item.get("correct_index")

    options = []
    for i, opt in enumerate(raw_options):
        options.append({
            "t": opt.strip(),
            "correct": i == correct_index
        })

    converted = {
        "id": item.get("id"),
        "q": question_text,
        "options": options,
        "type": item.get("type", "knowledge")
    }

    # Preserve topic if present
    if "topic" in item:
        converted["topic"] = item["topic"]

    # Preserve feedback if present
    if "feedback" in item:
        converted["feedback"] = item["feedback"]

    normalized.append(converted)

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(normalized, f, ensure_ascii=False, indent=2)

print(f"Normalized {len(normalized)} questions → {OUTPUT_FILE}")
