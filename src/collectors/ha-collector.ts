import WebSocket from 'ws';
import axios, { AxiosInstance } from 'axios';
import { BaseCollector } from './base-collector';
import {
  CollectorConfig,
  DataSourceType,
  EntityState,
  CollectedEvent,
  CollectorStatusInfo,
} from '../types';

export interface HACollectorConfig {
  includeDomains?: string[];
  includePatterns?: string[];
  excludePatterns?: string[];
  collectLogbook?: boolean;
  collectDeviceRegistry?: boolean;
  collectSystemHealth?: boolean;
  healthCheckInterval?: number;
  deviceSyncInterval?: number;
  pollInterval?: number;
  useWebSocket?: boolean;
}

interface HAEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, any>;
  last_changed: string;
  last_updated: string;
  context?: {
    id: string;
    parent_id: string | null;
    user_id: string | null;
  };
}

interface HAConfig {
  version: string;
  config_dir: string;
  elevation: number;
  latitude: number;
  longitude: number;
  time_zone: string;
  unit_system: Record<string, string>;
  components: string[];
  [key: string]: any;
}

interface HAWebSocketMessage {
  type: string;
  id?: number;
  success?: boolean;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  event?: any;
}

export class HACollector extends BaseCollector {
  private wsConnection: WebSocket | null;
  private haConfig: HACollectorConfig;
  private trackedEntities: Set<string>;
  private pollTimers: Map<string, NodeJS.Timeout>;
  private httpClient: AxiosInstance;
  private wsMessageId: number;
  private wsPendingRequests: Map<number, { resolve: (value: any) => void; reject: (reason: any) => void }>;
  private wsSubscriptions: Map<number, string>;
  private entityStates: Map<string, EntityState>;
  private haVersion: string | null;
  private haConfigCache: HAConfig | null;

  constructor(config: CollectorConfig) {
    super(config);
    this.wsConnection = null;
    this.haConfig = (config.config as HACollectorConfig) || {};
    this.trackedEntities = new Set();
    this.pollTimers = new Map();
    this.wsMessageId = 1;
    this.wsPendingRequests = new Map();
    this.wsSubscriptions = new Map();
    this.entityStates = new Map();
    this.haVersion = null;
    this.haConfigCache = null;

    const baseURL = this.config.baseUrl.replace(/\/$/, '');
    const token = this.config.auth?.token;

    this.httpClient = axios.create({
      baseURL: `${baseURL}/api`,
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        : {
            'Content-Type': 'application/json',
          },
      timeout: 30000,
    });
  }

  public getType(): DataSourceType {
    return DataSourceType.HomeAssistant;
  }

  public async connect(): Promise<void> {
    try {
      await this.testRESTConnection();

      if (this.haConfig.useWebSocket !== false) {
        try {
          await this.connectWebSocket();
        } catch (wsError) {
          console.warn('WebSocket connection failed, falling back to REST polling:', (wsError as Error).message);
        }
      }
    } catch (error) {
      throw new Error(`Failed to connect to Home Assistant: ${(error as Error).message}`);
    }
  }

  public async disconnect(): Promise<void> {
    this.stopPolling();
    await this.disconnectWebSocket();
    this.entityStates.clear();
    this.trackedEntities.clear();
  }

  public async collect(): Promise<void> {
    try {
      const states = await this.getStates();
      for (const state of states) {
        const previous = this.entityStates.get(state.entityId);
        this.entityStates.set(state.entityId, state);
        this.trackedEntities.add(state.entityId);

        if (!previous || previous.state !== state.state || previous.lastUpdated.getTime() !== state.lastUpdated.getTime()) {
          this.onStateChange(state);
        }
      }

      this.incrementMessageCount();
    } catch (error) {
      this.handleConnectionError(error as Error);
      throw error;
    }
  }

