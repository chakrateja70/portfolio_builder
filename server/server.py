"""
server.py - Main entry point for the Portfolio Builder web server

This uses Python's built-in http.server module (no Flask or FastAPI needed).
It starts an HTTP server on port 8080 and forwards all requests to router.py.

How to run:
    cd server
    python server.py

Then open: http://localhost:8080
"""

import sys
import os
from http.server import HTTPServer, BaseHTTPRequestHandler

# Allow importing other modules from the same 'server' folder
sys.path.insert(0, os.path.dirname(__file__))

from router import route_request

# ─── Server port ──────────────────────────────────────────────────────────────
PORT = 8080


class PortfolioHandler(BaseHTTPRequestHandler):
    """
    Handles every incoming HTTP request.
    We override the do_GET, do_POST, do_DELETE, do_OPTIONS methods.
    Each method simply calls route_request() from router.py.
    """

    def do_GET(self):
        route_request(self, "GET", self.path)

    def do_POST(self):
        route_request(self, "POST", self.path)

    def do_DELETE(self):
        route_request(self, "DELETE", self.path)

    def do_OPTIONS(self):
        # OPTIONS is used by browsers before cross-origin requests (CORS preflight)
        route_request(self, "OPTIONS", self.path)

    def log_message(self, format, *args):
        """
        Override the default log to show cleaner output in the terminal.
        """
        print(f"[REQUEST] {self.address_string()} → {args[0]}")


def run():
    """Start the HTTP server."""
    server = HTTPServer(("0.0.0.0", PORT), PortfolioHandler)
    print(f"")
    print(f"  🚀 Portfolio Builder server started!")
    print(f"  Open your browser at: http://localhost:{PORT}")
    print(f"  Press Ctrl+C to stop the server.")
    print(f"")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Server stopped.")
        server.server_close()


if __name__ == "__main__":
    run()
