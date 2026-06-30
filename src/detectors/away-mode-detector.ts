import { BaseDetector, DetectionContext } from './base-detector';
import {
  DetectionRule,
  DetectionResult,
  DetectionCategory,
  EntityState,
  CollectedEvent,
  Alert,
  DataSourceType,
} from '../types';

export interface AwayModeDetectorConfig {
  awayModeEntity: string;
  monitoredDomains: string[];
  ignoredEntities: string[];
  minAwayDuration: number;
  checkInterval: number;
}

const ALERT_TYPE_DEVICE_ON = 'device_on';

export class AwayModeDetector extends BaseDetector {
  private detectorConfig: AwayModeDetectorConfig;
  private awayModeState: boolean;
  private awaySince: Date | null;
  private deviceOnSince: Map<string, Date>;

  constructor(rule: DetectionRule) {
    super(rule);
    this.detectorConfig = this.getDefaultConfig();
    this.awayModeState = false;
    this.awaySince = null;
    this.deviceOnSince = new Map();
  }

  public getCategory(): DetectionCategory {
    return DetectionCategory.AwayMode;
  }

  public async initialize(): Promise<void> {
    this.deviceOnSince.clear();
    this.awayModeState = false;
    this.awaySince = null;
  }

  public async cleanup(): Promise<void> {
    this.deviceOnSince.clear();
  }

  private getDefaultConfig(): AwayModeDetectorConfig {
    return {
      awayModeEntity: 'input_boolean.away_mode',
      monitoredDomains: ['light', 'switch', 'climate', 'media_player', 'fan'],
      ignoredEntities: [],
      minAwayDuration: 300,
      checkInterval: 300,
    };
  }

  public validateConfig(config: Record<string, any>): string[] {
    const errors: string[] = [];

    if (config.minAwayDuration !== undefined && config.minAwayDuration < 60) {
      errors.push('minAwayDuration must be at least 60 seconds');
    }

    if (!config.awayModeEntity || typeof config.awayModeEntity !== 'string') {
      errors.push('awayModeEntity is required');
    }

    if (config.monitoredDomains !== undefined && !Array.isArray(config.monitoredDomains)) {
      errors.push('monitoredDomains must be an array');
    }

    if (config.ignoredEntities !== undefined && !Array.isArray(config.ignoredEntities)) {
      errors.push('ignoredEntities must be an array');
    }

    return errors;
  }

  protected applyConfig(config: Record<string, any>): void {
    super.applyConfig(config);
    const defaults = this.getDefaultConfig();
    this.detectorConfig = {
      awayModeEntity: config.awayModeEntity ?? defaults.awayModeEntity,
      monitoredDomains: config.monitoredDomains ?? defaults.monitoredDomains,
      ignoredEntities: config.ignoredEntities ?? defaults.ignoredEntities,
      minAwayDuration: config.minAwayDuration ?? defaults.minAwayDuration,
      checkInterval: config.checkInterval ?? defaults.checkInterval,
    };
  }

