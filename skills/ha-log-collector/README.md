# HA Log Collector

Home Assistant data collector for Smart Home Security Butler.

## Overview

HA Log Collector connects to Home Assistant and collects real-time state changes,
historical log data, device information, and system health metrics for security
monitoring and analysis.

## Features

- Real-time entity state changes via WebSocket API
- Historical logbook and state history via REST API
- Device and entity registry synchronization
- System health monitoring
- Configurable entity filtering (include/exclude patterns)
- Automatic reconnection with exponential backoff
- Local data buffering during disconnects

## Installation

This sub-skill is included with the Smart Home Security Butler. No separate
installation is required.

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `HA_TOKEN` | Home Assistant long-lived access token |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HA_BASE_URL` | `http://homeassistant.local:8123` | Home Assistant base URL |

### Configuration via API

```json
{
  "baseUrl": "http://homeassistant.local:8123",
  "token": "your-long-lived-access-token",
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

## Data Collected

| Data Type | Method | Frequency |
|-----------|--------|-----------|
| Entity state changes | WebSocket | Real-time |
| Logbook events | REST API | Every 15 minutes |
| Device registry | REST API | Every hour |
| Entity registry | REST API | Every 6 hours |
| System health | REST API | Every 5 minutes |

## Supported HA Versions

- Home Assistant 2024.1 and later
- Home Assistant OS, Supervised, Container, and Core installations
- Both HTTP and HTTPS endpoints

## Security

- Uses long-lived access tokens for authentication
- Supports HTTPS with self-signed certificates (configurable)
- Token stored securely, never logged or exposed
- Read-only access recommended for monitoring

## Related Documentation

- [Main Security Butler Skill](../SKILL.md)
- [System Architecture](../ref/architecture.md)
- [Detection Rules](../ref/detection-rules.md)

## License

MIT
