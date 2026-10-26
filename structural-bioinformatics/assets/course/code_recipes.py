"""Editable, explicit Python recipes and views of independently computed controls."""

import json
from textwrap import dedent

RECIPES = {
    "sequence": """
complement = parameters["dna"].upper().translate(str.maketrans("ACGT", "TGCA"))
dna = parameters["dna"].upper()
if not dna or set(dna) - set("ACGT"):
    raise ValueError("Use unambiguous DNA bases A/C/G/T")
counts = {base: dna.count(base) for base in "ACGT"}
result = {
    "metrics": {"length": len(dna), "gc_percent": 100 * (counts["G"] + counts["C"]) / len(dna)},
    "plot": {"xlabel": "Base index: A, C, G, T", "ylabel": "Count", "series": [
        {"name": "Counts", "points": [[i, counts[b]] for i, b in enumerate("ACGT")], "kind": "bar"}
    ]},
    "table": {"columns": ["Strand", "Sequence"], "rows": [
        ["DNA 5'-3'", dna], ["Complement 3'-5'", complement],
        ["Reverse complement 5'-3'", complement[::-1]], ["Coding-strand RNA", dna.replace("T", "U")]
    ]}
}
print("Reverse complement:", complement[::-1])
""",
    "geometry": """
import numpy as np

fixed = np.array(inputs["points"], dtype=float)
center = fixed.mean(axis=0)
a = np.deg2rad(parameters["angle"])
c, s = np.cos(a), np.sin(a)
rotation = np.array([[c, s, 0], [-s, c, 0], [0, 0, 1]])
moving = (fixed - center) @ rotation + center + [parameters["shift"], 0, 0]
moving[20, 0] += parameters["deformation"]  # author residue A:21

# Kabsch: preserve handedness; do not fit a mirror image.
mc = moving.mean(axis=0)
u, singular_values, vt = np.linalg.svd((moving - mc).T @ (fixed - center))
correction = np.diag([1.0, 1.0, np.linalg.det(u @ vt)])
fitted = (moving - mc) @ (u @ correction @ vt) + center

def rmsd(a, b):
    return float(np.sqrt(np.mean(np.sum((a - b)**2, axis=1))))

def rg(points):
    return float(np.sqrt(np.mean(np.sum((points - points.mean(axis=0))**2, axis=1))))

result = {
    "metrics": {"raw_rmsd_A": rmsd(moving, fixed), "fitted_rmsd_A": rmsd(fitted, fixed),
                "reference_rg_A": rg(fixed), "moving_rg_A": rg(moving)},
    "plot": {"xlabel": "x (angstrom)", "ylabel": "y (angstrom)", "equal_aspect": True,
             "series": [{"name": "Reference", "points": fixed[:, :2].tolist()},
                        {"name": "Fitted", "points": fitted[:, :2].tolist()}]}
}
print("C-alpha atoms:", len(fixed), "source SHA256:", inputs["source_sha256"])
""",
    "energy": """
import math

delta = parameters["delta"]  # (G_B - G_A) / kBT, dimensionless
ratio = math.exp(-delta)
p_b = ratio / (1 + ratio)
curve = [[x / 20, 1 / (1 + math.exp(x / 20))] for x in range(-120, 121)]
result = {
    "metrics": {"probability_b": p_b, "ratio_b_to_a": ratio},
    "plot": {"xlabel": "(G_B - G_A) / kBT", "ylabel": "Probability of B",
             "series": [{"name": "Two-state model", "points": curve}]}
}
print("P(A) + P(B) =", (1 - p_b) + p_b)
""",
    "minimization": """
def energy(x):
    return x**2

def gradient(x):
    return 2 * x

x = parameters["start"]
positions, energies = [x], [energy(x)]
for step in range(parameters["steps"]):
    x = x - parameters["rate"] * gradient(x)
    positions.append(x)
    energies.append(energy(x))

result = {
    "metrics": {"final_x": x, "final_energy": energies[-1]},
    "plot": {"xlabel": "Optimization step (not time)", "ylabel": "x",
             "series": [{"name": "Position", "points": [[i, v] for i, v in enumerate(positions)]}]},
    "table": {"columns": ["Step", "x", "U"],
              "rows": [[i, v, energies[i]] for i, v in enumerate(positions)]}
}
print("Energy change:", energies[-1] - energies[0])
""",
    "sampling": """
import math
import random

rng = random.Random(parameters["seed"])
rho, noise = parameters["correlation"], parameters["noise"]
residual = rng.gauss(0, noise)
values = []
for i in range(200):
    if i:
        residual = rho * residual + rng.gauss(0, noise * math.sqrt(1 - rho**2))
    values.append(1 + (parameters["shift"] if i >= 100 else 0) + residual)
block = parameters["block"]
means = [sum(values[i:i+block]) / block for i in range(0, len(values), block)]
result = {
    "metrics": {"mean": sum(values) / len(values), "min_block_mean": min(means),
                "max_block_mean": max(means)},
    "plot": {"xlabel": "Sample index", "ylabel": "Synthetic value",
             "series": [{"name": "Samples", "points": [[i+1, v] for i, v in enumerate(values)]}]},
    "table": {"columns": ["Block", "Mean"], "rows": [[i+1, v] for i, v in enumerate(means)]}
}
print("Consecutive blocks:", means)
""",
    "graph": """
import numpy as np

if parameters["dataset"] == "toy":
    points = np.array([[0,0,0], [4,0,0], [8,0,0], [4,3,0]], dtype=float)
    labels = list("ABCD")
else:
    points = np.array(inputs["points"], dtype=float)
    labels = inputs["labels"]

edges = []
for i in range(len(points)):
    for j in range(i + 1, len(points)):
        if parameters["dataset"] == "protein" and j - i <= parameters["exclude"]:
            continue
        distance = float(np.linalg.norm(points[i] - points[j]))
        if distance <= parameters["cutoff"]:
            edges.append((i, j, distance))
degrees = [sum(i in e[:2] for e in edges) for i in range(len(points))]
selected = labels.index(parameters["selected"])
neighbors = [[labels[j if i == selected else i], d] for i, j, d in edges if selected in (i,j)]
result = {
    "metrics": {"node_count": len(points), "edge_count": len(edges),
                "selected_degree": len(neighbors)},
    "plot": {"xlabel": "Node index", "ylabel": "Degree",
             "series": [{"name": "Degree", "points": [[i, d] for i, d in enumerate(degrees)],
                         "kind": "scatter"}]},
    "table": {"columns": ["Neighbor", "Distance (angstrom)"], "rows": neighbors}
}
print("Edges:", len(edges), "maximum degree:", max(degrees))
""",
}

