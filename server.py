#!/usr/bin/env python3
"""
Custom HTTP Server for Frontend
Tự động chuyển hướng đến trang chủ và bảo mật các file nhạy cảm
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Parse the URL
        parsed_path = urlparse(self.path)
        path = parsed_path.path
        
        # Chuyển hướng root đến main/
        if path == '/' or path == '':
            self.send_response(302)
            self.send_header('Location', '/main/')
            self.end_headers()
            return
            
        # Chặn truy cập các file/thư mục nhạy cảm
        forbidden_paths = [
            '/.git', '/.env', '/README', '/.htaccess', 
            '/server.py', '/robots.txt'
        ]
        
        for forbidden in forbidden_paths:
            if path.startswith(forbidden):
                self.send_error(403, "Forbidden")
                return
                
        # Chặn truy cập file .md
        if path.endswith('.md'):
            self.send_error(403, "Forbidden")
            return
            
        # Xử lý bình thường cho các request khác
        super().do_GET()
    
    def log_message(self, format, *args):
        # Custom log format
        print(f"[{self.log_date_time_string()}] {format % args}")

def run_server(port=8000):
    """Chạy server với port được chỉ định"""
    try:
        with socketserver.TCPServer(("", port), CustomHTTPRequestHandler) as httpd:
            print(f"🚀 Server đang chạy tại: http://localhost:{port}")
            print(f"🌐 Hoặc truy cập: http://103.163.118.181:{port}")
            print(f"📁 Thư mục gốc: {os.getcwd()}")
            print("🛑 Nhấn Ctrl+C để dừng server")
            print("-" * 50)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server đã được dừng!")
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"❌ Port {port} đã được sử dụng. Thử port khác:")
            print(f"   python3 server.py {port + 1}")
        else:
            print(f"❌ Lỗi: {e}")

if __name__ == "__main__":
    # Lấy port từ command line hoặc dùng mặc định 8000
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("❌ Port phải là số nguyên!")
            sys.exit(1)
    
    run_server(port)