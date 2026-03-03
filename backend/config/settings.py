"""
配置模块 - 集中管理所有配置项
支持从环境变量和 .env 文件读取配置
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# 加载 .env 文件
env_path = Path(__file__).parent.parent / ".env"
load_dotenv(env_path)


def get_env_int(key: str, default: int) -> int:
    """获取整数环境变量"""
    try:
        return int(os.getenv(key, str(default)))
    except ValueError:
        return default


def get_env_bool(key: str, default: bool) -> bool:
    """获取布尔环境变量"""
    return os.getenv(key, str(default).lower()).lower() == "true"


# ============================================
# Database Configuration
# ============================================
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = get_env_int("DB_PORT", 3306)
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "deepanalyze")

# Database URL
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}?charset=utf8mb4"

# ============================================
# JWT Configuration
# ============================================
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "26f04e88fe5ec70117d21e3b40646a975fb1c4bd7c79313e712c70e6f8bebd60")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS = get_env_int("JWT_EXPIRE_HOURS", 24)

# ============================================
# API Server Configuration
# ============================================
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = get_env_int("API_PORT", 8200)

# ============================================
# File Server Configuration
# ============================================
HTTP_SERVER_PORT = get_env_int("HTTP_SERVER_PORT", 8100)
HTTP_SERVER_BASE = os.getenv("HTTP_SERVER_BASE", f"http://localhost:{HTTP_SERVER_PORT}")

# ============================================
# Workspace Configuration
# ============================================
WORKSPACE_BASE_DIR = os.getenv("WORKSPACE_BASE_DIR", "workspace")

# ============================================
# AI/LLM Configuration
# ============================================
API_BASE = os.getenv("API_BASE", "http://localhost:8000/v1")
MODEL_PATH = os.getenv("MODEL_PATH", "DeepAnalyze-8B")
USE_MOCK_LLM = get_env_bool("USE_MOCK_LLM", True)

# ============================================
# Code Execution Configuration
# ============================================
CODE_EXECUTION_TIMEOUT = get_env_int("CODE_EXECUTION_TIMEOUT", 120)

# ============================================
# Session Configuration
# ============================================
SESSION_TIMEOUT_MINUTES = get_env_int("SESSION_TIMEOUT_MINUTES", 10)

# ============================================
# Log Configuration
# ============================================
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

# ============================================
# Matplotlib 中文支持
# ============================================
CHINESE_MATPLOT_STR = """
import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif'] = ['SimHei']
plt.rcParams['axes.unicode_minus'] = False
"""

# ============================================
# Default Admin User
# ============================================
DEFAULT_ADMIN_USERNAME = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
DEFAULT_ADMIN_PASSWORD = os.getenv("DEFAULT_ADMIN_PASSWORD", "admin123")
