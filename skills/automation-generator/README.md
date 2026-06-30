# Automation Generator

Security automation scene generator for Smart Home Security Butler.

## Overview

Automation Generator analyzes security detection results and generates
intelligent automation recommendations to improve home security. It creates
remediation automations, response procedures, and preventive measures.

## Features

- Rule-based templates for common security scenarios
- Pattern-based generation from existing automations
- Incident response automation generation
- Support for Home Assistant, Node-RED, and KNX Gateway
- Quality scoring and confidence metrics
- Safety validation before recommendations
- One-click apply with backup and rollback
- Security gap analysis

## Output Platforms

| Platform | Output Format |
|----------|--------------|
| Home Assistant | Automation YAML, scripts, blueprints |
| Node-RED | Flow JSON, subflows, function nodes |
| KNX Gateway | Scenes, workflows, triggers |

## Recommendation Types

| Type | Description |
|------|-------------|
| Remediation | Direct fix for detected issue |
| Prevention | Prevents future occurrences |
| Enhancement | Improves existing security |
| Response | Incident response automation |
| Monitoring | Better detection/visibility |

## Installation

This sub-skill is included with the Smart Home Security Butler. No separate
installation is required.

## Configuration

### Optional Environment Variables

| Variable | Description |
|----------|-------------|
| `HA_TOKEN` | For applying HA automations |
| `NR_TOKEN` | For applying Node-RED flows |
| `KNX_TOKEN` | For applying KNX Gateway scenes |

### Quality Thresholds

```json
{
  "minConfidence": 0.7,
  "maxRecommendationsPerAlert": 5,
  "autoApplyEnabled": false,
  "backupBeforeApply": true,
  "safetyValidation": true
}
```

## Workflow

```
Security Alert → Context Analysis → Template Matching
→ Customization → Safety Validation → Quality Scoring
→ User Review → Application → Verification
```

## Safety Features

- Dry-run verification before applying
- Automatic backup before changes
- Rollback capability for all applied recommendations
- Critical automations always require manual confirmation
- Conflict detection with existing automations

## Related Documentation

- [Main Security Butler Skill](../SKILL.md)
- [Detection Rules Reference](../ref/detection-rules.md)
- [Usage Examples](../ref/examples.md)
- [Security Detection Skill](../security-detection/SKILL.md)

## License

MIT
