# Node-RED 日志采集器

智能家居 AI 安全管家的 Node-RED 数据采集模块。

## 概述

Node-RED 日志采集器连接到 Node-RED Admin API，采集流状态、部署事件、节点健康状况、错误日志和系统指标，用于安全监控和自动化可靠性追踪。

## 功能特性

- 流状态监控和健康追踪
- 节点状态监控，含错误/警告检测
- 部署事件历史追踪
- 流执行错误收集
- 可配置的流/节点过滤
- 支持 HA 插件版和独立版 Node-RED
- 多种身份验证方式（Basic Auth、Bearer token）

## 安装

此子技能已包含在智能家居 AI 安全管家中，无需单独安装。

## 配置

### 必需的环境变量

无 - Node-RED 采集是可选的。通过 API 或配置文件进行配置。

### 可选的环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `NR_BASE_URL` | `http://homeassistant.local:1880` | Node-RED 基础 URL |
| `NR_TOKEN` | - | Node-RED 管理员令牌 |
| `NR_USERNAME` | - | HA 用户名（HA 插件版） |
| `NR_PASSWORD` | - | HA 密码（HA 插件版） |

### 通过 API 配置

```json
{
  "baseUrl": "http://homeassistant.local:1880",
  "auth": {
    "type": "basic",
    "username": "admin",
    "password": "密码"
  },
  "config": {
    "monitorFlows": ["Security*", "Home Automation"],
    "monitorNodeTypes": ["ha-*", "mqtt*"],
    "captureErrors": true,
    "captureDebug": false,
    "captureDeployments": true,
    "statusPollInterval": 30,
    "errorPollInterval": 15
  }
}
```

## 身份验证方式

| 方式 | 用例 |
|------|------|
| Basic Auth | Node-RED HA 插件版（直接端口） |
| Bearer Token | 独立版 Node-RED（带 adminAuth） |
| 无认证 | 仅受信任局域网（不推荐） |

## 采集的数据

| 数据类型 | 频率 | 说明 |
|---------|------|------|
| 流状态 | 每 60 秒 | 每个流的运行/禁用状态 |
| 节点状态 | 每 30 秒 | 每个被监控节点的状态 |
| 错误日志 | 每 15 秒 | 流执行错误 |
| 部署事件 | 轮询 | 流部署历史 |
| 系统信息 | 每 5 分钟 | Node-RED 版本、运行时间等 |

## 支持的 Node-RED 版本

- Node-RED 3.1 及更高版本
- Node-RED HA 插件（所有最新版本）
- 支持 HTTP 和 HTTPS 端点

## 安全性

- 支持多种身份验证方式
- 永不读取或存储流中的凭据
- 可配置的调试输出捕获（默认关闭）
- 建议尽可能使用只读访问权限

## 相关文档

- [安全管家主技能](../SKILL.md)
- [系统架构](../ref/architecture.md)
- [检测规则](../ref/detection-rules.md)
- [HA 日志采集器](../ha-log-collector/SKILL.md)

## 许可证

MIT
