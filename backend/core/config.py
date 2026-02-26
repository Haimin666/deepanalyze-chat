import os

# 原有大模型配置
API_BASE = "http://localhost:8000/v1"
MODEL_PATH = "DeepAnalyze-8B"

# 原有工作区配置
WORKSPACE_BASE_DIR = "workspace"
HTTP_SERVER_PORT = 8100
HTTP_SERVER_BASE = f"http://localhost:{HTTP_SERVER_PORT}"

# 新增安全及数据库配置
SQLALCHEMY_DATABASE_URL = "sqlite:///./deepanalyze.db"
SECRET_KEY = "deepanalyze-super-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

# 原有 matplotlib 中文字体配置
os.environ.setdefault("MPLBACKEND", "Agg")
Chinese_matplot_str = """
import matplotlib.pyplot as plt
plt.rcParams['font.sans-serif'] = ['SimHei'] 
plt.rcParams['axes.unicode_minus'] = False    
"""