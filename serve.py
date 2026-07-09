#!/usr/bin/env python3
"""Local static server for the offline Valley of Mines map.

A local HTTP server is required (rather than opening index.html directly
via file://) because the page fetches its location data with a root-relative
request ("/api/v1/maps/945/data"), which only resolves correctly against an
http:// origin.

Usage:
    python3 serve.py [port]      # default port 8000
Then open http://localhost:8000/ in your browser.
"""
import http.server
import os
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def guess_type(self, path):
        if path.endswith(os.sep + "data") or path == "data":
            return "application/json"
        return super().guess_type(path)


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Serving Valley of Mines offline map at http://localhost:{PORT}/")
        print("Press Ctrl+C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass
