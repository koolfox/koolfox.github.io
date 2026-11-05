"""Place the repository link in the headers of course-generated pages."""

import re

STAR = ('<a class="course-repo-star" href="https://github.com/koolfox/koolfox.github.io" '
        'target="_blank" rel="noopener noreferrer" '
        'aria-label="ستاره دادن به مخزن پروژه در GitHub، پنجره جدید">ستاره در GitHub</a>')
STYLE = '''<style>.course-repo-star{display:inline-flex;align-items:center;justify-content:center;min-height:30px;padding:3px 9px;border:1px solid #c8d5e9;border-radius:6px;background:#fff;color:#1749ad!important;font:600 11px/1.4 Arad,sans-serif;text-decoration:none;white-space:nowrap;flex:none}.course-repo-star:hover{border-color:#245bdf;background:#edf3ff}.course-repo-star:focus-visible{outline:3px solid #245bdf;outline-offset:2px}.reader-sections{flex-wrap:wrap}.host-header nav a.course-repo-star{display:inline-flex}.host-header nav{flex-wrap:wrap}.repo-star-header{display:flex;justify-content:flex-end;padding:6px 16px}.film-embedded .repo-star-header{display:none}@media print{.course-repo-star,.repo-star-header{display:none}}</style>'''


def add_course_star(html):
    if 'class="course-repo-star"' in html:
        return html
    if '<header class="reader-header">' in html:
        start = html.index('<header class="reader-header">')
        end = html.index('</nav>', start)
        html = html[:end] + STAR + html[end:]
    elif '<header class="site-header">' in html:
        start = html.index('<header class="site-header">')
        end = html.index('</div></header>', start)
        html = html[:end] + STAR + html[end:]
    elif '<header class="deck-toolbar">' in html:
        start = html.index('<header class="deck-toolbar">')
        end = html.index('</div></header>', start)
        html = html[:end] + STAR + html[end:]
    elif '<header class="host-header">' in html:
        start = html.index('<header class="host-header">')
        end = html.index('</nav>', start)
        html = html[:end] + STAR + html[end:]
    else:
        match = re.search(r'<header(?:\s[^>]*)?>', html)
        if match:
            end = html.index('</header>', match.end())
            html = html[:end] + STAR + html[end:]
        elif '<main' in html:
            html = html.replace('<main', '<header class="repo-star-header">' + STAR + '</header><main', 1)
        else:
            return html
    if '</head>' in html:
        return html.replace('</head>', STYLE + '</head>', 1)
    return html.replace('<main', STYLE + '<main', 1)
