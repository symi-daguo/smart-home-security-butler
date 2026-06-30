# Usage Examples

## Overview

This document provides practical examples and playbooks for using the Smart Home
Security Butler in common scenarios.

## Example 1: Initial Setup and Baseline Learning

### Scenario
Setting up security monitoring for a new home with Home Assistant.

### Workflow

**Step 1: Configure data sources**
```
Verify HA connectivity:
- Base URL: http://homeassistant.local:8123
- Token: long-lived access token
- Test connection → success
```

**Step 2: Start data collection**
```
Enable HA collector
Enable Node-RED collector (if available)
Enable KNX Gateway collector (if available)
```

**Step 3: Run baseline learning period**
```
Set baseline learning mode for 14 days
- No alerting during this period
- System learns normal patterns
- Daily baseline progress reports
```

**Step 4: Review baseline and tune thresholds**
```
After 14 days:
- Review learned baselines
- Adjust detection thresholds
- Set up notification channels
- Enable production alerting
```

**Step 5: Enable monitoring**
```
Start continuous monitoring
Configure daily summary reports
Set up weekly security reviews
```

## Example 2: Away Mode Security Monitoring

### Scenario
User is going on vacation and wants enhanced security monitoring.

### Setup

**Configuration:**
```yaml
away_mode:
  entity: input_boolean.vacation_mode
  enhanced_security: true
  motion_sensitivity: high
  door_access_alerts: critical
  notification_channels: [telegram, email]
```

**Expected behavior:**
- All motion detected during away mode triggers high-severity alert
- Door/window openings trigger critical alerts
- Light activations trigger alerts (unless scheduled)
- Daily security summary sent via email
- Instant Telegram alerts for all security events

### Sample Alert

```
🔴 CRITICAL: Front Door Opened

The front door was opened while the home is in vacation mode.

**Detected:** 2024-01-15 14:32:00
**Source:** binary_sensor.front_door
**Rule:** door-access-violation

[Acknowledge] [View Camera] [Sound Alarm]
```

## Example 3: Device Health Monitoring

### Scenario
Proactive monitoring of device battery levels and connectivity.

### Detection Rules

**Low Battery Alert:**
- Warning at 20%: "Sensor battery is low"
- Critical at 10%: "Sensor battery critically low"
- Weekly battery report on Sundays

**Offline Detection:**
- Alert after 5 minutes offline: "Device may be offline"
- Escalation after 1 hour: "Device confirmed offline"
- Auto-resolve when device reconnects

### Weekly Battery Report Template

```
🔋 Weekly Battery Report

**Critical (<10%):**
- binary_sensor.back_door: 8%

**Warning (<20%):**
- binary_sensor.front_door: 15%
- sensor.temperature_bedroom: 18%

**Healthy:** 24 devices
```

## Example 4: Energy Anomaly Detection

### Scenario
Detecting unusual energy consumption that may indicate issues.

### Detection Scenarios

**Scenario A: Vampire drain during away mode**
- Baseline: 50W idle consumption
- Detected: 500W while away
- Alert: "Unusual power consumption while away - check devices"
- Recommendation: "Automation to turn off non-essential devices when away"

**Scenario B: Sudden power spike**
- Baseline: Normal variation < 200W
- Detected: 2000W spike at 3:00 AM
- Alert: "Unusual power consumption pattern detected"
- Possible causes: HVAC issue, water heater, unknown device

**Scenario C: Gradual increase over days**
- Baseline: 300W average
- Trend: 350W → 400W → 450W over 3 days
- Alert: "Energy consumption trending upward"
- Recommendation: "Investigate devices with increasing power draw"

## Example 5: Night Time Security

### Scenario
Enhanced monitoring during nighttime hours.

### Configuration

```yaml
night_time_security:
  start_time: "22:00"
  end_time: "06:00"
  exterior_door_alert: true
  window_alert: true
  motion_outdoor_alert: true
  garage_door_alert: true
```

### Expected Alerts

| Event | Severity | Notification |
|-------|----------|--------------|
| Front door opened | High | Telegram + HA |
| Window opened | Medium | Telegram |
| Garage door opened | High | Telegram + HA |
| Outdoor motion | Low | HA only |
| Motion inside (armed) | Critical | All channels |

## Example 6: Automation Generation

### Scenario
System detects a recurring issue and suggests an automation fix.

### Issue Detected
```
Alert: Bathroom window often left open at night
Frequency: 3 times in the past week
Severity: Medium
```

### Generated Recommendation

**Title:** Nightly Window Check Automation
**Description:** Check all windows before bed and remind if any are open
**Platform:** Home Assistant
**Format:** Automation YAML
**Confidence:** 0.92
**Estimated effort:** Low

**Generated code:**
```yaml
alias: Nightly Window Check
trigger:
  - platform: time
    at: "22:00:00"
condition: []
action:
  - condition: state
    entity_id:
      - binary_sensor.any_window_open
    state: "on"
  - service: notify.mobile_app
    data:
      title: Windows Left Open
      message: >-
        The following windows are open:
        {{ expand('binary_sensor.all_windows')
           | selectattr('state', 'eq', 'on')
           | map(attribute='name') | join(', ') }}
mode: single
```

