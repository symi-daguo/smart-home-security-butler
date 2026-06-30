# Security Detection Engine

Security threat detection engine for Smart Home Security Butler.

## Overview

Security Detection Engine processes collected smart home data through configurable
detection rules to identify security threats, anomalies, and potential issues.

## Features

- Multiple detection categories (away mode, device fault, energy, door access, environmental)
- Configurable severity levels per rule
- Real-time and periodic detection modes
- Baseline learning for anomaly detection
- Alert lifecycle management (detect, acknowledge, resolve, silence)
- False positive tracking and automatic threshold tuning
- On-demand security scanning

## Detection Categories

| Category | Default Severity | Description |
|----------|-----------------|-------------|
| Away Mode Anomaly | High | Unusual activity when home is away |
| Device Fault | Medium | Offline devices, low battery, communication errors |
| Energy Anomaly | Low | Unusual power consumption patterns |
| Door Access Violation | High | Door/window openings at unexpected times |
| Environmental Hazard | Critical | Smoke, gas, water leak detection |

## Installation

This sub-skill is included with the Smart Home Security Butler. No separate
installation is required.

## Configuration

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DETECTION_INTERVAL` | 300s | Detection scan interval (seconds) |
| `BASELINE_LEARNING_DAYS` | 14 | Baseline learning period (days) |

### Rule Configuration

Each detection rule can be configured via API:

```json
{
  "id": "device-fault",
  "enabled": true,
  "severity": "medium",
  "config": {
    "offlineTimeout": 300,
    "batteryWarning": 20,
    "batteryCritical": 10
  },
  "notification": {
    "enabled": true,
    "channels": ["telegram", "homeassistant"],
    "throttle": {
      "maxPerHour": 10,
      "cooldownSeconds": 300
    }
  }
}
```

## Severity Levels

| Level | Notification |
|-------|--------------|
| Critical | All channels, immediate |
| High | Primary channels, immediate |
| Medium | Primary channels, throttled |
| Low | Summary only |
| Info | Log only |

## Alert Lifecycle

```
Detected → Active → Acknowledged → Resolved → Closed
              ↓
            Escalated (if unacknowledged)
```

## Baseline Learning

- Default learning period: 14 days
- During learning: observation mode, no notifications
- Baselines: time-of-day patterns, per-entity ranges, event frequencies
- Progress is tracked and reported daily

## Related Documentation

- [Main Security Butler Skill](../SKILL.md)
- [Detection Rules Reference](../ref/detection-rules.md)
- [System Architecture](../ref/architecture.md)
- [Notification Channels](../ref/notification-channels.md)

## License

MIT
