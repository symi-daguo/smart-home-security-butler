import axios, { AxiosInstance } from 'axios';
import { NotifierBase } from './notifier-base';
import { NotifierConfig, NotificationMessage, SeverityLevel } from '../types';

export interface ServerChanNotifierConfig {
  sendKey: string;
  channel?: number;
  openid?: string;
}

export class ServerChanNotifier extends NotifierBase {
  private serverchanConfig: ServerChanNotifierConfig;
  private axiosInstance: AxiosInstance | null;

  constructor(config: NotifierConfig) {
    super(config);
    this.serverchanConfig = (config.config as ServerChanNotifierConfig) || {
      sendKey: '',
    };
    this.axiosInstance = null;
  }

  public getType(): string {
    return 'serverchan';
  }

  public validateConfig(config: Record<string, any>): string[] {
    const errors: string[] = [];

    if (!config.sendKey || typeof config.sendKey !== 'string') {
      errors.push('sendKey is required');
    }

    if (config.channel !== undefined && typeof config.channel !== 'number') {
      errors.push('channel must be a number');
    }

    if (config.openid !== undefined && typeof config.openid !== 'string') {
      errors.push('openid must be a string');
    }

    return errors;
  }

  public async initialize(): Promise<void> {
    if (!this.serverchanConfig.sendKey) {
      throw new Error('Server酱 SendKey is not configured');
    }

    this.axiosInstance = axios.create({
      baseURL: 'https://sctapi.ftqq.com',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      },
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
      const response = await this.axiosInstance!.post(
        `/${this.serverchanConfig.sendKey}.send`,
        new URLSearchParams({
          title: '测试通知',
          desp: '这是一条测试消息',
        })
      );
      const data = response.data;
      return data && data.code === 0;
    } catch {
      return false;
    }
  }

  protected async sendMessage(message: NotificationMessage): Promise<boolean> {
    await this.ensureInitialized();

    if (!this.axiosInstance) {
      throw new Error('ServerChan notifier not initialized');
    }

    const title = this.buildTitle(message);
    const desp = this.buildBody(message);

    const params = new URLSearchParams();
    params.append('title', title);
    params.append('desp', desp);

    if (this.serverchanConfig.channel !== undefined) {
      params.append('channel', String(this.serverchanConfig.channel));
    }

    if (this.serverchanConfig.openid) {
      params.append('openid', this.serverchanConfig.openid);
    }

    try {
      const response = await this.axiosInstance.post(
        `/${this.serverchanConfig.sendKey}.send`,
        params
      );
      const data = response.data;
      return data && data.code === 0;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const msg = error.response.data?.message || error.message;
        throw new Error(`ServerChan API error: ${msg}`);
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
      const response = await this.axiosInstance!.post(
        `/${this.serverchanConfig.sendKey}.send`,
        new URLSearchParams({
          title: '测试通知',
          desp: '这是一条测试消息',
        })
      );
      const latencyMs = Date.now() - startTime;
      const data = response.data;
      const success = data && data.code === 0;

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
    return `【安全管家-${severityLabel}】${message.title}`;
  }

  private buildBody(message: NotificationMessage): string {
    const lines: string[] = [];
    lines.push('### 告警详情');
    lines.push('');
    lines.push(message.message);
    lines.push('');
    lines.push('---');
    lines.push('');

    if (message.alertId) {
      lines.push(`- **告警ID**: ${message.alertId}`);
    }

    lines.push(`- **告警时间**: ${new Date().toLocaleString('zh-CN')}`);
    lines.push(`- **严重程度**: ${this.getSeverityLabel(message.severity)}`);

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*此消息由智能家居 AI 安全管家自动发送*');

    return lines.join('\n');
  }

  public getSendKey(): string {
    return this.serverchanConfig.sendKey;
  }

  public setSendKey(key: string): void {
    this.serverchanConfig.sendKey = key;
    this.config.config = { ...this.serverchanConfig };
  }

  public override updateConfig(config: Partial<NotifierConfig>): void {
    super.updateConfig(config);
    if (config.config) {
      this.serverchanConfig = { ...this.serverchanConfig, ...config.config } as ServerChanNotifierConfig;
    }
  }
}
