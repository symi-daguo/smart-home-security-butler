import axios, { AxiosInstance } from 'axios';
import { NotifierBase } from './notifier-base';
import { NotifierConfig, NotificationMessage, SeverityLevel } from '../types';

export interface BarkNotifierConfig {
  deviceKey: string;
  baseUrl?: string;
  sound?: string;
  icon?: string;
  group?: string;
}

export class BarkNotifier extends NotifierBase {
  private barkConfig: BarkNotifierConfig;
  private axiosInstance: AxiosInstance | null;

  constructor(config: NotifierConfig) {
    super(config);
    this.barkConfig = (config.config as BarkNotifierConfig) || {
      deviceKey: '',
    };
    this.axiosInstance = null;
  }

  public getType(): string {
    return 'bark';
  }

  public validateConfig(config: Record<string, any>): string[] {
    const errors: string[] = [];

    if (!config.deviceKey || typeof config.deviceKey !== 'string') {
      errors.push('deviceKey is required');
    }

    if (config.baseUrl && typeof config.baseUrl !== 'string') {
      errors.push('baseUrl must be a string');
    }

    if (config.sound && typeof config.sound !== 'string') {
      errors.push('sound must be a string');
    }

    if (config.icon && typeof config.icon !== 'string') {
      errors.push('icon must be a string');
    }

    if (config.group && typeof config.group !== 'string') {
      errors.push('group must be a string');
    }

    return errors;
  }

  public async initialize(): Promise<void> {
    if (!this.barkConfig.deviceKey) {
      throw new Error('Bark device key is not configured');
    }

    const baseUrl = (this.barkConfig.baseUrl || 'https://api.day.app').replace(/\/$/, '');

    this.axiosInstance = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
    });

    this.initialized = true;
  }

  public async cleanup(): Promise<void> {
    this.axiosInstance = null;
    this.initialized = false;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const response = await this.axiosInstance!.get(`/${this.barkConfig.deviceKey}/test/test`);
      return response.status === 200;
    } catch {
      return false;
    }
  }

  protected async sendMessage(message: NotificationMessage): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.axiosInstance) {
      throw new Error('Bark notifier not initialized');
    }

    const title = this.escapeBarkText(this.buildTitle(message));
    const body = this.escapeBarkText(this.buildBody(message));

    const payload: Record<string, any> = {
      device_key: this.barkConfig.deviceKey,
      title,
      body,
    };

    if (this.barkConfig.sound) {
      payload.sound = this.barkConfig.sound;
    } else {
      payload.sound = 'minuet';
    }

    if (this.barkConfig.icon) {
      payload.icon = this.barkConfig.icon;
    }

    if (this.barkConfig.group) {
      payload.group = this.barkConfig.group;
    }

    const level = this.getSeverityLevel(message.severity);
    if (level) {
      payload.level = level;
    }

    try {
      const response = await this.axiosInstance.post('/push', payload);
      const data = response.data;
      return data && (data.code === 200 || data.success === true);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const msg = error.response.data?.message || error.message;
        throw new Error(`Bark API error: ${msg}`);
      }
      throw error;
    }
  }

  public async test(): Promise<{
    success: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      await this.ensureInitialized();
      const response = await this.axiosInstance!.get(
        `/${this.barkConfig.deviceKey}/测试通知/这是一条测试消息`
      );
      const latencyMs = Date.now() - startTime;
      const data = response.data;
      const success = data && (data.code === 200 || data.success === true);

      return {
        success,
        latencyMs,
        error: success ? undefined : data?.message || 'Unknown error',
      };
    } catch (error: any) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private buildTitle(message: NotificationMessage): string {
    const severityLabel = this.getSeverityLabel(message.severity);
    return `[${severityLabel}] ${message.title}`;
  }

  private buildBody(message: NotificationMessage): string {
    const lines: string[] = [];
    lines.push(message.message);

    if (message.alertId) {
      lines.push('');
      lines.push(`告警ID: ${message.alertId}`);
    }

    lines.push('');
    lines.push(`时间: ${new Date().toLocaleString('zh-CN')}`);

    return lines.join('\n');
  }

  private getSeverityLevel(severity: SeverityLevel): string | null {
    switch (severity) {
      case SeverityLevel.Critical:
      case SeverityLevel.High:
        return 'timeSensitive';
      case SeverityLevel.Medium:
        return 'active';
      case SeverityLevel.Low:
      case SeverityLevel.Info:
        return 'passive';
      default:
        return null;
    }
  }

  private escapeBarkText(text: string): string {
    return text;
  }

  public getDeviceKey(): string {
    return this.barkConfig.deviceKey;
  }

  public getBaseUrl(): string {
    return this.barkConfig.baseUrl || 'https://api.day.app';
  }

  public setDeviceKey(key: string): void {
    this.barkConfig.deviceKey = key;
    this.config.config = { ...this.barkConfig };
  }

  public setBaseUrl(url: string): void {
    this.barkConfig.baseUrl = url;
    this.config.config = { ...this.barkConfig };
    if (this.axiosInstance && url) {
      this.axiosInstance.defaults.baseURL = url.replace(/\/$/, '');
    }
  }

  public override updateConfig(config: Partial<NotifierConfig>): void {
    super.updateConfig(config);
    if (config.config) {
      this.barkConfig = { ...this.barkConfig, ...config.config } as BarkNotifierConfig;
      if (this.axiosInstance && this.barkConfig.baseUrl) {
        this.axiosInstance.defaults.baseURL = this.barkConfig.baseUrl.replace(/\/$/, '');
      }
    }
  }
}
