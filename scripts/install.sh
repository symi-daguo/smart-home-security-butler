#!/bin/bash

set -e

VERSION="0.1.0"
APP_NAME="smart-home-butler"
APP_DIR="$HOME/$APP_NAME"
IMAGE_NAME="${APP_NAME}:latest"

COLOR_GREEN="\033[0;32m"
COLOR_YELLOW="\033[1;33m"
COLOR_RED="\033[0;31m"
COLOR_BLUE="\033[0;34m"
COLOR_RESET="\033[0m"

log_info() { echo -e "${COLOR_BLUE}[INFO]${COLOR_RESET} $1"; }
log_success() { echo -e "${COLOR_GREEN}[OK]${COLOR_RESET} $1"; }
log_warn() { echo -e "${COLOR_YELLOW}[WARN]${COLOR_RESET} $1"; }
log_error() { echo -e "${COLOR_RED}[ERROR]${COLOR_RESET} $1"; }

check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    if ! docker info &> /dev/null 2>&1; then
        if command -v sudo &> /dev/null; then
            if sudo docker info &> /dev/null 2>&1; then
                DOCKER_CMD="sudo docker"
                return
            fi
        fi
        log_error "Docker 服务未运行或当前用户无权限"
        exit 1
    fi
    DOCKER_CMD="docker"
}

create_config() {
    mkdir -p "$APP_DIR/data"
    
    if [ -f "$APP_DIR/.env" ]; then
        log_info "配置文件已存在，跳过配置"
        return
    fi
    
    log_info "正在创建配置文件..."
    
    cat > "$APP_DIR/.env" << 'EOF'
# ============================================
# 智能家居 AI 安全管家 配置文件
# ============================================

# OpenRouter API 配置（必填）
OPENROUTER_API_KEY=your_openrouter_api_key_here
OPENROUTER_MODEL=nvidia/nemotron-3-super-120b-a12b:free
OPENROUTER_FALLBACK_MODEL=openrouter/free

# Home Assistant 配置（推荐填写）
HA_BASE_URL=http://172.17.0.1:8123
HA_TOKEN=your_ha_long_lived_token_here

# Node-RED 配置（可选）
NODERED_BASE_URL=http://172.17.0.1:1880
NODERED_TOKEN=

# KNX 网关配置（可选）
KNX_BASE_URL=
KNX_TOKEN=

# Telegram 通知配置（可选）
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# 检测间隔（毫秒，默认 5 分钟）
DETECTION_INTERVAL=300000

# 日志级别
LOG_LEVEL=info

# 端口配置
PORT=3000
EOF
    
    log_success "配置文件已创建: $APP_DIR/.env"
    log_warn "请编辑配置文件，填入你的 API 密钥等信息"
    log_warn "  nano $APP_DIR/.env"
}

