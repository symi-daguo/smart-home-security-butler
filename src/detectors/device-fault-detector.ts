import { BaseDetector, DetectionContext } from './base-detector';
import {
  DetectionRule,
  DetectionResult,
  DetectionCategory,
  EntityState,
  CollectedEvent,
  Alert,
  SeverityLevel,
  DataSourceType,
} from '../types';

export interface DeviceFaultDetectorConfig {
  offlineTimeoutMinutes: number;
  unavailableTimeoutMinutes: number;
  monitoredDomains: string[];
  ignoredEntities: string[];
  criticalDevicePatterns: string[];
  highDevicePatterns: string[];
  knxOfflineAttribute: string;
  noderedErrorEventType: string;
}

const ALERT_TYPE_OFFLINE = 'offline';
const ALERT_TYPE_UNAVAILABLE = 'unavailable';
const ALERT_TYPE_KNX_OFFLINE = 'knx_offline';
const ALERT_TYPE_NODERED_ERROR = 'nodered_error';

const CRITICAL_DEFAULT_PATTERNS = [
  'alarm_control_panel.*',
  'binary_sensor.*smoke*',
  'binary_sensor.*fire*',
  'binary_sensor.*carbon_monoxide*',
  'lock.*front_door*',
  'lock.*main_door*',
];

const HIGH_DEFAULT_PATTERNS = [
  'lock.*',
  'climate.*',
  'cover.*garage*',
  'binary_sensor.*door*',
  'binary_sensor.*window*',
  'camera.*',
];

export class DeviceFaultDetector extends BaseDetector {
  private detectorConfig: DeviceFaultDetectorConfig;
  private lastSeen: Map<string, Date>;
  private firstUnavailable: Map<string, Date>;
  private noderedErrorFlows: Map<string, Date>;

  constructor(rule: DetectionRule) {
    super(rule);
    this.detectorConfig = this.getDefaultConfig();
    this.lastSeen = new Map();
    this.firstUnavailable = new Map();
    this.noderedErrorFlows = new Map();
  }

  public getCategory(): DetectionCategory {
    return DetectionCategory.DeviceFault;
  }

  public async initialize(): Promise<void> {
    this.lastSeen.clear();
    this.firstUnavailable.clear();
    this.noderedErrorFlows.clear();
  }

  public async cleanup(): Promise<void> {
    this.lastSeen.clear();
    this.firstUnavailable.clear();
    this.noderedErrorFlows.clear();
  }

  private getDefaultConfig(): DeviceFaultDetectorConfig {
    return {
      offlineTimeoutMinutes: 5,
      unavailableTimeoutMinutes: 10,
      monitoredDomains: [
        'binary_sensor',
        'sensor',
        'lock',
        'cover',
        'climate',
        'light',
        'switch',
        'camera',
        'alarm_control_panel',
      ],
      ignoredEntities: [],
      criticalDevicePatterns: CRITICAL_DEFAULT_PATTERNS,
      highDevicePatterns: HIGH_DEFAULT_PATTERNS,
      knxOfflineAttribute: 'knx_offline',
      noderedErrorEventType: 'flow_error',
    };
  }

  public validateConfig(config: Record<string, any>): string[] {
    const errors: string[] = [];

    if (config.offlineTimeoutMinutes !== undefined && config.offlineTimeoutMinutes < 1) {
      errors.push('offlineTimeoutMinutes must be at least 1 minute');
    }

    if (config.unavailableTimeoutMinutes !== undefined && config.unavailableTimeoutMinutes < 1) {
      errors.push('unavailableTimeoutMinutes must be at least 1 minute');
    }

    if (config.monitoredDomains !== undefined && !Array.isArray(config.monitoredDomains)) {
      errors.push('monitoredDomains must be an array');
    }

    if (config.ignoredEntities !== undefined && !Array.isArray(config.ignoredEntities)) {
      errors.push('ignoredEntities must be an array');
    }

    if (config.criticalDevicePatterns !== undefined && !Array.isArray(config.criticalDevicePatterns)) {
      errors.push('criticalDevicePatterns must be an array');
    }

    if (config.highDevicePatterns !== undefined && !Array.isArray(config.highDevicePatterns)) {
      errors.push('highDevicePatterns must be an array');
    }

    return errors;
  }

