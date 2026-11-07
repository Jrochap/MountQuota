#!/usr/bin/env python3
"""Local dev server for MOUNT QUOTA (no caching, so edits show up on reload)."""
import http.server, socketserver, os, sys, webbrowser
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8642
os.chdir(os.path.dirname(os.path.abspath(__file__)))
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()
    def log_message(self, *a): pass
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(('127.0.0.1', PORT), H) as s:
    url = f'http://127.0.0.1:{PORT}/'
    print(f'MOUNT QUOTA running at {url}  (Ctrl+C to stop)')
    if '--open' in sys.argv: webbrowser.open(url)
    s.serve_forever()
