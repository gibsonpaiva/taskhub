#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
TASKHUB — GESTÃO DE TAREFAS
Servidor Web Estático (Dados agora no Supabase)
==============================================================================
"""

import http.server
import socketserver
import os
import sys
import webbrowser
import threading
import mimetypes

PORT = 5176
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

mimetypes.init()
mimetypes.add_type("application/javascript", ".js")
mimetypes.add_type("application/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")
mimetypes.add_type("image/svg+xml", ".svg")
mimetypes.add_type("application/json", ".json")


class TaskHubHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Servir apenas arquivos estáticos (HTML, CSS, JS)
        # Dados agora vêm direto do Supabase
        super().do_GET()


def run_server():
    socketserver.TCPServer.allow_reuse_address = True
    server_address = ("", PORT)

    try:
        httpd = socketserver.TCPServer(server_address, TaskHubHandler)
    except OSError as e:
        print(f"[Aviso] Porta {PORT} ocupada: {e}. Tentando 5177...")
        httpd = socketserver.TCPServer(("", 5177), TaskHubHandler)

    active_port = httpd.server_address[1]
    url = f"http://localhost:{active_port}"

    print("=" * 72)
    print("  TASKHUB — GESTÃO DE TAREFAS")
    print("=" * 72)
    print(f"  -> Servidor ativo em: {url}")
    print(f"  -> Dados: Supabase (cloud)")
    print(f"  -> Anexos: Supabase Storage")
    print("=" * 72)

    # Abre o navegador automaticamente em nova thread se chamado diretamente
    if "--no-browser" not in sys.argv:
        def open_browser():
            import time
            time.sleep(0.8)
            webbrowser.open(url)
        threading.Thread(target=open_browser, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[TaskHub] Encerrando servidor gracefully...")
        httpd.shutdown()


if __name__ == "__main__":
    run_server()
