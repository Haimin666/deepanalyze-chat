"""
HTTP 文件服务器
"""
import os
import socketserver
import threading
import http.server
from functools import partial

from config.settings import WORKSPACE_BASE_DIR, HTTP_SERVER_PORT


def start_http_server():
    """启动HTTP文件服务器"""
    os.makedirs(WORKSPACE_BASE_DIR, exist_ok=True)
    handler = partial(
        http.server.SimpleHTTPRequestHandler,
        directory=WORKSPACE_BASE_DIR
    )

    with socketserver.TCPServer(("", HTTP_SERVER_PORT), handler) as httpd:
        print(f"HTTP Server serving {WORKSPACE_BASE_DIR} at port {HTTP_SERVER_PORT}")
        httpd.serve_forever()


def start_http_server_thread():
    """在后台线程启动HTTP服务器"""
    thread = threading.Thread(target=start_http_server, daemon=True)
    thread.start()
    return thread
