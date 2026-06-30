import { EventEmitter } from 'events';
import {
  CollectorConfig,
  CollectorStatus,
  CollectorStatusInfo,
  CollectedEvent,
  EntityState,
  DataSourceType,
} from '../types';

export interface ReconnectConfig {
  enabled: boolean;
  initialDelayMs: number;
  maxDelayMs: number;
  maxRetries: number;
  backoffFactor: number;
}

export interface HeartbeatConfig {
  enabled: boolean;
  intervalMs: number;
  timeoutMs: number;
}

const DEFAULT_RECONNECT_CONFIG: ReconnectConfig = {
  enabled: true,
  initialDelayMs: 1000,
  maxDelayMs: 60000,
  maxRetries: -1,
  backoffFactor: 2,
};

const DEFAULT_HEARTBEAT_CONFIG: HeartbeatConfig = {
  enabled: false,
  intervalMs: 30000,
  timeoutMs: 10000,
};

export abstract class BaseCollector extends EventEmitter {
  protected config: CollectorConfig;
  protected status: CollectorStatus;
  protected messageCount: number;
  protected errorCount: number;
  protected connectedAt: Date | null;
  protected lastMessageAt: Date | null;
  protected reconnectConfig: ReconnectConfig;
  protected heartbeatConfig: HeartbeatConfig;
  protected reconnectAttempts: number;
  protected reconnectTimer: NodeJS.Timeout | null;
  protected heartbeatTimer: NodeJS.Timeout | null;
  protected heartbeatTimeoutTimer: NodeJS.Timeout | null;
  protected lastHeartbeatAt: Date | null;
  protected isStopping: boolean;

  constructor(config: CollectorConfig) {
    super();
    this.config = config;
    this.status = CollectorStatus.Disconnected;
    this.messageCount = 0;
    this.errorCount = 0;
    this.connectedAt = null;
    this.lastMessageAt = null;
    this.reconnectConfig = { ...DEFAULT_RECONNECT_CONFIG };
    this.heartbeatConfig = { ...DEFAULT_HEARTBEAT_CONFIG };
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.heartbeatTimeoutTimer = null;
    this.lastHeartbeatAt = null;
    this.isStopping = false;
  }

  public abstract getType(): DataSourceType;

  public abstract connect(): Promise<void>;

  public abstract disconnect(): Promise<void>;

  public abstract collect(): Promise<void>;

  public async start(): Promise<void> {
    if (this.status === CollectorStatus.Connected || this.status === CollectorStatus.Connecting) {
      return;
    }
    this.isStopping = false;
    this.status = CollectorStatus.Connecting;
    this.emit('statusChange', this.status);
    try {
      await this.connect();
      this.status = CollectorStatus.Connected;
      this.connectedAt = new Date();
      this.reconnectAttempts = 0;
      this.emit('connected');
      this.emit('statusChange', this.status);
      this.startHeartbeat();
      this.collect().catch((err) => this.onError(err));
    } catch (error) {
      this.status = CollectorStatus.Error;
      this.errorCount++;
      this.emit('error', error);
      this.emit('statusChange', this.status);
      this.scheduleReconnect();
      throw error;
    }
  }

  public async stop(): Promise<void> {
    this.isStopping = true;
    this.stopHeartbeat();
    this.stopReconnect();
    try {
      await this.disconnect();
    } finally {
      this.status = CollectorStatus.Disconnected;
      this.connectedAt = null;
      this.emit('disconnected');
      this.emit('statusChange', this.status);
    }
  }

  public getStatus(): CollectorStatusInfo {
    return {
      id: this.config.id,
      type: this.getType(),
      status: this.status,
      uptime: this.connectedAt
        ? Math.floor((Date.now() - this.connectedAt.getTime()) / 1000)
        : 0,
      connectedAt: this.connectedAt || undefined,
      lastMessageAt: this.lastMessageAt || undefined,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      metrics: {
        reconnectAttempts: this.reconnectAttempts,
        lastHeartbeatAt: this.lastHeartbeatAt,
      },
    };
  }

  public getConfig(): CollectorConfig {
    return { ...this.config };
  }

