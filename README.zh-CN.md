# 智能家居 AI 安全管家

> AI 驱动的智能家居安全监控与自动化系统

[English](README.md) | [GitHub](https://github.com/symi-daguo/smart-home-security-butler) | [问题反馈](https://github.com/symi-daguo/smart-home-security-butler/issues) | [版本发布](https://github.com/symi-daguo/smart-home-security-butler/releases)

> 姊妹项目：[knx-gateway-skills](https://github.com/symi-daguo/knx-gateway-skills) - KNX 网关、Home Assistant、Node-RED 自动化技能包（操作控制层）

基于 AI 的智能家居安全监控和自动化系统。主动监测 Home Assistant、Node-RED 和 KNX 网关，检测安全威胁、发送告警，并智能生成自动化建议。

---

## 目录

- [快速开始](#快速开始)
- [功能特性](#功能特性)
- [配置说明](#配置说明)
- [API 参考](#api-参考)
- [检测类别](#检测类别)
- [安全评分系统](#安全评分系统)
- [项目结构](#项目结构)
- [系统要求](#系统要求)
- [版本信息](#版本信息)
- [相关项目](#相关项目)
- [许可证](#许可证)

---

## 快速开始

### 1. Docker 部署（推荐）

```bash
git clone https://github.com/symi-daguo/smart-home-security-butler.git
cd smart-home-security-butler
cp .env.example .env
# 编辑 .env 文件填入配置
docker compose up -d --build
```

访问 Web 界面：http://localhost:3000

### 2. 验证安装

```bash
# 检查容器健康状态
curl http://localhost:3000/api/health

# 查看系统状态
curl http://localhost:3000/api/status
```

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **多源数据采集** | Home Assistant、Node-RED、KNX 网关、Matter Hub |
| **安全检测引擎** | 离家模式异常、设备故障、能耗异常、门禁违规 |
| **AI 智能助手** | 自然语言对话、安全分析、自动化生成 |
| **多渠道告警** | Telegram、Bark（iOS）、Server酱（微信） |
| **安全评分系统** | 0-100 分综合评分，5 大维度评估 |
| **趋势分析** | 告警趋势、设备健康、能耗模式 |
| **本地数据处理** | 所有数据本地存储，无云端依赖 |
| **CasaOS 适配** | 应用商店一键部署，快捷图标直达 |

---

## 配置说明

### 环境变量

| 变量 | 必填 | 说明 | 默认值 |
|------|------|------|--------|
| `OPENROUTER_API_KEY` | 是 | OpenRouter API 密钥 | - |
| `OPENROUTER_MODEL` | 否 | 主 AI 模型 | `nvidia/nemotron-3-super-120b-a12b:free` |
| `HA_BASE_URL` | 推荐 | Home Assistant 地址 | `http://172.17.0.1:8123` |
| `HA_TOKEN` | 推荐 | HA 长期访问令牌 | - |
| `NODERED_BASE_URL` | 否 | Node-RED 地址 | `http://172.17.0.1:1880` |
| `NODERED_TOKEN` | 否 | Node-RED 令牌 | - |
| `KNX_BASE_URL` | 否 | KNX 网关地址 | - |
| `KNX_TOKEN` | 否 | KNX 网关令牌 | - |
| `TELEGRAM_BOT_TOKEN` | 否 | Telegram 机器人令牌 | - |
| `TELEGRAM_CHAT_ID` | 否 | Telegram 聊天 ID | - |
| `BARK_DEVICE_KEY` | 否 | Bark 设备密钥 | - |
| `SERVERCHAN_SEND_KEY` | 否 | Server酱 SendKey | - |
| `DETECTION_INTERVAL` | 否 | 检测间隔（毫秒） | `300000` |
| `TZ` | 否 | 时区 | `Asia/Shanghai` |

### 获取 Home Assistant 令牌

1. 进入 Home Assistant 个人资料页面
2. 滚动到「长期访问令牌」部分
3. 点击「创建令牌」
4. 输入名称（如 "Smart Home Butler"）
5. 复制令牌并填入 `.env` 文件

### 配置微信推送（Server酱）

1. 访问 [Server酱 Turbo 版](https://sct.ftqq.com/)
2. 微信扫码登录
3. 进入「SendKey」页面，复制你的 SendKey
4. 在系统设置 -> 通知设置 -> Server酱 中配置，或设置环境变量 `SERVERCHAN_SEND_KEY`
5. 点击「测试推送」按钮验证配置

> 免费版每天 5 条消息，足够核心安全告警使用

### 配置 iOS 推送（Bark）

1. App Store 安装「Bark」APP
2. 打开 APP，复制设备密钥
3. 在系统设置 -> 通知设置 -> Bark 中配置，或设置环境变量 `BARK_DEVICE_KEY`
4. 可选：配置自定义铃声、分组、图标

---

## API 参考

### 系统接口

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/health` | GET | 健康检查 |
| `/api/status` | GET | 系统状态与指标 |
| `/api/settings` | GET/PUT | 查看/更新设置 |

### 设备与场景

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/devices` | GET | 设备/实体列表 |
| `/api/devices/control` | POST | 控制设备 |
| `/api/scenes` | GET | 场景与自动化列表 |
| `/api/scenes/activate` | POST | 激活场景 |
| `/api/rooms` | GET | 房间/区域统计 |

### 安全相关

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/alerts` | GET | 安全告警列表 |
| `/api/alerts/:id/acknowledge` | POST | 确认告警 |
| `/api/alerts/:id/close` | POST | 关闭告警 |
| `/api/security-score` | GET | 安全评分详情 |
| `/api/detect` | POST | 手动运行检测 |
| `/api/trends` | GET | 趋势分析数据 |
| `/api/insights` | GET | AI 安全洞察 |

### AI 对话

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/chat` | POST | 与 AI 助手对话 |
| `/api/chat/sessions` | GET | 对话会话列表 |
| `/api/chat/sessions/:id/messages` | GET | 会话历史消息 |
| `/api/chat/clear` | POST | 清空对话历史 |
| `/api/ai/test` | POST | 测试 AI 连接 |

### 自动化

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/templates` | GET | 自动化模板 |
| `/api/automation/generate` | POST | AI 生成自动化 |
| `/api/automation/apply` | POST | 应用自动化 |

### 采集与通知

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/collectors` | GET | 数据采集器列表 |
| `/api/collectors/test` | POST | 测试采集器连接 |
| `/api/notifications/test` | POST | 测试通知渠道 |

---

## 检测类别

| 类别 | 严重等级 | 说明 |
|------|----------|------|
| 离家模式异常 | 高 | 离家模式下设备异常开启 |
| 设备故障 | 中 | 设备离线、不可用、错误状态 |
| 能耗异常 | 低 | 异常功耗模式 |
| 门禁违规 | 严重 | 非预期时间门窗开启 |

---

## 安全评分系统

0-100 分综合安全评分，5 大维度评估：

| 维度 | 权重 | 说明 |
|------|------|------|
| 设备安全 | 30% | 在线率、故障率、电池健康 |
| 门禁安全 | 25% | 门窗状态、门禁违规 |
| 能耗安全 | 15% | 能耗异常、消费模式 |
| 自动化覆盖 | 15% | 处理率、响应时间 |
| 离家模式安全 | 15% | 离家模式安全、异常活动检测 |

**等级划分**：A (90-100) | B (80-89) | C (70-79) | D (60-69) | F (<60)

---

## 项目结构

```
smart-home-security-butler/
├── .github/
│   ├── agents/           # 自定义 Copilot 智能体
│   ├── workflows/        # CI/CD 与 CodeQL 工作流
│   ├── ISSUE_TEMPLATE/   # Issue 模板
│   ├── CODEOWNERS        # 代码审查责任人
│   ├── CONTRIBUTING.md   # 贡献指南
│   └── dependabot.yml    # 依赖自动更新
├── skills/               # Agent 技能包
│   ├── SKILL.md          # 主技能定义
│   ├── ha-log-collector/
│   ├── nodered-log-collector/
│   ├── security-detection/
│   └── automation-generator/
├── src/                  # 源代码
│   ├── collectors/       # 数据采集层
│   ├── detectors/        # 安全检测引擎
│   ├── ai/               # AI 智能体与大模型集成
│   ├── analytics/        # 趋势分析与报告
│   ├── automation/       # 自动化生成
│   ├── notifier/         # 通知渠道
│   ├── storage/          # 数据持久化
│   ├── server.ts         # HTTP API 服务
│   └── index.ts          # 核心管家类
├── public/               # Web UI 前端
├── scripts/              # 部署脚本
├── Dockerfile            # 容器构建配置
├── docker-compose.yml    # Docker Compose 文件
├── casaos-app.json       # CasaOS 应用商店配置
├── SECURITY.md           # 安全策略
└── README.md             # 本文档
```

---

## 版本信息

**当前版本**：0.6.1

### v0.6.1 (2026-06-30)

- **自定义 Copilot 智能体**：新增 3 个专用智能体（安全审查、文档维护、故障排查），位于 `.github/agents/` 目录
- **GitHub Agents 支持**：仓库完整支持 GitHub Copilot 自定义智能体功能
- **README 优化**：新增目录导航，改进文档结构，提升阅读体验
- **文档精简**：简化版本历史，仅展示最新版本更新记录
- **版本策略**：采用语义化版本（主版本.次版本.修订号），小迭代使用修订号

---

## 系统要求

- **CPU**：1 核心及以上
- **内存**：最低 128MB，推荐 256MB
- **存储**：500MB 以上（数据与日志）
- **Docker**：Docker & Docker Compose
- **Home Assistant**：2024.1+（推荐）

**CasaOS 实测**（J1900 处理器）：
- 内存占用：约 80-120MB
- CPU 占用：空闲 < 5%
- 启动时间：< 10 秒

---

## 相关项目

- [knx-gateway-skills](https://github.com/symi-daguo/knx-gateway-skills) - KNX 网关自动化技能（操作控制层）

---

## 许可证

MIT

---

## 维护者

symi-daguo
