import { BaseDetector, DetectionContext } from './base-detector';
import {
  DetectionRule,
  DetectionResult,
  DetectionCategory,
  EntityState,
  CollectedEvent,
  Alert,
  BaselineData,
  DataSourceType,
} from '../types';

export interface EnergyDetectorConfig {
  energySensors: string[];
  baselinePeriodDays: number;
  anomalyThreshold: number;
  minDurationMinutes: number;
  minDeviationWatts: number;
  perDeviceDetection: boolean;
  highConsumptionDevices: string[];
  updateBaselineIntervalHours: number;
}

const ALERT_TYPE_HIGH_ENERGY = 'high_energy';
const HISTORY_MAX_SAMPLES = 10000;

export class EnergyDetector extends BaseDetector {
  private detectorConfig: EnergyDetectorConfig;
  private baselines: Map<string, BaselineData>;
  private history: Map<string, Array<{ timestamp: Date; value: number }>>;
  private anomalyStart: Map<string, Date>;
  private lastBaselineUpdate: Map<string, Date>;

  constructor(rule: DetectionRule) {
    super(rule);
    this.detectorConfig = this.getDefaultConfig();
    this.baselines = new Map();
    this.history = new Map();
    this.anomalyStart = new Map();
    this.lastBaselineUpdate = new Map();
  }

  public getCategory(): DetectionCategory {
    return DetectionCategory.EnergyAnomaly;
  }

  public async initialize(): Promise<void> {
    this.baselines.clear();
    this.history.clear();
    this.anomalyStart.clear();
    this.lastBaselineUpdate.clear();
  }

  public async cleanup(): Promise<void> {
    this.baselines.clear();
    this.history.clear();
    this.anomalyStart.clear();
    this.lastBaselineUpdate.clear();
  }

  private getDefaultConfig(): EnergyDetectorConfig {
    return {
      energySensors: ['sensor.total_power', 'sensor.power_consumption'],
      baselinePeriodDays: 14,
      anomalyThreshold: 2.0,
      minDurationMinutes: 5,
      minDeviationWatts: 500,
      perDeviceDetection: true,
      highConsumptionDevices: [
        'switch.*ac*',
        'switch.*heater*',
        'switch.*oven*',
        'climate.*',
        'water_heater.*',
      ],
      updateBaselineIntervalHours: 1,
    };
  }

  public validateConfig(config: Record<string, any>): string[] {
    const errors: string[] = [];

    if (config.baselinePeriodDays !== undefined && config.baselinePeriodDays < 1) {
      errors.push('baselinePeriodDays must be at least 1 day');
    }

    if (config.anomalyThreshold !== undefined && config.anomalyThreshold < 1.1) {
      errors.push('anomalyThreshold must be at least 1.1');
    }

    if (config.minDurationMinutes !== undefined && config.minDurationMinutes < 1) {
      errors.push('minDurationMinutes must be at least 1 minute');
    }

    if (config.minDeviationWatts !== undefined && config.minDeviationWatts < 0) {
      errors.push('minDeviationWatts must be non-negative');
    }

    if (!config.energySensors || !Array.isArray(config.energySensors) || config.energySensors.length === 0) {
      errors.push('energySensors must be a non-empty array');
    }

    return errors;
  }

  protected applyConfig(config: Record<string, any>): void {
    super.applyConfig(config);
    const defaults = this.getDefaultConfig();
    this.detectorConfig = {
      energySensors: config.energySensors ?? defaults.energySensors,
      baselinePeriodDays: config.baselinePeriodDays ?? defaults.baselinePeriodDays,
      anomalyThreshold: config.anomalyThreshold ?? defaults.anomalyThreshold,
      minDurationMinutes: config.minDurationMinutes ?? defaults.minDurationMinutes,
      minDeviationWatts: config.minDeviationWatts ?? defaults.minDeviationWatts,
      perDeviceDetection: config.perDeviceDetection ?? defaults.perDeviceDetection,
      highConsumptionDevices: config.highConsumptionDevices ?? defaults.highConsumptionDevices,
      updateBaselineIntervalHours: config.updateBaselineIntervalHours ?? defaults.updateBaselineIntervalHours,
    };
  }

