#!/usr/bin/env python3
"""Preview the site locally -- like `python -m http.server`, but the browser is
told never to cache anything.

`python -m http.server` sends no cache headers, so browsers keep serving an old
copy of a script, stylesheet or data file for a while after you change it (a
new nav link that "isn't there", reviews that don't show up after the
generator ran). With this server a normal refresh always shows the latest.

    python rama-creations-site/tools/serve.py            # http://localhost:8000
    python rama-creations-site/tools/serve.py --port 8001 --directory some/other/site
"""

from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

SITE_ROOT = Path(__file__).resolve().parent.parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def make_server(directory: Path, port: int) -> ThreadingHTTPServer:
    handler = partial(NoCacheHandler, directory=str(directory))
    return ThreadingHTTPServer(("127.0.0.1", port), handler)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--directory", type=Path, default=SITE_ROOT, help="folder to serve (default: the site)")
    args = parser.parse_args()

    with make_server(args.directory.resolve(), args.port) as server:
        print(f"Serving {args.directory.resolve()} at http://localhost:{args.port}/  (Ctrl+C to stop)")
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print()


if __name__ == "__main__":
    main()
