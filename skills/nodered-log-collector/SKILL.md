---
name: nodered-log-collector
description: >-
  Node-RED flow log and status data collector for Smart Home Security Butler.
  Collects flow deployment events, node status changes, execution errors, and
  debug output from Node-RED via Admin REST API. Use when setting up Node-RED
  data collection for security monitoring, tracking flow execution health,
  detecting automation failures, or monitoring Node-RED system status.
version: 0.1.0
compatibility: >-
  Requires network access to a Node-RED instance on a trusted LAN or VPN.
  Supports Node-RED 3.1 and later. Works with both HA Add-on and standalone
  Node-RED deployments.
metadata:
  requires:
    env: []
  optionalEnv:
    - NR_TOKEN
    - NR_BASE_URL
    - NR_USERNAME
    - NR_PASSWORD
  primaryEnv: NR_TOKEN
  always: false
  homepage: https://github.com/symi-daguo/smart-home-security-butler
---

# Node-RED Log Collector

## Overview

Node-RED data collector module for Smart Home Security Butler. Connects to
Node-RED Admin API to collect flow status, deployment events, node health,
error logs, and system metrics for security monitoring and automation
reliability tracking.

## Connection

| Parameter | Default | Description |
|-----------|---------|-------------|
| Base URL | `http://homeassistant.local:1880` | Node-RED Admin API URL |
| Auth (Token) | `Authorization: Bearer ${NR_TOKEN}` | Bearer token authentication |
| Auth (Basic) | `Authorization: Basic ${credentials}` | HTTP Basic authentication |
| Admin API Path | `/admin` | Admin API base path |

### Authentication Methods

**Method 1: Bearer Token (Standalone Node-RED)**
- Configure adminAuth in Node-RED settings
- Generate token via POST /auth/token
- Token-based auth with configurable expiry

**Method 2: Basic Auth (HA Add-on)**
- Node-RED running as Home Assistant Add-on
- Uses HA authentication via nginx proxy
- Requires HA username and password
- Direct port access (1880) needed, Ingress not supported for API

**Method 3: No Auth (Trusted LAN Only)**
- Node-RED with adminAuth disabled
- Only use on completely trusted, isolated networks
- Not recommended for production

### HA Add-on Specific Notes

When Node-RED runs as a Home Assistant Add-on:
- The direct port (default 1880) must be exposed in Add-on configuration
- Authentication uses HA credentials (username + password) via Basic Auth
- The Ingress proxy does not support Admin API access
- Use `http://<ha-ip>:1880/` as the base URL

## Collected Data Types

### 1. Flow Status

Current state of all deployed flows.

**Flow data:**
```json
{
  "id": "flow-id",
  "label": "Security Automations",
  "disabled": false,
  "info": "...",
  "nodeCount": 15,
  "lastModified": "2024-01-15T10:00:00Z",
  "status": "running"
}
```

### 2. Node Status

Real-time status of individual nodes (polled).

**Node status types:**
| Status | Description |
|--------|-------------|
| `green` | Node is running normally |
| `yellow` | Node has warning |
| `red` | Node has error / disconnected |
| `grey` | Node is disabled |
| `blue` | Node is executing |

**Status data includes:**
- Node ID, type, name
- Current status fill (color)
- Status shape (ring/dot)
- Status text message
- Last status change time

### 3. Deployment Events

Flow deployment history.

**Deployment data:**
- Deployment timestamp
- Deployed flows/nodes
- User who deployed (if auth enabled)
- Deployment type (full/nodes/flows)
- Rev number

### 4. Error Logs

Flow execution errors and catch node output.

**Error data:**
- Error message
- Error stack trace (if available)
- Node that triggered the error
- Flow containing the node
- Timestamp
- Error count (for repeated errors)

### 5. Debug Output

Configurable debug node output capture.

**Note:** Debug output collection is opt-in per node. Only debug nodes with
specific labels/tags are collected to avoid overwhelming the system.

### 6. System Info

Node-RED runtime information.

**System metrics:**
- Node-RED version
- Node.js version
- Uptime
- Flow count
- Node count
- Memory usage

## Collection Configuration

### Monitoring Targets

```yaml
monitor_flows:
  - "Security Automations"
  - "Home Automation"
  - "*"  # Monitor all flows

monitor_node_types:
  - "ha-*"  # All Home Assistant nodes
  - "mqtt in"
  - "mqtt out"
  - "http request"
  - "trigger-state"
  - "poll-state"

capture_errors: true
capture_debug: false
capture_deployments: true
```

