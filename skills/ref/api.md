# Internal API Reference

## Overview

This document describes APIs for the Smart Home Security Butler. **For the running HTTP server, see [Implemented REST API](#implemented-rest-api-serverts-v040) first** — it lists endpoints that actually exist in `src/server.ts`. Later sections include design/planned APIs used by skills documentation; not all are implemented yet.

## Implemented REST API (server.ts v0.4.0)

Base URL: `http://<host>:3000` (CasaOS: `http://192.168.2.45:3000`)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | Status, `entityMetrics`, collectors, gateway |
| `/api/settings` | GET/PUT | Settings with hot-reload |
| `/api/insights` | GET | AI insight summary |
| `/api/devices` | GET | Entity list |
| `/api/devices/control` | POST | Device control |
| `/api/rooms` | GET | Room stats from HA areas |
| `/api/scenes` | GET | KNX + template scenes |
| `/api/scenes/activate` | POST | Activate scene |
| `/api/alerts` | GET | Alerts |
| `/api/alerts/:id/acknowledge` | POST | Acknowledge |
| `/api/chat` | POST | AI chat |
| `/api/chat/sessions` | GET | Sessions |
| `/api/chat/sessions/:id/messages` | GET | Messages |
| `/api/chat/clear` | POST | Clear chat |
| `/api/ai/test` | POST | Test AI |
| `/api/collectors` | GET | Collectors |
| `/api/collectors/test` | POST | Test collector |
| `/api/notifications/test` | POST | Test Telegram/Bark/ServerChan |
| `/api/security-score` | GET | Score |
| `/api/trends` | GET | Trends |
| `/api/detect` | POST | Run detection |
| `/api/templates` | GET | Templates |
| `/api/automation/generate` | POST | Generate automation |
| `/api/automation/apply` | POST | Apply automation |

Static UI: `GET /` serves `public/` (Nexus Web).

## Base Configuration

| Property | Default | Description |
|----------|---------|-------------|
| baseUrl | `http://localhost:3000` | Security Butler API base URL |
| auth | Bearer token | API authentication token |
| timeout | 30000ms | Request timeout |

## Data Collection API

### List Collectors

`GET /api/collectors`

Returns all configured data collectors and their status.

**Response:**
```json
{
  "collectors": [
    {
      "id": "ha-main",
      "type": "homeassistant",
      "status": "connected",
      "baseUrl": "http://homeassistant.local:8123",
      "lastMessageAt": "2024-01-15T10:30:00Z",
      "messageCount": 15234
    }
  ]
}
```

### Start Collector

`POST /api/collectors/:id/start`

Starts a stopped data collector.

**Response:**
```json
{
  "success": true,
  "collectorId": "ha-main",
  "status": "connecting"
}
```

### Stop Collector

`POST /api/collectors/:id/stop`

Stops a running data collector.

**Response:**
```json
{
  "success": true,
  "collectorId": "ha-main",
  "status": "disconnecting"
}
```

### Get Collector Status

`GET /api/collectors/:id/status`

Returns detailed collector status and metrics.

**Response:**
```json
{
  "id": "ha-main",
  "type": "homeassistant",
  "status": "connected",
  "uptime": 86400,
  "metrics": {
    "eventsReceived": 15234,
    "eventsProcessed": 15230,
    "errors": 4,
    "avgLatencyMs": 120
  },
  "connectedAt": "2024-01-14T10:30:00Z",
  "lastMessageAt": "2024-01-15T10:30:00Z"
}
```

## Detection API

### List Detection Rules

`GET /api/detection/rules`

Returns all detection rules with their current configuration.

**Query Parameters:**
- `enabled` (boolean): Filter by enabled status
- `category` (string): Filter by category
- `severity` (string): Filter by severity level

**Response:**
```json
{
  "rules": [
    {
      "id": "device-fault",
      "name": "Device Fault Detection",
      "category": "device",
      "severity": "medium",
      "enabled": true,
      "lastRunAt": "2024-01-15T10:25:00Z",
      "activeAlerts": 3
    }
  ],
  "total": 12
}
```

### Get Rule Details

`GET /api/detection/rules/:id`

Returns detailed configuration for a specific detection rule.

**Response:**
```json
{
  "id": "device-fault",
  "name": "Device Fault Detection",
  "description": "Detects offline devices and battery issues",
  "category": "device",
  "severity": "medium",
  "enabled": true,
  "config": {
    "check_interval": 300,
    "battery_warning_threshold": 20,
    "battery_critical_threshold": 10,
    "offline_timeout": 300
  },
  "notification": {
    "enabled": true,
    "channels": ["telegram", "homeassistant"],
    "throttle": {
      "maxPerHour": 10,
      "cooldownSeconds": 300
    }
  },
  "statistics": {
    "totalDetections": 45,
    "falsePositives": 3,
    "avgDetectionTimeMs": 1500
  }
}
```

### Update Rule Configuration

`PUT /api/detection/rules/:id`

Updates detection rule configuration.

**Request Body:**
```json
{
  "enabled": true,
  "severity": "high",
  "config": {
    "battery_warning_threshold": 25
  }
}
```

**Response:** Returns updated rule object.

### Run Detection Scan

`POST /api/detection/scan`

Manually triggers a detection scan.

**Request Body:**
```json
{
  "ruleIds": ["device-fault", "energy-anomaly"],
  "timeRange": {
    "start": "2024-01-15T00:00:00Z",
    "end": "2024-01-15T10:00:00Z"
  }
}
```

**Response:**
```json
{
  "scanId": "scan_abc123",
  "status": "running",
  "rules": ["device-fault", "energy-anomaly"],
  "startedAt": "2024-01-15T10:30:00Z"
}
```

### Get Scan Results

`GET /api/detection/scans/:scanId`

Returns results of a detection scan.

## Alerts API

### List Active Alerts

`GET /api/alerts`

Returns currently active (unresolved) alerts.

**Query Parameters:**
- `severity` (string): Filter by severity
- `ruleId` (string): Filter by detection rule
- `limit` (number): Page size (default 50)
- `offset` (number): Pagination offset

**Response:**
```json
{
  "alerts": [
    {
      "id": "alert_abc123",
      "ruleId": "device-fault",
      "severity": "medium",
      "title": "Device Offline",
      "description": "Front door sensor has been offline for 15 minutes",
      "entityId": "binary_sensor.front_door",
      "source": "homeassistant",
      "status": "active",
      "acknowledged": false,
      "firstDetectedAt": "2024-01-15T10:15:00Z",
      "lastDetectedAt": "2024-01-15T10:30:00Z",
      "detectionCount": 16
    }
  ],
  "total": 5,
  "offset": 0,
  "limit": 50
}
```

### Acknowledge Alert

`POST /api/alerts/:id/acknowledge`

Acknowledges an alert, stopping escalation and notifications.

**Request Body:**
```json
{
  "note": "Investigating now",
  "silencedUntil": "2024-01-15T12:00:00Z"
}
```

### Resolve Alert

`POST /api/alerts/:id/resolve`

Marks an alert as resolved.

**Request Body:**
```json
{
  "resolution": "Device reconnected",
  "resolutionType": "auto_recovered"
}
```

### Silence Alert

`POST /api/alerts/:id/silence`

Temporarily silences notifications for an alert.

**Request Body:**
```json
{
  "duration": 3600,
  "reason": "Maintenance window"
}
```

## Notification API

### Send Test Notification

`POST /api/notifications/test`

Sends a test notification to verify channel configuration.

**Request Body:**
```json
{
  "channel": "telegram",
  "severity": "medium",
  "title": "Test Alert",
  "message": "This is a test notification."
}
```

### Get Notification Logs

`GET /api/notifications/logs`

Returns notification delivery history.

**Response:**
```json
{
  "logs": [
    {
      "id": "notif_abc123",
      "channel": "telegram",
      "alertId": "alert_xyz789",
      "status": "delivered",
      "sentAt": "2024-01-15T10:30:00Z",
      "deliveredAt": "2024-01-15T10:30:02Z"
    }
  ],
  "total": 120
}
```

## Automation Generator API

### Generate Recommendations

`POST /api/automation/generate`

Generates security automation recommendations based on recent alerts.

**Request Body:**
```json
{
  "alertIds": ["alert_abc123"],
  "platform": "homeassistant",
  "format": "yaml"
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "id": "rec_abc123",
      "title": "Low Battery Alert Automation",
      "description": "Send daily battery level reports for all sensors",
      "severity": "medium",
      "platform": "homeassistant",
      "code": "automation yaml here...",
      "estimatedEffort": "low",
      "confidence": 0.85
    }
  ]
}
```

### Apply Recommendation

`POST /api/automation/apply/:id`

Applies a generated automation recommendation to the target platform.

**Request Body:**
```json
{
  "verifyOnly": false,
  "enableAutomation": false
}
```

### List Applied Recommendations

`GET /api/automation/applied`

Returns previously applied automation recommendations.

## Analytics API

### Get Trend Analysis

`GET /api/analytics/trends`

Returns comprehensive trend analysis data for the specified time range.

**Query Parameters:**
- `timeRange` (string): Time range - `day`, `week`, `month`, `year`, `custom` (default: `week`)
- `startTime` (ISO string): Start time for custom range
- `endTime` (ISO string): End time for custom range

**Response:**
```json
{
  "timeRange": "week",
  "startDate": "2024-01-08T00:00:00Z",
  "endDate": "2024-01-15T10:30:00Z",
  "alerts": {
    "daily": [
      { "timestamp": "2024-01-08T00:00:00Z", "count": 12 },
      { "timestamp": "2024-01-09T00:00:00Z", "count": 8 }
    ],
    "byCategory": [
      { "category": "device-fault", "count": 15, "percentage": 45.5 }
    ],
    "bySeverity": [
      { "severity": "medium", "count": 20, "percentage": 60.6 }
    ],
    "topDevices": [
      { "entityId": "binary_sensor.front_door", "count": 5, "category": "device-fault" }
    ],
    "hourlyDistribution": [
      { "hour": 0, "count": 2 },
      { "hour": 1, "count": 1 }
    ],
    "totalAlerts": 33,
    "resolvedAlerts": 28,
    "activeAlerts": 5,
    "resolutionRate": 0.848,
    "averageResponseTimeMinutes": 45.2
  },
  "devices": {
    "currentOnlineRate": 0.95,
    "totalDevices": 42,
    "onlineDevices": 40,
    "offlineDevices": ["sensor.bathroom_temp"],
    "onlineRate": [],
    "faultTrend": [],
    "stateChangeFrequency": [],
    "highFrequencyDevices": []
  },
  "energy": {
    "daily": [],
    "totalConsumption": 125.5,
    "dailyAverage": 17.9,
    "weekOverWeek": {
      "currentPeriod": 125.5,
      "previousPeriod": 118.2,
      "changePercent": 6.2,
      "changeAbsolute": 7.3
    },
    "peakHours": [{ "hour": 19, "consumption": 2.5, "percentage": 14.0 }],
    "topConsumers": [],
    "hasEnergyData": true
  },
  "securityScore": {
    "overall": 82,
    "grade": "B",
    "dimensions": [
      {
        "name": "Device Safety",
        "score": 85,
        "weight": 0.3,
        "description": "Device online rate, fault rate, battery health",
        "factors": ["Online rate: 95.2%", "Total devices: 42"],
        "recommendations": ["Check 2 offline devices"]
      }
    ],
    "calculatedAt": "2024-01-15T10:30:00Z",
    "change": 3,
    "trend": "improving",
    "strengths": ["Device Safety: 85", "Access Control: 90"],
    "weaknesses": ["Energy Safety: 68"]
  }
}
```

### Get Security Score

`GET /api/analytics/score`

Returns the current security score with dimension breakdown.

**Response:** Returns the `securityScore` object from the trends endpoint.

### Generate Security Report

`POST /api/analytics/report`

Generates a security report for the specified period.

**Request Body:**
```json
{
  "period": "weekly",
  "format": "markdown"
}
```

**Parameters:**
- `period`: Report period - `weekly` or `monthly`
- `format`: Output format - `text` or `markdown`

**Response:**
```json
{
  "period": "weekly",
  "format": "markdown",
  "generatedAt": "2024-01-15T10:30:00Z",
  "startDate": "2024-01-08T00:00:00Z",
  "endDate": "2024-01-15T10:30:00Z",
  "summary": {
    "totalAlerts": 33,
    "resolvedAlerts": 28,
    "resolutionRate": 0.848,
    "criticalAlerts": 0,
    "highAlerts": 3,
    "securityScore": 82,
    "previousScore": 79,
    "scoreChange": 3
  },
  "topRisks": [
    {
      "rank": 1,
      "title": "Front Door Sensor Offline",
      "description": "Front door sensor has been offline for 2 hours",
      "severity": "high",
      "category": "device-fault",
      "occurrenceCount": 5,
      "recommendation": "Check sensor battery and connection"
    }
  ],
  "deviceHealth": {
    "totalDevices": 42,
    "healthyDevices": 38,
    "warningDevices": 2,
    "criticalDevices": 2,
    "onlineRate": 0.95,
    "healthScore": 82,
    "lowBatteryDevices": [],
    "offlineDevices": ["sensor.bathroom_temp"],
    "highFrequencyDevices": []
  },
  "automationSuggestions": [
    "Create nightly door/window check automation"
  ],
  "recommendations": [
    "Check offline devices",
    "Review high severity alerts",
    "Improve energy safety score"
  ],
  "content": "# Smart Home Security Weekly Report\n\n..."
}
```

## System API

### Get System Status

`GET /api/system/status`

Returns overall system status and health metrics.

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "uptime": 86400,
  "components": {
    "collectors": { "status": "healthy", "active": 3, "total": 3 },
    "detection": { "status": "healthy", "activeRules": 10, "pendingScans": 0 },
    "notification": { "status": "healthy", "queued": 0, "sentToday": 45 },
    "storage": { "status": "healthy", "usedPercent": 25 }
  },
  "alerts": {
    "active": 5,
    "critical": 0,
    "high": 1,
    "medium": 3,
    "low": 1
  }
}
```

### Get Configuration

`GET /api/system/config`

Returns current system configuration.

### Update Configuration

`PUT /api/system/config`

Updates system configuration.
