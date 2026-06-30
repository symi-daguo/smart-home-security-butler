import {
  KnxSceneConfig,
  KnxWorkflowConfig,
  KnxSceneDevice,
  KnxWorkflowTrigger,
  KnxWorkflowNode,
  KnxWorkflowEdge,
  AutomationValidationResult,
  DeviceInfo,
  TriggerType,
  ActionType,
} from '../types';

const VALID_TRIGGER_TYPES: TriggerType[] = [
  'device_event',
  'cron',
  'sun_event',
  'manual',
  'webhook',
];

const VALID_NODE_TYPES: ActionType[] = [
  'device_control',
  'scene_exec',
  'delay',
  'condition',
  'transform',
];

export class KNXSceneBuilder {
  private sceneConfig: KnxSceneConfig;
  private availableDevices: DeviceInfo[];

  constructor(id?: string, name?: string) {
    this.sceneConfig = {
      id: id || this.generateId(),
      name: name || 'Unnamed Scene',
      description: '',
      devices: [],
    };
    this.availableDevices = [];
  }

  private generateId(): string {
    return `scene_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  public setId(id: string): KNXSceneBuilder {
    this.sceneConfig.id = id;
    return this;
  }

  public setName(name: string): KNXSceneBuilder {
    this.sceneConfig.name = name;
    return this;
  }

  public setDescription(description: string): KNXSceneBuilder {
    this.sceneConfig.description = description;
    return this;
  }

  public setAvailableDevices(devices: DeviceInfo[]): KNXSceneBuilder {
    this.availableDevices = devices;
    return this;
  }

  public addDevice(device: KnxSceneDevice): KNXSceneBuilder {
    this.sceneConfig.devices.push(device);
    return this;
  }

  public addSwitchDevice(deviceId: string, value: boolean): KNXSceneBuilder {
    this.sceneConfig.devices.push({
      deviceId,
      function: 'switch',
      value,
    });
    return this;
  }

  public addDimmingDevice(deviceId: string, value: number): KNXSceneBuilder {
    this.sceneConfig.devices.push({
      deviceId,
      function: 'dimming',
      value,
    });
    return this;
  }

  public addPositionDevice(deviceId: string, value: number): KNXSceneBuilder {
    this.sceneConfig.devices.push({
      deviceId,
      function: 'position',
      value,
    });
    return this;
  }

  public addTemperatureDevice(deviceId: string, value: number): KNXSceneBuilder {
    this.sceneConfig.devices.push({
      deviceId,
      function: 'temperature',
      value,
    });
    return this;
  }

  public build(): KnxSceneConfig {
    return { ...this.sceneConfig };
  }

  public toJSON(): string {
    return JSON.stringify(this.sceneConfig, null, 2);
  }

  public validate(): AutomationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingEntities: string[] = [];
    const conflicts: string[] = [];

    if (!this.sceneConfig.id) {
      errors.push('场景 ID 不能为空');
    }

    if (!this.sceneConfig.name) {
      errors.push('场景名称不能为空');
    }

    if (this.sceneConfig.devices.length === 0) {
      warnings.push('场景中没有配置任何设备');
    }

    for (let i = 0; i < this.sceneConfig.devices.length; i++) {
      const device = this.sceneConfig.devices[i];
      if (!device.deviceId) {
        errors.push(`设备 ${i + 1}: 设备 ID 不能为空`);
      }
      if (!device.function) {
        errors.push(`设备 ${i + 1}: 功能类型不能为空`);
      }
      if (
        device.value === null ||
        device.value === undefined
      ) {
        errors.push(`设备 ${i + 1}: 值不能为空`);
      }

      if (
        device.deviceId &&
        this.availableDevices.length > 0 &&
        !this.deviceExists(device.deviceId)
      ) {
        missingEntities.push(device.deviceId);
      }
    }

    const deviceIds = this.sceneConfig.devices.map((d) => d.deviceId);
    const duplicates = deviceIds.filter((id, index) => deviceIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      for (const dup of duplicates) {
        conflicts.push(`设备 ${dup} 在场景中重复配置`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingEntities: [...new Set(missingEntities)],
      conflicts,
    };
  }

  private deviceExists(deviceId: string): boolean {
    return this.availableDevices.some((d) => d.entityId === deviceId);
  }

  public static fromConfig(config: KnxSceneConfig): KNXSceneBuilder {
    const builder = new KNXSceneBuilder(config.id, config.name);
    builder.sceneConfig = { ...config };
    return builder;
  }

  public static fromJSON(json: string): KNXSceneBuilder {
    const config = JSON.parse(json) as KnxSceneConfig;
    return KNXSceneBuilder.fromConfig(config);
  }
}

export class KNXWorkflowBuilder {
  private workflowConfig: KnxWorkflowConfig;
  private availableDevices: DeviceInfo[];
  private nodeCounter: number;
  private edgeCounter: number;

  constructor(id?: string, name?: string) {
    this.workflowConfig = {
      id: id || this.generateId(),
      name: name || 'Unnamed Workflow',
      description: '',
      trigger: {
        type: 'manual',
        config: {},
      },
      nodes: [],
      edges: [],
    };
    this.availableDevices = [];
    this.nodeCounter = 0;
    this.edgeCounter = 0;
  }

  private generateId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  public setId(id: string): KNXWorkflowBuilder {
    this.workflowConfig.id = id;
    return this;
  }

  public setName(name: string): KNXWorkflowBuilder {
    this.workflowConfig.name = name;
    return this;
  }

  public setDescription(description: string): KNXWorkflowBuilder {
    this.workflowConfig.description = description;
    return this;
  }

  public setAvailableDevices(devices: DeviceInfo[]): KNXWorkflowBuilder {
    this.availableDevices = devices;
    return this;
  }

  public setTrigger(trigger: KnxWorkflowTrigger): KNXWorkflowBuilder {
    this.workflowConfig.trigger = trigger;
    return this;
  }

  public setDeviceEventTrigger(
    deviceId: string,
    eventType: string,
    options?: {
      value?: any;
      condition?: string;
    },
  ): KNXWorkflowBuilder {
    this.workflowConfig.trigger = {
      type: 'device_event',
      config: {
        deviceId,
        eventType,
        ...options,
      },
    };
    return this;
  }

  public setCronTrigger(expression: string, options?: { timezone?: string }): KNXWorkflowBuilder {
    this.workflowConfig.trigger = {
      type: 'cron',
      config: {
        expression,
        ...options,
      },
    };
    return this;
  }

  public setSunEventTrigger(
    event: 'sunrise' | 'sunset',
    options?: {
      offset?: number;
    },
  ): KNXWorkflowBuilder {
    this.workflowConfig.trigger = {
      type: 'sun_event',
      config: {
        event,
        ...options,
      },
    };
    return this;
  }

  public setManualTrigger(): KNXWorkflowBuilder {
    this.workflowConfig.trigger = {
      type: 'manual',
      config: {},
    };
    return this;
  }

  public setWebhookTrigger(webhookId: string, options?: { method?: string }): KNXWorkflowBuilder {
    this.workflowConfig.trigger = {
      type: 'webhook',
      config: {
        webhookId,
        ...options,
      },
    };
    return this;
  }

  public addNode(node: KnxWorkflowNode): KNXWorkflowBuilder {
    this.workflowConfig.nodes.push(node);
    return this;
  }

  public addDeviceControlNode(
    name: string,
    devices: { deviceId: string; function: string; value: any }[],
    position?: { x: number; y: number },
  ): string {
    const nodeId = `node_${this.nodeCounter++}`;
    this.workflowConfig.nodes.push({
      id: nodeId,
      type: 'device_control',
      name,
      config: {
        devices,
      },
      position,
    });
    return nodeId;
  }

  public addSceneExecNode(
    name: string,
    sceneId: string,
    position?: { x: number; y: number },
  ): string {
    const nodeId = `node_${this.nodeCounter++}`;
    this.workflowConfig.nodes.push({
      id: nodeId,
      type: 'scene_exec',
      name,
      config: {
        sceneId,
      },
      position,
    });
    return nodeId;
  }

  public addDelayNode(
    name: string,
    delayMs: number,
    position?: { x: number; y: number },
  ): string {
    const nodeId = `node_${this.nodeCounter++}`;
    this.workflowConfig.nodes.push({
      id: nodeId,
      type: 'delay',
      name,
      config: {
        delayMs,
      },
      position,
    });
    return nodeId;
  }

  public addConditionNode(
    name: string,
    condition: {
      type: 'device_state' | 'time' | 'and' | 'or' | 'not';
      config: Record<string, any>;
    },
    position?: { x: number; y: number },
  ): string {
    const nodeId = `node_${this.nodeCounter++}`;
    this.workflowConfig.nodes.push({
      id: nodeId,
      type: 'condition',
      name,
      config: condition,
      position,
    });
    return nodeId;
  }

  public addTransformNode(
    name: string,
    expression: string,
    position?: { x: number; y: number },
  ): string {
    const nodeId = `node_${this.nodeCounter++}`;
    this.workflowConfig.nodes.push({
      id: nodeId,
      type: 'transform',
      name,
      config: {
        expression,
      },
      position,
    });
    return nodeId;
  }

  public addEdge(
    source: string,
    target: string,
    options?: {
      sourceHandle?: string;
      targetHandle?: string;
    },
  ): string {
    const edgeId = `edge_${this.edgeCounter++}`;
    this.workflowConfig.edges.push({
      id: edgeId,
      source,
      target,
      ...options,
    });
    return edgeId;
  }

  public build(): KnxWorkflowConfig {
    return { ...this.workflowConfig };
  }

  public toJSON(): string {
    return JSON.stringify(this.workflowConfig, null, 2);
  }

  public validate(): AutomationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingEntities: string[] = [];
    const conflicts: string[] = [];

    if (!this.workflowConfig.id) {
      errors.push('工作流 ID 不能为空');
    }

    if (!this.workflowConfig.name) {
      errors.push('工作流名称不能为空');
    }

    if (!this.workflowConfig.trigger) {
      errors.push('工作流必须配置触发器');
    } else if (!VALID_TRIGGER_TYPES.includes(this.workflowConfig.trigger.type)) {
      errors.push(`不支持的触发器类型 '${this.workflowConfig.trigger.type}'`);
    }

    if (this.workflowConfig.nodes.length === 0) {
      errors.push('工作流至少需要一个节点');
    }

    const nodeIds = new Set<string>();
    for (let i = 0; i < this.workflowConfig.nodes.length; i++) {
      const node = this.workflowConfig.nodes[i];
      if (!node.id) {
        errors.push(`节点 ${i + 1}: 节点 ID 不能为空`);
      } else if (nodeIds.has(node.id)) {
        conflicts.push(`节点 ID '${node.id}' 重复`);
      } else {
        nodeIds.add(node.id);
      }

      if (!node.type) {
        errors.push(`节点 ${i + 1}: 节点类型不能为空`);
      } else if (!VALID_NODE_TYPES.includes(node.type)) {
        errors.push(`节点 ${i + 1}: 不支持的节点类型 '${node.type}'`);
      }

      if (!node.name) {
        warnings.push(`节点 ${i + 1}: 建议设置节点名称`);
      }

      const deviceIds = this.extractDeviceIdsFromNode(node);
      for (const deviceId of deviceIds) {
        if (this.availableDevices.length > 0 && !this.deviceExists(deviceId)) {
          missingEntities.push(deviceId);
        }
      }
    }

    const startNodes = this.workflowConfig.edges.length > 0
      ? this.workflowConfig.nodes.filter(
          (n) => !this.workflowConfig.edges.some((e) => e.target === n.id),
        )
      : this.workflowConfig.nodes;

    if (startNodes.length > 1) {
      warnings.push('工作流有多个起始节点，建议只有一个起始点');
    }

    const endNodes = this.workflowConfig.nodes.filter(
      (n) => !this.workflowConfig.edges.some((e) => e.source === n.id),
    );
    if (endNodes.length === 0 && this.workflowConfig.nodes.length > 0) {
      warnings.push('工作流没有结束节点');
    }

    for (let i = 0; i < this.workflowConfig.edges.length; i++) {
      const edge = this.workflowConfig.edges[i];
      if (!edge.source) {
        errors.push(`边 ${i + 1}: 源节点不能为空`);
      } else if (!nodeIds.has(edge.source)) {
        errors.push(`边 ${i + 1}: 源节点 '${edge.source}' 不存在`);
      }

      if (!edge.target) {
        errors.push(`边 ${i + 1}: 目标节点不能为空`);
      } else if (!nodeIds.has(edge.target)) {
        errors.push(`边 ${i + 1}: 目标节点 '${edge.target}' 不存在`);
      }
    }

    if (this.hasCycle()) {
      errors.push('工作流中存在循环依赖');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingEntities: [...new Set(missingEntities)],
      conflicts,
    };
  }

  private hasCycle(): boolean {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);

      const children = this.workflowConfig.edges
        .filter((e) => e.source === nodeId)
        .map((e) => e.target);

      for (const child of children) {
        if (!visited.has(child)) {
          if (dfs(child)) {
            return true;
          }
        } else if (recStack.has(child)) {
          return true;
        }
      }

      recStack.delete(nodeId);
      return false;
    };

    for (const node of this.workflowConfig.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  private deviceExists(deviceId: string): boolean {
    return this.availableDevices.some((d) => d.entityId === deviceId);
  }

  private extractDeviceIdsFromNode(node: KnxWorkflowNode): string[] {
    const deviceIds: string[] = [];

    if (node.type === 'device_control' && node.config?.devices) {
      for (const device of node.config.devices) {
        if (device.deviceId) {
          deviceIds.push(device.deviceId);
        }
      }
    }

    if (node.type === 'condition' && node.config?.config?.deviceId) {
      deviceIds.push(node.config.config.deviceId);
    }

    return deviceIds;
  }

  public static fromConfig(config: KnxWorkflowConfig): KNXWorkflowBuilder {
    const builder = new KNXWorkflowBuilder(config.id, config.name);
    builder.workflowConfig = { ...config };
    builder.nodeCounter = config.nodes.length;
    builder.edgeCounter = config.edges.length;
    return builder;
  }

  public static fromJSON(json: string): KNXWorkflowBuilder {
    const config = JSON.parse(json) as KnxWorkflowConfig;
    return KNXWorkflowBuilder.fromConfig(config);
  }

  public async validateWithGateway(
    apiUrl: string,
    token?: string,
  ): Promise<AutomationValidationResult> {
    const baseResult = this.validate();

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/api/health`, {
        headers,
      });

      if (!response.ok) {
        baseResult.warnings.push(`无法连接到 KNX 网关: ${response.statusText}`);
        return baseResult;
      }
    } catch (error) {
      baseResult.warnings.push(`无法连接到 KNX 网关: ${(error as Error).message}`);
    }

    return baseResult;
  }
}

export default KNXSceneBuilder;
