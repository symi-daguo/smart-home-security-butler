#!/bin/bash

set -e

VERSION="0.5.0"
APP_NAME="smart-home-butler"

COLOR_GREEN="\033[0;32m"
COLOR_YELLOW="\033[1;33m"
COLOR_RED="\033[0;31m"
COLOR_BLUE="\033[0;34m"
COLOR_RESET="\033[0m"

log_info() { echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"; }
log_success() { echo -e "${COLOR_GREEN}[OK]${COLOR_RESET} $1"; }
log_warn() { echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $1"; }
log_error() { echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"; }

show_usage() {
    echo "智能家居 AI 安全管家 - 批量部署工具"
    echo ""
    echo "用法: $0 <命令> [选项]"
    echo ""
    echo "命令:"
    echo "  single <host>      部署到单台服务器"
    echo "  batch <hosts_file> 批量部署到多台服务器"
    echo "  update <host>      更新单台服务器"
    echo "  batch-update <hosts_file> 批量更新"
    echo "  status <host>      查看服务器状态"
    echo "  batch-status <hosts_file> 批量查看状态"
    echo ""
    echo "服务器列表文件格式 (每行一个):"
    echo "  user@host:port"
    echo "  例如: symi@192.168.2.45:22"
    echo ""
    echo "环境变量配置:"
    echo "  SSH_PASSWORD       SSH 密码（可选，推荐用密钥）"
    echo "  OPENROUTER_API_KEY OpenRouter API Key"
    echo "  HA_BASE_URL        Home Assistant 地址"
    echo "  HA_TOKEN           Home Assistant Token"
    echo ""
    echo "示例:"
    echo "  $0 single symi@192.168.2.45"
    echo "  $0 batch hosts.txt"
}

check_ssh() {
    local host=$1
    ssh -o ConnectTimeout=5 -o BatchMode=yes "$host" "echo ok" &> /dev/null
    return $?
}

deploy_single() {
    local host=$1
    log_info "正在部署到 $host ..."
    
    if ! check_ssh "$host"; then
        log_error "无法连接到 $host"
        return 1
    fi
    
    log_success "SSH 连接成功"
    
    ssh "$host" "bash -s" << 'REMOTE_SCRIPT'
set -e

APP_DIR="$HOME/smart-home-butler"
mkdir -p "$APP_DIR/data"

if [ ! -f "$APP_DIR/.env" ]; then
    cat > "$APP_DIR/.env" << ENVEOF
TZ=Asia/Shanghai
NODE_ENV=production
DATA_DIR=/app/data
PORT=3000
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-}
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
OPENROUTER_FALLBACK_MODEL=openrouter/free
HA_BASE_URL=${HA_BASE_URL:-http://172.17.0.1:8123}
HA_TOKEN=${HA_TOKEN:-}
NODERED_BASE_URL=http://172.17.0.1:1880
NODERED_TOKEN=
KNX_BASE_URL=
KNX_TOKEN=
KNX2_BASE_URL=
KNX2_TOKEN=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
BARK_DEVICE_KEY=
BARK_BASE_URL=https://api.day.app
SERVERCHAN_SEND_KEY=
DETECTION_INTERVAL=300000
LOG_LEVEL=info
ENVEOF
fi

cat > "$APP_DIR/docker-compose.yml" << 'COMPOSEEOF'
services:
  smart-home-butler:
    image: registry.cn-hangzhou.aliyuncs.com/symi/smart-home-butler:latest
    container_name: smart-home-butler
    restart: unless-stopped
    environment:
      - TZ=${TZ:-Asia/Shanghai}
      - NODE_ENV=${NODE_ENV:-production}
      - DATA_DIR=${DATA_DIR:-/app/data}
      - PORT=${PORT:-3000}
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - OPENROUTER_MODEL=${OPENROUTER_MODEL:-nvidia/nemotron-3-super-120b-a12b:free}
      - OPENROUTER_FALLBACK_MODEL=${OPENROUTER_FALLBACK_MODEL:-openrouter/free}
      - HA_BASE_URL=${HA_BASE_URL:-http://172.17.0.1:8123}
      - HA_TOKEN=${HA_TOKEN}
      - NODERED_BASE_URL=${NODERED_BASE_URL:-http://172.17.0.1:1880}
      - NODERED_TOKEN=${NODERED_TOKEN}
      - KNX_BASE_URL=${KNX_BASE_URL}
      - KNX_TOKEN=${KNX_TOKEN}
      - KNX2_BASE_URL=${KNX2_BASE_URL}
      - KNX2_TOKEN=${KNX2_TOKEN}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
      - BARK_DEVICE_KEY=${BARK_DEVICE_KEY}
      - BARK_BASE_URL=${BARK_BASE_URL:-https://api.day.app}
      - SERVERCHAN_SEND_KEY=${SERVERCHAN_SEND_KEY}
      - DETECTION_INTERVAL=${DETECTION_INTERVAL:-300000}
      - LOG_LEVEL=${LOG_LEVEL:-info}
    volumes:
      - ./data:/app/data
    ports:
      - "${PORT:-3000}:3000"
    network_mode: bridge
    mem_limit: 256m
    cpus: '1.0'
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
COMPOSEEOF

cd "$APP_DIR"

if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    DOCKER_CMD="docker"
elif command -v sudo &> /dev/null && sudo docker info &> /dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
else
    echo "ERROR: Docker 不可用"
    exit 1
fi

$DOCKER_CMD pull registry.cn-hangzhou.aliyuncs.com/symi/smart-home-butler:latest

if $DOCKER_CMD ps -a --format '{{.Names}}' | grep -q "^smart-home-butler$"; then
    $DOCKER_CMD compose up -d --force-recreate 2>/dev/null || {
        $DOCKER_CMD stop smart-home-butler 2>/dev/null || true
        $DOCKER_CMD rm smart-home-butler 2>/dev/null || true
        $DOCKER_CMD run -d \
            --name smart-home-butler \
            --restart unless-stopped \
            --env-file .env \
            -v "$APP_DIR/data:/app/data" \
            -p 3000:3000 \
            --memory 256m \
            --cpus 1.0 \
            registry.cn-hangzhou.aliyuncs.com/symi/smart-home-butler:latest
    }
else
    $DOCKER_CMD compose up -d 2>/dev/null || {
        $DOCKER_CMD run -d \
            --name smart-home-butler \
            --restart unless-stopped \
            --env-file .env \
            -v "$APP_DIR/data:/app/data" \
            -p 3000:3000 \
            --memory 256m \
            --cpus 1.0 \
            registry.cn-hangzhou.aliyuncs.com/symi/smart-home-butler:latest
    }
fi

sleep 5

if $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^smart-home-butler$"; then
    echo "SUCCESS: 部署成功"
    $DOCKER_CMD ps --filter "name=smart-home-butler" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
else
    echo "ERROR: 容器启动失败"
    $DOCKER_CMD logs smart-home-butler --tail 20
    exit 1
fi
REMOTE_SCRIPT

    if [ $? -eq 0 ]; then
        log_success "部署成功: $host"
        echo "  Web 界面: http://$(echo "$host" | cut -d@ -f2 | cut -d: -f1):3000"
        return 0
    else
        log_error "部署失败: $host"
        return 1
    fi
}

update_single() {
    local host=$1
    log_info "正在更新 $host ..."
    
    if ! check_ssh "$host"; then
        log_error "无法连接到 $host"
        return 1
    fi
    
    ssh "$host" "bash -s" << 'REMOTE_SCRIPT'
set -e

APP_DIR="$HOME/smart-home-butler"

if [ ! -d "$APP_DIR" ]; then
    echo "ERROR: 未找到安装目录，请先部署"
    exit 1
fi

cd "$APP_DIR"

if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    DOCKER_CMD="docker"
elif command -v sudo &> /dev/null && sudo docker info &> /dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
else
    echo "ERROR: Docker 不可用"
    exit 1
fi

BACKUP_DIR="$APP_DIR/backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
[ -d "$APP_DIR/data" ] && cp -r "$APP_DIR/data" "$BACKUP_DIR/"
[ -f "$APP_DIR/.env" ] && cp "$APP_DIR/.env" "$BACKUP_DIR/"

$DOCKER_CMD pull registry.cn-hangzhou.aliyuncs.com/symi/smart-home-butler:latest

$DOCKER_CMD compose up -d --force-recreate 2>/dev/null || {
    $DOCKER_CMD stop smart-home-butler 2>/dev/null || true
    $DOCKER_CMD rm smart-home-butler 2>/dev/null || true
    $DOCKER_CMD run -d \
        --name smart-home-butler \
        --restart unless-stopped \
        --env-file .env \
        -v "$APP_DIR/data:/app/data" \
        -p 3000:3000 \
        --memory 256m \
        --cpus 1.0 \
        registry.cn-hangzhou.aliyuncs.com/symi/smart-home-butler:latest
}

sleep 5

if $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^smart-home-butler$"; then
    echo "SUCCESS: 更新成功"
    echo "  备份目录: $BACKUP_DIR"
else
    echo "ERROR: 更新失败"
    exit 1
fi
REMOTE_SCRIPT

    if [ $? -eq 0 ]; then
        log_success "更新成功: $host"
        return 0
    else
        log_error "更新失败: $host"
        return 1
    fi
}

check_status() {
    local host=$1
    log_info "检查状态: $host ..."
    
    if ! check_ssh "$host"; then
        log_error "无法连接到 $host"
        return 1
    fi
    
    ssh "$host" "bash -s" << 'REMOTE_SCRIPT'
if command -v docker &> /dev/null && docker info &> /dev/null 2>&1; then
    DOCKER_CMD="docker"
elif command -v sudo &> /dev/null && sudo docker info &> /dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
else
    echo "ERROR: Docker 不可用"
    exit 1
fi

$DOCKER_CMD ps -a --filter "name=smart-home-butler" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
$DOCKER_CMD stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" smart-home-butler 2>/dev/null || true
REMOTE_SCRIPT
}

batch_operation() {
    local operation=$1
    local hosts_file=$2
    
    if [ ! -f "$hosts_file" ]; then
        log_error "服务器列表文件不存在: $hosts_file"
        exit 1
    fi
    
    local success=0
    local failed=0
    local total=0
    
    while IFS= read -r host || [ -n "$host" ]; do
        [[ -z "$host" || "$host" =~ ^# ]] && continue
        total=$((total + 1))
        
        case $operation in
            deploy)
                if deploy_single "$host"; then
                    success=$((success + 1))
                else
                    failed=$((failed + 1))
                fi
                ;;
            update)
                if update_single "$host"; then
                    success=$((success + 1))
                else
                    failed=$((failed + 1))
                fi
                ;;
            status)
                check_status "$host"
                success=$((success + 1))
                ;;
        esac
        
        echo ""
    done < "$hosts_file"
    
    echo "============================================"
    echo "  批量操作完成"
    echo "  总计: $total 台"
    echo "  成功: $success 台"
    echo "  失败: $failed 台"
    echo "============================================"
}

main() {
    local cmd=${1:-help}
    
    case $cmd in
        single)
            if [ -z "$2" ]; then
                log_error "请指定服务器地址"
                show_usage
                exit 1
            fi
            deploy_single "$2"
            ;;
        batch)
            if [ -z "$2" ]; then
                log_error "请指定服务器列表文件"
                show_usage
                exit 1
            fi
            batch_operation deploy "$2"
            ;;
        update)
            if [ -z "$2" ]; then
                log_error "请指定服务器地址"
                show_usage
                exit 1
            fi
            update_single "$2"
            ;;
        batch-update)
            if [ -z "$2" ]; then
                log_error "请指定服务器列表文件"
                show_usage
                exit 1
            fi
            batch_operation update "$2"
            ;;
        status)
            if [ -z "$2" ]; then
                log_error "请指定服务器地址"
                show_usage
                exit 1
            fi
            check_status "$2"
            ;;
        batch-status)
            if [ -z "$2" ]; then
                log_error "请指定服务器列表文件"
                show_usage
                exit 1
            fi
            batch_operation status "$2"
            ;;
        help|--help|-h)
            show_usage
            ;;
        *)
            log_error "未知命令: $cmd"
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