### Application Options
1. **Review and apply** manually via HA UI
2. **Import directly** via HA API with user confirmation
3. **Customize** - modify the automation before applying
4. **Schedule** - add to a backlog for later review

## Example 7: Incident Response Playbook

### Scenario
A critical security alert is triggered - coordinated response.

### Alert Triggered
```
🔴 CRITICAL: Smoke Detected - Living Room

Smoke detected in the living room smoke detector.
Immediate attention required!
```

### Automated Response

1. **Immediate notification** (all channels within 1 second)
2. **Smart actions** (if configured and approved):
   - Turn on all lights
   - Unlock front door
   - Open garage door
   - Turn on exhaust fans
3. **Neighbor/family notification** (if configured)
4. **Emergency services suggestion** (never auto-call)

### Post-Incident

1. Incident timeline generated
2. All sensor data around incident preserved
3. Post-incident report generated
4. Recommendations for improving response

## Example 8: Integration with Existing Automations

### Scenario
User has existing HA automations and wants to add security monitoring.

### Approach

1. **Discovery phase**: Scan existing automations and scenes
2. **Gap analysis**: Identify unmonitored security aspects
3. **Recommendation**: Suggest additional detection rules
4. **Integration**: Ensure no conflicts with existing automations

### Example Gap Analysis Output

```
Security Gap Analysis

**Current Coverage:**
- Door/window sensors: Covered (existing automation)
- Motion detection: Covered (existing automation)
- Smoke detectors: Not monitored (not monitored by security)
- Water leak sensors: Not monitored
- Battery levels: Not monitored
- Energy anomalies: Not monitored

**Recommendations:**
1. Enable environmental hazard detection (smoke, water)
2. Add device battery monitoring
3. Configure energy anomaly detection
4. Add night-time security mode
```

## Example 9: Security Trend Analysis

### Scenario
User wants to understand home security trends over the past month.

### Workflow

**Step 1: Get weekly trends**
```
Request trend analysis for the past week
- Time range: week
- Includes: alert trends, device health, energy trends, security score
```

**Step 2: Review security score**
```
Security Score: 82/100 (Grade B)
Trend: Improving (+3 points from last week)

Strengths:
- Device Safety: 85
- Access Control: 90

Weaknesses:
- Energy Safety: 68
- Automation Coverage: 72
```

**Step 3: Analyze alert patterns**
```
Alert distribution this week:
- Device Faults: 15 (45%)
- Energy Anomalies: 8 (24%)
- Door Access: 6 (18%)
- Away Mode: 2 (6%)
- Environmental: 2 (6%)

Peak alert hours: 14:00-16:00 and 22:00-23:00

Top alert devices:
1. binary_sensor.front_door - 5 alerts (device fault)
2. sensor.living_room_temperature - 3 alerts (energy)
3. binary_sensor.back_door - 2 alerts (door access)
```

**Step 4: Identify improvement areas**
```
Based on trend analysis:
1. Front door sensor has frequent disconnects - check battery
2. Energy consumption peaks in afternoon - investigate HVAC
3. Door access alerts at night - review access schedule
```

## Example 10: Weekly Security Report

### Scenario
User requests a weekly security report for review.

### Generated Report Summary

```
Smart Home Security Weekly Report
Period: 2024-01-08 to 2024-01-15

1. Overview
   - Security Score: 82/100 (B Grade)
   - Score Change: +3 from last week
   - Total Alerts: 33
   - Resolved: 28 (84.8%)
   - Critical Alerts: 0
   - High Alerts: 3

2. Top Security Risks
   #1: Front Door Sensor Offline (High)
       - 5 occurrences this week
       - Recommendation: Check sensor battery and connection

   #2: Afternoon Energy Spike (Medium)
       - Daily energy spike between 14:00-16:00
       - Recommendation: Check HVAC schedule and insulation

3. Device Health
   - Total Devices: 42
   - Health Score: 82/100
   - Online Rate: 95.2%
   - Offline Devices: 2
   - Low Battery: 0

4. Improvement Recommendations
   1. Replace battery in front door sensor
   2. Investigate afternoon energy consumption pattern
   3. Add nightly door/window check automation
   4. Review and optimize HVAC schedule
   5. Set up monthly security review routine
```

## Example 11: Monthly Security Review

### Scenario
End-of-month security review with detailed reporting.

### Analysis Process

1. **Generate monthly report** in Markdown format
2. **Compare with previous month** - identify trends and changes
3. **Review top risks** and track resolution progress
4. **Assess security score trajectory** - is security improving?
5. **Plan next month's improvements** based on findings

### Key Metrics to Review

| Metric | This Month | Last Month | Change |
|--------|-----------|------------|--------|
| Security Score | 78 | 72 | +6 |
| Total Alerts | 142 | 168 | -15% |
| Resolution Rate | 82% | 75% | +7% |
| Critical Alerts | 2 | 5 | -60% |
| Device Online Rate | 94% | 91% | +3% |
| Avg Response Time | 48 min | 72 min | -33% |

### Action Items from Monthly Review

1. **Maintain improvements**: Continue practices that reduced critical alerts
2. **Address recurring issues**: Devices with persistent fault alerts
3. **Expand coverage**: Add monitoring for currently unmonitored areas
4. **Optimize automation**: Improve auto-resolution for common alert types
5. **Schedule quarterly audit**: Full security audit every 3 months