# Name, type/unit, meaning. Keys are the exact Python names, including aliases from UI controls.
PARAMETERS = {
    "sequence": [("dna", "str; 5′→3′", "توالی فرضی رشتهٔ کدکننده")],
    "geometry": [
        ("shift", "float; Å", "انتقال در راستای x"),
        ("angle", "float; degree", "چرخش صلب حول z"),
        ("deformation", "float; Å", "تغییر مختصات اتم A:21"),
    ],
    "energy": [("delta", "float; ΔG/kBT", "اختلاف انرژی آزاد B منهای A")],
    "minimization": [
        ("start", "float", "مقدار آغازین x"),
        ("rate", "float", "اندازهٔ گام"),
        ("steps", "int", "تعداد تکرار الگوریتم"),
    ],
    "sampling": [
        ("shift", "float", "افزایش میانگین نیمهٔ دوم؛ mean_shift در کنترل‌ها"),
        ("noise", "float", "انحراف معیار نویز"),
        ("correlation", "float; ρ", "ضریب AR(1)"),
        ("seed", "int", "بذر مولد"),
        ("block", "int", "تعداد نمونه در هر بلوک"),
    ],
    "graph": [
        ("dataset", "str: toy/protein", "ورودی چهارگره‌ای یا Cαهای 1UBQ"),
        ("cutoff", "float; Å", "آستانهٔ فاصلهٔ سه‌بعدی"),
        ("exclude", "int", "حذف نزدیک‌های توالی در ورودی پروتئین"),
        ("selected", "str", "برچسب گره انتخاب‌شده؛ node در کنترل‌ها"),
    ],
}
CHALLENGES = {
    "sequence": (
        "یک پنجرهٔ لغزان برای درصد GC بساز و توضیح بده چرا GC به‌تنهایی "
        "بیان یا ساختار RNA را تعیین نمی‌کند."
    ),
    "geometry": (
        "هم‌ترازی را با ۳۰ اتم اول انجام بده ولی RMSD را روی تمام ۷۶ اتم "
        "بسنج؛ انتخاب اتم‌های برازش و ارزیابی چه اثری دارد؟"
    ),
    "energy": (
        "مدل را به سه حالت با انرژی آزاد بی‌بُعد مشخص گسترش بده؛ احتمال‌ها "
        "را نرمال کن و جمع آن‌ها را بررسی کن."
    ),
    "minimization": (
        "تابع را به (x²−1)² و مشتق را به 4x(x²−1) تغییر بده. با start=2 و "
        "rate=0.05 اثر مقدار اولیه را بررسی کن."
    ),
    "sampling": (
        "تعداد نمونه‌ها را بیشتر کن و میانگین بلوک‌های چند طول را مقایسه "
        "کن؛ از روی تعداد نمونه به‌تنهایی استقلال را نتیجه نگیر."
    ),
    "graph": (
        "در چهار نقطه، شرط <= را به < تبدیل کن و cutoff=5 بگذار. سپس در "
        "پروتئین، درجه را با و بدون حذف نزدیک‌های توالی مقایسه کن."
    ),
}


