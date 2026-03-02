#!/usr/bin/env python3
"""
创建管理员用户脚本
"""
import os
import sys
import uuid
from pathlib import Path
from datetime import datetime

# 加载 .env 环境变量
try:
    from dotenv import load_dotenv

    env_path = Path(__file__).parent / ".env"
    if env_path.exists():
        load_dotenv(env_path)
        print(f"✅ 已加载环境配置")
except ImportError:
    print("⚠️  python-dotenv 未安装，使用系统环境变量")

# 数据库配置
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "three_panel")

print(f"📡 连接数据库: {DB_HOST}:{DB_PORT}/{DB_NAME}")

try:
    import pymysql
    import bcrypt

    # 连接数据库
    conn = pymysql.connect(
        host=DB_HOST,
        port=DB_PORT,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME,
        charset='utf8mb4'
    )

    cursor = conn.cursor()

    # 创建密码哈希
    password = "admin123"
    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    # 生成用户ID
    user_id = str(uuid.uuid4())

    # 检查表是否存在
    cursor.execute("SHOW TABLES LIKE 'users'")
    if cursor.fetchone() is None:
        print("📋 users 表不存在，创建表...")
        cursor.execute("""
            CREATE TABLE users (
                id VARCHAR(36) PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                role VARCHAR(20) DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        """)
        conn.commit()
        print("✅ 已创建 users 表")

    # 检查 admin 是否存在
    cursor.execute("SELECT id FROM users WHERE username = 'admin'")
    if cursor.fetchone():
        print("⚠️  admin 用户已存在，更新密码...")
        cursor.execute("UPDATE users SET password_hash = %s WHERE username = 'admin'", (password_hash,))
        conn.commit()
        print("✅ admin 密码已更新为: admin123")
    else:
        # 插入新用户
        cursor.execute("""
            INSERT INTO users (id, username, password_hash, name, role, created_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (user_id, "admin", password_hash, "系统管理员", "admin"))
        conn.commit()
        print("=" * 50)
        print("✅ 已创建管理员账户:")
        print(f"   用户名: admin")
        print(f"   密码: admin123")
        print(f"   ID: {user_id}")
        print("=" * 50)

    cursor.close()
    conn.close()
    print("✅ 完成!")

except ImportError as e:
    print(f"❌ 缺少依赖: {e}")
    print("   请安装: pip install pymysql bcrypt python-dotenv")
except Exception as e:
    print(f"❌ 错误: {e}")
    import traceback

    traceback.print_exc()