import { EventEmitter } from 'events';
import {
  DetectionRule,
  Alert,
  DetectionResult,
  SeverityLevel,
  DetectionCategory,
  EntityState,
  CollectedEvent,
  DataSourceType,
  AlertStatus,
} from '../types';

export const DEFAULT_DEDUPLICATION_WINDOW_MS = 30 * 60 * 1000;

export abstract class BaseDetector extends EventEmitter {
  protected rule: DetectionRule;
  protected lastRunAt: Date | null;
  protected activeAlerts: Map<string, Alert>;
  protected lastAlertTimestamps: Map<string, number>;
  protected deduplicationWindowMs: number;
  protected initialized: boolean;

  constructor(rule: DetectionRule) {
    super();
    this.rule = rule;
    this.lastRunAt = null;
    this.activeAlerts = new Map();
    this.lastAlertTimestamps = new Map();
    this.deduplicationWindowMs = DEFAULT_DEDUPLICATION_WINDOW_MS;
    this.initialized = false;
    this.applyConfig(rule.config);
  }

  public abstract getCategory(): DetectionCategory;

  public abstract detect(
    states: EntityState[],
    events: CollectedEvent[],
    context?: DetectionContext,
  ): Promise<DetectionResult>;

  public abstract validateConfig(config: Record<string, any>): string[];

  public abstract initialize(): Promise<void>;

  public abstract cleanup(): Promise<void>;

  public async run(
    states: EntityState[],
    events: CollectedEvent[],
    context?: DetectionContext,
  ): Promise<DetectionResult> {
    if (!this.rule.enabled) {
      return {
        ruleId: this.rule.id,
        alerts: [],
        scannedEntities: 0,
        durationMs: 0,
        errors: ['Rule is disabled'],
      };
    }

    const startTime = Date.now();
    this.lastRunAt = new Date();

    try {
      await this.ensureInitialized();
      const result = await this.detect(states, events, context);
      const filteredAlerts = result.alerts.filter((alert) => !this.isAlertSilenced(alert));
      result.alerts = filteredAlerts;
      this.updateActiveAlerts(filteredAlerts);
      result.durationMs = Date.now() - startTime;
      return result;
    } catch (error) {
      return {
        ruleId: this.rule.id,
        alerts: [],
        scannedEntities: 0,
        durationMs: Date.now() - startTime,
        errors: [(error as Error).message],
      };
    }
  }

  public getRule(): DetectionRule {
    return { ...this.rule };
  }

  public updateRule(rule: Partial<DetectionRule>): void {
    this.rule = { ...this.rule, ...rule, updatedAt: new Date() };
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlert(alertId: string): Alert | undefined {
    return this.activeAlerts.get(alertId);
  }

  public acknowledgeAlert(alertId: string, note?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date();
    if (note) {
      alert.data.acknowledgementNote = note;
    }
    this.emit('alert_updated', alert);
    return true;
  }

  public silenceAlert(alertId: string, durationSeconds: number, reason?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }
    alert.silencedUntil = new Date(Date.now() + durationSeconds * 1000);
    if (reason) {
      alert.data.silenceReason = reason;
    }
    this.emit('alert_updated', alert);
    return true;
  }

  public resolveAlert(alertId: string, resolution?: string, resolutionType?: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) {
      return false;
    }
    alert.status = AlertStatus.Resolved;
    alert.resolvedAt = new Date();
    alert.resolution = resolution;
    alert.resolutionType = resolutionType;
    this.activeAlerts.delete(alertId);
    this.emit('alert_resolved', alert);
    return true;
  }

  public getLastRunAt(): Date | null {
    return this.lastRunAt;
  }

  public getSeverity(): SeverityLevel {
    return this.rule.severity;
  }

  public isEnabled(): boolean {
    return this.rule.enabled;
  }

  protected createAlert(
    title: string,
    description: string,
    entityId: string | undefined,
    source: DataSourceType,
    sourceId: string,
    data: Record<string, any>,
  ): Alert {
    const now = new Date();
    const alertId = `alert_${this.rule.id}_${entityId || 'global'}_${now.getTime()}`;

    return {
      id: alertId,
      ruleId: this.rule.id,
      ruleName: this.rule.name,
      severity: this.rule.severity,
      category: this.getCategory(),
      title,
      description,
      entityId,
      source,
      sourceId,
      status: AlertStatus.New,
      acknowledged: false,
      firstDetectedAt: now,
      lastDetectedAt: now,
      detectionCount: 1,
      data,
    };
  }

  protected shouldDeduplicate(dedupeKey: string): boolean {
    const now = Date.now();
    const lastTimestamp = this.lastAlertTimestamps.get(dedupeKey);
    if (lastTimestamp && now - lastTimestamp < this.deduplicationWindowMs) {
      return true;
    }
    this.lastAlertTimestamps.set(dedupeKey, now);
    return false;
  }

  protected getDeduplicationKey(entityId: string | undefined, alertType: string): string {
    return `${this.rule.id}_${entityId || 'global'}_${alertType}`;
  }

  protected applyConfig(config: Record<string, any>): void {
    const errors = this.validateConfig(config);
    if (errors.length > 0) {
      console.warn(`Config validation warnings for detector ${this.rule.id}:`, errors);
    }
    if (config.deduplicationWindowMs !== undefined) {
      this.deduplicationWindowMs = config.deduplicationWindowMs;
    }
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
      this.initialized = true;
    }
  }

  protected updateActiveAlerts(alerts: Alert[]): void {
    const currentAlertKeys = new Set(alerts.map((a) => this.getAlertKey(a)));

    const resolvedKeys: string[] = [];
    for (const [key, alert] of this.activeAlerts) {
      if (!currentAlertKeys.has(key) && alert.status !== AlertStatus.Acknowledged) {
        resolvedKeys.push(key);
      }
    }

    for (const key of resolvedKeys) {
      const alert = this.activeAlerts.get(key);
      if (alert) {
        alert.status = AlertStatus.Resolved;
        alert.resolvedAt = new Date();
        alert.resolutionType = 'auto_resolved';
        this.emit('alert_resolved', alert);
        this.activeAlerts.delete(key);
      }
    }

    for (const alert of alerts) {
      const key = this.getAlertKey(alert);
      const existing = this.activeAlerts.get(key);
      if (existing) {
        existing.lastDetectedAt = alert.lastDetectedAt;
        existing.detectionCount++;
        existing.data = { ...existing.data, ...alert.data };
        this.emit('alert_updated', existing);
      } else {
        this.activeAlerts.set(key, alert);
        this.emit('alert_created', alert);
      }
    }
  }

  protected getAlertKey(alert: Alert): string {
    return `${alert.ruleId}_${alert.entityId || 'global'}`;
  }

  protected isAlertSilenced(alert: Alert): boolean {
    if (!alert.silencedUntil) {
      return false;
    }
    return alert.silencedUntil > new Date();
  }
}

export interface DetectionContext {
  awayMode?: boolean;
  nightMode?: boolean;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek?: number;
  baselineData?: Map<string, any>;
  userPresence?: Map<string, boolean>;
}