  public async detect(
    states: EntityState[],
    events: CollectedEvent[],
    context?: DetectionContext,
  ): Promise<DetectionResult> {
    const alerts: Alert[] = [];
    let scannedEntities = 0;

    this.updateAwayModeState(states);

    if (!this.isAwayModeActive()) {
      this.deviceOnSince.clear();
      return {
        ruleId: this.rule.id,
        alerts: [],
        scannedEntities: 0,
        durationMs: 0,
        errors: [],
      };
    }

    const monitoredDevices = states.filter((s) => this.isMonitoredDevice(s));
    scannedEntities = monitoredDevices.length;

    const activeDevices: EntityState[] = [];

    for (const entity of monitoredDevices) {
      if (this.isDeviceOn(entity)) {
        activeDevices.push(entity);
        this.trackDeviceOn(entity);
      } else {
        this.deviceOnSince.delete(entity.entityId);
      }
    }

    if (activeDevices.length > 0) {
      const alert = this.createAwayModeAlert(activeDevices);
      if (alert) {
        alerts.push(alert);
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

  private updateAwayModeState(states: EntityState[]): void {
    const awayEntity = states.find(
      (s) => s.entityId === this.detectorConfig.awayModeEntity,
    );

    if (awayEntity) {
      const isAway = this.isEntityOn(awayEntity);

      if (isAway && !this.awayModeState) {
        this.awaySince = new Date();
      } else if (!isAway && this.awayModeState) {
        this.awaySince = null;
        this.deviceOnSince.clear();
      }

      this.awayModeState = isAway;
    }
  }

  private isAwayModeActive(): boolean {
    if (!this.awayModeState || !this.awaySince) {
      return false;
    }

    const awayDuration = (Date.now() - this.awaySince.getTime()) / 1000;
    return awayDuration >= this.detectorConfig.minAwayDuration;
  }

  private isMonitoredDevice(entity: EntityState): boolean {
    const [domain] = entity.entityId.split('.');

    if (!this.detectorConfig.monitoredDomains.includes(domain)) {
      return false;
    }

    if (this.detectorConfig.ignoredEntities.includes(entity.entityId)) {
      return false;
    }

    return true;
  }

  private isEntityOn(entity: EntityState): boolean {
    const state = entity.state.toLowerCase();
    return state === 'on' || state === 'true' || state === 'open' || state === 'unlocked';
  }

  private isDeviceOn(entity: EntityState): boolean {
    const [domain] = entity.entityId.split('.');
    const state = entity.state.toLowerCase();

    switch (domain) {
      case 'light':
      case 'switch':
      case 'fan':
      case 'media_player':
        return state === 'on' || state === 'true';
      case 'climate':
        return state !== 'off' && state !== 'unavailable' && state !== 'unknown';
      default:
        return state === 'on' || state === 'true' || state === 'open';
    }
  }

  private trackDeviceOn(entity: EntityState): void {
    if (!this.deviceOnSince.has(entity.entityId)) {
      this.deviceOnSince.set(entity.entityId, new Date());
    }
  }

  private createAwayModeAlert(devices: EntityState[]): Alert | null {
    const dedupeKey = this.getDeduplicationKey('global', ALERT_TYPE_DEVICE_ON);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const deviceList = devices
      .map((d) => {
        const friendlyName = d.attributes.friendly_name || d.entityId;
        const room = d.attributes.room || d.attributes.area || 'Unknown';
        const onSince = this.deviceOnSince.get(d.entityId);
        const duration = onSince
          ? Math.floor((Date.now() - onSince.getTime()) / 1000 / 60)
          : 0;
        return {
          entityId: d.entityId,
          name: friendlyName,
          room,
          durationMinutes: duration,
        };
      })
      .sort((a, b) => b.durationMinutes - a.durationMinutes);

    const deviceNames = deviceList.map((d) => d.name).join(', ');
    const suggestions = this.generateSuggestions(deviceList);

    return this.createAlert(
      `Away mode: ${deviceList.length} devices left on`,
      `${deviceList.length} devices are still on while away mode is active: ${deviceNames}`,
      undefined,
      devices[0].source,
      devices[0].sourceId,
      {
        deviceCount: deviceList.length,
        devices: deviceList,
        suggestions,
        awaySince: this.awaySince?.toISOString(),
        alertType: ALERT_TYPE_DEVICE_ON,
      },
    );
  }

  private generateSuggestions(devices: Array<{ entityId: string; name: string; room: string }>): string[] {
    const suggestions: string[] = [];
    const domains = new Set(devices.map((d) => d.entityId.split('.')[0]));

    if (domains.has('light')) {
      suggestions.push('Turn off all lights using scene.turn_off or light.turn_off service');
    }
    if (domains.has('switch')) {
      suggestions.push('Check and turn off unnecessary switches');
    }
    if (domains.has('climate')) {
      suggestions.push('Set thermostats to away mode or turn off HVAC systems');
    }
    if (domains.has('media_player')) {
      suggestions.push('Turn off all media devices');
    }
    if (domains.has('fan')) {
      suggestions.push('Turn off all fans');
    }

    suggestions.push('Consider creating an "Away Mode" automation to automatically turn off devices');

    return suggestions;
  }
}
