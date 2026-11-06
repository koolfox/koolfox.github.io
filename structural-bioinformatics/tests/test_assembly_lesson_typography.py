import unicodedata
from pathlib import Path


def test_new_assembly_teaching_has_plain_persian():
    root = Path(__file__).resolve().parents[1]
    lesson = (root / "docs/course/session-12.fa.md").read_text()
    added_lesson = lesson.split("## از فایل تا انتخاب در VMD", 1)[1].split(
        "## کار عملی: کنترل یک مسیر پردازش", 1
    )[0]
    slides = (root / "assets/course-slides.js").read_text()
    added_exercise = slides.split("function assemblyExercise()", 1)[1].split(
        "function reverseComplementExercise()", 1
    )[0]
    forbidden = set("ءأإؤئۀةٔٔ")
    for character in added_lesson + added_exercise:
        assert character not in forbidden
        assert not ("\u064b" <= character <= "\u065f")
        assert not ("\u0670" == character or "\u06d6" <= character <= "\u06ed")
        assert not (
            unicodedata.combining(character) and "ARABIC" in unicodedata.name(character, "")
        )
