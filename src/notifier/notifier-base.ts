import { EventEmitter } from 'events';
import {
  NotifierConfig,
  NotificationMessage,
  NotificationLog,
  ThrottleConfig,
  SeverityLevel,
} from '../types';

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  backoffFactor: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffFactor: 2,
  maxDelayMs: 30000,
};

export abstract class NotifierBase extends EventEmitter {
  protected config: NotifierConfig;
  protected throttleConfig: ThrottleConfig | null;
  protected retryConfig: RetryConfig;
  protected notificationLog: NotificationLog[];
  protected lastNotificationTime: Map<string, number>;
  protected notificationCount: Map<string, number>;
  protected initialized: boolean;

  constructor(config: NotifierConfig) {
    super();
    this.config = config;
    this.throttleConfig = null;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG };
    this.notificationLog = [];
    this.lastNotificationTime = new Map();
    this.notificationCount = new Map();
    this.initialized = false;
  }

  public abstract getType(): string;

  protected abstract sendMessage(message: NotificationMessage): Promise<boolean>;

  public abstract validateConfig(config: Record<string, any>): string[];

  public abstract initialize(): Promise<void>;

  public abstract cleanup(): Promise<void>;

  public abstract testConnection(): Promise<boolean>;

  public async notify(message: NotificationMessage): Promise<NotificationLog> {
    const logEntry: NotificationLog = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      channel: this.config.id,
      alertId: message.alertId,
      messageId: message.id,
      status: 'pending',
    };

    try {
      if (!this.config.enabled) {
        logEntry.status = 'failed';
        logEntry.error = 'Notifier is disabled';
        logEntry.failedAt = new Date();
        this.notificationLog.push(logEntry);
        return logEntry;
      }

      if (this.shouldThrottle(message)) {
        logEntry.status = 'failed';
        logEntry.error = 'Rate limited';
        logEntry.failedAt = new Date();
        this.notificationLog.push(logEntry);
        this.emit('notification_failed', logEntry);
        return logEntry;
      }

      logEntry.sentAt = new Date();
      const success = await this.sendWithRetry(message);

      if (success) {
        logEntry.status = 'sent';
        logEntry.deliveredAt = new Date();
        this.recordNotification(message);
        this.emit('notification_sent', logEntry);
      } else {
        logEntry.status = 'failed';
        logEntry.failedAt = new Date();
        logEntry.error = 'Send failed after retries';
        this.emit('notification_failed', logEntry);
      }

      this.notificationLog.push(logEntry);
      return logEntry;
    } catch (error) {
      logEntry.status = 'failed';
      logEntry.failedAt = new Date();
      logEntry.error = (error as Error).message;
      this.notificationLog.push(logEntry);
      this.emit('notification_failed', logEntry);
      return logEntry;
    }
  }

  protected async sendWithRetry(message: NotificationMessage): Promise<boolean> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const success = await this.sendMessage(message);
        if (success) {
          return true;
        }
      } catch (error) {
        lastError = error as Error;
      }

      if (attempt < this.retryConfig.maxRetries) {
        const delay = Math.min(
          this.retryConfig.initialDelayMs *
            Math.pow(this.retryConfig.backoffFactor, attempt),
          this.retryConfig.maxDelayMs
        );
        await this.sleep(delay);
      }
    }

    if (lastError) {
      throw lastError;
    }
    return false;
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public formatMessage(
    message: NotificationMessage,
    format: 'text' | 'markdown' | 'html' = 'text'
  ): string {
    const severity = this.formatSeverity(message.severity);
    const lines: string[] = [];

    switch (format) {
      case 'html':
        lines.push(`<b>[${severity}] ${this.escapeHtml(message.title)}</b>`);
        lines.push('');
        lines.push(this.escapeHtml(message.message));
        break;

      case 'markdown':
        lines.push(`**[${severity}] ${this.escapeMarkdown(message.title)}**`);
        lines.push('');
        lines.push(this.escapeMarkdown(message.message));
        break;

      default:
        lines.push(`[${severity}] ${message.title}`);
        lines.push('');
        lines.push(message.message);
        break;
    }

    if (message.alertId) {
      lines.push('');
      if (format === 'html') {
        lines.push(`<i>Alert ID: ${this.escapeHtml(message.alertId)}</i>`);
      } else if (format === 'markdown') {
        lines.push(`*Alert ID: ${this.escapeMarkdown(message.alertId)}*`);
      } else {
        lines.push(`Alert ID: ${message.alertId}`);
      }
    }

    return lines.join('\n');
  }

  protected escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  protected escapeMarkdown(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  public getConfig(): NotifierConfig {
    return { ...this.config };
  }

  public updateConfig(config: Partial<NotifierConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public setThrottle(config: ThrottleConfig): void {
    this.throttleConfig = config;
  }

  public getThrottleConfig(): ThrottleConfig | null {
    return this.throttleConfig ? { ...this.throttleConfig } : null;
  }

  public setRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
  }

  public getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public enable(): void {
    this.config.enabled = true;
  }

  public disable(): void {
    this.config.enabled = false;
  }

  public getId(): string {
    return this.config.id;
  }

  public getName(): string {
    return this.config.name;
  }

  public getNotificationLogs(limit?: number, since?: Date): NotificationLog[] {
    let result = [...this.notificationLog].reverse();

    if (since) {
      result = result.filter((l) => l.sentAt && l.sentAt >= since);
    }

    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }

  public getStats(hours: number = 24): {
    total: number;
    sent: number;
    failed: number;
    rateLimited: number;
  } {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recent = this.notificationLog.filter((l) => {
      const time = l.sentAt || l.failedAt;
      return time && time >= since;
    });

    return {
      total: recent.length,
      sent: recent.filter((l) => l.status === 'sent' || l.status === 'delivered').length,
      failed: recent.filter((l) => l.status === 'failed' && l.error !== 'Rate limited').length,
      rateLimited: recent.filter((l) => l.error === 'Rate limited').length,
    };
  }

  protected shouldThrottle(message: NotificationMessage): boolean {
    if (!this.throttleConfig) {
      return false;
    }

    const key = message.alertId || message.title;
    const now = Date.now();

    const lastTime = this.lastNotificationTime.get(key) || 0;
    const cooldownMs = this.throttleConfig.cooldownSeconds * 1000;

    if (now - lastTime < cooldownMs) {
      return true;
    }

    const hourAgo = now - 60 * 60 * 1000;
    const hourCount = this.notificationCount.get(key) || 0;

    if (hourCount >= this.throttleConfig.maxPerHour) {
      return true;
    }

    return false;
  }

  protected recordNotification(message: NotificationMessage): void {
    const key = message.alertId || message.title;
    const now = Date.now();

    this.lastNotificationTime.set(key, now);

    const currentCount = this.notificationCount.get(key) || 0;
    this.notificationCount.set(key, currentCount + 1);

    setTimeout(() => {
      const count = this.notificationCount.get(key) || 0;
      if (count > 0) {
        this.notificationCount.set(key, count - 1);
      }
    }, 60 * 60 * 1000);
  }

  protected formatSeverity(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.Critical:
        return 'CRITICAL';
      case SeverityLevel.High:
        return 'HIGH';
      case SeverityLevel.Medium:
        return 'MEDIUM';
      case SeverityLevel.Low:
        return 'LOW';
      case SeverityLevel.Info:
        return 'INFO';
      default:
        return 'UNKNOWN';
    }
  }

  protected getSeverityLabel(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.Critical:
        return '紧急';
      case SeverityLevel.High:
        return '高';
      case SeverityLevel.Medium:
        return '中';
      case SeverityLevel.Low:
        return '低';
      case SeverityLevel.Info:
        return '信息';
      default:
        return '未知';
    }
  }

  protected getSeverityColor(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.Critical:
        return '#dc2626';
      case SeverityLevel.High:
        return '#ea580c';
      case SeverityLevel.Medium:
        return '#ca8a04';
      case SeverityLevel.Low:
        return '#2563eb';
      case SeverityLevel.Info:
        return '#6b7280';
      default:
        return '#6b7280';
    }
  }

  public async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
      this.initialized = true;
    }
  }
}
