# Notification Channels

## Overview

The notification system delivers security alerts through multiple channels with
configurable routing, throttling, and escalation policies.

## Supported Channels

### 1. Telegram (Primary)

**Configuration:**
```yaml
type: telegram
enabled: true
bot_token: ${TELEGRAM_BOT_TOKEN}
chat_id: ${TELEGRAM_CHAT_ID}
parse_mode: HTML
```

**Features:**
- Rich formatting (bold, links, code blocks)
- Image and snapshot attachments
- Inline buttons for quick actions
- Message threading for related alerts

**Message Types:**
- Alert notifications with severity indicators
- Daily/weekly security summaries
- System status reports
- Interactive action prompts (acknowledge, silence, view details)

### 2. Home Assistant Persistent Notifications

**Configuration:**
```yaml
type: homeassistant
enabled: true
base_url: ${HA_BASE_URL}
token: ${HA_TOKEN}
```

**Features:**
- Notifications appear in HA sidebar
- Persistent until acknowledged
- Supports notification categories
- Can trigger mobile app push via HA

### 3. Email (SMTP)

**Configuration:**
```yaml
type: email
enabled: false
smtp_host: smtp.example.com
smtp_port: 587
smtp_secure: true
username: alerts@example.com
password: ${EMAIL_PASSWORD}
from: alerts@example.com
to: admin@example.com
```

**Use Cases:**
- Daily security reports
- Critical incident digests
- Audit trail delivery

### 4. Webhook

**Configuration:**
```yaml
type: webhook
enabled: false
url: https://example.com/webhook
method: POST
headers:
  Authorization: Bearer ${WEBHOOK_TOKEN}
content_type: application/json
```

**Use Cases:**
- Integration with other systems
- Custom notification flows
- IT/security team dashboards
- Incident management systems

## Message Templates

### Alert Message Template

```
[{{severity_icon}} {{severity_label}}] {{title}}

{{description}}

**Detected:** {{detected_at}}
**Source:** {{source}}
**Rule:** {{rule_id}}

{{action_buttons}}
```

### Severity Icons

| Severity | Icon | Label |
|----------|------|-------|
| Critical | 🔴 | CRITICAL |
| High | 🟠 | HIGH |
| Medium | 🟡 | MEDIUM |
| Low | 🔵 | LOW |
| Info | ⚪ | INFO |

### Summary Template

```
📊 Security Summary - {{period}}

**Alerts by Severity:**
🔴 Critical: {{critical_count}}
🟠 High: {{high_count}}
🟡 Medium: {{medium_count}}
🔵 Low: {{low_count}}

**Top Issues:**
{{top_issues}}

**System Status:**
- Collectors: {{collector_status}}
- Detection Engine: {{detection_status}}
- Storage: {{storage_status}}
```

## Routing and Throttling

### Severity-based Routing

| Severity | Channels | Throttle |
|----------|----------|----------|
| Critical | All channels | None (immediate) |
| High | Telegram, HA, Webhook | 5 min cooldown per rule |
| Medium | Telegram, HA | 15 min cooldown per rule |
| Low | Daily summary only | Aggregated |
| Info | Weekly summary only | Aggregated |

### Rate Limiting

**Global limits:**
```yaml
max_notifications_per_hour: 60
max_notifications_per_day: 500
```

**Per-rule limits:**
```yaml
cooldown_seconds: 300
max_alerts_per_hour: 10
```

### Deduplication

Alerts are deduplicated based on:
1. Rule ID
2. Entity/source ID
3. Time window (configurable, default 5 minutes)

Deduplicated alerts are counted but not re-sent. A summary is sent after
the deduplication window closes.

## Escalation Rules

**Example escalation policy:**
```yaml
escalation:
  - trigger: critical_unacknowledged
    delay: 300
    action: repeat_notification
    channels: [telegram, email]
  - trigger: critical_unacknowledged
    delay: 900
    action: notify_on_call
    target: secondary_contact
  - trigger: high_count_exceeded
    count: 5
    window: 3600
    action: send_digest
    channels: [email]
```

## Interactive Actions

Telegram notifications support inline buttons for quick actions:

| Button | Action |
|--------|--------|
| Acknowledge | Marks alert as acknowledged, stops escalation |
| Silence 1h | Silences similar alerts for 1 hour |
| Silence 24h | Silences similar alerts for 24 hours |
| View Details | Opens dashboard or more information |
| Disable Rule | Temporarily disables the detection rule |

## Testing Notifications

### Send Test Alert

```
POST /api/notifications/test
{
  "channel": "telegram",
  "severity": "medium",
  "title": "Test Alert",
  "message": "This is a test notification from Security Butler."
}
```

### Verify Channel Configuration

```
POST /api/notifications/verify
{
  "channel": "telegram",
  "config": {
    "bot_token": "...",
    "chat_id": "..."
  }
}
```

## Troubleshooting

### Telegram Not Not Received

1. Verify bot token is correct
2. Check chat ID format (should be numeric, e.g., -1001234567890 for groups)
3. Ensure bot has been added to the group (for group chats)
4. Check /api/notifications/log for delivery errors

### Notification Delay

1. Check throttle/cooldown settings
2. Verify collector is receiving data in real-time
3. Check system load and detection backlog
4. Review network connectivity to notification endpoints