  public async testConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    haVersion?: string;
    entityCount?: number;
  }> {
    const startTime = Date.now();
    try {
      const config = await this.getHAConfig();
      const states = await this.getStates();
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        latencyMs,
        haVersion: config.version,
        entityCount: states.length,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  public getTrackedEntities(): string[] {
    return Array.from(this.trackedEntities);
  }

  public getEntityState(entityId: string): EntityState | undefined {
    return this.entityStates.get(entityId);
  }

  public getAllEntityStates(): EntityState[] {
    return Array.from(this.entityStates.values());
  }

  public async getStates(): Promise<EntityState[]> {
    const response = await this.httpClient.get<HAEntityState[]>('/states');
    const haStates = response.data;
    const result: EntityState[] = [];

    for (const haState of haStates) {
      if (this.shouldTrackEntity(haState.entity_id)) {
        result.push(this.convertHAEntityState(haState));
      }
    }

    return result;
  }

  public async getState(entityId: string): Promise<EntityState> {
    const response = await this.httpClient.get<HAEntityState>(`/states/${entityId}`);
    return this.convertHAEntityState(response.data);
  }

  public async getHAConfig(): Promise<HAConfig> {
    const response = await this.httpClient.get<HAConfig>('/config');
    this.haConfigCache = response.data;
    this.haVersion = response.data.version;
    return response.data;
  }

  public async callService(domain: string, service: string, data?: Record<string, any>): Promise<any[]> {
    const response = await this.httpClient.post<any[]>(`/services/${domain}/${service}`, data || {});
    return response.data;
  }

  public async getEntityHistory(
    entityId: string,
    startTime: Date,
    endTime: Date,
    limit?: number,
  ): Promise<EntityState[]> {
    const startIso = startTime.toISOString();
    const endIso = endTime.toISOString();
    const params: Record<string, any> = {
      filter_entity_id: entityId,
    };
    if (limit) {
      params.limit = limit;
    }

    const response = await this.httpClient.get<HAEntityState[][]>(
      `/history/period/${startIso}?end_time=${encodeURIComponent(endIso)}`,
      { params }
    );

    const result: EntityState[] = [];
    if (response.data && response.data.length > 0) {
      for (const haState of response.data[0]) {
        result.push(this.convertHAEntityState(haState));
      }
    }
    return result;
  }

  public async getLogbookEvents(
    startTime: Date,
    endTime: Date,
    entityId?: string,
  ): Promise<CollectedEvent[]> {
    const startIso = startTime.toISOString();
    const endIso = endTime.toISOString();
    let url = `/logbook/${startIso}?end_time=${encodeURIComponent(endIso)}`;
    if (entityId) {
      url += `&entity=${encodeURIComponent(entityId)}`;
    }

    const response = await this.httpClient.get<any[]>(url);
    const events: CollectedEvent[] = [];

    for (const logEntry of response.data) {
      events.push({
        id: `logbook_${logEntry.entity_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(logEntry.when),
        source: DataSourceType.HomeAssistant,
        sourceId: this.config.id,
        eventType: logEntry.name || 'logbook_entry',
        entityId: logEntry.entity_id,
        data: logEntry,
      });
    }

    return events;
  }

  public async getDeviceRegistry(): Promise<any[]> {
    try {
      const response = await this.httpClient.get<any[]>('/devices');
      return response.data;
    } catch (error) {
      return [];
    }
  }

  public async getSystemHealth(): Promise<Record<string, any>> {
    try {
      const response = await this.httpClient.get<Record<string, any>>('/diagnostics');
      return response.data;
    } catch (error) {
      return {
        error: (error as Error).message,
      };
    }
  }

  public async connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.config.baseUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/api/websocket';
        this.wsConnection = new WebSocket(wsUrl);

        let authResolved = false;
        const authTimeout = setTimeout(() => {
          if (!authResolved) {
            reject(new Error('WebSocket authentication timeout'));
            this.disconnectWebSocket().catch(() => {});
          }
        }, 15000);

        this.wsConnection.on('open', () => {
        });

        this.wsConnection.on('message', (data: WebSocket.Data) => {
          try {
            const message: HAWebSocketMessage = JSON.parse(data.toString());
            this.handleWebSocketMessage(message);

            if (message.type === 'auth_required') {
              this.sendWebSocketMessage({
                type: 'auth',
                access_token: this.config.auth?.token,
              }).catch(() => {});
            } else if (message.type === 'auth_ok') {
              authResolved = true;
              clearTimeout(authTimeout);
              this.subscribeEvents('state_changed').catch(() => {});
              resolve();
            } else if (message.type === 'auth_invalid') {
              authResolved = true;
              clearTimeout(authTimeout);
              reject(new Error(message.error?.message || 'WebSocket authentication failed'));
            }
          } catch (parseError) {
            console.error('Failed to parse WebSocket message:', parseError);
          }
        });

        this.wsConnection.on('error', (error) => {
          if (!authResolved) {
            authResolved = true;
            clearTimeout(authTimeout);
            reject(error);
          } else {
            this.handleConnectionError(error);
          }
        });

        this.wsConnection.on('close', (code, reason) => {
          if (!authResolved) {
            authResolved = true;
            clearTimeout(authTimeout);
            reject(new Error(`WebSocket closed: ${code} ${reason}`));
          } else {
            this.handleConnectionError(new Error(`WebSocket closed: ${code} ${reason}`));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  public async disconnectWebSocket(): Promise<void> {
    if (this.wsConnection) {
      this.wsPendingRequests.forEach(({ reject }) => {
        reject(new Error('WebSocket disconnected'));
      });
      this.wsPendingRequests.clear();
      this.wsSubscriptions.clear();

      try {
        this.wsConnection.close();
      } catch (e) {
      }
      this.wsConnection = null;
    }
  }

  public async subscribeEvents(eventType: string): Promise<number> {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    const messageId = this.wsMessageId++;
    this.sendWebSocketMessage({
      id: messageId,
      type: 'subscribe_events',
      event_type: eventType,
    });

    return new Promise((resolve, reject) => {
      this.wsPendingRequests.set(messageId, {
        resolve: () => {
          this.wsSubscriptions.set(messageId, eventType);
          resolve(messageId);
        },
        reject,
      });
    });
  }

  public async unsubscribeEvents(subscriptionId: number): Promise<void> {
    if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
      return;
    }

    const messageId = this.wsMessageId++;
    this.sendWebSocketMessage({
      id: messageId,
      type: 'unsubscribe_events',
      subscription: subscriptionId,
    });

    return new Promise((resolve, reject) => {
      this.wsPendingRequests.set(messageId, {
        resolve: () => {
          this.wsSubscriptions.delete(subscriptionId);
          resolve();
        },
        reject,
      });
    });
  }

  public isWebSocketConnected(): boolean {
    return this.wsConnection !== null && this.wsConnection.readyState === WebSocket.OPEN;
  }

  public getStatus(): CollectorStatusInfo {
    const baseStatus = super.getStatus();
    return {
      ...baseStatus,
      metrics: {
        ...baseStatus.metrics,
        trackedEntities: this.trackedEntities.size,
        webSocketConnected: this.isWebSocketConnected(),
        haVersion: this.haVersion,
        pollTimers: this.pollTimers.size,
      },
    };
  }

  protected shouldTrackEntity(entityId: string): boolean {
    const [domain] = entityId.split('.');

    if (this.haConfig.includeDomains && this.haConfig.includeDomains.length > 0) {
      if (!this.haConfig.includeDomains.includes(domain)) {
        return false;
      }
    }

    if (this.haConfig.excludePatterns) {
      for (const pattern of this.haConfig.excludePatterns) {
        if (this.matchPattern(entityId, pattern)) {
          return false;
        }
      }
    }

    if (this.haConfig.includePatterns && this.haConfig.includePatterns.length > 0) {
      for (const pattern of this.haConfig.includePatterns) {
        if (this.matchPattern(entityId, pattern)) {
          return true;
        }
      }
      return false;
    }

    return true;
  }

  private matchPattern(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
    return regex.test(str);
  }

  protected startPolling(): void {
    this.stopPolling();

    const pollInterval = this.haConfig.pollInterval || 300000;

    const mainTimer = setInterval(() => {
      if (this.isConnected()) {
        this.collect().catch((error) => {
          this.onError(error);
        });
      }
    }, pollInterval);

    this.pollTimers.set('main', mainTimer);

    if (this.haConfig.collectSystemHealth) {
      const healthInterval = this.haConfig.healthCheckInterval || pollInterval * 2;
      const healthTimer = setInterval(() => {
        if (this.isConnected()) {
          this.getSystemHealth().catch(() => {});
        }
      }, healthInterval);
      this.pollTimers.set('health', healthTimer);
    }
  }

  protected stopPolling(): void {
    for (const timer of this.pollTimers.values()) {
      clearInterval(timer);
    }
    this.pollTimers.clear();
  }

  protected async ping(): Promise<void> {
    await this.getHAConfig();
  }

  private async testRESTConnection(): Promise<void> {
    const config = await this.getHAConfig();
    this.haVersion = config.version;
  }

  private convertHAEntityState(haState: HAEntityState): EntityState {
    return {
      entityId: haState.entity_id,
      state: haState.state,
      attributes: { ...haState.attributes },
      lastChanged: new Date(haState.last_changed),
      lastUpdated: new Date(haState.last_updated),
      source: DataSourceType.HomeAssistant,
      sourceId: this.config.id,
    };
  }

  private sendWebSocketMessage(message: Record<string, any>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.wsConnection || this.wsConnection.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket is not connected'));
        return;
      }

      try {
        this.wsConnection.send(JSON.stringify(message), (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleWebSocketMessage(message: HAWebSocketMessage): void {
    if (message.id !== undefined) {
      const pending = this.wsPendingRequests.get(message.id);
      if (pending) {
        if (message.success) {
          pending.resolve(message.result);
        } else {
          pending.reject(new Error(message.error?.message || 'WebSocket request failed'));
        }
        this.wsPendingRequests.delete(message.id);
      }
    }

    if (message.type === 'event' && message.event) {
      this.handleWebSocketEvent(message.event);
    }
  }

  private handleWebSocketEvent(event: any): void {
    if (event.event_type === 'state_changed' && event.data) {
      const entityId = event.data.entity_id;
      const newState = event.data.new_state as HAEntityState;

      if (newState && this.shouldTrackEntity(entityId)) {
        const entityState = this.convertHAEntityState(newState);
        this.entityStates.set(entityId, entityState);
        this.trackedEntities.add(entityId);
        this.onStateChange(entityState);

        const collectedEvent: CollectedEvent = {
          id: `evt_${event.context?.id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(event.time_fired || Date.now()),
          source: DataSourceType.HomeAssistant,
          sourceId: this.config.id,
          eventType: 'state_changed',
          entityId: entityId,
          data: event.data,
        };
        this.onEvent(collectedEvent);
      }
    }
  }
}