### Collection Intervals

| Data Type | Interval | Method |
|-----------|----------|--------|
| Flow status | 1 minute | Admin API polling |
| Node status | 30 seconds | Admin API polling |
| Error logs | 15 seconds | Admin API polling |
| Deployment events | Real-time (polling) | Admin API polling |
| System info | 5 minutes | Admin API polling |

## API Reference

### Start Collection

`POST /api/collectors/nodered/start`

**Request:**
```json
{
  "baseUrl": "http://homeassistant.local:1880",
  "auth": {
    "type": "basic",
    "username": "admin",
    "password": "${NR_PASSWORD}"
  },
  "config": {
    "monitorFlows": ["*"],
    "monitorNodeTypes": ["ha-*", "mqtt*"],
    "captureErrors": true,
    "captureDebug": false
  }
}
```

### Stop Collection

`POST /api/collectors/nodered/stop`

### Get Status

`GET /api/collectors/nodered/status`

**Response:**
```json
{
  "status": "connected",
  "uptime": 3600,
  "flowsMonitored": 8,
  "nodesMonitored": 120,
  "errorsDetected": 3,
  "lastCheckAt": "2024-01-15T10:30:00Z",
  "nodeRedVersion": "3.1.9",
  "deploymentsToday": 5
}
```

### Test Connection

`POST /api/collectors/nodered/test`

Tests connectivity without starting full collection.

**Response:**
```json
{
  "success": true,
  "latencyMs": 67,
  "version": "3.1.9",
  "flowCount": 8,
  "nodeCount": 120
}
```

### Get Flow Health Report

`GET /api/collectors/nodered/health-report`

Returns comprehensive flow health summary.

**Response:**
```json
{
  "totalFlows": 8,
  "healthyFlows": 6,
  "flowsWithErrors": 2,
  "disabledFlows": 0,
  "totalNodes": 120,
  "nodesWithErrors": 5,
  "nodesWithWarnings": 12,
  "errorRateLastHour": 0.5,
  "topErrorNodes": [
    {
      "id": "node-id",
      "type": "http request",
      "name": "Weather API",
      "errorCount": 15,
      "lastError": "2024-01-15T10:25:00Z"
    }
  ]
}
```

### Get Error Log

`GET /api/collectors/nodered/errors`

Returns recent flow execution errors.

**Query Parameters:**
- `flowId` (string): Filter by flow
- `nodeType` (string): Filter by node type
- `since` (ISO string): Errors since this time
- `limit` (number): Max results (default 50)

## Security Notes

- **Admin API access**: The collector needs read access to Node-RED Admin API. Avoid using full admin accounts where possible.
- **Credentials in flows**: The collector never reads or stores credentials stored in flow configurations.
- **Debug output**: Be cautious when enabling debug output capture - it may contain sensitive data.
- **Network exposure**: Node-RED Admin API should not be exposed directly to the internet.

## Common Pitfalls

### Pitfall 1: HA Add-on Ingress doesn't work for API
Node-RED HA Add-on Ingress uses a reverse proxy that does not support the Admin API properly. Always use the direct port (default 1880) for API access.

### Pitfall 2: Status polling vs. real-time
Node-RED Admin API does not have a WebSocket for real-time status. The collector uses polling. For critical nodes, set shorter polling intervals.

### Pitfall 3: Debug node flooding
Enabling debug capture on busy flows can generate massive amounts of data. Use specific debug node names/labels to filter what gets collected.

### Pitfall 4: Deployment detection
Node-RED doesn't have a direct deployment event API. The collector detects deployments by monitoring flow rev numbers and comparing timestamps.

## Troubleshooting

### Connection Failed (HA Add-on)

1. Verify direct port is enabled in Add-on configuration
2. Check HA username and password are correct
3. Ensure Node-RED Add-on is running
4. Verify firewall allows access to port 1880

### Connection Failed (Standalone)

1. Check Node-RED is running and accessible
2. Verify adminAuth credentials
3. Ensure httpAdminRoot is configured correctly
4. Check CORS settings if accessing from different origin

### Missing Flow Data

1. Verify flow is deployed and not disabled
2. Check flow ID/label matches monitor pattern
3. Ensure collector has read permissions
4. Check Node-RED logs for API errors