create_compose() {
    cat > "$APP_DIR/docker-compose.yml" << 'EOF'
services:
  smart-home-butler:
    image: smart-home-butler:latest
    container_name: smart-home-butler
    restart: unless-stopped
    environment:
      - TZ=Asia/Shanghai
      - NODE_ENV=production
      - DATA_DIR=/app/data
      - PORT=3000
      - OPENROUTER_API_KEY=${OPENROUTER_API_KEY}
      - OPENROUTER_MODEL=${OPENROUTER_MODEL:-nvidia/nemotron-3-super-120b-a12b:free}
      - OPENROUTER_FALLBACK_MODEL=${OPENROUTER_FALLBACK_MODEL:-openrouter/free}
      - HA_BASE_URL=${HA_BASE_URL:-http://172.17.0.1:8123}
      - HA_TOKEN=${HA_TOKEN}
      - NODERED_BASE_URL=${NODERED_BASE_URL:-http://172.17.0.1:1880}
      - NODERED_TOKEN=${NODERED_TOKEN}
      - KNX_BASE_URL=${KNX_BASE_URL}
      - KNX_TOKEN=${KNX_TOKEN}
      - TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN}
      - TELEGRAM_CHAT_ID=${TELEGRAM_CHAT_ID}
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
    healthcheck:
      test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 30s
EOF
}

check_image() {
    if $DOCKER_CMD image inspect "$IMAGE_NAME" &> /dev/null; then
        return 0
    fi
    return 1
}

build_image() {
    if check_image; then
        log_info "镜像已存在，跳过构建"
        return
    fi
    
    log_info "正在构建 Docker 镜像..."
    
    TMP_BUILD_DIR=$(mktemp -d)
    
    git clone --depth 1 https://github.com/symi-daguo/smart-home-security-butler.git "$TMP_BUILD_DIR/repo" 2>/dev/null || {
        log_warn "无法从 GitHub 克隆，使用本地构建"
        mkdir -p "$TMP_BUILD_DIR/repo"
    }
    
    if [ ! -f "$TMP_BUILD_DIR/repo/Dockerfile" ]; then
        log_warn "源码不可用，拉取预构建镜像..."
        $DOCKER_CMD pull "registry.cn-hangzhou.aliyuncs.com/symi/smart-home-butler:latest" 2>/dev/null || {
            log_error "无法拉取镜像，请检查网络"
            rm -rf "$TMP_BUILD_DIR"
            exit 1
        }
        $DOCKER_CMD tag "registry.cn-hangzhou.aliyuncs.com/symi/smart-home-butler:latest" "$IMAGE_NAME"
        rm -rf "$TMP_BUILD_DIR"
        log_success "镜像拉取成功"
        return
    fi
    
    cd "$TMP_BUILD_DIR/repo"
    $DOCKER_CMD build -t "$IMAGE_NAME" .
    
    cd - > /dev/null
    rm -rf "$TMP_BUILD_DIR"
    
    log_success "镜像构建完成"
}

start_container() {
    log_info "正在启动容器..."
    
    cd "$APP_DIR"
    
    if $DOCKER_CMD ps -a --format '{{.Names}}' | grep -q "^${APP_NAME}$"; then
        log_info "容器已存在，正在重启..."
        $DOCKER_CMD compose up -d 2>/dev/null || $DOCKER_CMD restart "$APP_NAME"
    else
        $DOCKER_CMD compose up -d 2>/dev/null || {
            log_warn "docker-compose 不可用，使用 docker run"
            $DOCKER_CMD run -d \
                --name "$APP_NAME" \
                --restart unless-stopped \
                --env-file .env \
                -v "$APP_DIR/data:/app/data" \
                -p 3000:3000 \
                --memory 256m \
                --cpus 1.0 \
                "$IMAGE_NAME"
        }
    fi
    
    sleep 3
    
    if $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^${APP_NAME}$"; then
        log_success "容器启动成功"
    else
        log_error "容器启动失败，请查看日志"
        $DOCKER_CMD logs "$APP_NAME" --tail 20
        exit 1
    fi
}

show_info() {
    echo ""
    echo "============================================"
    echo "  智能家居 AI 安全管家 安装完成！"
    echo "============================================"
    echo ""
    echo "  版本: v$VERSION"
    echo "  目录: $APP_DIR"
    echo ""
    echo "  Web 管理界面: http://localhost:3000"
    echo ""
    echo "  常用命令:"
    echo "    查看状态:  shb status"
    echo "    查看日志:  shb logs"
    echo "    重启:      shb restart"
    echo "    升级:      shb update"
    echo "    停止:      shb stop"
    echo ""
    echo "  配置文件: $APP_DIR/.env"
    echo "  数据目录: $APP_DIR/data"
    echo ""
    echo "============================================"
}

