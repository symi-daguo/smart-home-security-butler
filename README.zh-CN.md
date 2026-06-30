# 智能家居 AI 安全管家

[English](README.md) | [GitHub](https://github.com/symi-daguo/smart-home-security-butler)

> 姊妹项目：[knx-gateway-skills](https://github.com/symi-daguo/knx-gateway-skills) - KNX 网关、Home Assistant、Node-RED 自动化技能包（操作控制层）

基于 AI 的智能家居安全监控和自动化系统。主动监测 Home Assistant、Node-RED 和 KNX 网关，检测安全威胁、发送告警，并智能生成自动化建议。

## 项目定位

本项目是智能家居的**监控管理层**，与姊妹项目 [knx-gateway-skills](https://github.com/symi-daguo/knx-gateway-skills)（操作控制层）协同工作：

| 项目 | 定位 | 核心能力 |
|------|------|----------|
| **smart-home-security-butler** | 监控管理层 | 安全检测、告警推送、趋势分析、安全评分、AI 对话 |
| **knx-gateway-skills** | 操作控制层 | 设备控制、场景配置、自动化创建、Lovelace 管理、Node-RED 流程 |

两个项目均提供 Agent Skill 技能包，AI 智能体可同时加载，实现「监控 + 控制」闭环。

## 版本

0.6.0

## 更新日志

### v0.6.0 (2026-06-30)

- **GitHub 仓库最佳实践**: 完整 CI/CD 流水线，包含 GitHub Actions、CodeQL 安全扫描、Dependabot 依赖更新
- **Issue 与 PR 模板**: 标准化的 Bug 报告、功能请求和 Pull Request 模板，保证贡献一致性
- **仓库治理**: CODEOWNERS、SECURITY.md、CODE_OF_CONDUCT.md、CONTRIBUTING.md 专业项目管理
- **健康检查端点**: 新增 `/api/health` 端点，支持 Docker 健康检查和监控
- **Docker 健康检查**: Dockerfile 内置 HEALTHCHECK 指令，支持容器编排
- **技术栈升级**: better-sqlite3 12.x、axios 1.18.x、TypeScript target ES2023
- **TypeScript 严格模式**: 新增 noImplicitReturns 和 noFallthroughCasesInSwitch，代码更安全
- **CI 矩阵测试**: 在 Node.js 20.x 和 22.x 上运行测试，确保兼容性
- **版本统一**: package.json / server.ts / Docker / 文档全部对齐 v0.6.0
- **验证通过**: TypeScript 构建通过、Docker 构建成功、容器启动健康

### v0.5.0 (2026-06-30)

- **技术栈全面升级**：Node.js 22 LTS、TypeScript 5.5、Vitest 2、ESLint 9.10、Prettier 3.4，全部对齐 2026 年最新稳定版
- **部署配置统一**：docker-compose.yml、casaos-app.json、batch-deploy.sh、.env.example 四文件环境变量完全对齐（22 个变量）
- **CasaOS 应用商店完善**：新增 KNX、Bark、Server酱 等 10 个环境变量配置项，敏感字段均设为密码类型
- **批量部署脚本升级**：支持完整 22 个环境变量，新增 KNX 双网关、Bark、Server酱 配置支持
- **新增 .gitignore**：标准 Node.js 项目忽略配置
- **清理无效文件**：移除临时测试文件 test-collector.ts
- **TypeScript 编译升级**：target 从 ES2020 升级到 ES2022，更现代的语法支持
- **版本统一**：package.json / SKILL.md / casaos-app.json / 文档均为 v0.5.0
- **验证通过**：TypeScript 编译零错误，依赖安装正常

### v0.4.0 (2026-06-29)

- **Bark 推送通知**：新增 `BarkNotifier`，支持官方 `api.day.app` 和自建服务，iOS 免费推送，可自定义铃声/图标/分组
- **Server酱 推送通知**：新增 `ServerChanNotifier`，通过 Turbo 版 API 推送到微信，免费每天 5 条额度满足安全告警场景
- **微信推送优化**：Markdown 格式消息，标题带严重程度标识，正文含告警详情/时间/等级，微信阅读体验好
- **通知测试功能**：新增 `/api/notifications/test` API，前端设置页每个渠道都有「测试推送」按钮，配置完可立即验证
- **AI 上下文优化**：设备摘要每 5 分钟同步一次，相比完整设备列表可节省约 60% token 消耗
- **低 Token 设计**：系统上下文中仅保留设备类型/来源/房间数量和告警摘要，不传输完整实体列表
- **多渠道告警**：同时支持 Telegram + Bark + Server酱，可在设置页独立配置启用
- **环境变量支持**：`BARK_DEVICE_KEY`、`BARK_BASE_URL`、`SERVERCHAN_SEND_KEY` 支持 Docker 部署配置
- **技能系统完善**：4 个生产级技能（`ha-log-collector`、`nodered-log-collector`、`security-detection`、`automation-generator`），均含 SKILL.md 文档
- **版本与文档对齐**：统一 `package.json` / 服务端 / 诊断页 / 关于弹窗为 v0.4.0；补齐 `.env.example`；API 文档与 `server.ts` 实现对齐

### v0.3.0 (2026-06-29)

- **全板块功能补齐**：概览、空间、场景、设备、安全、Fusion、AI、诊断、设置等页面按钮与卡片均已接线
- **模态框与下拉组件**：新增 `ui.css`，统一模态框、通知面板、用户菜单、全局搜索样式
- **概览页增强**：实时/历史趋势 Tab、`/api/trends` 趋势数据、自定义布局（localStorage 持久化）
- **真实数据统计**：Fusion 卡片与网关侧栏使用采集器实测数据（实体/域/不可用/采集器连接），移除估算假数据
- **房间面板**：控制/环境/自动化/信息四套 Tab 按房间加载真实内容
- **顶栏功能**：健康状态、通知红点、`/api/alerts` 通知列表、全局搜索、关于 Nexus 弹窗
- **场景创建**：AI 生成场景模态框对接 `/api/automation/generate`
- **对话历史**：`/api/chat/sessions` 列表与 `/api/chat/sessions/:id/messages` 历史消息加载
- **视图切换**：日常/专业视图切换 `body.view-pro` 样式
- **版本号统一**：`package.json`、诊断页、关于弹窗、服务端日志均为 v0.3.0
- **验证**：本地与 CasaOS（`192.168.2.45`）`agent-browser` 全页导航、模态框、Fusion 卡片、趋势 Tab、房间 Tab 验证通过

### v0.2.0 (2026-06-29)

- **前端 AI 对话**：Web 界面改为调用真实 `/api/chat`，移除本地 mock 回复
- **设置热重载**：保存系统设置后立即应用数据源、AI、Telegram、检测间隔与日志保留配置
- **新增 API**：`/api/ai/test`、`/api/insights`、`/api/devices/control`、`/api/scenes/activate`
- **设备控制**：概览页与设备页支持通过 API 控制 HA/KNX 设备
- **场景激活**：场景中心与快捷场景支持调用 KNX/HA 真实场景
- **告警处理**：安全中心「处理」按钮对接 `/api/alerts/:id/acknowledge`
- **AI 安全洞察**：概览页洞察卡片基于 `/api/insights` 实时数据
- **设备搜索筛选**：设备管理页搜索框与类型筛选已接线
- **Matter 采集器**：新增 `MatterCollector`，设置页启用后可采集 Matter Hub 设备
- **安全评分修复**：`/api/status` 使用真实 `overall` 分数，移除硬编码 fallback 85 分
- **场景列表**：`/api/scenes` 合并 KNX 真实场景与自动化模板

### v0.1.0

- 初始版本：Nexus Web 界面、多数据源采集、安全检测引擎、Docker 部署

## Docker 部署

### 系统要求：
- Docker & Docker Compose
- 最低 256MB 可用内存
- 1 CPU 核心
- Home Assistant 实例（可选，推荐）
- OpenRouter API Key（用于 AI 对话）

### 快速部署

```bash
git clone <repo-url>
cd smart-home-security-butler
cp .env.example .env
# 编辑 .env 文件，填入配置
docker compose up -d --build
```

### 环境变量配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `OPENROUTER_API_KEY` | OpenRouter API 密钥 | - |
| `OPENROUTER_MODEL` | 主 AI 模型 | `nvidia/nemotron-3-super-120b-a12b:free` |
| `OPENROUTER_FALLBACK_MODEL` | 备用 AI 模型 | `openrouter/free` |
| `HA_BASE_URL` | Home Assistant 地址 | `http://172.17.0.1:8123` |
| `HA_TOKEN` | Home Assistant 长期访问令牌 | - |
| `NODERED_BASE_URL` | Node-RED 地址 | `http://172.17.0.1:1880` |
| `NODERED_TOKEN` | Node-RED 访问令牌 | - |
| `KNX_BASE_URL` | KNX 网关地址 | - |
| `KNX_TOKEN` | KNX 网关令牌 | - |
| `TELEGRAM_BOT_TOKEN` | Telegram 机器人令牌 | - |
| `TELEGRAM_CHAT_ID` | Telegram 聊天 ID | - |
| `SERVERCHAN_SEND_KEY` | Server酱 SendKey（微信推送） | - |
| `BARK_DEVICE_KEY` | Bark 设备密钥（iOS 推送） | - |
| `BARK_BASE_URL` | Bark 服务地址 | `https://api.day.app` |
| `DETECTION_INTERVAL` | 检测间隔（毫秒） | `300000` |
| `LOG_LEVEL` | 日志级别 | `info` |

### 获取 Home Assistant 长期访问令牌

在 Home Assistant 中创建长期访问令牌：

1. 进入 Home Assistant 个人资料
2. 滚动到"长期访问令牌"部分
3. 点击"创建令牌"
4. 输入名称（如 "Smart Home Butler"）
5. 复制生成的令牌并保存到 `.env` 文件

### 配置 Server酱 微信推送

Server酱 可以将安全告警推送到微信，免费版每天 5 条，足以应对核心安全隐患告警场景。

配置步骤：

1. 访问 [Server酱 Turbo 版](https://sct.ftqq.com/)
2. 用微信扫码登录
3. 进入「SendKey」页面，复制你的 SendKey
4. 将 SendKey 填入系统设置 -> 通知设置 -> Server酱 中，或配置环境变量 `SERVERCHAN_SEND_KEY`
5. 点击「测试 Server酱 推送」按钮验证配置是否正确

消息说明：
- 标题格式：`【安全管家-严重程度】告警标题`
- 正文支持 Markdown，包含告警详情、时间、严重程度
- 免费版每天 5 条，仅核心安全告警推送完全够用

### 配置 Bark iOS 推送

Bark 是一款 iOS 端的免费推送工具，支持自建服务端。

配置步骤：

1. 在 App Store 安装「Bark」APP
2. 打开 APP，复制你的设备密钥
3. 将密钥填入系统设置 -> 通知设置 -> Bark 中，或配置环境变量 `BARK_DEVICE_KEY`
4. 可选：配置自定义铃声、分组、图标
5. 点击「测试 Bark 推送」按钮验证配置是否正确

### 验证部署

```bash
# 检查容器状态
docker ps --filter name=smart-home-butler

# 查看日志
docker logs smart-home-butler

# 测试 API
curl http://localhost:3000/api/status

# 测试 AI 对话
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"你好，请介绍一下你自己"}'
```

### API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 服务信息 |
| `/api/status` | GET | 系统状态 |
| `/api/settings` | GET/PUT | 系统设置（保存后立即生效） |
| `/api/insights` | GET | AI 安全洞察摘要 |
| `/api/devices` | GET | 设备列表 |
| `/api/devices/control` | POST | 设备控制 |
| `/api/scenes` | GET | 场景列表（KNX + 模板） |
| `/api/scenes/activate` | POST | 激活场景 |
| `/api/alerts` | GET | 告警列表 |
| `/api/alerts/:id/acknowledge` | POST | 确认告警 |
| `/api/chat` | POST | AI 对话 |
| `/api/ai/test` | POST | AI 连接测试 |
| `/api/collectors/test` | POST | 数据源连接测试 |
| `/api/security-score` | GET | 安全评分 |
| `/api/trends` | GET | 趋势分析 |
| `/api/rooms` | GET | 房间/区域实体统计 |
| `/api/chat/sessions` | GET | AI 对话会话列表 |
| `/api/chat/sessions/:id/messages` | GET | 会话历史消息 |
| `/api/chat/clear` | POST | 清空当前对话 |
| `/api/notifications/test` | POST | 测试通知渠道推送 |
| `/api/detect` | POST | 手动运行安全检测 |
| `/api/templates` | GET | 自动化模板 |
| `/api/automation/generate` | POST | AI 生成自动化 |
| `/api/automation/apply` | POST | 应用自动化到 HA/KNX |
| `/api/collectors` | GET | 采集器列表与状态 |

### CasaOS 部署

已在 **J1900 + CasaOS** 环境（`192.168.2.45`）验证通过：
- 内存占用：约 80-120MB
- CPU 占用：< 5%（空闲）
- 启动时间：< 10 秒
- 与 HA、Node-RED、Mosquitto 等 CasaOS 容器共存稳定
- **采集器实测**：Home Assistant、Node-RED、KNX 网关均已 `connected`，数据来自真实网关
- v0.4.0 通过 `agent-browser` 全页导航、Fusion 真实数据、通知测试、设置 API 验证

#### CasaOS 快捷入口（Web 界面）

安装后有两种方式打开 Nexus 控制台：

1. **应用面板图标（推荐）**  
   `docker-compose.yml` 已包含 `x-casaos` 配置（`port_map: 3000`）。在 CasaOS 应用列表中点击「智能家居 AI 安全管家」图标，即可在浏览器打开 Web 界面。

2. **直接访问**  
   `http://<CasaOS主机IP>:3000`（你的环境为 `http://192.168.2.45:3000`）

> 若自定义安装后图标灰色无法点击：在 CasaOS 应用设置中将 **Web UI 端口** 设为 `3000`，或重新导入带 `x-casaos` 的 compose 文件后重建容器。

#### 数据原则

- 所有统计来自 **真实采集器**（HA 实体、KNX 场景、告警、系统指标），不做离线设备修复
- 设备「不可用」仅作状态展示，反映网关真实回报
- Fusion 卡片显示实体数、域数、采集器连接数等实测值，**不使用估算假数据**

**CasaOS 更新部署**（在开发机同步代码后）：

```bash
# 同步代码到 CasaOS 主机
rsync -avz --exclude node_modules --exclude data --exclude .git --exclude dist \
  ./ symi@192.168.2.45:~/smart-home-butler/

# SSH 到 CasaOS 重建容器
ssh symi@192.168.2.45 'cd ~/smart-home-butler && sudo docker compose up -d --build'
```

或使用部署脚本：

```bash
./scripts/batch-deploy.sh update symi@192.168.2.45
```

## 安装

```bash
npx skills add symi-daguo/smart-home-security-butler
```

## 功能特性

- **多源数据采集**：Home Assistant、Node-RED、KNX 网关
- **全面检测**：离家模式异常、设备故障、能耗异常、门禁违规、环境危害
- **智能通知**：Telegram、Bark（iOS）、Server酱（微信），支持节流和去重
- **自动化生成**：AI 驱动的安全自动化建议
- **趋势分析**：告警趋势、设备健康趋势、能耗趋势、安全评分
- **安全评分**：0-100 分综合安全评分，多维度评估
- **报告生成**：周报和月报，支持文本和 Markdown 格式
- **基线学习**：建立正常模式以减少误报
- **本地处理**：所有数据本地存储，无云端依赖

## 可用技能

| 技能 | 说明 |
|------|------|
| `smart-home-security-butler` | 主技能 - 综合安全监控和管理 |
| `ha-log-collector` | Home Assistant 日志和状态数据采集 |
| `nodered-log-collector` | Node-RED 流日志和状态数据采集 |
| `security-detection` | 安全威胁检测引擎和规则管理 |
| `automation-generator` | 安全自动化场景生成和建议 |

## 项目结构

```
smart-home-security-butler/
  public/                              # Nexus Web UI
    index.html                         # 页面结构
    app.js                             # 前端逻辑
    style.css                          # 主样式
    ui.css                             # 模态框/下拉/趋势组件
  src/
    server.ts                          # HTTP API + 静态资源服务
    index.ts                           # SecurityButler 核心引擎
    types.ts
    config.ts                          # 配置类型（运行时设置见 data/settings.json）
    collectors/                        # HA / Node-RED / KNX / Matter
    detectors/                         # 安全检测器
    automation/                        # 自动化生成与场景构建
    analytics/                         # 趋势分析与报告
    ai/                                # OpenRouter AI Agent
    notifier/                          # Telegram / Bark / Server酱
    storage/sqlite-storage.ts          # SQLite 持久化
  skills/                              # Agent 技能包（见各子目录 SKILL.md）
  data/                                # 运行时数据（settings.json、sqlite）
  scripts/batch-deploy.sh              # CasaOS 批量部署脚本
  docker-compose.yml                   # Docker + x-casaos Web UI 快捷入口
  casaos-app.json                      # CasaOS 应用商店元数据
  Dockerfile
  .env.example                         # 环境变量模板
  package.json
  README.md / README.zh-CN.md
```

## 系统要求

### Home Assistant
- 运行中的 Home Assistant 实例（2024.1+）
- 具有实体读取权限的长期访问令牌
- 环境变量：`HA_TOKEN`

### Node-RED（可选）
- Node-RED 3.1+，启用 Admin API
- 独立版或 HA 插件版（需直接端口访问）
- 环境变量：`NR_TOKEN`

### KNX 网关（可选）
- 带 REST API 的 KNX 网关
- 环境变量：`KNX_TOKEN`

### Telegram 通知
- Telegram 机器人令牌
- 目标聊天 ID
- 环境变量：`TELEGRAM_BOT_TOKEN`、`TELEGRAM_CHAT_ID`

## 快速开始

### 1. 安装

```bash
npm install smart-home-security-butler
```

### 2. 配置

设置环境变量：

```bash
export HA_TOKEN="你的长期访问令牌"
export HA_BASE_URL="http://homeassistant.local:8123"
export TELEGRAM_BOT_TOKEN="你的机器人令牌"
export TELEGRAM_CHAT_ID="你的聊天ID"
```

### 3. 初始化

```typescript
import { SecurityButler } from 'smart-home-security-butler';

const butler = new SecurityButler();
await butler.start();
```

### 4. 监控

```typescript
const status = await butler.getSystemStatus();
console.log(status);
```

## 检测类别

| 类别 | 默认严重等级 | 说明 |
|------|-------------|------|
| 离家模式异常 | 高 | 离家时的异常活动 |
| 设备故障 | 中 | 设备离线、低电量、错误 |
| 能耗异常 | 低 | 异常的功耗 |
| 门禁违规 | 高 | 非预期时间的门窗开启 |
| 环境危害 | 严重 | 烟雾、燃气、漏水检测 |

## 安全评分系统

0-100 分综合安全评分，多维度评估：

| 维度 | 权重 | 说明 |
|------|------|------|
| 设备安全 | 30% | 在线率、故障率、电池健康 |
| 门禁安全 | 25% | 门窗状态、门禁违规 |
| 能耗安全 | 15% | 能耗异常、消费模式 |
| 自动化覆盖 | 15% | 处理率、响应时间 |
| 离家模式安全 | 15% | 离家模式安全、异常活动检测 |

评分等级：A (90-100)、B (80-89)、C (70-79)、D (60-69)、F (<60)

## 报告生成

自动生成安全报告，便于定期审查：

- **周报**：每周安全状况快速概览
- **月报**：月度综合安全分析
- **报告格式**：文本和 Markdown
- **报告内容**：告警趋势、主要风险、设备健康、改进建议

## 架构

```
数据源 → 采集器 → 存储 → 检测引擎 → 通知器
                        │       ↓
                        │  自动化生成器
                        └──→ 分析引擎 → 报告
                                   ↓
                                安全评分
```

## 安全性

- 所有数据本地处理
- 所有集成使用基于令牌的身份验证
- 建议使用最小权限访问
- 通知速率限制防止告警疲劳
- 自动化变更前自动备份

## 明日继续开发

当前完成度约 **80–85%**（CasaOS 生产环境 UI + 采集 + AI + 通知已可用）。建议优先级：

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P1 | `/api/automation/apply` 端到端验证 | 生成后一键写入 HA/KNX |
| P1 | 环境危害检测器 | `detectors/` 中尚未实现 |
| P2 | `ConfigManager.load/save()` | 与 `data/settings.json` 统一 |
| P2 | 单元测试 | `vitest` 框架已配置，尚无测试文件 |
| P3 | Matter Hub 采集 | 设置页可启用，按环境验证 |

**日常操作（CasaOS `192.168.2.45`）**

```bash
# 打开 Web 界面
open http://192.168.2.45:3000
# 或在 CasaOS 应用面板点击「智能家居 AI 安全管家」

# 同步代码并重建
rsync -avz --exclude node_modules --exclude data --exclude .git --exclude dist \
  ./ symi@192.168.2.45:~/smart-home-butler/
ssh symi@192.168.2.45 'cd ~/smart-home-butler && sudo docker compose up -d --build'

# 健康检查
curl http://192.168.2.45:3000/api/status
curl http://192.168.2.45:3000/api/collectors
```

**本地开发**

```bash
npm install && npm run build
node dist/server.js   # http://localhost:3000
```

## 相关项目

- [knx-gateway-skills](https://github.com/symi-daguo/knx-gateway-skills) - KNX 网关自动化技能

## 许可证

MIT

## 仓库

https://github.com/symi-daguo/smart-home-security-butler

## 维护者

symi-daguo (303316404@qq.com)
