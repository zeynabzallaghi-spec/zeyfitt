#!/usr/bin/env python3
"""Temporary diagnostic: dump every request header the public gateway
chain actually delivers to a sandbox port. Routed via the Caddyfile
XTransformPort query trick (?XTransformPort=3001)."""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class Echo(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802
        body = json.dumps(
            {
                "path": self.path,
                "headers": dict(self.headers.items()),
            },
            indent=2,
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):  # silence
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 3001), Echo).serve_forever()
