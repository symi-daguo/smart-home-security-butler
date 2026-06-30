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

export interface DoorAccessDetectorConfig {
  doorSensors: string[];
  windowSensors: string[];
  lockSensors: string[];
  quietHoursStart: string;
  quietHoursEnd: string;
  awayModeEntity: string;
  doorOpenTimeoutMinutes: number;
  windowOpenTimeoutMinutes: number;
  criticalDoors: string[];
  highDoors: string[];
}

const ALERT_TYPE_AWAY_DOOR_OPEN = 'away_door_open';
const ALERT_TYPE_QUIET_HOURS_DOOR_OPEN = 'quiet_hours_door_open';
const ALERT_TYPE_DOOR_LEFT_OPEN = 'door_left_open';
const ALERT_TYPE_WINDOW_LEFT_OPEN = 'window_left_open';
const ALERT_TYPE_LOCK_JAMMED = 'lock_jammed';
const ALERT_TYPE_LOCK_UNLOCKED_AWAY = 'lock_unlocked_away';

export class DoorAccessDetector extends BaseDetector {
  private detectorConfig: DoorAccessDetectorConfig;
  private openDoors: Map<string, { openedAt: Date }>;
  private openWindows: Map<string, { openedAt: Date }>;
  private awayModeState: boolean;

  constructor(rule: DetectionRule) {
    super(rule);
    this.detectorConfig = this.getDefaultConfig();
    this.openDoors = new Map();
    this.openWindows = new Map();
    this.awayModeState = false;
  }

  public getCategory(): DetectionCategory {
    return DetectionCategory.DoorAccess;
  }

  public async initialize(): Promise<void> {
    this.openDoors.clear();
    this.openWindows.clear();
    this.awayModeState = false;
  }

  public async cleanup(): Promise<void> {
    this.openDoors.clear();
    this.openWindows.clear();
  }

  private getDefaultConfig(): DoorAccessDetectorConfig {
    return {
      doorSensors: ['binary_sensor.*door*', 'binary_sensor.*entry*'],
      windowSensors: ['binary_sensor.*window*'],
      lockSensors: ['lock.*'],
      quietHoursStart: '22:00',
      quietHoursEnd: '06:00',
      awayModeEntity: 'input_boolean.away_mode',
      doorOpenTimeoutMinutes: 30,
      windowOpenTimeoutMinutes: 60,
      criticalDoors: [
        'binary_sensor.*front_door*',
        'binary_sensor.*main_door*',
        'lock.*front_door*',
        'lock.*main_door*',
      ],
      highDoors: [
        'binary_sensor.*back_door*',
        'binary_sensor.*side_door*',
        'binary_sensor.*garage_door*',
        'cover.*garage*',
        'lock.*back_door*',
        'lock.*garage*',
      ],
    };
  }

  public validateConfig(config: Record<string, any>): string[] {
    const errors: string[] = [];

    if (config.quietHoursStart && !this.isValidTime(config.quietHoursStart)) {
      errors.push('quietHoursStart must be in HH:MM format');
    }

    if (config.quietHoursEnd && !this.isValidTime(config.quietHoursEnd)) {
      errors.push('quietHoursEnd must be in HH:MM format');
    }

    if (config.doorOpenTimeoutMinutes !== undefined && config.doorOpenTimeoutMinutes < 1) {
      errors.push('doorOpenTimeoutMinutes must be at least 1 minute');
    }

    if (config.windowOpenTimeoutMinutes !== undefined && config.windowOpenTimeoutMinutes < 1) {
      errors.push('windowOpenTimeoutMinutes must be at least 1 minute');
    }

    if (!config.doorSensors || !Array.isArray(config.doorSensors)) {
      errors.push('doorSensors must be an array');
    }

    if (!config.windowSensors || !Array.isArray(config.windowSensors)) {
      errors.push('windowSensors must be an array');
    }

    if (!config.lockSensors || !Array.isArray(config.lockSensors)) {
      errors.push('lockSensors must be an array');
    }

    return errors;
  }

