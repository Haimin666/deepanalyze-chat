FROM python:3.10-slim

WORKDIR /app

# 安装必要的系统库 (Pandoc 用于文档导出等)
RUN apt-get update && apt-get install -y pandoc && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# 暴露 FastAPI API 端口和静态文件服务端口
EXPOSE 8200
EXPOSE 8100

CMD ["python", "main.py"]