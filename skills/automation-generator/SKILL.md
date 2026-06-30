---
name: automation-generator
description: >-
  Security automation scene generator for Smart Home Security Butler. Analyzes
  security detection results and intelligently generates remediation automation
  recommendations for Home Assistant, Node-RED, and KNX Gateway. Use when
  requesting security automation suggestions, generating response automations,
  creating safety procedures, or getting recommendations for improving home
  security based on detected issues.
version: 0.1.0
compatibility: >-
  Generates automations compatible with Home Assistant 2024.1+, Node-RED 3.1+,
  and KNX Gateway 1.0+.
metadata:
  requires:
    env: []
  optionalEnv:
    - HA_TOKEN
    - NR_TOKEN
    - KNX_TOKEN
  primaryEnv: ""
  always: false
  homepage: https://github.com/symi-daguo/smart-home-security-butler
---

# Automation Generator

## Overview

Automation Generator analyzes security detection results and generates
intelligent automation recommendations to improve home security. It creates
remediation automations, response procedures, and preventive measures tailored
to the specific security issues detected in the user's environment.

## Generation Strategies

### 1. Rule-based Templates

Pre-built templates for common security scenarios.

**Template categories:**
- Door/window security reminders
- Battery monitoring and alerts
- Away mode security enhancements
- Night time security routines
- Leak and smoke detection response
- Power failure procedures
- Vacation mode setups

### 2. Pattern-based Generation

Analyzes existing automations and detection patterns to suggest improvements.

**Analysis methods:**
- Gap analysis - identify unmonitored areas
- Redundancy detection - find overlapping automations
- Enhancement suggestions - improve existing automations
- Integration proposals - connect disparate systems

### 3. Incident Response Automations

Generates response automations for specific incident types.

**Response categories:**
- Intrusion response (lights, alarms, notifications)
- Fire response (alarms, ventilation, evacuation)
- Water leak response (valve closure, pump activation)
- Power outage response (backup systems, notifications)
- Medical emergency response

## Output Platforms

### 1. Home Assistant

Generates native Home Assistant automations in YAML format.

**Output types:**
- Standard automations (automation YAML)
- Scripts (script YAML)
- Blueprints (blueprint YAML)
- Scene definitions

**Example output:**
```yaml
alias: Nightly Window Check
trigger:
  - platform: time
    at: "22:00:00"
condition: []
action:
  - condition: state
    entity_id: binary_sensor.any_window_open
    state: "on"
  - service: notify.mobile_app
    data:
      title: Windows Left Open
      message: Check windows before bed
mode: single
```

### 2. Node-RED

Generates Node-RED flow JSON that can be imported directly.

**Output types:**
- Complete flows (JSON)
- Subflows
- Function node code snippets
- Flow configuration recommendations

**Example output:**
```json
{
  "id": "flow-id",
  "label": "Security Response",
  "nodes": [ ... ],
  "connections": [ ... ]
}
```

### 3. KNX Gateway

Generates KNX Gateway scenes and automation workflows.

**Output types:**
- Scene definitions
- Automation workflows
- Trigger configurations
- Scene groups

## Recommendation Quality Metrics

Each recommendation includes quality indicators:

| Metric | Range | Description |
|--------|-------|-------------|
| `confidence` | 0-1 | How well the recommendation fits the issue |
| `estimatedEffort` | low/medium/high | Implementation effort |
| `impactScore` | 0-1 | Expected security improvement |
| `riskLevel` | low/medium/high | Risk of side effects |
| `testCoverage` | 0-1 | How well-tested the template is |

## Recommendation Categories

### By Type

| Type | Description |
|------|-------------|
| `remediation` | Direct fix for detected issue |
| `prevention` | Prevents future occurrences |
| `enhancement` | Improves existing security |
| `response` | Incident response automation |
| `monitoring` | Better detection/visibility |

### By Effort

| Effort | Description | Implementation |
|--------|-------------|----------------|
| Low | Simple config change | < 5 minutes |
| Medium | Multi-step setup | 15-30 minutes |
| High | Complex integration | > 1 hour |

## Generation Workflow

```
Security Alert → Context Analysis → Template Matching
                                      ↓
                          Customization & Parameterization
                                      ↓
                          Validation & Safety Check
                                      ↓
                          Quality Scoring & Ranking
                                      ↓
                          User Review & Application
```

### Step 1: Context Analysis

Gathers relevant context:
- Affected devices and entities
- Related existing automations
- User's home configuration
- Historical incident patterns
- User preferences and constraints

### Step 2: Template Matching

Matches issue to appropriate templates:
- Exact match for known patterns
- Similar issues with adjustments
- New custom generation for unique scenarios

