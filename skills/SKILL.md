---
name: smart-home-security-butler
description: >-
  Smart Home AI Security Butler - Proactively monitors device status and logs from
  Home Assistant, Node-RED, and KNX Gateways. Identifies security risks including
  away mode anomalies, device faults, energy consumption abnormalities, and access
  control violations. Provides automatic alert notifications via Telegram and other
  channels, generates intelligent automation scene suggestions, and delivers
  comprehensive security trend analysis with weekly/monthly reports. Use when
  monitoring home security, analyzing security events, configuring detection rules,
  setting up alert notifications, generating automation recommendations, viewing
  security trends and scores, or producing security reports.
version: 0.5.0
compatibility: >-
  Requires network access to Home Assistant, Node-RED, and/or KNX Gateway instances
  on a trusted LAN or VPN. Supports HA 2024.1+, Node-RED 3.1+, and KNX Gateway 1.0+.
metadata:
  requires:
    env:
      - HA_TOKEN
  optionalEnv:
    - NR_TOKEN
    - KNX_TOKEN
    - HA_BASE_URL
    - NR_BASE_URL
    - KNX_BASE_URL
    - TELEGRAM_BOT_TOKEN
    - TELEGRAM_CHAT_ID
    - BARK_DEVICE_KEY
    - BARK_BASE_URL
    - SERVERCHAN_SEND_KEY
  primaryEnv: HA_TOKEN
  always: false
  homepage: https://github.com/symi-daguo/smart-home-security-butler
---

# Smart Home AI Security Butler

## Overview

Smart Home AI Security Butler is a comprehensive security monitoring and analysis
system for smart home ecosystems. It integrates with Home Assistant, Node-RED, and
KNX Gateways to provide real-time security threat detection, alerting, and
proactive security recommendations.

## Connection Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| HA Base URL | `http://172.17.0.1:8123` (CasaOS bridge) | Home Assistant instance URL |
| HA Auth | `Authorization: Bearer ${HA_TOKEN}` | Long-lived access token |
| Node-RED Base URL | `http://homeassistant.local:1880` | Node-RED Admin API URL |
| Node-RED Auth | `Authorization: Bearer ${NR_TOKEN}` | Node-RED admin token (optional) |
| KNX Gateway Base URL | `http://ycznwl.local/api/v1` | KNX Gateway REST API URL |
| KNX Gateway Auth | `Authorization: Bearer ${KNX_TOKEN}` | KNX Gateway API token (optional) |
| Telegram Bot Token | - | Bot token for alert notifications |
| Telegram Chat ID | - | Target chat ID for notifications |
| Bark Device Key | - | iOS Bark push device key |
| Bark Base URL | `https://api.day.app` | Bark server URL (supports self-hosted) |
| ServerChan SendKey | - | Server酱 Turbo SendKey for WeChat push |

### Getting API Tokens

**Home Assistant Token:**
1. Open HA frontend -> Profile -> Security
2. Scroll to "Long-Lived Access Tokens"
3. Click "Create Token", enter a name, and copy the token

**Telegram Bot Token:**
1. Message `@BotFather` on Telegram
2. Send `/newbot` and follow instructions
3. Copy the bot token

**Telegram Chat ID:**
1. Message `@userinfobot` or `@myidbot` on Telegram
2. Start the bot to get your chat ID

**Safe token handling:**
- Store tokens in environment variables or your platform's secret store
- Never paste tokens directly into chat conversations
- Reference tokens via environment variables, not inline
- Never hardcode tokens in shared scripts or commit to version control

## Reference Documents

This skill is organized into progressive reference files. Read them in order when
you need detailed information:

| File | Content |
|------|---------|
| [ref/architecture.md](ref/architecture.md) | System architecture, data flow, component design |
| [ref/detection-rules.md](ref/detection-rules.md) | Security detection rule definitions, thresholds, severity levels |
| [ref/notification-channels.md](ref/notification-channels.md) | Notification channel configuration, message templates |
| [ref/api.md](ref/api.md) | Internal API reference for security butler engine |
| [ref/examples.md](ref/examples.md) | Realistic usage examples and security playbooks |

## Sub-Skills

| Skill | Description |
|-------|-------------|
| [ha-log-collector](ha-log-collector/SKILL.md) | Home Assistant log and state data collection |
| [nodered-log-collector](nodered-log-collector/SKILL.md) | Node-RED flow log and status data collection |
| [security-detection](security-detection/SKILL.md) | Security threat detection engine and rule management |
| [automation-generator](automation-generator/SKILL.md) | Security automation scene generation and recommendations |

## Quick Start - Agent Workflow

### Setting up security monitoring

1. **Configure data sources**: Verify connectivity to HA, Node-RED, and KNX Gateway
2. **Enable collectors**: Start log collection from configured sources
3. **Configure detection rules**: Set up detection rules with appropriate thresholds
4. **Set up notifications**: Configure Telegram or other notification channels
5. **Start monitoring**: Begin continuous security monitoring

### Running a security audit

