"""Execute the general Tcl lesson example when a Tcl interpreter is available."""

import shutil
import subprocess
from pathlib import Path

import pytest

PROJECT = Path(__file__).resolve().parents[1]


@pytest.mark.parametrize(
    ("items", "expected"),
    [
        ("[list 2 4 6]", "count = 3\nmean = 4.0\n"),
        ("[list 2 3]", "count = 2\nmean = 2.5\n"),
        ("[list]", "empty list: mean is undefined\n"),
    ],
)
def test_general_tcl_lesson(items, expected):
    interpreter = shutil.which("tclsh")
    if interpreter is None:
        pytest.skip("tclsh is not installed")
    lesson = (PROJECT / "docs/course/session-07.fa.md").read_text()
    section = lesson.split("## تمرین گام‌به‌گام Tcl بدون نصب VMD", 1)[1]
    code = section.split("```tcl\n", 1)[1].split("\n```", 1)[0]
    code = code.replace("[list 2 4 6]", items, 1)
    result = subprocess.run(
        [interpreter], input=code, text=True, capture_output=True, check=True, timeout=5
    )
    assert result.stdout == expected
    assert result.stderr == ""


def test_tcl_braces_and_quotes_example():
    interpreter = shutil.which("tclsh")
    if interpreter is None:
        pytest.skip("tclsh is not installed")
    result = subprocess.run(
        [interpreter],
        input='set x 3\nputs {$x}\nputs "$x"\nputs [expr {2 + 3}]\n',
        text=True,
        capture_output=True,
        check=True,
        timeout=5,
    )
    assert result.stdout == "$x\n3\n5\n"
    assert not result.stderr
