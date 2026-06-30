---
name: ha-log-collector
description: >-
  Home Assistant log and state data collector for Smart Home Security Butler.
  Collects entity state changes, logbook events, device status, and system health
  data from Home Assistant via REST and WebSocket APIs. Use when setting up HA
  data collection for security monitoring, configuring which entities to monitor,
  troubleshooting HA connectivity, or managing HA data collection settings.
version: 0.1.0
compatibility: >-
  Requires network access to a Home Assistant instance on a trusted LAN or VPN.
  Supports Home Assistant 2024.1 and later.
metadata:
  requires:
    env:
      - HA_TOKEN
  optionalEnv:
    - HA_BASE_URL
  primaryEnv: HA_TOKEN
  always: false
  homepage: https://github.com/symi-daguo/smart-home-security-butler
---

# HA Log Collector

## Overview

Home Assistant data collector module for Smart Home Security Butler. Connects to
Home Assistant via WebSocket API for real-time state changes and REST API for
historical data and configuration retrieval.

## Connection

| Parameter | Default | Description |
|-----------|---------|-------------|
| Base URL | `http://homeassistant.local:8123` | Home Assistant instance URL |
| Auth | `Authorization: Bearer ${HA_TOKEN}` | Long-lived access token |
| WebSocket | `ws://homeassistant.local:8123/api/websocket` | Real-time events endpoint |
| REST API | `http://homeassistant.local:8123/api` | REST API base path |

### Getting a Long-Lived Access Token

1. Open Home Assistant frontend
2. Click your profile (bottom of sidebar)
3. Navigate to Security tab
4. Scroll to "Long-Lived Access Tokens"
5. Click "Create Token", enter a name (e.g., "Security Butler")
6. Copy the token (shown only once)

**Minimum required permissions:**
- Read access to all monitored entities
- System health read access (optional)

## Collected Data Types

### 1. Entity State Changes (Real-time)

Collected via WebSocket `state_changed` events.

**Entity domains collected by default:**
| Domain | Purpose |
|--------|---------|
| `binary_sensor` | Door, window, motion, smoke, water, gas sensors |
| `sensor` | Temperature, humidity, battery, energy sensors |
| `light` | Light state and brightness |
| `switch` | Switch states |
| `lock` | Door lock states |
| `alarm_control_panel` | Alarm system status |
| `cover` | Garage doors, blinds, shutters |
| `climate` | Thermostat and HVAC status |
| `camera` | Camera status (not video) |
| `input_boolean` | Presence, away mode flags |

**State change data structure:**
```json
{
  "entity_id": "binary_sensor.front_door",
  "old_state": {
    "state": "off",
    "last_changed": "2024-01-15T10:00:00Z",
    "attributes": {}
  },
  "new_state": {
    "state": "on",
    "last_changed": "2024-01-15T10:30:00Z",
    "attributes": {
      "device_class": "door",
      "friendly_name": "Front Door",
      "battery_level": 95
    }
  }
}
```

### 2. Logbook Events (Historical)

Collected via REST API `/api/logbook` endpoint.

**Filtered event types:**
- `state_changed` for security-relevant entities
- Automation triggered events
- Script execution events
- Alarm state changes

### 3. Device Registry

Collected periodically via REST API.

**Device information:**
- Device ID, name, manufacturer, model
- Connection status (online/offline via entity availability)
- Battery level (if available)
- Firmware version
- Area/room assignment

### 4. Entity Registry

Periodic sync of entity metadata.

**Entity metadata:**
- Entity ID, name, device class
- Unit of measurement
- State class
- Area assignment
- Disabled by status

### 5. System Health

Periodic health check data.

**Health metrics:**
- HA version
- Supervisor status (if HAOS)
- Add-on statuses
- System load
- Database size
- Backup status

## Collection Configuration

### Entity Filtering

**Include patterns (default):**
```yaml
include_domains:
  - binary_sensor
  - sensor
  - light
  - switch
  - lock
  - alarm_control_panel
  - cover
  - climate
  - input_boolean

include_entity_patterns:
  - "*door*"
  - "*window*"
  - "*motion*"
  - "*smoke*"
  - "*water*"
  - "*gas*"
  - "*battery*"
  - "*energy*"
  - "*power*"
  - "*away*"
  - "*presence*"
```