  protected applyConfig(config: Record<string, any>): void {
    super.applyConfig(config);
    const defaults = this.getDefaultConfig();
    this.detectorConfig = {
      offlineTimeoutMinutes: config.offlineTimeoutMinutes ?? defaults.offlineTimeoutMinutes,
      unavailableTimeoutMinutes: config.unavailableTimeoutMinutes ?? defaults.unavailableTimeoutMinutes,
      monitoredDomains: config.monitoredDomains ?? defaults.monitoredDomains,
      ignoredEntities: config.ignoredEntities ?? defaults.ignoredEntities,
      criticalDevicePatterns: config.criticalDevicePatterns ?? defaults.criticalDevicePatterns,
      highDevicePatterns: config.highDevicePatterns ?? defaults.highDevicePatterns,
      knxOfflineAttribute: config.knxOfflineAttribute ?? defaults.knxOfflineAttribute,
      noderedErrorEventType: config.noderedErrorEventType ?? defaults.noderedErrorEventType,
    };
  }

  public async detect(
    states: EntityState[],
    events: CollectedEvent[],
    context?: DetectionContext,
  ): Promise<DetectionResult> {
    const alerts: Alert[] = [];
    let scannedEntities = 0;

    this.updateLastSeen(states);
    this.processEvents(events);

    const monitoredDevices = states.filter((s) => this.isMonitored(s));
    scannedEntities = monitoredDevices.length;

    for (const entity of monitoredDevices) {
      const offlineAlert = this.checkOfflineTimeout(entity);
      if (offlineAlert) {
        alerts.push(offlineAlert);
        continue;
      }

      const unavailableAlert = this.checkUnavailable(entity);
      if (unavailableAlert) {
        alerts.push(unavailableAlert);
        continue;
      }

      const knxOfflineAlert = this.checkKnxOffline(entity);
      if (knxOfflineAlert) {
        alerts.push(knxOfflineAlert);
      }
    }

    for (const [flowId, firstSeen] of this.noderedErrorFlows) {
      const noderedAlert = this.checkNodeRedFlowError(flowId, firstSeen);
      if (noderedAlert) {
        alerts.push(noderedAlert);
      }
    }

    return {
      ruleId: this.rule.id,
      alerts,
      scannedEntities,
      durationMs: 0,
      errors: [],
    };
  }

  private updateLastSeen(states: EntityState[]): void {
    const now = new Date();
    for (const state of states) {
      if (state.state !== 'unavailable' && state.state !== 'unknown') {
        this.lastSeen.set(state.entityId, now);
        this.firstUnavailable.delete(state.entityId);
      }
    }
  }

  private processEvents(events: CollectedEvent[]): void {
    const now = new Date();
    for (const event of events) {
      if (event.source === DataSourceType.NodeRed && event.eventType === this.detectorConfig.noderedErrorEventType) {
        const flowId = event.data.flowId || event.data.id || event.id;
        if (!this.noderedErrorFlows.has(flowId)) {
          this.noderedErrorFlows.set(flowId, now);
        }
      }
    }
  }

  private isMonitored(entity: EntityState): boolean {
    const [domain] = entity.entityId.split('.');

    if (!this.detectorConfig.monitoredDomains.includes(domain)) {
      return false;
    }

    if (this.detectorConfig.ignoredEntities.includes(entity.entityId)) {
      return false;
    }

    return true;
  }

  private checkOfflineTimeout(entity: EntityState): Alert | null {
    const lastSeen = this.lastSeen.get(entity.entityId);
    if (!lastSeen) {
      return null;
    }

    const timeSinceLastSeen = (Date.now() - lastSeen.getTime()) / 1000 / 60;

    if (timeSinceLastSeen > this.detectorConfig.offlineTimeoutMinutes) {
      const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_OFFLINE);
      if (this.shouldDeduplicate(dedupeKey)) {
        return null;
      }

      const severity = this.getDeviceSeverity(entity.entityId);
      const friendlyName = entity.attributes.friendly_name || entity.entityId;

      const alert = this.createAlert(
        `Device may be offline: ${friendlyName}`,
        `${friendlyName} has not reported status for ${Math.round(timeSinceLastSeen)} minutes.`,
        entity.entityId,
        entity.source,
        entity.sourceId,
        {
          offlineDurationMinutes: Math.round(timeSinceLastSeen),
          lastSeenAt: lastSeen.toISOString(),
          alertType: ALERT_TYPE_OFFLINE,
          deviceClass: entity.attributes.device_class,
        },
      );

      alert.severity = severity;
      return alert;
    }

