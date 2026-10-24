"""Build and validate a few-shot prompt; no model or generated answer is used."""
import json

examples = [
    {"text": "I enjoyed this lesson", "label": "positive"},
    {"text": "This lesson was confusing", "label": "negative"},
]
query = "The examples were helpful"
allowed = {"positive", "negative"}
assert all(e["label"] in allowed for e in examples)
assert query not in [e["text"] for e in examples]
prompt = "Classify sentiment. Return JSON with exactly one key: label.\n"
for example in examples:
    prompt += "Example: " + json.dumps(example) + "\n"
prompt += "Input: " + json.dumps(query) + "\nAnswer:"
print(prompt)


def validate_response(raw):
    try:
        answer = json.loads(raw)
    except json.JSONDecodeError:
        return False
    return (isinstance(answer, dict) and set(answer) == {"label"}
            and isinstance(answer["label"], str) and answer["label"] in allowed)


# These are hand-written validator test fixtures, NOT model responses.
fixtures = ['{"label":"positive"}', '{"label":"unknown"}', 'not JSON', '[]']
results = [validate_response(raw) for raw in fixtures]
assert results == [True, False, False, False]
print("Validator tests (not model predictions):", results)