**Exclude patterns:**
```yaml
exclude_entity_patterns:
  - "*diagnostic*"
  - "*_signal_strength"
  - "*_linkquality"
```

### Collection Intervals

| Data Type | Interval | Method |
|-----------|----------|--------|
| State changes | Real-time | WebSocket subscription |
| Device registry | 1 hour | REST API polling |
| Entity registry | 6 hours | REST API polling |
| System health | 5 minutes | REST API polling |
| Logbook history | 15 minutes | REST API polling |
| Historical states | 1 hour | REST API polling |

## API Reference

### Start Collection

`POST /api/collectors/homeassistant/start`

**Request:**
```json
{
  "baseUrl": "http://homeassistant.local:8123",
  "token": "${HA_TOKEN}",
  "config": {
    "includeDomains": ["binary_sensor", "sensor"],
    "includePatterns": ["*door*", "*window*"],
    "excludePatterns": []
  }
}
```

### Stop Collection

`POST /api/collectors/homeassistant/stop`

### Get Status

`GET /api/collectors/homeassistant/status`

**Response:**
```json
{
  "status": "connected",
  "uptime": 3600,
  "entitiesTracked": 156,
  "eventsReceived": 4523,
  "lastEventAt": "2024-01-15T10:30:00Z",
  "webSocketConnected": true,
  "restApiReachable": true
}
```

### Test Connection

`POST /api/collectors/homeassistant/test`

Tests connectivity without starting full collection.

**Response:**
```json
{
  "success": true,
  "latencyMs": 45,
  "haVersion": "2024.1.5",
  "entityCount": 234
}
```

### Get Collected Entities

`GET /api/collectors/homeassistant/entities`

Returns list of entities currently being tracked.

**Query Parameters:**
- `domain` (string): Filter by domain
- `area` (string): Filter by area
- `search` (string): Search entity name/id

### Get Entity History

`GET /api/collectors/homeassistant/history/:entityId`

Returns historical state data for an entity.

**Query Parameters:**
- `startTime` (ISO string): Start of time range
- `endTime` (ISO string): End of time range
- `limit` (number): Max records (default 500)

## Security Notes

- **Token permissions**: Use a dedicated HA user with read-only permissions where possible
- **Sensitive entities**: Exclude entities with sensitive data (e.g., presence of specific people) if privacy is a concern
- **Data retention**: Collected data follows the global retention policy configured in Security Butler
- **Local processing**: All data processing happens locally within the security butler

## Common Pitfalls

### Pitfall 1: WebSocket disconnects on HA restart
HA restart causes WebSocket disconnection. The collector automatically reconnects with exponential backoff. Temporary data gaps are normal during HA restarts.

### Pitfall 2: Too many entities tracked
Tracking all entities can cause performance issues. Use include/exclude patterns to focus on security-relevant entities only.

### Pitfall 3: Token expires
Long-lived access tokens do not expire. However, if the user account is deleted or the token is revoked, collection stops. Monitor collector status for authentication errors.

### Pitfall 4: History API rate limiting
HA REST API has rate limits. The collector respects these limits automatically with backoff. If you need more frequent data, use WebSocket real-time events instead.

## Troubleshooting

### Connection Failed

1. Verify HA URL is accessible from the security butler host
2. Check token is valid and has not been revoked
3. Ensure HA is running and reachable on the network
4. Check firewall settings between collector and HA

### Missing Entities

1. Verify entity exists in HA (Settings > Devices & Services > Entities)
2. Check entity is not excluded by filter patterns
3. Confirm entity domain is in the include list
4. Verify entity has a unique ID (some legacy entities may not)

### High Memory Usage

1. Reduce number of tracked entities using filters
2. Decrease historical data retention period
3. Check for entities that change state very frequently (e.g., power sensors updating every second)
4. Consider sampling for high-frequency sensors
