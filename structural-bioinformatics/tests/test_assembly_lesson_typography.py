import unicodedata
from pathlib import Path


def test_new_course_teaching_has_plain_persian():
    root = Path(__file__).resolve().parents[1]
    lesson = (root / "docs/course/session-12.fa.md").read_text()
    added_lesson = lesson.split("## از فایل تا انتخاب در VMD", 1)[1].split(
        "## کار عملی: کنترل یک مسیر پردازش", 1
    )[0]
    slides = (root / "assets/course-slides.js").read_text()
    added_exercises = slides.split("function structureInterpretationExercise()", 1)[1].split(
        "function reverseComplementExercise()", 1
    )[0]
    lesson_11 = (root / "docs/course/session-11.fa.md").read_text()
    added_lesson_11 = lesson_11.split("در اسلاید تعاملی همین مبحث،", 1)[1].split("\n", 1)[0]
    forbidden = set("\u0621\u0623\u0625\u0624\u0626\u06c0\u0629\u0654")
    for character in added_lesson + added_lesson_11 + added_exercises:
        assert character not in forbidden
        assert not ("\u064b" <= character <= "\u065f")
        assert not ("\u0670" == character or "\u06d6" <= character <= "\u06ed")
        assert not (
            unicodedata.combining(character) and "ARABIC" in unicodedata.name(character, "")
        )
