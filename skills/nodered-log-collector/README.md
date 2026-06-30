# Node-RED Log Collector

Node-RED data collector for Smart Home Security Butler.

## Overview

Node-RED Log Collector connects to Node-RED Admin API and collects flow status,
deployment events, node health, error logs, and system metrics for security
monitoring and automation reliability tracking.

## Features

- Flow status monitoring and health tracking
- Node status monitoring with error/warning detection
- Deployment event history tracking
- Flow execution error collection
- Configurable flow/node filtering
- Support for both HA Add-on and standalone Node-RED
- Multiple authentication methods (Basic Auth, Bearer token)

## Installation

This sub-skill is included with the Smart Home Security Butler. No separate
installation is required.

## Configuration

### Required Environment Variables

None - Node-RED collection is optional. Configure via API or config file.

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NR_BASE_URL` | `http://homeassistant.local:1880` | Node-RED base URL |
| `NR_TOKEN` | - | Node-RED admin bearer token |
| `NR_USERNAME` | - | HA username (for HA Add-on) |
| `NR_PASSWORD` | - | HA password (for HA Add-on) |

### Configuration via API

```json
{
  "baseUrl": "http://homeassistant.local:1880",
  "auth": {
    "type": "basic",
    "username": "admin",
    "password": "password"
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

## Authentication Methods

| Method | Use Case |
|--------|----------|
| Basic Auth | Node-RED HA Add-on (direct port) |
| Bearer Token | Standalone Node-RED with adminAuth |
| No Auth | Trusted LAN only (not recommended) |

## Data Collected

| Data Type | Frequency | Description |
|-----------|-----------|-------------|
| Flow status | Every 60s | Running/disabled state of each flow |
| Node status | Every 30s | Status of each monitored node |
| Error logs | Every 15s | Flow execution errors |
| Deployment events | Polling | Flow deployment history |
| System info | Every 5 min | Node-RED version, uptime, etc. |

## Supported Node-RED Versions

- Node-RED 3.1 and later
- Node-RED HA Add-on (all recent versions)
- Both HTTP and HTTPS endpoints

## Security

- Supports multiple authentication methods
- Never reads or stores flow credentials
- Configurable debug output capture (opt-in)
- Recommend read-only access where possible

## Related Documentation

- [Main Security Butler Skill](../SKILL.md)
- [System Architecture](../ref/architecture.md)
- [Detection Rules](../ref/detection-rules.md)
- [HA Log Collector](../ha-log-collector/SKILL.md)

## License

MIT
