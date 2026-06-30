#!/bin/bash

set -e

APP_NAME="smart-home-butler"
APP_DIR="$HOME/$APP_NAME"
IMAGE_NAME="${APP_NAME}:latest"
BACKUP_DIR="$APP_DIR/backup_$(date +%Y%m%d_%H%M%S)"

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
    if command -v sudo &> /dev/null && ! docker info &> /dev/null 2>&1; then
        DOCKER_CMD="sudo docker"
    else
        DOCKER_CMD="docker"
    fi
}

backup_data() {
    log_info "正在备份数据..."
    mkdir -p "$BACKUP_DIR"
    
    if [ -d "$APP_DIR/data" ]; then
        cp -r "$APP_DIR/data" "$BACKUP_DIR/"
    fi
    
    if [ -f "$APP_DIR/.env" ]; then
        cp "$APP_DIR/.env" "$BACKUP_DIR/"
    fi
    
    log_success "数据已备份到: $BACKUP_DIR"
}

pull_new_image() {
    log_info "正在拉取最新镜像..."
    
    $DOCKER_CMD pull "registry.cn-hangzhou.aliyuncs.com/symi/smart-home-butler:latest" 2>/dev/null && {
        $DOCKER_CMD tag "registry.cn-hangzhou.aliyuncs.com/symi/smart-home-butler:latest" "$IMAGE_NAME"
        log_success "镜像拉取成功"
        return 0
    }
    
    log_warn "无法拉取镜像，尝试本地构建..."
    
    TMP_BUILD_DIR=$(mktemp -d)
    git clone --depth 1 https://github.com/symi-daguo/smart-home-security-butler.git "$TMP_BUILD_DIR/repo" 2>/dev/null || {
        log_error "无法获取源码"
        rm -rf "$TMP_BUILD_DIR"
        return 1
    }
    
    cd "$TMP_BUILD_DIR/repo"
    $DOCKER_CMD build -t "$IMAGE_NAME" .
    cd - > /dev/null
    rm -rf "$TMP_BUILD_DIR"
    
    log_success "镜像构建成功"
    return 0
}

upgrade_container() {
    log_info "正在升级容器..."
    
    cd "$APP_DIR"
    
    OLD_IMAGE_ID=$($DOCKER_CMD inspect --format='{{.Image}}' "$APP_NAME" 2>/dev/null || echo "")
    
    if $DOCKER_CMD compose up -d --force-recreate 2>/dev/null; then
        :
    else
        log_warn "docker-compose 不可用，使用 docker run"
        $DOCKER_CMD stop "$APP_NAME" 2>/dev/null || true
        $DOCKER_CMD rm "$APP_NAME" 2>/dev/null || true
        $DOCKER_CMD run -d \
            --name "$APP_NAME" \
            --restart unless-stopped \
            --env-file .env \
            -v "$APP_DIR/data:/app/data" \
            -p 3000:3000 \
            --memory 256m \
            --cpus 1.0 \
            "$IMAGE_NAME"
    fi
    
    sleep 3
    
    if $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^${APP_NAME}$"; then
        log_success "容器升级成功"
    else
        log_error "容器启动失败，正在回滚..."
        rollback
        exit 1
    fi
}

rollback() {
    log_warn "正在回滚..."
    
    if [ -n "$OLD_IMAGE_ID" ]; then
        $DOCKER_CMD stop "$APP_NAME" 2>/dev/null || true
        $DOCKER_CMD rm "$APP_NAME" 2>/dev/null || true
        
        cd "$APP_DIR"
        $DOCKER_CMD run -d \
            --name "$APP_NAME" \
            --restart unless-stopped \
            --env-file .env \
            -v "$APP_DIR/data:/app/data" \
            -p 3000:3000 \
            --memory 256m \
            --cpus 1.0 \
            "$OLD_IMAGE_ID"
        
        if $DOCKER_CMD ps --format '{{.Names}}' | grep -q "^${APP_NAME}$"; then
            log_success "回滚成功"
        else
            log_error "回滚失败，请手动检查"
        fi
    fi
}

verify_health() {
    log_info "正在验证服务健康状态..."
    
    for i in {1..10}; do
        if curl -s http://localhost:3000/api/status | grep -q '"success":true'; then
            log_success "服务运行正常"
            return 0
        fi
        sleep 2
    done
    
    log_warn "健康检查超时，请检查日志"
    return 1
}

cleanup_old_backups() {
    log_info "清理旧备份..."
    ls -dt "$APP_DIR"/backup_* 2>/dev/null | tail -n +4 | while read -r old_backup; do
        rm -rf "$old_backup"
        log_info "已删除旧备份: $(basename "$old_backup")"
    done
}

show_info() {
    echo ""
    echo "============================================"
    echo "  升级完成！"
    echo "============================================"
    echo ""
    echo "  Web 管理界面: http://localhost:3000"
    echo ""
    echo "  查看状态: shb status"
    echo "  查看日志: shb logs"
    echo ""
    echo "  数据备份: $BACKUP_DIR"
    echo "============================================"
}

main() {
    echo ""
    echo "============================================"
    echo "  智能家居 AI 安全管家 一键升级"
    echo "============================================"
    echo ""
    
    if [ ! -d "$APP_DIR" ]; then
        log_error "未找到安装目录: $APP_DIR"
        log_error "请先运行安装脚本"
        exit 1
    fi
    
    check_docker
    backup_data
    pull_new_image
    upgrade_container
    verify_health || true
    cleanup_old_backups
    show_info
}

main "$@"
