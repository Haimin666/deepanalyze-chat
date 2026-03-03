#!/bin/bash
# ============================================
# DeepAnalyze 一键部署脚本
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "============================================"
echo "     DeepAnalyze 一键部署脚本"
echo "============================================"
echo -e "${NC}"

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        echo $ID
    elif [ -f /etc/redhat-release ]; then
        echo "rhel"
    else
        echo "unknown"
    fi
}

OS=$(detect_os)
echo -e "${GREEN}检测到操作系统: $OS${NC}"

# 检查并安装依赖
check_python() {
    if command -v python3 &> /dev/null; then
        PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
        echo -e "${GREEN}✓ Python $PYTHON_VERSION 已安装${NC}"
        return 0
    else
        echo -e "${YELLOW}! Python3 未安装${NC}"
        return 1
    fi
}

check_node() {
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        echo -e "${GREEN}✓ Node.js $NODE_VERSION 已安装${NC}"
        return 0
    else
        echo -e "${YELLOW}! Node.js 未安装${NC}"
        return 1
    fi
}

check_mysql() {
    if command -v mysql &> /dev/null; then
        echo -e "${GREEN}✓ MySQL 客户端已安装${NC}"
        return 0
    else
        echo -e "${YELLOW}! MySQL 客户端未安装${NC}"
        return 1
    fi
}

check_docker() {
    if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
        DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
        echo -e "${GREEN}✓ Docker $DOCKER_VERSION 已安装${NC}"
        return 0
    else
        echo -e "${YELLOW}! Docker 未安装${NC}"
        return 1
    fi
}

# 安装依赖
install_dependencies() {
    echo -e "${YELLOW}安装 Python 依赖...${NC}"
    cd backend
    pip3 install -r requirements.txt -q
    cd ..
    echo -e "${GREEN}✓ Python 依赖安装完成${NC}"

    echo -e "${YELLOW}安装前端依赖...${NC}"
    cd frontend
    if command -v bun &> /dev/null; then
        bun install --silent
    elif command -v npm &> /dev/null; then
        npm install --quiet
    fi
    cd ..
    echo -e "${GREEN}✓ 前端依赖安装完成${NC}"
}

# 初始化数据库
init_database() {
    echo -e "${YELLOW}初始化数据库...${NC}"

    if [ ! -f "backend/.env" ]; then
        echo -e "${RED}✗ 未找到 backend/.env 配置文件${NC}"
        echo -e "${YELLOW}正在从 .env.example 创建配置文件...${NC}"
        cp backend/.env.example backend/.env
        echo -e "${YELLOW}请编辑 backend/.env 配置数据库连接信息后重新运行${NC}"
        exit 1
    fi

    source backend/.env

    if [ -n "$DB_PASSWORD" ]; then
        mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" -p"$DB_PASSWORD" < backend/init_db.sql 2>/dev/null || true
    else
        mysql -h "${DB_HOST:-localhost}" -P "${DB_PORT:-3306}" -u "${DB_USER:-root}" < backend/init_db.sql 2>/dev/null || true
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
    cd ..
    echo -e "${GREEN}✓ 前端构建完成${NC}"
}

# 创建必要目录
create_directories() {
    echo -e "${YELLOW}创建必要的目录...${NC}"
    mkdir -p workspace logs
    echo -e "${GREEN}✓ 目录创建完成${NC}"
}

# Docker 部署
docker_deploy() {
    echo -e "${YELLOW}使用 Docker 部署...${NC}"

    if [ ! -f "backend/.env" ]; then
        cp backend/.env.example backend/.env
        echo -e "${YELLOW}已创建 backend/.env，请配置后重新运行${NC}"
        exit 1
    fi

    docker-compose up -d --build

    echo -e "${GREEN}✓ Docker 部署完成${NC}"
    echo ""
    echo -e "  ${BLUE}前端:${NC}    http://localhost:3000"
    echo -e "  ${BLUE}后端 API:${NC} http://localhost:8200"
    echo -e "  ${BLUE}默认账号:${NC} admin / admin123"
}

# 主流程
main() {
    echo ""

    # 选择部署方式
    echo -e "${YELLOW}请选择部署方式:${NC}"
    echo "  1) Docker 部署 (推荐)"
    echo "  2) 手动部署"
    echo "  3) 仅检查环境"
    read -p "请输入选项 [1-3]: " choice

    case $choice in
        1)
            if check_docker; then
                docker_deploy
            else
                echo -e "${RED}✗ Docker 未安装，无法使用 Docker 部署${NC}"
                echo -e "${YELLOW}请先安装 Docker: https://docs.docker.com/get-docker/${NC}"
                exit 1
            fi
            ;;
        2)
            echo ""
            echo -e "${YELLOW}检查环境...${NC}"
            check_python || exit 1
            check_node || exit 1
            check_mysql

            echo ""
            install_dependencies
            create_directories
            init_database
            build_frontend

            echo ""
            echo -e "${GREEN}============================================${NC}"
            echo -e "${GREEN}  部署完成！${NC}"
            echo -e "${GREEN}============================================${NC}"
            echo ""
            echo "启动服务："
            echo "  ./scripts/start.sh"
            echo ""
            echo "停止服务："
            echo "  ./scripts/stop.sh"
            ;;
        3)
            echo ""
            echo -e "${YELLOW}检查环境...${NC}"
            check_python
            check_node
            check_mysql
            check_docker
            ;;
        *)
            echo -e "${RED}无效选项${NC}"
            exit 1
            ;;
    esac
}

# 运行
main "$@"