  public async detect(
    states: EntityState[],
    events: CollectedEvent[],
    context?: DetectionContext,
  ): Promise<DetectionResult> {
    const alerts: Alert[] = [];
    let scannedEntities = 0;

    const energyStates = states.filter((s) => this.isEnergySensor(s));
    scannedEntities = energyStates.length;

    for (const entity of energyStates) {
      const value = this.parseEnergyValue(entity);
      if (value === null) {
        continue;
      }

      this.recordHistory(entity.entityId, value);
      this.updateBaselineIfNeeded(entity.entityId);

      const baseline = this.baselines.get(entity.entityId);
      if (!baseline) {
        continue;
      }

      const isAnomaly = this.isAnomalous(value, baseline, context);

      if (isAnomaly) {
        const alert = this.checkAnomalyAlert(entity, value, baseline, context);
        if (alert) {
          alerts.push(alert);
        }
      } else {
        this.anomalyStart.delete(entity.entityId);
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

  private isEnergySensor(entity: EntityState): boolean {
    return this.detectorConfig.energySensors.some((pattern) =>
      this.matchPattern(entity.entityId, pattern),
    );
  }

  private parseEnergyValue(entity: EntityState): number | null {
    const value = Number(entity.state);
    if (isNaN(value) || value < 0) {
      return null;
    }
    return value;
  }

  private recordHistory(entityId: string, value: number): void {
    const history = this.history.get(entityId) || [];
    history.push({ timestamp: new Date(), value });

    if (history.length > HISTORY_MAX_SAMPLES) {
      const cutoff = history.length - HISTORY_MAX_SAMPLES;
      history.splice(0, cutoff);
    }

    const maxAge = this.detectorConfig.baselinePeriodDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - maxAge;
    const filtered = history.filter((h) => h.timestamp.getTime() > cutoffTime);

    this.history.set(entityId, filtered);
  }

  private updateBaselineIfNeeded(entityId: string): void {
    const now = new Date();
    const lastUpdate = this.lastBaselineUpdate.get(entityId);
    const updateInterval = this.detectorConfig.updateBaselineIntervalHours * 60 * 60 * 1000;

    if (lastUpdate && now.getTime() - lastUpdate.getTime() < updateInterval) {
      return;
    }

    this.calculateBaseline(entityId);
    this.lastBaselineUpdate.set(entityId, now);
  }

  private calculateBaseline(entityId: string): BaselineData | null {
    const history = this.history.get(entityId);
    if (!history || history.length < 10) {
      return null;
    }

    const values = history.map((h) => h.value);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const min = Math.min(...values);
    const max = Math.max(...values);

    const baseline: BaselineData = {
      entityId,
      metric: 'power',
      period: `${this.detectorConfig.baselinePeriodDays}d`,
      mean,
      stdDev,
      min,
      max,
      samples: values.length,
      lastUpdated: new Date(),
    };

    this.baselines.set(entityId, baseline);
    return baseline;
  }

  private isAnomalous(value: number, baseline: BaselineData, context?: DetectionContext): boolean {
    const deviation = value - baseline.mean;

    if (deviation < this.detectorConfig.minDeviationWatts) {
      return false;
    }

    if (baseline.stdDev === 0) {
      return value > baseline.mean * this.detectorConfig.anomalyThreshold;
    }

    const deviationRatio = deviation / baseline.stdDev;
    let threshold = this.detectorConfig.anomalyThreshold;

    if (context?.awayMode) {
      threshold *= 0.8;
    }

    return deviationRatio > threshold;
  }

  private checkAnomalyAlert(
    entity: EntityState,
    currentValue: number,
    baseline: BaselineData,
    context?: DetectionContext,
  ): Alert | null {
    const now = new Date();

    if (!this.anomalyStart.has(entity.entityId)) {
      this.anomalyStart.set(entity.entityId, now);
      return null;
    }

    const startTime = this.anomalyStart.get(entity.entityId)!;
    const durationMinutes = (now.getTime() - startTime.getTime()) / 1000 / 60;

    if (durationMinutes < this.detectorConfig.minDurationMinutes) {
      return null;
    }

    const dedupeKey = this.getDeduplicationKey(entity.entityId, ALERT_TYPE_HIGH_ENERGY);
    if (this.shouldDeduplicate(dedupeKey)) {
      return null;
    }

    const friendlyName = entity.attributes.friendly_name || entity.entityId;
    const deviation = currentValue - baseline.mean;
    const percentage = baseline.mean > 0 ? Math.round((deviation / baseline.mean) * 100) : 0;
    const possibleDevices = this.identifyHighConsumptionDevices(context);

    return this.createAlert(
      `Energy anomaly: ${friendlyName}`,
      `Power consumption is abnormally high. Current: ${Math.round(currentValue)}W, Baseline: ${Math.round(baseline.mean)}W (+${percentage}%)`,
      entity.entityId,
      entity.source,
      entity.sourceId,
      {
        alertType: ALERT_TYPE_HIGH_ENERGY,
        currentValue,
        baselineMean: baseline.mean,
        baselineStdDev: baseline.stdDev,
        deviation,
        percentage,
        durationMinutes: Math.round(durationMinutes),
        startedAt: startTime.toISOString(),
        possibleHighConsumptionDevices: possibleDevices,
        unit: entity.attributes.unit_of_measurement || 'W',
        awayMode: context?.awayMode || false,
      },
    );
  }

  private identifyHighConsumptionDevices(context?: DetectionContext): string[] {
    if (!this.detectorConfig.perDeviceDetection) {
      return [];
    }

    const devices: string[] = [];

    if (context?.awayMode) {
      devices.push('HVAC systems (should be in away mode)');
      devices.push('Water heater (consider lowering temperature)');
    } else {
      devices.push('HVAC systems');
      devices.push('Electric water heater');
      devices.push('Oven or stove');
      devices.push('Electric dryer');
      devices.push('Space heater');
      devices.push('Air conditioner');
    }

    return devices;
  }

  public getBaseline(entityId: string): BaselineData | undefined {
    return this.baselines.get(entityId);
  }

  public getAllBaselines(): BaselineData[] {
    return Array.from(this.baselines.values());
  }

  public getBaselineProgress(): number {
    const total = this.detectorConfig.energySensors.length;
    if (total === 0) {
      return 100;
    }

    let withBaseline = 0;
    for (const entityPattern of this.detectorConfig.energySensors) {
      for (const [entityId] of this.baselines) {
        if (this.matchPattern(entityId, entityPattern)) {
          withBaseline++;
          break;
        }
      }
    }

    return Math.round((withBaseline / total) * 100);
  }

  private matchPattern(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
    return regex.test(str);
  }
}
