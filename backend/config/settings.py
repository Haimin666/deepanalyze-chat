"""
配置模块 - 集中管理所有配置项
"""
import os

# API 配置
API_BASE = os.getenv("API_BASE", "http://localhost:8000/v1")
MODEL_PATH = os.getenv("MODEL_PATH", "DeepAnalyze-8B")

# 工作区配置
WORKSPACE_BASE_DIR = os.getenv("WORKSPACE_BASE_DIR", "workspace")

# HTTP 文件服务器配置
HTTP_SERVER_PORT = int(os.getenv("HTTP_SERVER_PORT", "8100"))
HTTP_SERVER_BASE = os.getenv("HTTP_SERVER_BASE", f"http://localhost:{HTTP_SERVER_PORT}")

# API 服务配置
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8200"))

# 代码执行配置
CODE_EXECUTION_TIMEOUT = int(os.getenv("CODE_EXECUTION_TIMEOUT", "120"))

# Matplotlib 中文支持
CHINESE_MATPLOT_STR = """
import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif'] = ['SimHei']
plt.rcParams['axes.unicode_minus'] = False
"""

# 用户认证配置 - 只保留 admin 用户
PRESET_USERS = [
    {
        "id": "1",
        "username": "admin",
        "name": "Admin User",
        "role": "admin",
        "password": "admin123",
        "createdAt": "2024-01-01T00:00:00Z",
    },
]
