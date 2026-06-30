# System Architecture

## Overview

Smart Home Security Butler uses a modular, layered architecture designed for
extensibility and reliability. The system collects data from multiple smart home
sources, processes it through detection engines, and delivers actionable alerts
and recommendations.

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                       │
│  (Agent Interface, CLI, REST API, Dashboard UI, Reports)       │
├─────────────────────────────────────────────────────────────────┤
│                        Analytics Layer                          │
│  (Trend Analyzer, Report Generator, Security Scoring)          │
├─────────────────────────────────────────────────────────────────┤
│                        Orchestration Layer                      │
│  (SecurityButler Engine, Task Scheduler, Rule Manager)         │
├─────────────────────────────────────────────────────────────────┤
│                        Detection Layer                          │
│  (Detectors, Analyzers, Baseline Models)                       │
├─────────────────────────────────────────────────────────────────┤
│                        Collection Layer                         │
│  (HA Collector, Node-RED Collector, KNX Collector)             │
├─────────────────────────────────────────────────────────────────┤
│                        Storage Layer                            │
│  (SQLite Database, Configuration, Cache)                       │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Data Collectors

Collect structured and unstructured data from smart home systems.

**Home Assistant Collector**
- Entity state changes via WebSocket API
- Logbook events and history data
- Device registry and entity registry
- System health and supervisor status

**Node-RED Collector**
- Flow deployment events
- Node status changes
- Debug log output
- Flow execution errors

**KNX Gateway Collector**
- Device online/offline status
- Group monitor telegrams
- Scene execution logs
- System health metrics

### 2. Detection Engine

Processes collected data through configurable detection rules.

**Detector Types:**
- **Threshold-based**: Simple value comparison (temperature, battery level)
- **Pattern-based**: Anomaly detection using baseline patterns
- **State machine**: Multi-state sequence detection (e.g., door open + no motion)
- **Correlation**: Cross-source event correlation

**Detection Pipeline:**
```
Raw Data → Normalization → Feature Extraction → Rule Matching → Alert Generation
```

### 3. Notification System

Delivers alerts through configured channels with intelligent throttling.

**Supported Channels:**
- Telegram (primary)
- Home Assistant persistent notifications
- Email (via SMTP)
- Webhook endpoints

**Notification Features:**
- Severity-based routing
- Rate limiting and throttling
- Alert deduplication
- Escalation rules

### 4. Automation Generator

Analyzes security findings and generates remediation automations.

**Generation Strategies:**
- Rule-based templates for common security scenarios
- Pattern matching against existing automations
- User preference learning

**Output Formats:**
- Home Assistant automations (YAML)
- Node-RED flows (JSON)
- KNX Gateway scenes and workflows

### 5. Analytics and Reporting Engine

Provides comprehensive trend analysis, security scoring, and automated reporting.

**Trend Analyzer:**
- Alert trend analysis (daily/weekly/monthly)
- Category and severity breakdowns
- Top frequent alert devices (Top 10)
- Hourly distribution heatmap data
- Device online rate tracking
- Energy consumption trends (when data available)
- State change frequency analysis

**Security Scoring System:**
- 0-100 comprehensive security score
- Multi-dimensional evaluation (device, access, energy, automation, away mode)
- Weighted scoring with configurable dimensions
- Score trend tracking (improving/declining/stable)
- Strength and weakness identification
- Actionable improvement recommendations

**Report Generator:**
- Weekly and monthly security reports
- Text and Markdown output formats
- Period overview with key metrics
- Top security risks ranked by severity
- Device health summary
- Automation improvement suggestions
- Security improvement roadmap

### 6. Storage Layer

Persistent storage for configuration, logs, and detection state.

**Data Categories:**
- Configuration (detection rules, notification settings)
- Collected data (entity states, logs, events)
- Detection state (baselines, active alerts, detection history)
- Analytics (incident trends, false positive tracking)

## Data Flow

### Real-time Monitoring Flow

1. Collectors subscribe to real-time events from data sources
2. Events are normalized and stored in the time-series database
3. Detection rules evaluate new events as they arrive
4. Detected issues trigger notification pipeline
5. Automation generator provides remediation suggestions

### Periodic Audit Flow

1. Scheduler triggers periodic full scan
2. Collectors pull historical data for analysis
3. All detection rules run against accumulated data
4. Summary report is generated and sent
5. Baseline models are updated with new data

## Extensibility Points

### Adding a New Collector

1. Extend `BaseCollector` class
2. Implement `connect()`, `disconnect()`, `collect()` methods
3. Register with collector manager
4. Define data schema in types

### Adding a New Detector

1. Extend `BaseDetector` class
2. Implement `detect()` and `validateConfig()` methods
3. Define rule configuration schema
4. Register with detection engine

### Adding a Notification Channel

1. Extend `NotifierBase` class
2. Implement `send()` and `validateConfig()` methods
3. Register with notification manager
4. Define message templates

## Performance Characteristics

| Metric | Target | Notes |
|--------|--------|-------|
| Detection latency | < 30s | From event to alert |
| Collector throughput | 1000 events/min | Per data source |
| Database storage | ~100MB/month | For typical home setup |
| Memory footprint | < 200MB | Runtime memory usage |
| CPU usage | < 5% | On typical server hardware |

## Deployment Options

### Standalone Process
Run as an independent Node.js process with its own lifecycle.

### Home Assistant Add-on
Package as a HAOS add-on for tight integration with Home Assistant.

### Node-RED Node
Deploy as custom Node-RED nodes within an existing Node-RED instance.
