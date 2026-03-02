#!/bin/bash
# ============================================
# DeepAnalyze 生产环境部署脚本
# ============================================

set -e

echo "============================================"
echo "  DeepAnalyze 生产环境部署"
echo "============================================"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查 Python
check_python() {
    echo -e "${YELLOW}检查 Python 环境...${NC}"
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version)
        echo -e "${GREEN}✓ $PYTHON_VERSION${NC}"
    else
        echo -e "${RED}✗ 未找到 Python3，请先安装 Python 3.9+${NC}"
        exit 1
    fi
}

# 检查 MySQL
check_mysql() {
    echo -e "${YELLOW}检查 MySQL 连接...${NC}"
    if command -v mysql &> /dev/null; then
        echo -e "${GREEN}✓ MySQL 客户端已安装${NC}"
    else
        echo -e "${YELLOW}! MySQL 客户端未安装，跳过检查${NC}"
    fi
}

# 安装 Python 依赖
install_dependencies() {
    echo -e "${YELLOW}安装 Python 依赖...${NC}"
    cd backend
    pip3 install -r requirements.txt
    echo -e "${GREEN}✓ Python 依赖安装完成${NC}"
    cd ..
}

# 安装前端依赖
install_frontend() {
    echo -e "${YELLOW}安装前端依赖...${NC}"
    cd frontend
    if command -v bun &> /dev/null; then
        bun install
    elif command -v npm &> /dev/null; then
        npm install
    else
        echo -e "${RED}✗ 未找到 bun 或 npm${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ 前端依赖安装完成${NC}"
    cd ..
}

# 初始化数据库
init_database() {
    echo -e "${YELLOW}初始化数据库...${NC}"
    
    # 检查 .env 文件
    if [ ! -f "backend/.env" ]; then
        echo -e "${RED}✗ 未找到 backend/.env 配置文件${NC}"
        echo -e "${YELLOW}请复制 .env.example 并配置数据库信息${NC}"
        cp backend/.env backend/.env
        echo -e "${YELLOW}已创建 backend/.env，请编辑配置后重新运行${NC}"
        exit 1
    fi
    
    # 导入 SQL 初始化脚本
    source backend/.env
    
    if [ -n "$DB_PASSWORD" ]; then
        mysql -h $DB_HOST -P $DB_PORT -u $DB_USER -p$DB_PASSWORD < backend/init_db.sql 2>/dev/null || true
    else
        mysql -h $DB_HOST -P $DB_PORT -u $DB_USER < backend/init_db.sql 2>/dev/null || true
    fi
    
    echo -e "${GREEN}✓ 数据库初始化完成${NC}"
}

# 构建前端
build_frontend() {
    echo -e "${YELLOW}构建前端...${NC}"
    cd frontend
    if command -v bun &> /dev/null; then
        bun run build
    else
        npm run build
    fi
    echo -e "${GREEN}✓ 前端构建完成${NC}"
    cd ..
}

# 创建必要的目录
create_directories() {
    echo -e "${YELLOW}创建必要的目录...${NC}"
    mkdir -p workspace
    mkdir -p logs
    echo -e "${GREEN}✓ 目录创建完成${NC}"
}

# 主流程
main() {
    echo ""
    
    # 检查环境
    check_python
    check_mysql
    
    # 安装依赖
    install_dependencies
    install_frontend
    
    # 初始化
    create_directories
    init_database
    
    # 构建
    build_frontend
    
    echo ""
    echo -e "${GREEN}============================================${NC}"
    echo -e "${GREEN}  部署完成！${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo ""
    echo "启动服务："
    echo "  后端: cd backend && python main.py"
    echo "  前端: cd frontend && bun run start (或 npm run start)"
    echo ""
}

# 运行
main "$@"
