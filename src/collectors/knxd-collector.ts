import { BaseCollector } from './base-collector';
import {
  CollectorConfig,
  CollectorStatus,
  DataSourceType,
  EntityState,
} from '../types';
import {
  getKnxdHealthStatus,
  getKnxdEnvPath,
  getKnxdHost,
  getKnxdPort,
  KnxdHealthStatus,
} from '../knx/knxd-env';

export class KnxdCollector extends BaseCollector {
  private pollInterval: NodeJS.Timeout | null = null;
  private lastHealth: KnxdHealthStatus | null = null;

  constructor(config: CollectorConfig) {
    super(config);
  }

  public getType(): DataSourceType {
    return DataSourceType.Knxd;
  }

  public async connect(): Promise<void> {
    await this.refreshHealth();
  }

  public async disconnect(): Promise<void> {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.lastHealth = null;
  }

  public async collect(): Promise<void> {
    await this.refreshHealth();

    const intervalMs = this.config.config?.collectInterval ?? 60000;
    if (!this.pollInterval) {
      this.pollInterval = setInterval(() => {
        this.refreshHealth().catch((err) => this.handleConnectionError(err));
      }, intervalMs);
    }
  }

  public getLastHealth(): KnxdHealthStatus | null {
    return this.lastHealth;
  }

  private async refreshHealth(): Promise<void> {
    const health = await getKnxdHealthStatus();
    this.lastHealth = health;
    this.messageCount += 1;
    this.lastMessageAt = new Date();

    const healthy = health.portOpen && health.containerStatus !== 'stopped';
    const stateValue = healthy ? 'online' : health.envExists ? 'degraded' : 'offline';

    const state: EntityState = {
      entityId: 'knxd.gateway',
      state: stateValue,
      attributes: {
        friendly_name: 'knxd 本机网关',
        env_path: health.envPath,
        env_exists: health.envExists,
        host: health.host,
        port: health.port,
        port_open: health.portOpen,
        container_name: health.containerName,
        container_status: health.containerStatus,
        address: health.config?.address,
        client_address: health.config?.clientAddress,
        interface: health.config?.interface,
        device: health.config?.device,
        gateway_name: health.config?.gatewayName,
        checked_at: health.checkedAt,
      },
      lastChanged: new Date(),
      lastUpdated: new Date(),
      source: DataSourceType.Knxd,
      sourceId: this.config.id,
    };

    this.onStateChange(state);
    this.status = healthy ? CollectorStatus.Connected : CollectorStatus.Disconnected;
    this.connectedAt = healthy ? this.connectedAt || new Date() : null;
  }

  protected async ping(): Promise<void> {
    const host = this.config.config?.host || getKnxdHost();
    const port = this.config.config?.port || getKnxdPort();
    const health = await getKnxdHealthStatus();
    if (!health.portOpen) {
      throw new Error(`knxd port ${host}:${port} is not reachable`);
    }
  }

  public getMetrics(): Record<string, unknown> {
    return {
      envPath: this.config.config?.envPath || getKnxdEnvPath(),
      host: this.config.config?.host || getKnxdHost(),
      port: this.config.config?.port || getKnxdPort(),
      lastHealth: this.lastHealth,
    };
  }
}