def template(mode, parameters):
    prefix = "# PARAMETERS BEGIN\nparameters = __PARAMETERS__\n# PARAMETERS END\n\n"
    return (prefix + dedent(RECIPES[mode]).lstrip()).replace(
        "__PARAMETERS__", json.dumps(parameters, ensure_ascii=False, indent=4)
    )


def reference_view(state):
    """Project the trusted engine to the same named metrics as the editable recipe."""
    mode = state["mode"]
    if mode == "sequence":
        metrics = {"length": state["length"], "gc_percent": state["gc_percent"]}
    elif mode == "geometry":
        metrics = {
            "raw_rmsd_A": state["raw_rmsd"],
            "fitted_rmsd_A": state["fitted_rmsd"],
            "reference_rg_A": state["reference_rg"],
            "moving_rg_A": state["moving_rg"],
        }
    elif mode == "energy":
        metrics = {"probability_b": state["probability_b"], "ratio_b_to_a": state["ratio"]}
    elif mode == "minimization":
        metrics = {"final_x": state["positions"][-1], "final_energy": state["energies"][-1]}
    elif mode == "sampling":
        metrics = {
            "mean": state["mean"],
            "min_block_mean": min(state["block_means"]),
            "max_block_mean": max(state["block_means"]),
        }
    else:
        metrics = {
            "node_count": len(state["labels"]),
            "edge_count": len(state["edges"]),
            "selected_degree": len(state["neighbors"]),
        }
    return {"metrics": metrics, "config": state["config"]}


if __name__ == "__main__":
    from pathlib import Path

    payload = {
        mode: {
            "body": dedent(body).lstrip(),
            "parameters": PARAMETERS[mode],
            "challenge": CHALLENGES[mode],
        }
        for mode, body in RECIPES.items()
    }
    Path(__file__).with_name("code-recipes.json").write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    )