### Step 3: Customization

Fills in template parameters:
- Entity IDs from user's system
- Timing and threshold adjustments
- Notification preferences
- Area/room context

### Step 4: Safety Validation

Before presenting recommendations:
- Check for conflicting automations
- Verify entity availability
- Validate against safety rules
- Estimate side effects
- Flag any risks

## API Reference

### Generate Recommendations

`POST /api/automation/generate`

Generates security automation recommendations.

**Request Body:**
```json
{
  "alertIds": ["alert_abc123", "alert_def456"],
  "platform": "homeassistant",
  "category": "remediation",
  "maxResults": 5,
  "minConfidence": 0.7
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "id": "rec_abc123",
      "title": "Low Battery Alert Automation",
      "description": "Automated battery level monitoring with weekly reports",
      "type": "remediation",
      "platform": "homeassistant",
      "format": "automation-yaml",
      "code": "automation yaml here...",
      "confidence": 0.92,
      "estimatedEffort": "low",
      "impactScore": 0.75,
      "riskLevel": "low",
      "relatedAlerts": ["alert_abc123"],
      "prerequisites": [],
      "alternatives": []
    }
  ],
  "total": 8,
  "generatedAt": "2024-01-15T10:30:00Z"
}
```

### Get Recommendation Details

`GET /api/automation/recommendations/:id`

Returns full details of a specific recommendation.

### Apply Recommendation

`POST /api/automation/recommendations/:id/apply`

Applies the automation to the target platform.

**Request Body:**
```json
{
  "verifyOnly": false,
  "enableAutomation": false,
  "backupExisting": true
}
```

**Response:**
```json
{
  "success": true,
  "applied": true,
  "platformEntityId": "automation.low_battery_alert",
  "backupCreated": "backup_20240115_103000",
  "warnings": []
}
```

### Verify Recommendation

`POST /api/automation/recommendations/:id/verify`

Dry-run verification without applying. Checks for conflicts and validates configuration.

**Response:**
```json
{
  "valid": true,
  "conflicts": [],
  "missingEntities": [],
  "warnings": [],
  "estimatedImpact": "low"
}
```

### List Applied Recommendations

`GET /api/automation/applied`

Returns previously applied recommendations.

### Security Gap Analysis

`POST /api/automation/gap-analysis`

Performs comprehensive security gap analysis.

**Response:**
```json
{
  "currentCoverage": {
    "door_window": { "covered": true, "score": 0.85 },
    "motion": { "covered": true, "score": 0.7 },
    "smoke": { "covered": false, "score": 0 },
    "water": { "covered": true, "score": 0.9 },
    "battery": { "covered": false, "score": 0.2 }
  },
  "recommendations": [ ... ],
  "overallScore": 0.53,
  "priorityAreas": ["smoke_detection", "battery_monitoring"]
}
```

## Safety Rules

**Never generate automations that:**
- Disable critical safety detectors (smoke, CO, gas)
- Override lock mechanisms without explicit approval
- Bypass alarm systems
- Grant network access to untrusted devices
- Modify system-level configurations
- Delete existing automations without backup
- Automatically call emergency services

**Always include:**
- Clear instructions for manual verification
- Estimated side effects
- Rollback procedures
- Testing recommendations
- Dependency information

## Security Notes

- **Human review required**: Recommendations should always be reviewed by a human before applying to production systems.
- **Backup before apply**: The system automatically creates backups before applying changes.
- **Rollback capability**: All applied recommendations can be rolled back.
- **No auto-apply for critical**: Critical security automations always require explicit confirmation.
- **Sandbox testing**: Recommendations can be tested in a sandbox/dry-run mode first.

## Common Pitfalls

### Pitfall 1: Applying without testing
Always use `verifyOnly: true` first to check for conflicts and issues before applying automations to your system.

### Pitfall 2: Ignoring prerequisites
Some recommendations require additional setup (e.g., specific integrations, helper entities). Review prerequisites before attempting to apply.

### Pitfall 3: Over-automation
Not every security issue needs an automation. Sometimes a simple notification or process change is more appropriate.

### Pitfall 4: Not customizing templates
Templates are generic starting points. Always review and customize entity IDs, timing, and thresholds for your specific environment.

## Best Practices

1. **Start small**: Apply one recommendation at a time, verify it works correctly before adding more.
2. **Test thoroughly**: Test each automation in various conditions (day/night, away/home, etc.).
3. **Document changes**: Keep track of applied recommendations and any customizations made.
4. **Review periodically**: Security needs change over time. Reassess recommendations periodically.
5. **Maintain backups**: Always backup before applying new automations.