  protected applyConfig(config: Record<string, any>): void {
    super.applyConfig(config);
    const defaults = this.getDefaultConfig();
    this.detectorConfig = {
      doorSensors: config.doorSensors ?? defaults.doorSensors,
      windowSensors: config.windowSensors ?? defaults.windowSensors,
      lockSensors: config.lockSensors ?? defaults.lockSensors,
      quietHoursStart: config.quietHoursStart ?? defaults.quietHoursStart,
      quietHoursEnd: config.quietHoursEnd ?? defaults.quietHoursEnd,
      awayModeEntity: config.awayModeEntity ?? defaults.awayModeEntity,
      doorOpenTimeoutMinutes: config.doorOpenTimeoutMinutes ?? defaults.doorOpenTimeoutMinutes,
      windowOpenTimeoutMinutes: config.windowOpenTimeoutMinutes ?? defaults.windowOpenTimeoutMinutes,
      criticalDoors: config.criticalDoors ?? defaults.criticalDoors,
      highDoors: config.highDoors ?? defaults.highDoors,
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
    const isQuietHours = this.isQuietHours();
    const isAwayMode = this.awayModeState;

    const doorEntities = this.filterDoorEntities(states);
    const windowEntities = this.filterWindowEntities(states);
    const lockEntities = this.filterLockEntities(states);
    scannedEntities = doorEntities.length + windowEntities.length + lockEntities.length;

    for (const entity of doorEntities) {
      const doorAlerts = this.checkDoor(entity, isAwayMode, isQuietHours);
      alerts.push(...doorAlerts);
    }

    for (const entity of windowEntities) {
      const windowAlerts = this.checkWindow(entity, isAwayMode);
      alerts.push(...windowAlerts);
    }

    for (const entity of lockEntities) {
      const lockAlerts = this.checkLock(entity, isAwayMode);
      alerts.push(...lockAlerts);
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
      this.awayModeState = awayEntity.state === 'on' || awayEntity.state === 'true';
    }
  }

  private filterDoorEntities(states: EntityState[]): EntityState[] {
    return states.filter((state) =>
      this.detectorConfig.doorSensors.some((pattern) =>
        this.matchPattern(state.entityId, pattern),
      ),
    );
  }

  private filterWindowEntities(states: EntityState[]): EntityState[] {
    return states.filter((state) =>
      this.detectorConfig.windowSensors.some((pattern) =>
        this.matchPattern(state.entityId, pattern),
      ),
    );
  }

  private filterLockEntities(states: EntityState[]): EntityState[] {
    return states.filter((state) =>
      this.detectorConfig.lockSensors.some((pattern) =>
        this.matchPattern(state.entityId, pattern),
      ),
    );
  }

  private checkDoor(entity: EntityState, isAwayMode: boolean, isQuietHours: boolean): Alert[] {
    const alerts: Alert[] = [];
    const isOpen = this.isDoorOpen(entity);

    if (isOpen) {
      if (!this.openDoors.has(entity.entityId)) {
        this.openDoors.set(entity.entityId, { openedAt: new Date() });
      }

      const openInfo = this.openDoors.get(entity.entityId)!;
      const openDurationMinutes = (Date.now() - openInfo.openedAt.getTime()) / 1000 / 60;

      if (isAwayMode) {
        const awayAlert = this.createAwayModeDoorAlert(entity, openInfo.openedAt, openDurationMinutes);
        if (awayAlert) {
          alerts.push(awayAlert);
        }
      }

      if (isQuietHours && !isAwayMode) {
        const quietAlert = this.createQuietHoursDoorAlert(entity, openInfo.openedAt, openDurationMinutes);
        if (quietAlert) {
          alerts.push(quietAlert);
        }
      }

      if (openDurationMinutes >= this.detectorConfig.doorOpenTimeoutMinutes) {
        const leftOpenAlert = this.createDoorLeftOpenAlert(entity, openInfo.openedAt, openDurationMinutes);
        if (leftOpenAlert) {
          alerts.push(leftOpenAlert);
        }
      }
    } else {
      this.openDoors.delete(entity.entityId);
    }

    return alerts;
  }

  private checkWindow(entity: EntityState, isAwayMode: boolean): Alert[] {
    const alerts: Alert[] = [];
    const isOpen = this.isWindowOpen(entity);

    if (isOpen) {
      if (!this.openWindows.has(entity.entityId)) {
        this.openWindows.set(entity.entityId, { openedAt: new Date() });
      }

      const openInfo = this.openWindows.get(entity.entityId)!;
      const openDurationMinutes = (Date.now() - openInfo.openedAt.getTime()) / 1000 / 60;

      if (isAwayMode) {
        const awayAlert = this.createAwayModeWindowAlert(entity, openInfo.openedAt, openDurationMinutes);
        if (awayAlert) {
          alerts.push(awayAlert);
        }
      }

      if (openDurationMinutes >= this.detectorConfig.windowOpenTimeoutMinutes) {
        const leftOpenAlert = this.createWindowLeftOpenAlert(entity, openInfo.openedAt, openDurationMinutes);
        if (leftOpenAlert) {
          alerts.push(leftOpenAlert);
        }
      }
    } else {
      this.openWindows.delete(entity.entityId);
    }

    return alerts;
  }

  private checkLock(entity: EntityState, isAwayMode: boolean): Alert[] {
    const alerts: Alert[] = [];

    if (this.isLockJammed(entity)) {
      const jammedAlert = this.createLockJammedAlert(entity);
      if (jammedAlert) {
        alerts.push(jammedAlert);
      }
    }

    if (isAwayMode && this.isLockUnlocked(entity)) {
      const unlockedAlert = this.createAwayModeLockAlert(entity);
      if (unlockedAlert) {
        alerts.push(unlockedAlert);
      }
    }

    return alerts;
  }

  private isDoorOpen(entity: EntityState): boolean {
    const state = entity.state.toLowerCase();
    if (entity.entityId.startsWith('cover.')) {
      return state === 'open' || state === 'opening';
    }
    return state === 'on' || state === 'true' || state === 'open';
  }

  private isWindowOpen(entity: EntityState): boolean {
    const state = entity.state.toLowerCase();
    return state === 'on' || state === 'true' || state === 'open';
  }

  private isLockJammed(entity: EntityState): boolean {
    const state = entity.state.toLowerCase();
    return state === 'jammed' || entity.attributes.jammed === true;
  }

  private isLockUnlocked(entity: EntityState): boolean {
    const state = entity.state.toLowerCase();
    return state === 'unlocked';
  }

  private createAwayModeDoorAlert(entity: EntityState, openedAt: Date, openDurationMinutes: number): Alert | null {
    const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_AWAY_DOOR_OPEN);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const friendlyName = entity.attributes.friendly_name || entity.entityId;
    const severity = this.getDoorSeverity(entity.entityId);

    const alert = this.createAlert(
      `Away mode: ${friendlyName} opened`,
      `${friendlyName} was opened while away mode is active. Open for ${Math.round(openDurationMinutes)} minutes.`,
      entity.entityId,
      entity.source,
      entity.sourceId,
      {
        alertType: ALERT_TYPE_AWAY_DOOR_OPEN,
        openDurationMinutes: Math.round(openDurationMinutes),
        openedAt: openedAt.toISOString(),
        awayMode: true,
        doorType: 'door',
      },
    );

    alert.severity = severity;
    return alert;
  }