  public isConnected(): boolean {
    return this.status === CollectorStatus.Connected;
  }

  public setReconnectConfig(config: Partial<ReconnectConfig>): void {
    this.reconnectConfig = { ...this.reconnectConfig, ...config };
  }

  public setHeartbeatConfig(config: Partial<HeartbeatConfig>): void {
    this.heartbeatConfig = { ...this.heartbeatConfig, ...config };
  }

  protected onEvent(event: CollectedEvent): void {
    this.messageCount++;
    this.lastMessageAt = new Date();
    this.recordActivity();
    this.emit('event', event);
  }

  protected onStateChange(state: EntityState): void {
    this.messageCount++;
    this.lastMessageAt = new Date();
    this.recordActivity();
    this.emit('state_change', state);
  }

  protected onError(error: Error): void {
    this.errorCount++;
    this.emit('error', error);
  }

  protected incrementMessageCount(): void {
    this.messageCount++;
    this.lastMessageAt = new Date();
    this.recordActivity();
  }

  protected handleConnectionError(error: Error): void {
    this.onError(error);
    if (this.status === CollectorStatus.Connected) {
      this.status = CollectorStatus.Error;
      this.emit('statusChange', this.status);
      this.stopHeartbeat();
      this.scheduleReconnect();
    }
  }

  protected scheduleReconnect(): void {
    if (!this.reconnectConfig.enabled || this.isStopping) {
      return;
    }

    if (
      this.reconnectConfig.maxRetries > 0 &&
      this.reconnectAttempts >= this.reconnectConfig.maxRetries
    ) {
      this.emit('error', new Error(`Max reconnect attempts (${this.reconnectConfig.maxRetries}) reached`));
      return;
    }

    this.stopReconnect();

    const delay = Math.min(
      this.reconnectConfig.initialDelayMs *
        Math.pow(this.reconnectConfig.backoffFactor, this.reconnectAttempts),
      this.reconnectConfig.maxDelayMs
    );

    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(async () => {
      if (this.isStopping) {
        return;
      }
      this.status = CollectorStatus.Connecting;
      this.emit('statusChange', this.status);
      this.emit('reconnecting', this.reconnectAttempts, delay);
      try {
        await this.connect();
        this.status = CollectorStatus.Connected;
        this.connectedAt = new Date();
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.emit('statusChange', this.status);
        this.startHeartbeat();
        this.collect().catch((err) => this.onError(err));
      } catch (error) {
        this.status = CollectorStatus.Error;
        this.errorCount++;
        this.emit('error', error);
        this.emit('statusChange', this.status);
        this.scheduleReconnect();
      }
    }, delay);
  }

  protected stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  protected startHeartbeat(): void {
    if (!this.heartbeatConfig.enabled) {
      return;
    }
    this.stopHeartbeat();
    this.lastHeartbeatAt = new Date();
    this.heartbeatTimer = setInterval(() => {
      this.performHeartbeat().catch((error) => {
        this.handleHeartbeatFailure(error);
      });
    }, this.heartbeatConfig.intervalMs);
  }

  protected stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  protected async performHeartbeat(): Promise<void> {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
    }

    this.heartbeatTimeoutTimer = setTimeout(() => {
      this.handleHeartbeatFailure(new Error('Heartbeat timeout'));
    }, this.heartbeatConfig.timeoutMs);

    try {
      await this.ping();
      this.lastHeartbeatAt = new Date();
      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer);
        this.heartbeatTimeoutTimer = null;
      }
    } catch (error) {
      if (this.heartbeatTimeoutTimer) {
        clearTimeout(this.heartbeatTimeoutTimer);
        this.heartbeatTimeoutTimer = null;
      }
      throw error;
    }
  }

  protected handleHeartbeatFailure(error: Error): void {
    this.onError(error);
    if (this.status === CollectorStatus.Connected) {
      this.status = CollectorStatus.Error;
      this.emit('statusChange', this.status);
      this.stopHeartbeat();
      this.scheduleReconnect();
    }
  }

  protected async ping(): Promise<void> {
    return Promise.resolve();
  }

  protected recordActivity(): void {
    this.lastHeartbeatAt = new Date();
  }
}
