import axios, { AxiosInstance } from 'axios';
import { BaseCollector } from './base-collector';
import {
  CollectorConfig,
  DataSourceType,
  EntityState,
  CollectedEvent,
  CollectorStatusInfo,
} from '../types';

export interface KnxCollectorConfig {
  monitorDevices?: boolean;
  monitorScenes?: boolean;
  monitorAutomations?: boolean;
  collectSystemStatus?: boolean;
  collectInterval?: number;
  statusPollInterval?: number;
  includeRooms?: string[];
  excludeRooms?: string[];
  includeDeviceTypes?: string[];
  excludeDeviceTypes?: string[];
  includeScenes?: string[];
  excludeScenes?: string[];
  includeWorkflows?: string[];
  excludeWorkflows?: string[];
}

export interface KnxDevice {
  uuid: string;
  name: string;
  type: string;
  sub_type?: string;
  room_uuid?: string;
  room_name?: string;
  online: boolean;
  last_seen?: string;
  state?: Record<string, any>;
  capabilities?: string[];
  attributes?: Record<string, any>;
  [key: string]: any;
}

export interface KnxRoom {
  uuid: string;
  name: string;
  icon?: string;
  description?: string;
  [key: string]: any;
}

export interface KnxScene {
  uuid: string;
  name: string;
  description?: string;
  enabled: boolean;
  icon?: string;
  last_executed?: string;
  device_count?: number;
  [key: string]: any;
}

export interface KnxSceneLog {
  uuid: string;
  scene_uuid: string;
  scene_name?: string;
  timestamp: string;
  status: 'success' | 'failed' | 'partial';
  triggered_by?: string;
  details?: Record<string, any>;
  [key: string]: any;
}

export interface KnxWorkflow {
  uuid: string;
  name: string;
  description?: string;
  enabled: boolean;
  status: 'running' | 'stopped' | 'error' | 'disabled';
  trigger_type?: string;
  last_triggered?: string;
  error_count?: number;
  [key: string]: any;
}

export interface KnxSystemLimits {
  max_devices?: number;
  max_rooms?: number;
  max_scenes?: number;
  max_automations?: number;
  [key: string]: any;
}

export interface KnxSystemLocation {
  latitude?: number;
  longitude?: number;
  timezone?: string;
  sunrise?: string;
  sunset?: string;
  [key: string]: any;
}

export interface KnxDeviceStatus {
  uuid: string;
  name: string;
  type: string;
  subType: string;
  online: boolean;
  lastSeen: Date;
  roomId?: string;
  roomName?: string;
}

export interface KnxSceneStatus {
  uuid: string;
  name: string;
  enabled: boolean;
  lastExecuted?: Date;
}

export interface KnxWorkflowStatus {
  uuid: string;
  name: string;
  enabled: boolean;
  status: 'running' | 'stopped' | 'error' | 'disabled';
  lastTriggered?: Date;
  errorCount: number;
}

interface KnxApiResponse<T> {
  code?: number;
  message?: string;
  data?: T;
  [key: string]: any;
}

const DEVICE_TYPE_MAP: Record<string, string> = {
  light: 'light',
  switch: 'switch',
  curtain: 'cover',
  ac: 'climate',
  fan: 'fan',
  sensor: 'sensor',
  binary_sensor: 'binary_sensor',
  thermostat: 'climate',
  air_conditioner: 'climate',
  dimmer: 'light',
  shutter: 'cover',
  blind: 'cover',
  window: 'binary_sensor',
  door: 'binary_sensor',
  motion: 'binary_sensor',
  smoke: 'binary_sensor',
  water_leak: 'binary_sensor',
  co2: 'sensor',
  temperature: 'sensor',
  humidity: 'sensor',
  brightness: 'sensor',
};

export class KnxCollector extends BaseCollector {
  private knxConfig: KnxCollectorConfig;
  private devices: Map<string, KnxDeviceStatus>;
  private deviceStates: Map<string, EntityState>;
  private scenes: Map<string, KnxSceneStatus>;
  private sceneStates: Map<string, EntityState>;
  private workflows: Map<string, KnxWorkflowStatus>;
  private workflowStates: Map<string, EntityState>;
  private rooms: Map<string, KnxRoom>;
  private pollTimers: Map<string, NodeJS.Timeout>;
  private httpClient: AxiosInstance;
  private systemInfo: {
    location?: KnxSystemLocation;
    limits?: KnxSystemLimits;
  };
  private trackedDeviceUuids: Set<string>;
  private trackedSceneUuids: Set<string>;
  private trackedWorkflowUuids: Set<string>;
  private sceneLogs: KnxSceneLog[];

