# Detection Rules

## Overview

Detection rules define what security events the system monitors for and how
they are identified. Each rule has configurable parameters, severity levels,
and response actions.

## Severity Levels

| Level | Value | Description | Response |
|-------|-------|-------------|----------|
| Critical | 4 | Immediate security threat (fire, flood, break-in) | Instant notification + all channels |
| High | 3 | Significant security concern (unauthorized access) | Immediate notification |
| Medium | 2 | Potential issue (device offline, unusual pattern) | Scheduled summary |
| Low | 1 | Informational (minor deviation from baseline) | Daily summary |
| Info | 0 | System status and routine events | Log only |

## Rule Categories

### 1. Away Mode Detection

**Rule ID:** `away-mode-anomaly`
**Description:** Detects unexpected activity when the home is in away mode.

**Configuration:**
```yaml
enabled: true
severity: high
away_mode_entity: input_boolean.away_mode
detection_window: 300
cooldown_period: 1800
```

**Detection Conditions:**
- Motion detected while away mode is active
- Door/window opened while away mode is active
- Lights turned on while away mode is active (unless scheduled)
- Unusual device state changes during away period

**Thresholds:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| motion_alert_delay | 60s | Delay before motion triggers alert |
| door_alert_delay | 30s | Delay before door trigger alert |
| min_away_duration | 300s | Minimum away time before detection |

### 2. Device Fault Detection

**Rule ID:** `device-fault`
**Description:** Detects offline devices, communication failures, and low battery.

**Configuration:**
```yaml
enabled: true
severity: medium
check_interval: 300
battery_warning_threshold: 20
battery_critical_threshold: 10
offline_timeout: 300
```

**Detection Conditions:**
- Device has been unavailable/offline for > threshold
- Battery level below warning/critical threshold
- Communication errors exceeding error rate threshold
- Device temperature outside normal range

**Monitored Device Classes:**
- Binary sensors (door, window, motion, smoke, water)
- Climate devices (thermostats, HVAC)
- Security devices (cameras, alarm systems)
- Battery-powered sensors

### 3. Energy Anomaly Detection

**Rule ID:** `energy-anomaly`
**Description:** Detects unusual power consumption patterns.

**Configuration:**
```yaml
enabled: true
severity: low
baseline_days: 14
deviation_threshold: 2.0
min_deviation_watts: 500
```

**Detection Conditions:**
- Total power consumption > 2x baseline for same time period
- Individual device power usage significantly above normal
- Power draw when all residents are away (vampire drain)
- Sudden spikes in consumption

**Detection Methods:**
- Time-of-day baseline comparison
- Moving average deviation
- Per-device anomaly scoring
- Seasonal adjustment

### 4. Door Access Detection

**Rule ID:** `door-access-violation`
**Description:** Detects door/window openings at unexpected times.

**Configuration:**
```yaml
enabled: true
severity: high
night_start: "22:00"
night_end: "06:00"
away_mode_sensitivity: high
```

**Detection Conditions:**
- Exterior door opened during night hours (unless disarmed)
- Window opened during night hours
- Garage door opened at unusual times
- Door left open for extended period

**Sensitivity Levels:**
| Level | Description |
|-------|-------------|
| Low | Only alert on prolonged openings (>5 min) |
| Medium | Alert on all exterior door openings at night |
| High | Alert on any door/window opening when away |

### 5. Environmental Safety Detection

**Rule ID:** `environmental-hazard`
**Description:** Detects smoke, gas, water leaks, and other environmental hazards.

**Configuration:**
```yaml
enabled: true
severity: critical
cooldown_period: 60
```

**Detection Conditions:**
- Smoke detector triggered
- Carbon monoxide detector triggered
- Water leak sensor triggered
- Gas detector triggered
- Temperature outside safe range

**Note:** These detectors are always enabled and cannot be disabled
through configuration. They represent critical safety functions.

### 6. Security System Detection

**Rule ID:** `security-system`
**Description:** Monitors alarm system status and arming/disarming events.

**Configuration:**
```yaml
enabled: true
severity: high
expected_arm_time: "22:00"
expected_disarm_time: "07:00"
grace_period: 3600
```

**Detection Conditions:**
- Alarm triggered
- System disarmed by unexpected user
- System not armed at expected time
- System disarmed during unexpected hours

## Rule Configuration Schema

All detection rules follow this schema:

```typescript
interface DetectionRule {
  id: string;
  name: string;
  description: string;
  category: DetectionCategory;
  severity: SeverityLevel;
  enabled: boolean;
  config: Record<string, any>;
  schedule?: {
    type: 'continuous' | 'interval' | 'cron';
    value?: string;
  };
  notification: {
    enabled: boolean;
    channels: string[];
    throttle?: {
      maxPerHour: number;
      cooldownSeconds: number;
    };
  };
  actions: {
    type: 'notify' | 'automation' | 'webhook';
    config: Record<string, any>;
  }[];
}
```

## Rule Tuning Guide

### Reducing False Positives

1. **Increase cooldown periods**: Prevents repeated alerts from flapping sensors
2. **Adjust thresholds**: Higher deviation thresholds reduce sensitivity
3. **Add conditions**: Require multiple conditions to trigger (e.g., motion + door open)
4. **Extend baseline period**: More baseline data improves anomaly detection accuracy

### Improving Detection

1. **Add more data sources**: Correlate across multiple sensors and systems
2. **Fine-tune thresholds**: Adjust based on actual environment patterns
3. **Use context**: Incorporate weather, calendar, presence data
4. **Update baselines**: Regularly retrain baseline models

## Rule Testing

Each rule supports testing with historical data:

```
POST /api/detection/test
{
  "ruleId": "device-fault",
  "startTime": "2024-01-01T00:00:00Z",
  "endTime": "2024-01-07T23:59:59Z",
  "configOverrides": {}
}
```

Returns:
- Number of detected events
- Event details with timestamps
- False positive indicators (if validated)
- Performance metrics
