---
name: security-detection
description: >-
  Security threat detection engine for Smart Home Security Butler. Provides
  configurable detection rules for away mode anomalies, device faults, energy
  consumption abnormalities, door access violations, and environmental hazards.
  Use when configuring detection rules, adjusting sensitivity thresholds,
  running security audits, managing detection rule lifecycle, or analyzing
  security detection results and false positives.
version: 0.1.0
compatibility: >-
  Works with data from Home Assistant, Node-RED, and KNX Gateway collectors.
  Requires SQLite for state persistence.
metadata:
  requires:
    env: []
  optionalEnv:
    - DETECTION_INTERVAL
    - BASELINE_LEARNING_DAYS
  primaryEnv: ""
  always: false
  homepage: https://github.com/symi-daguo/smart-home-security-butler
---

# Security Detection Engine

## Overview

Security Detection Engine is the core analysis module of Smart Home Security Butler.
It processes collected smart home data through a set of configurable detection rules
to identify security threats, anomalies, and potential issues.

## Detection Categories

### 1. Away Mode Anomaly Detection

**Rule ID:** `away-mode-anomaly`
**Default Severity:** high

Detects unexpected activity when the home is in away or vacation mode.

**Detection conditions:**
- Motion detected while away mode is active
- Exterior door/window opened while away
- Lights/appliances activated without schedule
- Unusual device state changes during away period

**Configuration parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `awayModeEntity` | `input_boolean.away_mode` | HA entity indicating away status |
| `minAwayDuration` | 300s | Minimum time in away mode before detection |
| `motionAlertDelay` | 60s | Delay before motion triggers alert |
| `doorAlertDelay` | 30s | Delay before door trigger alerts |
| `ignoredDevices` | `[]` | Devices excluded from away mode detection |

### 2. Device Fault Detection

**Rule ID:** `device-fault`
**Default Severity:** medium

Detects offline devices, communication failures, and low battery conditions.

**Detection conditions:**
- Device unavailable/offline for > threshold period
- Battery level below warning/critical threshold
- Communication error rate exceeds threshold
- Device temperature outside normal operating range

**Configuration parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `offlineTimeout` | 300s | Time before device considered offline |
| `batteryWarning` | 20% | Battery warning threshold |
| `batteryCritical` | 10% | Battery critical threshold |
| `checkInterval` | 300s | Device health check interval |
| `monitoredDomains` | `[binary_sensor, sensor, lock, cover]` | Device types to monitor |

### 3. Energy Anomaly Detection

**Rule ID:** `energy-anomaly`
**Default Severity:** low

Detects unusual power consumption patterns that may indicate issues.

**Detection conditions:**
- Total consumption > Nx baseline for same time period
- Individual device power significantly above normal
- Unexpected power draw during away mode
- Sudden consumption spikes

**Configuration parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `baselineDays` | 14 | Days of data for baseline calculation |
| `deviationThreshold` | 2.0 | Multiplier for anomaly detection |
| `minDeviationWatts` | 500 | Minimum absolute deviation to alert |
| `energyEntities` | `[sensor.total_power]` | Entities to monitor |

### 4. Door Access Violation Detection

**Rule ID:** `door-access-violation`
**Default Severity:** high

Detects door/window openings at unexpected times or under unexpected conditions.

**Detection conditions:**
- Exterior door opened during night hours
- Window opened during night hours
- Garage door opened at unusual times
- Door left open for extended period

**Configuration parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `nightStart` | `22:00` | Night period start time |
| `nightEnd` | `06:00` | Night period end time |
| `doorOpenTimeout` | 300s | Alert if door left open |
| `sensitivity` | `medium` | Detection sensitivity level |

### 5. Environmental Hazard Detection

**Rule ID:** `environmental-hazard`
**Default Severity:** critical

Detects immediate safety hazards - smoke, gas, water leaks.

**Detection conditions:**
- Smoke detector triggered
- Carbon monoxide detector triggered
- Water leak sensor triggered
- Natural gas detector triggered
- Temperature outside safe range

**Note:** This rule category cannot be disabled. These are critical safety
detectors that always run.

**Configuration parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `cooldownPeriod` | 60s | Alert cooldown per sensor |
| `autoAcknowledge` | false | Auto-acknowledge when clear |

## Detection Architecture

### Pipeline

```
Raw Data → Normalization → Feature Extraction → Rule Matching → Alert Generation
                          ↓
                    Baseline Model
```

### Detection Modes

**Real-time Detection:**
- Event-driven: runs on each incoming state change
- Low latency: detection within seconds
- Used for time-sensitive rules (smoke, door access)

**Periodic Detection:**
- Scheduled: runs at configured intervals
- Deeper analysis with historical context
- Used for trend-based rules (energy anomaly, device health)

**On-demand Scanning:**
- Manual trigger via API
- Full audit of all rules against time range
- Used for security audits and testing

## Severity Levels