  private createQuietHoursDoorAlert(entity: EntityState, openedAt: Date, openDurationMinutes: number): Alert | null {
    const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_QUIET_HOURS_DOOR_OPEN);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const friendlyName = entity.attributes.friendly_name || entity.entityId;
    const severity = this.getDoorSeverity(entity.entityId);

    const alert = this.createAlert(
      `Quiet hours: ${friendlyName} opened`,
      `${friendlyName} was opened during quiet hours. Open for ${Math.round(openDurationMinutes)} minutes.`,
      entity.entityId,
      entity.source,
      entity.sourceId,
      {
        alertType: ALERT_TYPE_QUIET_HOURS_DOOR_OPEN,
        openDurationMinutes: Math.round(openDurationMinutes),
        openedAt: openedAt.toISOString(),
        quietHours: true,
        doorType: 'door',
      },
    );

    alert.severity = severity === SeverityLevel.Critical ? SeverityLevel.High : severity;
    return alert;
  }

  private createDoorLeftOpenAlert(entity: EntityState, openedAt: Date, openDurationMinutes: number): Alert | null {
    const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_DOOR_LEFT_OPEN);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const friendlyName = entity.attributes.friendly_name || entity.entityId;
    const room = entity.attributes.room || entity.attributes.area || 'Unknown';

    const alert = this.createAlert(
      `Door left open: ${friendlyName}`,
      `${friendlyName} in ${room} has been open for ${Math.round(openDurationMinutes)} minutes.`,
      entity.entityId,
      entity.source,
      entity.sourceId,
      {
        alertType: ALERT_TYPE_DOOR_LEFT_OPEN,
        openDurationMinutes: Math.round(openDurationMinutes),
        openedAt: openedAt.toISOString(),
        room,
        doorType: 'door',
        suggestion: `Consider closing ${friendlyName} to save energy or improve security.`,
      },
    );

    alert.severity = SeverityLevel.Medium;
    return alert;
  }

  private createAwayModeWindowAlert(entity: EntityState, openedAt: Date, openDurationMinutes: number): Alert | null {
    const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_AWAY_DOOR_OPEN);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const friendlyName = entity.attributes.friendly_name || entity.entityId;

    const alert = this.createAlert(
      `Away mode: ${friendlyName} open`,
      `${friendlyName} is open while away mode is active. Open for ${Math.round(openDurationMinutes)} minutes.`,
      entity.entityId,
      entity.source,
      entity.sourceId,
      {
        alertType: ALERT_TYPE_AWAY_DOOR_OPEN,
        openDurationMinutes: Math.round(openDurationMinutes),
        openedAt: openedAt.toISOString(),
        awayMode: true,
        doorType: 'window',
      },
    );

    alert.severity = SeverityLevel.High;
    return alert;
  }

  private createWindowLeftOpenAlert(entity: EntityState, openedAt: Date, openDurationMinutes: number): Alert | null {
    const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_WINDOW_LEFT_OPEN);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const friendlyName = entity.attributes.friendly_name || entity.entityId;
    const room = entity.attributes.room || entity.attributes.area || 'Unknown';

    const alert = this.createAlert(
      `Window left open: ${friendlyName}`,
      `${friendlyName} in ${room} has been open for ${Math.round(openDurationMinutes)} minutes.`,
      entity.entityId,
      entity.source,
      entity.sourceId,
      {
        alertType: ALERT_TYPE_WINDOW_LEFT_OPEN,
        openDurationMinutes: Math.round(openDurationMinutes),
        openedAt: openedAt.toISOString(),
        room,
        doorType: 'window',
        suggestion: `Consider closing ${friendlyName} if not needed.`,
      },
    );

    alert.severity = SeverityLevel.Low;
    return alert;
  }

  private createLockJammedAlert(entity: EntityState): Alert | null {
    const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_LOCK_JAMMED);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const friendlyName = entity.attributes.friendly_name || entity.entityId;
    const severity = this.getDoorSeverity(entity.entityId);

    const alert = this.createAlert(
      `Lock jammed: ${friendlyName}`,
      `${friendlyName} is reporting a jammed state. The lock may need physical attention.`,
      entity.entityId,
      entity.source,
      entity.sourceId,
      {
        alertType: ALERT_TYPE_LOCK_JAMMED,
        lockStatus: 'jammed',
        suggestion: 'Check the lock for physical obstructions and ensure proper alignment.',
      },
    );

    alert.severity = severity;
    return alert;
  }

  private createAwayModeLockAlert(entity: EntityState): Alert | null {
    const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_LOCK_UNLOCKED_AWAY);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const friendlyName = entity.attributes.friendly_name || entity.entityId;
    const severity = this.getDoorSeverity(entity.entityId);

    const alert = this.createAlert(
      `Away mode: ${friendlyName} unlocked`,
      `${friendlyName} is unlocked while away mode is active.`,
      entity.entityId,
      entity.source,
      entity.sourceId,
      {
        alertType: ALERT_TYPE_LOCK_UNLOCKED_AWAY,
        lockStatus: 'unlocked',
        awayMode: true,
        suggestion: 'Lock the door immediately or check if someone is home.',
      },
    );

    alert.severity = severity;
    return alert;
  }

  private getDoorSeverity(entityId: string): SeverityLevel {
    if (this.matchesAnyPattern(entityId, this.detectorConfig.criticalDoors)) {
      return SeverityLevel.Critical;
    }

    if (this.matchesAnyPattern(entityId, this.detectorConfig.highDoors)) {
      return SeverityLevel.High;
    }

    return SeverityLevel.Medium;
  }

  private matchesAnyPattern(str: string, patterns: string[]): boolean {
    return patterns.some((pattern) => this.matchPattern(str, pattern));
  }

  private isQuietHours(): boolean {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startHour, startMin] = this.detectorConfig.quietHoursStart.split(':').map(Number);
    const [endHour, endMin] = this.detectorConfig.quietHoursEnd.split(':').map(Number);

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (startMinutes > endMinutes) {
      return currentMinutes >= startMinutes || currentMinutes < endMinutes;
    }

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  private isValidTime(time: string): boolean {
    const pattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
    return pattern.test(time);
  }

  private matchPattern(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
    return regex.test(str);
  }
}