    return null;
  }

  private checkUnavailable(entity: EntityState): Alert | null {
    if (entity.state !== 'unavailable' && entity.state !== 'unknown') {
      this.firstUnavailable.delete(entity.entityId);
      return null;
    }

    const now = new Date();
    if (!this.firstUnavailable.has(entity.entityId)) {
      this.firstUnavailable.set(entity.entityId, now);
      return null;
    }

    const firstSeen = this.firstUnavailable.get(entity.entityId)!;
    const duration = (now.getTime() - firstSeen.getTime()) / 1000 / 60;

    if (duration > this.detectorConfig.unavailableTimeoutMinutes) {
      const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_UNAVAILABLE);
      if (this.shouldDeduplicate(dedupeKey)) {
        return null;
      }

      const severity = this.getDeviceSeverity(entity.entityId);
      const friendlyName = entity.attributes.friendly_name || entity.entityId;

      const alert = this.createAlert(
        `Device unavailable: ${friendlyName}`,
        `${friendlyName} has been ${entity.state} for ${Math.round(duration)} minutes.`,
        entity.entityId,
        entity.source,
        entity.sourceId,
        {
          state: entity.state,
          unavailableDurationMinutes: Math.round(duration),
          firstUnavailableAt: firstSeen.toISOString(),
          alertType: ALERT_TYPE_UNAVAILABLE,
          deviceClass: entity.attributes.device_class,
        },
      );

      alert.severity = severity;
      return alert;
    }

    return null;
  }

  private checkKnxOffline(entity: EntityState): Alert | null {
    if (entity.source !== DataSourceType.KnxGateway) {
      return null;
    }

    const isKnxOffline = entity.attributes[this.detectorConfig.knxOfflineAttribute] === true;
    if (!isKnxOffline) {
      return null;
    }

    const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_KNX_OFFLINE);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const severity = this.getDeviceSeverity(entity.entityId);
    const friendlyName = entity.attributes.friendly_name || entity.entityId;

    const alert = this.createAlert(
      `KNX device offline: ${friendlyName}`,
      `${friendlyName} is marked as offline on the KNX gateway.`,
      entity.entityId,
      entity.source,
      entity.sourceId,
      {
        alertType: ALERT_TYPE_KNX_OFFLINE,
        deviceClass: entity.attributes.device_class,
        knxAddress: entity.attributes.knx_address || entity.attributes.group_address,
      },
    );

    alert.severity = severity;
    return alert;
  }

  private checkNodeRedFlowError(flowId: string, firstSeen: Date): Alert | null {
    const dedupeKey = this.getDeduplicationKey(flowId, ALERT_TYPE_NODERED_ERROR);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const duration = (Date.now() - firstSeen.getTime()) / 1000 / 60;

    const alert = this.createAlert(
      `Node-RED flow error: ${flowId}`,
      `Node-RED flow ${flowId} has been in error state for ${Math.round(duration)} minutes.`,
      flowId,
      DataSourceType.NodeRed,
      'nodered',
      {
        alertType: ALERT_TYPE_NODERED_ERROR,
        flowId,
        errorDurationMinutes: Math.round(duration),
        firstSeenAt: firstSeen.toISOString(),
      },
    );

    alert.severity = SeverityLevel.Medium;
    return alert;
  }

  private getDeviceSeverity(entityId: string): SeverityLevel {
    if (this.matchesAnyPattern(entityId, this.detectorConfig.criticalDevicePatterns)) {
      return SeverityLevel.Critical;
    }

    if (this.matchesAnyPattern(entityId, this.detectorConfig.highDevicePatterns)) {
      return SeverityLevel.High;
    }

    return SeverityLevel.Medium;
  }

  private matchesAnyPattern(str: string, patterns: string[]): boolean {
    return patterns.some((pattern) => this.matchPattern(str, pattern));
  }

  private matchPattern(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
    return regex.test(str);
  }
}