| Level | Value | Description | Notification |
|-------|-------|-------------|--------------|
| Critical | 4 | Immediate safety threat | All channels, immediate |
| High | 3 | Significant security concern | Primary channels, immediate |
| Medium | 2 | Potential issue | Primary channels, throttled |
| Low | 1 | Minor deviation | Summary only |
| Info | 0 | Routine event | Log only |

## Detection State Management

### Alert Lifecycle

```
Detected → Active → (Acknowledge) → (Resolve) → Closed
                ↓
              Escalated (if unacknowledged)
```

### Alert States

| State | Description |
|-------|-------------|
| `new` | Just detected, not yet processed |
| `active` | Currently ongoing issue |
| `acknowledged` | User has acknowledged, still monitoring |
| `silenced` | Temporarily suppressed |
| `resolved` | Issue resolved, no longer active |
| `closed` | Alert closed and archived |

## Baseline Learning

### Learning Period

Detection rules need baseline data to establish normal patterns.

**Default learning period:** 14 days

**During learning phase:**
- Detection runs in "observation mode"
- No notifications sent
- Potential anomalies logged but not raised as alerts
- Daily progress report on baseline quality

**Baseline types:**
- Time-of-day patterns (hourly, daily, weekly)
- Seasonal adjustments
- Per-entity normal ranges
- Event frequency baselines

## API Reference

### List Detection Rules

`GET /api/detection/rules`

Returns all configured detection rules.

**Query Parameters:**
- `enabled` (boolean): Filter by enabled status
- `category` (string): Filter by category
- `severity` (string): Filter by severity

### Get Rule Details

`GET /api/detection/rules/:id`

Returns detailed rule configuration and statistics.

### Update Rule

`PUT /api/detection/rules/:id`

Updates detection rule configuration.

**Request Body:**
```json
{
  "enabled": true,
  "severity": "high",
  "config": {
    "batteryWarning": 25
  }
}
```

### Enable Rule

`POST /api/detection/rules/:id/enable`

### Disable Rule

`POST /api/detection/rules/:id/disable`

**Note:** Environmental hazard rules cannot be disabled.

### Run Detection Scan

`POST /api/detection/scan`

Manually triggers a detection scan.

**Request Body:**
```json
{
  "ruleIds": ["device-fault", "energy-anomaly"],
  "timeRange": {
    "start": "2024-01-15T00:00:00Z",
    "end": "2024-01-15T23:59:59Z"
  }
}
```

### Get Scan Status

`GET /api/detection/scans/:scanId`

### List Active Alerts

`GET /api/alerts`

### Acknowledge Alert

`POST /api/alerts/:id/acknowledge`

### Resolve Alert

`POST /api/alerts/:id/resolve`

### Silence Alert

`POST /api/alerts/:id/silence`

### Get Detection Statistics

`GET /api/detection/stats`

Returns detection performance statistics.

**Response:**
```json
{
  "totalDetections": 456,
  "activeAlerts": 5,
  "bySeverity": {
    "critical": 0,
    "high": 1,
    "medium": 3,
    "low": 1
  },
  "byRule": {
    "device-fault": 234,
    "energy-anomaly": 89,
    "away-mode-anomaly": 12,
    "door-access-violation": 56,
    "environmental-hazard": 2
  },
  "falsePositiveRate": 0.08,
  "avgDetectionTimeMs": 1200,
  "baselineProgress": 85
}
```

## Security Notes

- **Critical detectors always on**: Environmental hazard detectors cannot be disabled through normal configuration.
- **False positive management**: System tracks false positive rates per rule and automatically adjusts thresholds if too high.
- **Data privacy**: Detection processing happens entirely locally. No data leaves the system except through configured notification channels.
- **Rule validation**: All rule configuration changes are validated before being applied. Invalid configurations are rejected.

## Common Pitfalls

### Pitfall 1: Insufficient baseline data
Running detection with less than 7 days of baseline data results in high false positive rates, especially for anomaly detection rules. Wait for baseline learning to complete before enabling production alerting.

### Pitfall 2: Too many detection rules
Enabling every rule at full sensitivity creates alert fatigue. Start with critical rules (environmental, door access) and add others gradually as you tune thresholds.

### Pitfall 3: Not acknowledging alerts
Unacknowledged alerts can trigger escalation rules and flood notifications. Acknowledge alerts you're aware of to prevent unnecessary escalation.

### Pitfall 4: Ignoring false positives
Each false positive should be reviewed and used to tune detection thresholds. The system tracks false positive rates but relies on user feedback to label them.

## Performance Tuning

### For high device count homes (>100 entities)
- Increase detection interval from 5 min to 15 min
- Reduce historical data retention from 30 days to 14 days
- Use entity filters to focus on security-relevant devices only
- Consider running energy detection less frequently (hourly)

### For critical security requirements
- Decrease detection interval to 1 minute for critical rules
- Enable real-time event-driven detection for all sensors
- Add redundant notification channels
- Configure escalation policies
