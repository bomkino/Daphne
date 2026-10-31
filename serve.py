# Dev server for the Daphne prototype: a plain static server that tells the browser never to cache,
# so an edited engine or app is always the one that runs. Usage: python3 serve.py [port] (default 5178).
import functools, http.server, os, sys

class NoCache(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.svg': 'image/svg+xml'}
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

port = int(sys.argv[1]) if len(sys.argv) > 1 else 5178
root = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prototype')
handler = functools.partial(NoCache, directory=root)
http.server.ThreadingHTTPServer(('127.0.0.1', port), handler).serve_forever()
