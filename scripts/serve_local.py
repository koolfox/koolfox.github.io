"""Serve the assembled public notebook locally, without third-party dependencies."""

import argparse
import errno
import functools
import tempfile
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from build_pages import build_site


class PreviewHandler(SimpleHTTPRequestHandler):
    def log_message(self, _format, *_args):
        """Keep normal asset requests out of the classroom console."""


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--port",
        type=int,
        default=8787,
        help="Preferred local port; 0 selects a free port",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Print the URL without opening a browser",
    )
    args = parser.parse_args()
    if not 0 <= args.port <= 65535:
        parser.error("Port must be between 0 and 65535")
    repository = Path(__file__).resolve().parents[1]
    with tempfile.TemporaryDirectory(prefix="research-preview-") as temporary:
        site = build_site(
            repository,
            Path(temporary) / "pages",
            projects=("structural-bioinformatics",),
        )
        handler = functools.partial(PreviewHandler, directory=str(site))
        ports = [0] if args.port == 0 else range(args.port, min(args.port + 10, 65536))
        server = None
        for port in ports:
            try:
                server = ThreadingHTTPServer(("127.0.0.1", port), handler)
                break
            except OSError as error:
                if error.errno != errno.EADDRINUSE:
                    parser.exit(1, f"Cannot start local preview: {error}\n")
        if server is None:
            parser.exit(1, "Ports are busy; choose another --port value.\n")
        url = f"http://127.0.0.1:{server.server_address[1]}/structural-bioinformatics/"
        presentation = (
            url + "?document=class-presentation.fa.md&chapter=chapter-1#reading"
        )
        print(f"LOCAL_PREVIEW_URL={url}", flush=True)
        print(f"Class presentation: {presentation}", flush=True)
        print(
            "Local assets work offline. Ctrl+C stops the server; restart after source edits.",
            flush=True,
        )
        try:
            if not args.no_browser:
                webbrowser.open(presentation)
            server.serve_forever()
        except KeyboardInterrupt:
            print("\nLocal preview stopped.", flush=True)
        finally:
            server.server_close()


if __name__ == "__main__":
    main()
