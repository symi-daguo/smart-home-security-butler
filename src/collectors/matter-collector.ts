import axios, { AxiosInstance } from 'axios';
import { BaseCollector } from './base-collector';
import {
  CollectorConfig,
  DataSourceType,
  EntityState,
} from '../types';

export class MatterCollector extends BaseCollector {
  private client: AxiosInstance | null = null;
  private devices: Array<Record<string, any>> = [];
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(config: CollectorConfig) {
    super(config);
  }

  public getType(): DataSourceType {
    return DataSourceType.Matter;
  }

  public async connect(): Promise<void> {
    const baseUrl = this.config.baseUrl || 'http://172.17.0.1:5580';
    const token = this.config.auth?.token || '';

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    await this.ping();
  }

  public async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.client = null;
    this.devices = [];
  }

  public async collect(): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.fetchDevices();

    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        this.fetchDevices().catch((err) => this.handleConnectionError(err));
      }, 30000);
    }
  }

  private async fetchDevices(): Promise<void> {
    if (!this.client) {
      return;
    }

    try {
      const response = await this.client.get('/devices');
      if (response.data && Array.isArray(response.data)) {
        this.devices = response.data;
        this.messageCount += this.devices.length;
        this.lastMessageAt = new Date();

        for (const device of this.devices) {
          const entityId = `matter.${device.id || device.uniqueId}`;
          const state: EntityState = {
            entityId,
            state: device.available !== false ? 'online' : 'offline',
            attributes: {
              friendly_name: device.name || 'Matter Device',
              ...device,
              source: DataSourceType.Matter,
            },
            lastChanged: new Date(),
            lastUpdated: new Date(),
            source: DataSourceType.Matter,
            sourceId: this.config.id,
          };
          this.onStateChange(state);
        }
      }
    } catch {
      this.recordActivity();
    }
  }

  protected async ping(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not initialized');
    }

    try {
      await this.client.get('/', { timeout: 5000 });
    } catch (error: any) {
      if (error.response && error.response.status < 500) {
        return;
      }
      throw error;
    }
  }

  public getDeviceCount(): number {
    return this.devices.length;
  }

  public getDevices(): Array<Record<string, any>> {
    return [...this.devices];
  }
}
