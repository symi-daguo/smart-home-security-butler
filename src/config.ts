import { SecurityButlerConfig, CollectorConfig, NotifierConfig } from './types';

export class ConfigManager {
  private config: SecurityButlerConfig;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
    this.config = this.loadDefaultConfig();
  }

  private getDefaultConfigPath(): string {
    return process.env.SECURITY_BUTLER_CONFIG || './config.json';
  }

  private loadDefaultConfig(): SecurityButlerConfig {
    return {
      logRetentionDays: 30,
      detectionIntervalSeconds: 300,
      baselineLearningDays: 14,
      maxNotificationsPerHour: 60,
      dataDirectory: './data',
      collectors: [],
      notifiers: [],
    };
  }

  public async load(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public async save(): Promise<void> {
    throw new Error('Method not implemented.');
  }

  public getConfig(): SecurityButlerConfig {
    return { ...this.config };
  }

  public getCollectors(): CollectorConfig[] {
    return [...this.config.collectors];
  }

  public getCollector(id: string): CollectorConfig | undefined {
    return this.config.collectors.find((c) => c.id === id);
  }

  public addCollector(collector: CollectorConfig): void {
    const existing = this.config.collectors.findIndex((c) => c.id === collector.id);
    if (existing >= 0) {
      this.config.collectors[existing] = collector;
    } else {
      this.config.collectors.push(collector);
    }
  }

  public removeCollector(id: string): boolean {
    const index = this.config.collectors.findIndex((c) => c.id === id);
    if (index >= 0) {
      this.config.collectors.splice(index, 1);
      return true;
    }
    return false;
  }

  public getNotifiers(): NotifierConfig[] {
    return [...this.config.notifiers];
  }

  public getNotifier(id: string): NotifierConfig | undefined {
    return this.config.notifiers.find((n) => n.id === id);
  }

  public addNotifier(notifier: NotifierConfig): void {
    const existing = this.config.notifiers.findIndex((n) => n.id === notifier.id);
    if (existing >= 0) {
      this.config.notifiers[existing] = notifier;
    } else {
      this.config.notifiers.push(notifier);
    }
  }

  public removeNotifier(id: string): boolean {
    const index = this.config.notifiers.findIndex((n) => n.id === id);
    if (index >= 0) {
      this.config.notifiers.splice(index, 1);
      return true;
    }
    return false;
  }

  public getLogRetentionDays(): number {
    return this.config.logRetentionDays;
  }

  public getDetectionInterval(): number {
    return this.config.detectionIntervalSeconds;
  }

  public getBaselineLearningDays(): number {
    return this.config.baselineLearningDays;
  }

  public getMaxNotificationsPerHour(): number {
    return this.config.maxNotificationsPerHour;
  }

  public getDataDirectory(): string {
    return this.config.dataDirectory;
  }

  public update(updates: Partial<SecurityButlerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public validate(): string[] {
    const errors: string[] = [];
    if (this.config.logRetentionDays < 1) {
      errors.push('logRetentionDays must be at least 1');
    }
    if (this.config.detectionIntervalSeconds < 60) {
      errors.push('detectionIntervalSeconds must be at least 60');
    }
    if (this.config.baselineLearningDays < 1) {
      errors.push('baselineLearningDays must be at least 1');
    }
    return errors;
  }
}