install_cli() {
    CLI_PATH="/usr/local/bin/shb"
    
    if [ -w "/usr/local/bin" ]; then
        SUDO=""
    elif command -v sudo &> /dev/null; then
        SUDO="sudo"
    else
        log_warn "无法安装命令行工具，跳过"
        return
    fi
    
    $SUDO tee "$CLI_PATH" > /dev/null << 'EOF'
#!/bin/bash
APP_DIR="$HOME/smart-home-butler"
APP_NAME="smart-home-butler"

if command -v sudo &> /dev/null && ! docker info &> /dev/null 2>&1; then
    DOCKER_CMD="sudo docker"
else
    DOCKER_CMD="docker"
fi

cd "$APP_DIR"

case "${1:-help}" in
    status)
        echo "容器状态:"
        $DOCKER_CMD ps -a --filter "name=$APP_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        echo ""
        echo "资源使用:"
        $DOCKER_CMD stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" $APP_NAME 2>/dev/null || echo "无法获取资源信息"
        ;;
    logs)
        $DOCKER_CMD logs -f --tail 100 "$APP_NAME"
        ;;
    restart)
        echo "正在重启..."
        cd "$APP_DIR"
        $DOCKER_CMD compose restart 2>/dev/null || $DOCKER_CMD restart "$APP_NAME"
        echo "重启完成"
        ;;
    stop)
        echo "正在停止..."
        cd "$APP_DIR"
        $DOCKER_CMD compose stop 2>/dev/null || $DOCKER_CMD stop "$APP_NAME"
        echo "已停止"
        ;;
    start)
        echo "正在启动..."
        cd "$APP_DIR"
        $DOCKER_CMD compose up -d 2>/dev/null || $DOCKER_CMD start "$APP_NAME"
        echo "已启动"
        ;;
    update)
        echo "正在更新..."
        cd "$APP_DIR"
        $DOCKER_CMD pull smart-home-butler:latest 2>/dev/null || echo "使用本地镜像"
        $DOCKER_CMD compose up -d --force-recreate 2>/dev/null || {
            $DOCKER_CMD stop "$APP_NAME"
            $DOCKER_CMD rm "$APP_NAME"
            $DOCKER_CMD run -d \
                --name "$APP_NAME" \
                --restart unless-stopped \
                --env-file .env \
                -v "$APP_DIR/data:/app/data" \
                -p 3000:3000 \
                --memory 256m \
                --cpus 1.0 \
                smart-home-butler:latest
        }
        echo "更新完成"
        ;;
    config)
        nano "$APP_DIR/.env"
        echo "配置已更新，正在重启..."
        cd "$APP_DIR"
        $DOCKER_CMD compose restart 2>/dev/null || $DOCKER_CMD restart "$APP_NAME"
        ;;
    uninstall)
        read -p "确定要卸载吗？数据将保留在 $APP_DIR/data [y/N]: " confirm
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            cd "$APP_DIR"
            $DOCKER_CMD compose down 2>/dev/null || {
                $DOCKER_CMD stop "$APP_NAME"
                $DOCKER_CMD rm "$APP_NAME"
            }
            echo "容器已删除，数据保留在 $APP_DIR"
            echo "如需彻底删除，请手动执行: rm -rf $APP_DIR"
        fi
        ;;
    help|*)
        echo "智能家居 AI 安全管家 命令行工具"
        echo ""
        echo "用法: shb <命令>"
        echo ""
        echo "命令:"
        echo "  status    查看运行状态"
        echo "  logs      查看实时日志"
        echo "  start     启动服务"
        echo "  stop      停止服务"
        echo "  restart   重启服务"
        echo "  update    升级到最新版本"
        echo "  config    编辑配置文件"
        echo "  uninstall 卸载（保留数据）"
        echo "  help      显示帮助"
        ;;
esac
EOF
    
    $SUDO chmod +x "$CLI_PATH"
    log_success "命令行工具已安装: shb"
}

main() {
    echo ""
    echo "============================================"
    echo "  智能家居 AI 安全管家 一键安装"
    echo "  v$VERSION"
    echo "============================================"
    echo ""
    
    check_docker
    create_config
    create_compose
    build_image
    start_container
    install_cli
    show_info
}

main "$@"
