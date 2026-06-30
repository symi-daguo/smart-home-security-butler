# HA 日志采集器

智能家居 AI 安全管家的 Home Assistant 数据采集模块。

## 概述

HA 日志采集器连接到 Home Assistant，实时采集实体状态变化、历史日志数据、设备信息和系统健康指标，用于安全监控和分析。

## 功能特性

- 通过 WebSocket API 实时获取实体状态变化
- 通过 REST API 获取历史日志和状态历史
- 设备和实体注册表同步
- 系统健康监控
- 可配置的实体过滤（包含/排除模式）
- 带指数退避的自动重连
- 断开连接期间的本地数据缓冲

## 安装

此子技能已包含在智能家居 AI 安全管家中，无需单独安装。

## 配置

### 必需的环境变量

| 变量 | 说明 |
|------|------|
| `HA_TOKEN` | Home Assistant 长期访问令牌 |

### 可选的环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HA_BASE_URL` | `http://homeassistant.local:8123` | Home Assistant 基础 URL |

### 通过 API 配置

```json
{
  "baseUrl": "http://homeassistant.local:8123",
  "token": "你的长期访问令牌",
  "config": {
    "includeDomains": ["binary_sensor", "sensor", "light", "switch", "lock", "alarm_control_panel", "cover"],
    "includePatterns": ["*door*", "*window*", "*motion*", "*smoke*", "*water*", "*battery*"],
    "excludePatterns": ["*diagnostic*"],
    "collectLogbook": true,
    "collectDeviceRegistry": true,
    "collectSystemHealth": true,
    "healthCheckInterval": 300,
    "deviceSyncInterval": 3600
  }
}
```

## 采集的数据

| 数据类型 | 方法 | 频率 |
|---------|------|------|
| 实体状态变化 | WebSocket | 实时 |
| 日志事件 | REST API | 每 15 分钟 |
| 设备注册表 | REST API | 每小时 |
| 实体注册表 | REST API | 每 6 小时 |
| 系统健康 | REST API | 每 5 分钟 |

## 支持的 HA 版本

- Home Assistant 2024.1 及更高版本
- Home Assistant OS、Supervised、Container 和 Core 安装方式
- 支持 HTTP 和 HTTPS 端点

## 安全性

- 使用长期访问令牌进行身份验证
- 支持 HTTPS 和自签名证书（可配置）
- 令牌安全存储，永不记录或暴露
- 建议使用只读权限进行监控

## 相关文档

- [安全管家主技能](../SKILL.md)
- [系统架构](../ref/architecture.md)
- [检测规则](../ref/detection-rules.md)

## 许可证

MIT