1. **Collect baseline data**: Gather historical device states and logs
2. **Run detection scan**: Execute all enabled detection rules
3. **Review findings**: Analyze detected security issues by severity
4. **Generate recommendations**: Get automation suggestions for each finding
5. **Apply remediations**: Implement recommended security automations

### Typical detection flow

```
HA State Events ──┐
                   ├──► Collectors ──► Storage ──► Detection Engine ──► Notifier
Node-RED Logs ────┤                                       │
                   │                                       ▼
KNX Gateway Data ──┘                            Automation Generator
```

## Detection Categories

| Category | Description | Severity Levels |
|----------|-------------|-----------------|
| Away Mode Anomaly | Unusual activity when home is in away mode | critical / high |
| Device Fault | Offline devices, communication failures, low battery | medium / high |
| Energy Anomaly | Unusual power consumption patterns | low / medium |
| Access Violation | Door/window opening at unexpected times | high / critical |
| Environmental | Smoke, water leak, gas detection | critical |

## Trend Analysis and Reporting

The Security Butler provides comprehensive trend analysis and security reporting
to help users understand their home security posture over time.

### Security Score System

A 0-100 comprehensive security score evaluates home security across multiple
dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Device Safety | 30% | Device online rate, fault rate, battery health |
| Access Control | 25% | Door/window status, access violations, entry patterns |
| Energy Safety | 15% | Energy anomalies, consumption patterns, peak usage |
| Automation Coverage | 15% | Alert resolution rate, response time, automation level |
| Away Mode Safety | 15% | Away mode security, abnormal activity detection |

Score grades:
- A (90-100): Excellent security posture
- B (80-89): Good security with minor improvements
- C (70-79): Adequate security with noticeable gaps
- D (60-69): Below average, significant improvements needed
- F (<60): Poor security, immediate attention required

### Alert Trend Analysis

- **Time-based statistics**: Daily, weekly, and monthly alert counts
- **Category breakdown**: Alerts by detection category with percentage distribution
- **Severity distribution**: Breakdown by critical, high, medium, low, and info
- **Top 10 frequent alert devices**: Devices with most alerts
- **Hourly heatmap data**: Alert distribution across 24 hours
- **Resolution metrics**: Resolution rate and average response time

### Device Status Trends

- **Online rate tracking**: Historical device online rate over time
- **Fault trends**: Device fault count trend over the analysis period
- **State change frequency**: Devices sorted by state change frequency
- **High-frequency devices**: Devices with unusually frequent state changes

### Energy Trends (when energy data available)

- **Consumption statistics**: Daily/weekly/monthly energy usage
- **Comparative analysis**: Week-over-week and month-over-month changes
- **Peak hour identification**: Top consumption hours of the day
- **Top consumers**: Devices with highest energy consumption

### Security Reports

Generate automated weekly or monthly security reports in text or Markdown format:

**Report contents:**
- Period overview (total alerts, resolution rate, security score)
- Alert trend charts and statistics
- Top security risks ranked by severity and frequency
- Device health summary (online rate, battery status, fault devices)
- Automation improvement suggestions
- Security improvement recommendations for next period

## Security Notes

- **Data privacy**: All log data is stored locally. No data is sent to external servers except configured notification channels.
- **Token security**: Always use least-privilege tokens. HA tokens should only have necessary entity read permissions.
- **Network security**: Run monitoring on trusted LAN or VPN. Do not expose HA/NR admin APIs directly to the internet.
- **Notification channels**: Review notification endpoints before configuring. Only send alerts to verified recipients.
- **Detection tuning**: Customize detection thresholds for your environment to reduce false positives.

## Critical Rules

1. **Never disable critical safety detectors** (smoke, water leak, gas) unless explicitly requested by the user.
2. **Always verify automations** before enabling them in production environments.
3. **Detection results are advisory** - always have human review for critical security decisions.
4. **Log retention** should be configured per user privacy requirements.
5. **Notification throttling** must be enabled to prevent alert fatigue during incident storms.

## Common Pitfalls

### Pitfall 1: Not configuring notification throttling
Without rate limiting, a flapping sensor can generate hundreds of notifications per hour. Always set `maxNotificationsPerHour` in the notifier configuration.

### Pitfall 2: Using admin tokens for read-only monitoring
HA tokens with full admin access are unnecessary for monitoring. Create a dedicated user with only entity read permissions for the security butler.

### Pitfall 3: Ignoring baseline learning period
Detection rules need 7-14 days of baseline data to establish normal patterns. Running detection without sufficient baseline data will produce high false positive rates.

### Pitfall 4: Not testing notification channels
Always test notification channels after configuration. A broken notification pipeline means no alerts during real incidents.

## System Limits

| Limit | Default | Description |
|-------|---------|-------------|
| Max data sources | 10 | Total HA + Node-RED + KNX instances |
| Detection rules | 50 | Maximum enabled detection rules |
| Log retention | 30 days | Default log storage duration |
| Notification rate | 60/hour | Max notifications per hour |
| Detection interval | 5 min | Minimum detection scan interval |
| Concurrent detectors | 10 | Max parallel detection tasks |