  constructor(config: CollectorConfig) {
    super(config);
    this.knxConfig = (config.config as KnxCollectorConfig) || {};
    this.devices = new Map();
    this.deviceStates = new Map();
    this.scenes = new Map();
    this.sceneStates = new Map();
    this.workflows = new Map();
    this.workflowStates = new Map();
    this.rooms = new Map();
    this.pollTimers = new Map();
    this.systemInfo = {};
    this.trackedDeviceUuids = new Set();
    this.trackedSceneUuids = new Set();
    this.trackedWorkflowUuids = new Set();
    this.sceneLogs = [];

    const baseURL = `${this.config.baseUrl.replace(/\/$/, '')}/api/v1`;
    const token = this.config.auth?.token;

    this.httpClient = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 30000,
      responseType: 'json',
    });
  }

  public getType(): DataSourceType {
    return DataSourceType.KnxGateway;
  }

  public async connect(): Promise<void> {
    try {
      await this.testRESTConnection();
      await this.collect();
      this.startPolling();
    } catch (error) {
      throw new Error(`Failed to connect to KNX Gateway: ${(error as Error).message}`);
    }
  }

  public async disconnect(): Promise<void> {
    this.stopPolling();
    this.devices.clear();
    this.deviceStates.clear();
    this.scenes.clear();
    this.sceneStates.clear();
    this.workflows.clear();
    this.workflowStates.clear();
    this.rooms.clear();
    this.trackedDeviceUuids.clear();
    this.trackedSceneUuids.clear();
    this.trackedWorkflowUuids.clear();
    this.sceneLogs = [];
    this.systemInfo = {};
  }

  public async collect(): Promise<void> {
    try {
      let anySuccess = false;

      if (this.knxConfig.monitorDevices !== false) {
        try {
          await this.collectDevices();
          anySuccess = true;
        } catch (e) {
          this.onError(e as Error);
        }
      }

      if (this.knxConfig.monitorScenes !== false) {
        try {
          await this.collectScenes();
          anySuccess = true;
        } catch (e) {
          this.onError(e as Error);
        }
      }

      if (this.knxConfig.monitorAutomations !== false) {
        try {
          await this.collectWorkflows();
          anySuccess = true;
        } catch (e) {
          this.onError(e as Error);
        }
      }

      if (this.knxConfig.collectSystemStatus !== false) {
        try {
          await this.collectSystemInfo();
        } catch (e) {
          // System info is optional
        }
      }

      if (!anySuccess && this.knxConfig.monitorDevices !== false) {
        throw new Error('Failed to collect any data from KNX gateway');
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
    deviceCount?: number;
    sceneCount?: number;
    workflowCount?: number;
  }> {
    const startTime = Date.now();
    try {
      const devices = await this.getDevices();
      const scenes = await this.getScenes();
      const workflows = await this.getWorkflows();
      const latencyMs = Date.now() - startTime;
      return {
        success: true,
        latencyMs,
        deviceCount: devices.length,
        sceneCount: scenes.length,
        workflowCount: workflows.length,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  public getDevices(): KnxDeviceStatus[] {
    return Array.from(this.devices.values());
  }

  public getDevice(deviceUuid: string): KnxDeviceStatus | undefined {
    return this.devices.get(deviceUuid);
  }

  public getDeviceEntityState(deviceUuid: string): EntityState | undefined {
    return this.deviceStates.get(`knx.device.${deviceUuid}`);
  }

  public getAllDeviceStates(): EntityState[] {
    return Array.from(this.deviceStates.values());
  }

  public getScenes(): KnxSceneStatus[] {
    return Array.from(this.scenes.values());
  }

  public getScene(sceneUuid: string): KnxSceneStatus | undefined {
    return this.scenes.get(sceneUuid);
  }

  public getSceneEntityState(sceneUuid: string): EntityState | undefined {
    return this.sceneStates.get(`knx.scene.${sceneUuid}`);
  }

  public getAllSceneStates(): EntityState[] {
    return Array.from(this.sceneStates.values());
  }

  public getWorkflows(): KnxWorkflowStatus[] {
    return Array.from(this.workflows.values());
  }

  public getWorkflow(workflowUuid: string): KnxWorkflowStatus | undefined {
    return this.workflows.get(workflowUuid);
  }

  public getWorkflowEntityState(workflowUuid: string): EntityState | undefined {
    return this.workflowStates.get(`knx.workflow.${workflowUuid}`);
  }

  public getAllWorkflowStates(): EntityState[] {
    return Array.from(this.workflowStates.values());
  }

  public getRooms(): KnxRoom[] {
    return Array.from(this.rooms.values());
  }

  public getRoom(roomUuid: string): KnxRoom | undefined {
    return this.rooms.get(roomUuid);
  }

  public getSystemInfo(): {
    location?: KnxSystemLocation;
    limits?: KnxSystemLimits;
  } {
    return { ...this.systemInfo };
  }

  public getSceneLogs(sceneUuid?: string, limit?: number, since?: Date): KnxSceneLog[] {
    let result = [...this.sceneLogs];

    if (sceneUuid) {
      result = result.filter((l) => l.scene_uuid === sceneUuid);
    }

    if (since) {
      result = result.filter((l) => new Date(l.timestamp) >= since);
    }

    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }

  public async getDeviceList(): Promise<KnxDevice[]> {
    return this.fetchDevices();
  }

  public async getSceneList(): Promise<KnxScene[]> {
    return this.fetchScenes();
  }

  public async getSystemStatus(): Promise<Record<string, any>> {
    try {
      const [location, limits] = await Promise.all([
        this.fetchSystemLocation(),
        this.fetchSystemLimits(),
      ]);
      return { location, limits };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }

  public async getDeviceDetail(uuid: string): Promise<KnxDevice> {
    const response = await this.httpClient.get<KnxApiResponse<KnxDevice>>(`/devices/${uuid}`);
    const data = this.extractResponseData(response.data);
    if (!data) {
      throw new Error(`Device ${uuid} not found`);
    }
    return data;
  }

  public async getSceneDetail(uuid: string): Promise<KnxScene> {
    const response = await this.httpClient.get<KnxApiResponse<KnxScene>>(`/scenes/${uuid}`);
    const data = this.extractResponseData(response.data);
    if (!data) {
      throw new Error(`Scene ${uuid} not found`);
    }
    return data;
  }

  public async getSceneExecutionLogs(sceneUuid: string): Promise<KnxSceneLog[]> {
    const response = await this.httpClient.get<KnxApiResponse<KnxSceneLog[]>>('/scenes/logs', {
      params: { scene_uuid: sceneUuid },
    });
    return this.extractResponseData(response.data) || [];
  }

  public async getWorkflowDetail(uuid: string): Promise<KnxWorkflow> {
    const response = await this.httpClient.get<KnxApiResponse<KnxWorkflow>>(
      `/automation/workflows/${uuid}`
    );
    const data = this.extractResponseData(response.data);
    if (!data) {
      throw new Error(`Workflow ${uuid} not found`);
    }
    return data;
  }

  public async executeScene(uuid: string): Promise<boolean> {
    try {
      const response = await this.httpClient.post<KnxApiResponse<any>>(`/scenes/${uuid}/execute`);
      const success = this.isResponseSuccess(response.data);

      if (success) {
        const now = new Date();
        const scene = this.scenes.get(uuid);
        if (scene) {
          scene.lastExecuted = now;
        }

        const sceneState = this.sceneStates.get(`knx.scene.${uuid}`);
        if (sceneState) {
          sceneState.attributes.lastExecuted = now.toISOString();
          sceneState.lastUpdated = now;
          this.onStateChange(sceneState);
        }

        const event: CollectedEvent = {
          id: `knx_scene_exec_${uuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: now,
          source: DataSourceType.KnxGateway,
          sourceId: this.config.id,
          eventType: 'scene_executed',
          entityId: `knx.scene.${uuid}`,
          data: {
            sceneUuid: uuid,
            sceneName: scene?.name,
          },
        };
        this.onEvent(event);
      }

      return success;
    } catch (error) {
      this.onError(error as Error);
      return false;
    }
  }

  public async controlDevice(
    deviceUuid: string,
    action: string,
    params?: Record<string, any>
  ): Promise<boolean> {
    try {
      const response = await this.httpClient.post<KnxApiResponse<any>>(
        `/devices/${deviceUuid}/action`,
        {
          action,
          params: params || {},
        }
      );
      const success = this.isResponseSuccess(response.data);

      if (success) {
        const now = new Date();
        const deviceState = this.deviceStates.get(`knx.device.${deviceUuid}`);
        if (deviceState) {
          if (action === 'turn_on') {
            deviceState.state = 'on';
          } else if (action === 'turn_off') {
            deviceState.state = 'off';
          }
          if (params) {
            deviceState.attributes = { ...deviceState.attributes, ...params };
          }
          deviceState.lastUpdated = now;
          this.onStateChange(deviceState);
        }

        const event: CollectedEvent = {
          id: `knx_device_ctrl_${deviceUuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: now,
          source: DataSourceType.KnxGateway,
          sourceId: this.config.id,
          eventType: 'device_control',
          entityId: `knx.device.${deviceUuid}`,
          data: {
            deviceUuid,
            action,
            params: params || {},
          },
        };
        this.onEvent(event);
      }

      return success;
    } catch (error) {
      this.onError(error as Error);
      return false;
    }
  }

  public getHealthReport(): {
    totalDevices: number;
    onlineDevices: number;
    offlineDevices: number;
    errorDevices: number;
    totalScenes: number;
    enabledScenes: number;
    totalWorkflows: number;
    runningWorkflows: number;
    errorWorkflows: number;
    disabledWorkflows: number;
    totalRooms: number;
  } {
    const deviceValues = Array.from(this.devices.values());
    const sceneValues = Array.from(this.scenes.values());
    const workflowValues = Array.from(this.workflows.values());

    const totalDevices = deviceValues.length;
    const onlineDevices = deviceValues.filter((d) => d.online).length;
    const offlineDevices = totalDevices - onlineDevices;
    const errorDevices = 0;

    const totalScenes = sceneValues.length;
    const enabledScenes = sceneValues.filter((s) => s.enabled).length;

    const totalWorkflows = workflowValues.length;
    const runningWorkflows = workflowValues.filter((w) => w.status === 'running').length;
    const errorWorkflows = workflowValues.filter((w) => w.status === 'error').length;
    const disabledWorkflows = workflowValues.filter((w) => w.status === 'disabled').length;

    const totalRooms = this.rooms.size;

    return {
      totalDevices,
      onlineDevices,
      offlineDevices,
      errorDevices,
      totalScenes,
      enabledScenes,
      totalWorkflows,
      runningWorkflows,
      errorWorkflows,
      disabledWorkflows,
      totalRooms,
    };
  }

  public getDeviceTypeStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const device of this.devices.values()) {
      stats[device.type] = (stats[device.type] || 0) + 1;
    }
    return stats;
  }

  protected shouldTrackDevice(device: KnxDevice): boolean {
    if (this.knxConfig.includeRooms && this.knxConfig.includeRooms.length > 0) {
      if (!device.room_uuid || !this.knxConfig.includeRooms.includes(device.room_uuid)) {
        if (device.room_name) {
          const match = this.knxConfig.includeRooms.some(
            (pattern) => this.matchPattern(device.room_name!, pattern)
          );
          if (!match) return false;
        } else {
          return false;
        }
      }
    }

    if (this.knxConfig.excludeRooms && this.knxConfig.excludeRooms.length > 0) {
      if (device.room_uuid && this.knxConfig.excludeRooms.includes(device.room_uuid)) {
        return false;
      }
      if (device.room_name) {
        const match = this.knxConfig.excludeRooms.some(
          (pattern) => this.matchPattern(device.room_name!, pattern)
        );
        if (match) return false;
      }
    }

    if (this.knxConfig.includeDeviceTypes && this.knxConfig.includeDeviceTypes.length > 0) {
      if (!this.knxConfig.includeDeviceTypes.includes(device.type)) {
        return false;
      }
    }

    if (this.knxConfig.excludeDeviceTypes && this.knxConfig.excludeDeviceTypes.length > 0) {
      if (this.knxConfig.excludeDeviceTypes.includes(device.type)) {
        return false;
      }
    }

    return true;
  }

  protected shouldTrackScene(scene: KnxScene): boolean {
    if (this.knxConfig.includeScenes && this.knxConfig.includeScenes.length > 0) {
      const match = this.knxConfig.includeScenes.some(
        (pattern) => this.matchPattern(scene.name, pattern) || scene.uuid === pattern
      );
      if (!match) return false;
    }

    if (this.knxConfig.excludeScenes && this.knxConfig.excludeScenes.length > 0) {
      const match = this.knxConfig.excludeScenes.some(
        (pattern) => this.matchPattern(scene.name, pattern) || scene.uuid === pattern
      );
      if (match) return false;
    }

    return true;
  }

  protected shouldTrackWorkflow(workflow: KnxWorkflow): boolean {
    if (this.knxConfig.includeWorkflows && this.knxConfig.includeWorkflows.length > 0) {
      const match = this.knxConfig.includeWorkflows.some(
        (pattern) => this.matchPattern(workflow.name, pattern) || workflow.uuid === pattern
      );
      if (!match) return false;
    }

    if (this.knxConfig.excludeWorkflows && this.knxConfig.excludeWorkflows.length > 0) {
      const match = this.knxConfig.excludeWorkflows.some(
        (pattern) => this.matchPattern(workflow.name, pattern) || workflow.uuid === pattern
      );
      if (match) return false;
    }

    return true;
  }

  private matchPattern(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
    return regex.test(str);
  }

  private async testRESTConnection(): Promise<void> {
    try {
      await this.fetchSystemLocation();
    } catch {
      await this.fetchDevices();
    }
  }

  private async fetchDevices(): Promise<KnxDevice[]> {
    const response = await this.httpClient.get<KnxApiResponse<KnxDevice[]>>('/devices');
    const data = this.extractResponseData(response.data) || [];
    return data.map((device: any) => ({
      ...device,
      uuid: device.uuid || String(device.id),
      online: device.is_online !== false && device.online !== false,
      room_uuid: device.room_uuid || String(device.room_id || ''),
    }));
  }

  private async fetchRooms(): Promise<KnxRoom[]> {
    const response = await this.httpClient.get<KnxApiResponse<KnxRoom[]>>('/rooms');
    const data = this.extractResponseData(response.data) || [];
    return data.map((room: any) => ({
      ...room,
      uuid: room.uuid || String(room.id),
    }));
  }

  private async fetchScenes(): Promise<KnxScene[]> {
    const response = await this.httpClient.get<KnxApiResponse<any>>('/scenes');
    const data = this.extractResponseData(response.data);
    let scenes: any[] = [];
    if (Array.isArray(data)) {
      scenes = data;
    } else if (data && Array.isArray(data.scenes)) {
      scenes = data.scenes;
    }
    return scenes.map((scene: any) => ({
      ...scene,
      uuid: scene.uuid || String(scene.id),
      enabled: scene.enabled !== false,
    }));
  }

  private async fetchWorkflows(): Promise<KnxWorkflow[]> {
    try {
      const response = await this.httpClient.get<KnxApiResponse<any>>(
        '/automation/workflows'
      );
      const data = this.extractResponseData(response.data);
      if (Array.isArray(data)) {
        return data.map((w: any) => ({
          ...w,
          uuid: w.uuid || String(w.id),
          enabled: w.enabled !== false,
          status: w.status || (w.enabled ? 'running' : 'disabled'),
        }));
      }
      if (data && Array.isArray(data.workflows)) {
        return data.workflows.map((w: any) => ({
          ...w,
          uuid: w.uuid || String(w.id),
          enabled: w.enabled !== false,
          status: w.status || (w.enabled ? 'running' : 'disabled'),
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  private async fetchSystemLocation(): Promise<KnxSystemLocation> {
    try {
      const response = await this.httpClient.get<KnxApiResponse<KnxSystemLocation>>(
        '/system/location'
      );
      return this.extractResponseData(response.data) || {};
    } catch {
      try {
        const response = await this.httpClient.get<KnxApiResponse<any>>('/system/status');
        const data = this.extractResponseData(response.data) || {};
        return {
          timezone: data.timezone || 'Asia/Shanghai',
          ...data,
        } as KnxSystemLocation;
      } catch {
        return {};
      }
    }
  }

  private async fetchSystemLimits(): Promise<KnxSystemLimits> {
    try {
      const response = await this.httpClient.get<KnxApiResponse<KnxSystemLimits>>(
        '/automation/limits'
      );
      return this.extractResponseData(response.data) || {};
    } catch {
      return {};
    }
  }

  private extractResponseData<T>(response: KnxApiResponse<T>): T | undefined {
    if (response.data !== undefined) {
      return response.data;
    }
    return response as unknown as T;
  }

  private isResponseSuccess(response: KnxApiResponse<any>): boolean {
    if (response.code !== undefined) {
      return response.code === 0 || response.code === 200;
    }
    return true;
  }

  private async collectDevices(): Promise<void> {
    const [devices, rooms] = await Promise.all([this.fetchDevices(), this.fetchRooms()]);

    const roomMap = new Map<string, KnxRoom>();
    for (const room of rooms) {
      roomMap.set(room.uuid, room);
      this.rooms.set(room.uuid, room);
    }

    const seenUuids = new Set<string>();
    const now = new Date();

    for (const device of devices) {
      if (!this.shouldTrackDevice(device)) {
        continue;
      }

      seenUuids.add(device.uuid);
      const room = device.room_uuid ? roomMap.get(device.room_uuid) : undefined;

      const deviceStatus: KnxDeviceStatus = {
        uuid: device.uuid,
        name: device.name,
        type: device.type,
        subType: device.sub_type || '',
        online: device.online !== false,
        lastSeen: device.last_seen ? new Date(device.last_seen) : now,
        roomId: device.room_uuid,
        roomName: room?.name || device.room_name,
      };

      this.devices.set(device.uuid, deviceStatus);
      this.trackedDeviceUuids.add(device.uuid);

      const entityState = this.convertDeviceToEntityState(device, room);
      const previous = this.deviceStates.get(entityState.entityId);
      this.deviceStates.set(entityState.entityId, entityState);

      if (!previous || previous.state !== entityState.state || previous.lastUpdated.getTime() !== entityState.lastUpdated.getTime()) {
        this.onStateChange(entityState);

        if (previous && previous.state !== entityState.state) {
          const event: CollectedEvent = {
            id: `knx_device_state_${device.uuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: now,
            source: DataSourceType.KnxGateway,
            sourceId: this.config.id,
            eventType: 'device_state_changed',
            entityId: entityState.entityId,
            data: {
              deviceUuid: device.uuid,
              deviceName: device.name,
              oldState: previous.state,
              newState: entityState.state,
              roomId: device.room_uuid,
              roomName: room?.name,
            },
          };
          this.onEvent(event);
        }

        if (previous && previous.attributes.online !== entityState.attributes.online) {
          const eventType = entityState.attributes.online
            ? 'device_online'
            : 'device_offline';
          const event: CollectedEvent = {
            id: `knx_device_conn_${device.uuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: now,
            source: DataSourceType.KnxGateway,
            sourceId: this.config.id,
            eventType,
            entityId: entityState.entityId,
            data: {
              deviceUuid: device.uuid,
              deviceName: device.name,
              online: entityState.attributes.online,
              roomId: device.room_uuid,
              roomName: room?.name,
            },
          };
          this.onEvent(event);
        }
      }
    }

    for (const [uuid] of this.devices) {
      if (!seenUuids.has(uuid)) {
        this.devices.delete(uuid);
        this.deviceStates.delete(`knx.device.${uuid}`);
        this.trackedDeviceUuids.delete(uuid);
      }
    }
  }

  private async collectScenes(): Promise<void> {
    const scenes = await this.fetchScenes();
    const seenUuids = new Set<string>();
    const now = new Date();

    for (const scene of scenes) {
      if (!this.shouldTrackScene(scene)) {
        continue;
      }

      seenUuids.add(scene.uuid);

      const sceneStatus: KnxSceneStatus = {
        uuid: scene.uuid,
        name: scene.name,
        enabled: scene.enabled !== false,
        lastExecuted: scene.last_executed ? new Date(scene.last_executed) : undefined,
      };

      this.scenes.set(scene.uuid, sceneStatus);
      this.trackedSceneUuids.add(scene.uuid);

      const entityState = this.convertSceneToEntityState(scene);
      const previous = this.sceneStates.get(entityState.entityId);
      this.sceneStates.set(entityState.entityId, entityState);

      if (!previous || previous.state !== entityState.state || previous.lastUpdated.getTime() !== entityState.lastUpdated.getTime()) {
        this.onStateChange(entityState);

        if (previous && previous.state !== entityState.state) {
          const event: CollectedEvent = {
            id: `knx_scene_state_${scene.uuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: now,
            source: DataSourceType.KnxGateway,
            sourceId: this.config.id,
            eventType: 'scene_status_changed',
            entityId: entityState.entityId,
            data: {
              sceneUuid: scene.uuid,
              sceneName: scene.name,
              oldStatus: previous.state,
              newStatus: entityState.state,
            },
          };
          this.onEvent(event);
        }
      }
    }

    for (const [uuid] of this.scenes) {
      if (!seenUuids.has(uuid)) {
        this.scenes.delete(uuid);
        this.sceneStates.delete(`knx.scene.${uuid}`);
        this.trackedSceneUuids.delete(uuid);
      }
    }
  }

  private async collectWorkflows(): Promise<void> {
    let workflows: KnxWorkflow[] = [];
    try {
      workflows = await this.fetchWorkflows();
    } catch (error) {
      return;
    }

    const seenUuids = new Set<string>();
    const now = new Date();

    for (const workflow of workflows) {
      if (!this.shouldTrackWorkflow(workflow)) {
        continue;
      }

      seenUuids.add(workflow.uuid);

      let status: 'running' | 'stopped' | 'error' | 'disabled';
      if (!workflow.enabled) {
        status = 'disabled';
      } else if (workflow.status) {
        status = workflow.status;
      } else {
        status = 'running';
      }

      const workflowStatus: KnxWorkflowStatus = {
        uuid: workflow.uuid,
        name: workflow.name,
        enabled: workflow.enabled !== false,
        status,
        lastTriggered: workflow.last_triggered ? new Date(workflow.last_triggered) : undefined,
        errorCount: workflow.error_count || 0,
      };

      this.workflows.set(workflow.uuid, workflowStatus);
      this.trackedWorkflowUuids.add(workflow.uuid);

      const entityState = this.convertWorkflowToEntityState(workflow, status);
      const previous = this.workflowStates.get(entityState.entityId);
      this.workflowStates.set(entityState.entityId, entityState);

      if (!previous || previous.state !== entityState.state || previous.lastUpdated.getTime() !== entityState.lastUpdated.getTime()) {
        this.onStateChange(entityState);

        if (previous && previous.state !== entityState.state) {
          const event: CollectedEvent = {
            id: `knx_workflow_state_${workflow.uuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: now,
            source: DataSourceType.KnxGateway,
            sourceId: this.config.id,
            eventType: 'workflow_status_changed',
            entityId: entityState.entityId,
            data: {
              workflowUuid: workflow.uuid,
              workflowName: workflow.name,
              oldStatus: previous.state,
              newStatus: entityState.state,
            },
          };
          this.onEvent(event);
        }

        if (status === 'error' && previous?.state !== 'error') {
          const event: CollectedEvent = {
            id: `knx_workflow_err_${workflow.uuid}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: now,
            source: DataSourceType.KnxGateway,
            sourceId: this.config.id,
            eventType: 'workflow_error',
            entityId: entityState.entityId,
            data: {
              workflowUuid: workflow.uuid,
              workflowName: workflow.name,
              errorCount: workflow.error_count || 0,
            },
          };
          this.onEvent(event);
        }
      }
    }

    for (const [uuid] of this.workflows) {
      if (!seenUuids.has(uuid)) {
        this.workflows.delete(uuid);
        this.workflowStates.delete(`knx.workflow.${uuid}`);
        this.trackedWorkflowUuids.delete(uuid);
      }
    }
  }

  private async collectSystemInfo(): Promise<void> {
    try {
      const [location, limits] = await Promise.all([
        this.fetchSystemLocation(),
        this.fetchSystemLimits(),
      ]);
      this.systemInfo = { location, limits };
    } catch (error) {
      // System info endpoints may not always be available
    }
  }

  private convertDeviceToEntityState(device: KnxDevice, room?: KnxRoom): EntityState {
    const entityType = DEVICE_TYPE_MAP[device.type] || device.type;
    let state = 'unknown';

    if (device.state) {
      if (typeof device.state.on === 'boolean') {
        state = device.state.on ? 'on' : 'off';
      } else if (typeof device.state.status === 'string') {
        state = device.state.status;
      }
    }

    if (!device.online) {
      state = 'unavailable';
    }

    const now = new Date();
    const lastUpdated = device.last_seen ? new Date(device.last_seen) : now;

    return {
      entityId: `knx.device.${device.uuid}`,
      state,
      attributes: {
        name: device.name,
        type: device.type,
        subType: device.sub_type || '',
        entityType,
        online: device.online !== false,
        roomId: device.room_uuid,
        roomName: room?.name || device.room_name,
        capabilities: device.capabilities || [],
        lastSeen: device.last_seen || now.toISOString(),
        raw: device,
        ...(device.state || {}),
      },
      lastChanged: lastUpdated,
      lastUpdated,
      source: DataSourceType.KnxGateway,
      sourceId: this.config.id,
    };
  }

  private convertSceneToEntityState(scene: KnxScene): EntityState {
    const state = scene.enabled ? 'active' : 'inactive';
    const now = new Date();

    return {
      entityId: `knx.scene.${scene.uuid}`,
      state,
      attributes: {
        name: scene.name,
        description: scene.description || '',
        enabled: scene.enabled !== false,
        icon: scene.icon || '',
        lastExecuted: scene.last_executed || null,
        deviceCount: scene.device_count || 0,
        raw: scene,
      },
      lastChanged: scene.last_executed ? new Date(scene.last_executed) : now,
      lastUpdated: now,
      source: DataSourceType.KnxGateway,
      sourceId: this.config.id,
    };
  }

  private convertWorkflowToEntityState(
    workflow: KnxWorkflow,
    status: 'running' | 'stopped' | 'error' | 'disabled'
  ): EntityState {
    const now = new Date();

    return {
      entityId: `knx.workflow.${workflow.uuid}`,
      state: status,
      attributes: {
        name: workflow.name,
        description: workflow.description || '',
        enabled: workflow.enabled !== false,
        triggerType: workflow.trigger_type || '',
        lastTriggered: workflow.last_triggered || null,
        errorCount: workflow.error_count || 0,
        raw: workflow,
      },
      lastChanged: workflow.last_triggered ? new Date(workflow.last_triggered) : now,
      lastUpdated: now,
      source: DataSourceType.KnxGateway,
      sourceId: this.config.id,
    };
  }

  protected startPolling(): void {
    this.stopPolling();

    const collectInterval =
      this.knxConfig.collectInterval ||
      this.knxConfig.statusPollInterval ||
      300000;

    const mainTimer = setInterval(() => {
      if (this.isConnected()) {
        this.collect().catch((error) => {
          this.onError(error);
        });
      }
    }, collectInterval);

    this.pollTimers.set('main', mainTimer);
  }

  protected stopPolling(): void {
    for (const timer of this.pollTimers.values()) {
      clearInterval(timer);
    }
    this.pollTimers.clear();
  }

  public getStatus(): CollectorStatusInfo {
    const baseStatus = super.getStatus();
    const health = this.getHealthReport();
    return {
      ...baseStatus,
      metrics: {
        ...baseStatus.metrics,
        trackedDevices: this.trackedDeviceUuids.size,
        trackedScenes: this.trackedSceneUuids.size,
        trackedWorkflows: this.trackedWorkflowUuids.size,
        rooms: this.rooms.size,
        ...health,
      },
    };
  }

  protected async ping(): Promise<void> {
    await this.fetchSystemLocation();
  }
}
