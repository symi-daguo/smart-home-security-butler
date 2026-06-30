# Smart Home Security Butler

[中文文档](README.zh-CN.md) | [GitHub](https://github.com/symi-daguo/smart-home-security-butler)

> Sister project: [knx-gateway-skills](https://github.com/symi-daguo/knx-gateway-skills) - KNX Gateway, Home Assistant, and Node-RED automation skill pack (operation & control layer)

AI-powered security monitoring and automation for smart homes. Proactively monitors
Home Assistant, Node-RED, and KNX Gateways to detect security threats, send
alerts, and generate intelligent automation recommendations.

## Project Overview

This project is the **monitoring & management layer** of the smart home ecosystem, working alongside its sister project [knx-gateway-skills](https://github.com/symi-daguo/knx-gateway-skills) (the operation & control layer):

| Project | Role | Core Capabilities |
|---------|------|-------------------|
| **smart-home-security-butler** | Monitoring Layer | Security detection, alert notification, trend analysis, security scoring, AI conversation |
| **knx-gateway-skills** | Control Layer | Device control, scene configuration, automation creation, Lovelace management, Node-RED flows |

Both projects provide Agent Skill packages. AI agents can load both to achieve a complete "monitor + control" closed loop.

## Version

0.6.0

## Changelog

### v0.6.0 (2026-06-30)

- **GitHub repository best practices**: Complete CI/CD pipeline with GitHub Actions, CodeQL security scanning, Dependabot dependency updates
- **Issue & PR templates**: Standardized bug report, feature request, and pull request templates for consistent contribution
- **Repository governance**: CODEOWNERS, SECURITY.md, CODE_OF_CONDUCT.md, CONTRIBUTING.md for professional project management
- **Health check endpoint**: New `/api/health` endpoint for Docker health checks and monitoring
- **Docker healthcheck**: Built-in HEALTHCHECK instruction in Dockerfile for container orchestration
- **Tech stack upgrade**: better-sqlite3 12.x, axios 1.18.x, TypeScript target ES2023
- **TypeScript strictness**: Added noImplicitReturns and noFallthroughCasesInSwitch for safer code
- **CI matrix testing**: Tests run on Node.js 20.x and 22.x for compatibility verification
- **Version alignment**: package.json / server.ts / Docker / docs all at v0.6.0
- **Verified**: TypeScript build passes, Docker build succeeds, container starts healthy

### v0.5.0 (2026-06-30)

- **Full tech stack upgrade**: Node.js 22 LTS, TypeScript 5.5, Vitest 2, ESLint 9.10, Prettier 3.4 - all aligned with 2026 latest stable
- **Unified deployment config**: docker-compose.yml, casaos-app.json, batch-deploy.sh, .env.example all aligned (22 env vars total)
- **CasaOS app store improvements**: 10 new env vars including KNX, Bark, ServerChan; sensitive fields marked as password type
- **Batch deploy script upgrade**: Full 22-env-var support with KNX dual gateway, Bark, ServerChan config
- **Added .gitignore**: Standard Node.js project ignore rules
- **Cleanup**: Removed temporary test file test-collector.ts
- **TypeScript upgrade**: target ES2020 -> ES2022, more modern syntax support
- **Version alignment**: package.json / SKILL.md / casaos-app.json / docs all at v0.5.0
- **Verified**: Zero TypeScript errors, dependencies install cleanly

### v0.4.0 (2026-06-29)

- **Bark push notification**: Added `BarkNotifier`, supports official `api.day.app` and self-hosted servers, free iOS push with custom sound/icon/group
- **ServerChan push notification**: Added `ServerChanNotifier`, WeChat push via Turbo API, 5 free messages/day is enough for critical security alerts
- **WeChat message formatting**: Markdown-rich messages with severity in title, alert details/timestamp/level in body, optimized for WeChat readability
- **Notification test API**: New `/api/notifications/test` endpoint, each channel has a "Test Push" button in settings for instant verification
- **AI context optimization**: Periodic device summary sync (every 5 min), reduces token consumption by ~60% vs full device list in context
- **Token-efficient design**: Device type/source/room counts + alert summary instead of full entity list in system context
- **Multi-channel alerts**: Telegram + Bark + ServerChan, configurable independently via settings page
- **Env var support**: `BARK_DEVICE_KEY`, `BARK_BASE_URL`, `SERVERCHAN_SEND_KEY` for Docker deployments
- **Skill system**: 4 production skills with SKILL.md docs
- **Version/doc alignment**: v0.4.0 unified across package, server, UI; `.env.example` added; API docs match `server.ts`

### v0.3.0 (2026-06-29)

- **Full UI wiring**: Overview, spaces, scenes, devices, security, Fusion, AI, diagnostics, and settings pages are fully connected
- **Modal & dropdown components**: Added `ui.css` for consistent modals, notifications, user menu, and global search
- **Overview enhancements**: Live/trends tabs, `/api/trends` data, customizable layout (localStorage)
- **Fusion page**: Protocol/core/ecosystem cards open detail modals with real device/scene/automation/event stats
- **Room panel**: Control/environment/automation/info tabs load room-specific content
- **Top bar**: Health status, notification badge, `/api/alerts` feed, global search, About Nexus modal
- **Scene creation**: AI scene modal wired to `/api/automation/generate`
- **Chat history**: `/api/chat/sessions` list and `/api/chat/sessions/:id/messages` message loading
- **View toggle**: Daily/pro view switches `body.view-pro` styling
- **Version alignment**: `package.json`, diagnostics page, about modal, and server logs at v0.3.0
- **Verification**: `agent-browser` pass on local and CasaOS (`192.168.2.45`)

### v0.2.0 (2026-06-29)

- **Web AI chat**: UI now calls real `/api/chat` instead of local mock responses
- **Settings hot-reload**: Saving settings immediately applies collectors, AI, Telegram, and system params
- **New APIs**: `/api/ai/test`, `/api/insights`, `/api/devices/control`, `/api/scenes/activate`
- **Device control**: Overview and devices pages can control HA/KNX devices via API
- **Scene activation**: Scene center triggers real KNX/HA scenes
- **Alert handling**: Security center acknowledge button wired to API
- **AI insights**: Overview card powered by `/api/insights`
- **Device search/filter**: Devices page search and type filter connected
- **Matter collector**: Added `MatterCollector` for Matter Hub integration
- **Security score fix**: `/api/status` returns real scores without hardcoded fallback
- **Scene list**: `/api/scenes` merges KNX scenes with automation templates

### v0.1.0

- Initial release: Nexus UI, multi-source collectors, detection engine, Docker deployment

## Docker Deployment

### System Requirements:
- Docker & Docker Compose
- Minimum 256MB available RAM
- 1 CPU core
- Home Assistant instance (optional, recommended)
- OpenRouter API Key (for AI conversations)

### Quick Deployment

```bash
git clone <repo-url>
cd smart-home-security-butler
cp .env.example .env
# Edit .env file with your configuration
docker compose up -d --build
```

### Environment Variables Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENROUTER_API_KEY` | OpenRouter API key | - |
| `OPENROUTER_MODEL` | Primary AI model | `nvidia/nemotron-3-super-120b-a12b:free` |
| `OPENROUTER_FALLBACK_MODEL` | Fallback AI model | `openrouter/free` |
| `HA_BASE_URL` | Home Assistant URL | `http://172.17.0.1:8123` |
| `HA_TOKEN` | Home Assistant long-lived access token | - |
| `NODERED_BASE_URL` | Node-RED URL | `http://172.17.0.1:1880` |
| `NODERED_TOKEN` | Node-RED access token | - |
| `KNX_BASE_URL` | KNX Gateway URL | - |
| `KNX_TOKEN` | KNX Gateway token | - |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | - |
| `TELEGRAM_CHAT_ID` | Telegram chat ID | - |
| `DETECTION_INTERVAL` | Detection interval (ms) | `300000` |
| `LOG_LEVEL` | Log level | `info` |

### Getting a Home Assistant Long-Lived Access Token

Create a long-lived access token in Home Assistant:

1. Go to your Home Assistant profile
2. Scroll to "Long-Lived Access Tokens" section
3. Click "Create Token"
4. Enter a name (e.g., "Smart Home Butler")
5. Copy the generated token and save it in your `.env` file

### Verify Deployment

```bash
# Check container status
docker ps --filter name=smart-home-butler

# View logs
docker logs smart-home-butler

# Test API
curl http://localhost:3000/api/status

# Test AI chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, please introduce yourself"}'
```

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | System status, entity metrics, gateway info |
| `/api/settings` | GET/PUT | Settings (hot-reload on save) |
| `/api/insights` | GET | AI security insight summary |
| `/api/devices` | GET | Device/entity list |
| `/api/devices/control` | POST | Control HA/KNX device |
| `/api/scenes` | GET | Scenes (KNX + templates) |
| `/api/scenes/activate` | POST | Activate scene |
| `/api/alerts` | GET | Alerts |
| `/api/alerts/:id/acknowledge` | POST | Acknowledge alert |
| `/api/chat` | POST | AI chat |
| `/api/chat/sessions` | GET | Chat sessions |
| `/api/chat/sessions/:id/messages` | GET | Session messages |
| `/api/chat/clear` | POST | Clear chat |
| `/api/ai/test` | POST | AI connection test |
| `/api/collectors` | GET | Collector list |
| `/api/collectors/test` | POST | Test collector connection |
| `/api/notifications/test` | POST | Test notification channel |
| `/api/rooms` | GET | Room/area entity stats |
| `/api/security-score` | GET | Security score |
| `/api/trends` | GET | Trend analysis |
| `/api/detect` | POST | Run detection manually |
| `/api/templates` | GET | Automation templates |
| `/api/automation/generate` | POST | Generate automation |
| `/api/automation/apply` | POST | Apply automation to HA/KNX |

### CasaOS Deployment

Verified on **J1900 + CasaOS** (`192.168.2.45`):
- Memory usage: ~80-120MB
- CPU usage: < 5% (idle)
- Startup time: < 10 seconds
- Stable coexistence with HA, Node-RED, Mosquitto on CasaOS
- v0.4.0 verified on CasaOS via `agent-browser` and live collector data

**Update on CasaOS**:

```bash
rsync -avz --exclude node_modules --exclude data --exclude .git --exclude dist \
  ./ symi@192.168.2.45:~/smart-home-butler/
ssh symi@192.168.2.45 'cd ~/smart-home-butler && sudo docker compose up -d --build'
```

## Installation

```bash
npx skills add symi-daguo/smart-home-security-butler
```

## Features

- **Multi-source data collection**: Home Assistant, Node-RED, KNX Gateway
- **Comprehensive detection**: Away mode anomalies, device faults, energy anomalies, door access violations, environmental hazards
- **Smart notifications**: Telegram, HA notifications, with throttling and deduplication
- **Automation generation**: AI-powered security automation recommendations
- **Trend analysis**: Alert trends, device health trends, energy trends, and security scoring
- **Security scoring**: 0-100 comprehensive security score with multi-dimensional evaluation
- **Reporting**: Weekly and monthly security reports in text and Markdown formats
- **Baseline learning**: Establishes normal patterns to reduce false positives
- **Local processing**: All data stays local, no cloud dependency

## Available Skills

| Skill | Description |
|-------|-------------|
| `smart-home-security-butler` | Main skill - comprehensive security monitoring and management |
| `ha-log-collector` | Home Assistant log and state data collection |
| `nodered-log-collector` | Node-RED flow log and status data collection |
| `security-detection` | Security threat detection engine and rule management |
| `automation-generator` | Security automation scene generation and recommendations |

## Project Structure

```
smart-home-security-butler/
  skills/                              # All skills
    SKILL.md                           # Main skill definition
    ref/                               # Reference documents
      architecture.md                  # System architecture
      detection-rules.md               # Detection rule definitions
      notification-channels.md         # Notification channel config
      api.md                           # Internal API reference
      examples.md                      # Usage examples
    ha-log-collector/                  # HA log collector sub-skill
      SKILL.md
      README.md
      README.zh-CN.md
    nodered-log-collector/             # Node-RED log collector sub-skill
      SKILL.md
      README.md
      README.zh-CN.md
    security-detection/                # Security detection engine
      SKILL.md
      README.md
      README.zh-CN.md
    automation-generator/              # Automation generator
      SKILL.md
      README.md
      README.zh-CN.md
  src/                                 # Source code
    index.ts                           # Main entry point
    types.ts                           # Type definitions
    config.ts                          # Configuration management
    collectors/                        # Data collectors
      base-collector.ts                # Collector base class
      ha-collector.ts                  # HA data collector
      nodered-collector.ts             # Node-RED data collector
      knx-collector.ts                 # KNX Gateway data collector
    detectors/                         # Security detectors
      base-detector.ts                 # Detector base class
      away-mode-detector.ts            # Away mode anomaly detection
      device-fault-detector.ts         # Device fault detection
      energy-detector.ts               # Energy anomaly detection
      door-access-detector.ts          # Door access violation detection
    analytics/                         # Trend analysis and reporting
      trend-analyzer.ts                # Trend analysis engine
      report-generator.ts              # Security report generator
    notifier/                          # Notification module
      notifier-base.ts                 # Notifier base class
      telegram-notifier.ts             # Telegram notifier
    storage/                           # Storage module
      sqlite-storage.ts                # SQLite storage
  README.md                            # English documentation
  README.zh-CN.md                      # Chinese documentation
  package.json                         # Package configuration
```

## Requirements

### Home Assistant
- Running Home Assistant instance (2024.1+)
- Long-lived access token with entity read permissions
- Environment variable: `HA_TOKEN`

### Node-RED (Optional)
- Node-RED 3.1+ with Admin API enabled
- Either standalone or HA Add-on with direct port access
- Environment variable: `NR_TOKEN`

### KNX Gateway (Optional)
- KNX Gateway with REST API
- Environment variable: `KNX_TOKEN`

### Telegram Notifications
- Telegram bot token
- Target chat ID
- Environment variables: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`

## Quick Start

### 1. Install

```bash
npm install smart-home-security-butler
```

### 2. Configure

Set environment variables:

```bash
export HA_TOKEN="your-long-lived-access-token"
export HA_BASE_URL="http://homeassistant.local:8123"
export TELEGRAM_BOT_TOKEN="your-bot-token"
export TELEGRAM_CHAT_ID="your-chat-id"
```

### 3. Initialize

```typescript
import { SecurityButler } from 'smart-home-security-butler';

const butler = new SecurityButler();
await butler.start();
```

### 4. Monitor

```typescript
const status = await butler.getSystemStatus();
console.log(status);
```

## Detection Categories

| Category | Default Severity | Description |
|----------|-----------------|-------------|
| Away Mode Anomaly | High | Unusual activity when home is away |
| Device Fault | Medium | Offline devices, low battery, errors |
| Energy Anomaly | Low | Unusual power consumption |
| Door Access Violation | High | Door/window openings at unexpected times |
| Environmental Hazard | Critical | Smoke, gas, water leak detection |

## Security Scoring System

Comprehensive 0-100 security score evaluating multiple dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Device Safety | 30% | Online rate, fault rate, battery health |
| Access Control | 25% | Door/window status, access violations |
| Energy Safety | 15% | Energy anomalies, consumption patterns |
| Automation Coverage | 15% | Resolution rate, response time |
| Away Mode Safety | 15% | Away mode security, abnormal activity |

Score grades: A (90-100), B (80-89), C (70-79), D (60-69), F (<60)

## Reporting

Generate automated security reports for regular review:

- **Weekly reports**: Quick overview of weekly security status
- **Monthly reports**: Comprehensive monthly security analysis
- **Report formats**: Text and Markdown
- **Contents**: Alert trends, top risks, device health, improvement recommendations

## Architecture

```
Data Sources → Collectors → Storage → Detection Engine → Notifier
                                    │       ↓
                                    │  Automation Generator
                                    └──→ Analytics Engine → Reports
                                               ↓
                                        Security Scoring
```

## Security

- All data processed locally
- Token-based authentication for all integrations
- Least-privilege access recommended
- Notification rate limiting to prevent alert fatigue
- Automatic backup before automation changes

## Related Projects

- [knx-gateway-skills](https://github.com/symi-daguo/knx-gateway-skills) - KNX Gateway automation skills

## License

MIT

## Repository

https://github.com/symi-daguo/smart-home-security-butler

## Maintainer

symi-daguo (303316404@qq.com)
