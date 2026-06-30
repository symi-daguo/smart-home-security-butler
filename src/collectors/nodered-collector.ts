import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { BaseCollector } from './base-collector';
import {
  CollectorConfig,
  DataSourceType,
  EntityState,
  CollectedEvent,
  CollectorStatusInfo,
} from '../types';

export interface NodeRedCollectorConfig {
  monitorFlows?: string[];
  monitorNodeTypes?: string[];
  captureErrors?: boolean;
  captureDebug?: boolean;
  captureDeployments?: boolean;
  statusPollInterval?: number;
  errorPollInterval?: number;
  collectInterval?: number;
}

export interface FlowStatus {
  id: string;
  label: string;
  disabled: boolean;
  nodeCount: number;
  lastModified: Date;
  status: 'running' | 'stopped' | 'error' | 'disabled';
}

export interface NodeStatus {
  id: string;
  type: string;
  name?: string;
  flowId: string;
  fill: 'green' | 'yellow' | 'red' | 'grey' | 'blue';
  shape: 'ring' | 'dot';
  text?: string;
  lastChanged: Date;
}

export interface FlowError {
  id: string;
  timestamp: Date;
  flowId: string;
  nodeId: string;
  nodeType: string;
  nodeName?: string;
  message: string;
  stack?: string;
  count: number;
}

interface NodeRedFlow {
  id: string;
  type: string;
  label?: string;
  disabled?: boolean;
  info?: string;
  nodes?: NodeRedNode[];
  z?: string;
  name?: string;
  [key: string]: any;
}

interface NodeRedNode {
  id: string;
  type: string;
  name?: string;
  x?: number;
  y?: number;
  z?: string;
  wires?: string[][];
  inputs?: number;
  outputs?: number;
  [key: string]: any;
}

interface NodeRedModule {
  name: string;
  version: string;
  nodes: Record<string, NodeRedModuleNode>;
}

interface NodeRedModuleNode {
  name: string;
  version: string;
  local?: boolean;
  user?: boolean;
  enabled?: boolean;
  loaded?: boolean;
  err?: string;
  types?: string[];
}

interface NodeRedSettings {
  httpNodeRoot: string;
  version: string;
  [key: string]: any;
}

export class NodeRedCollector extends BaseCollector {
  private nrConfig: NodeRedCollectorConfig;
  private flows: Map<string, FlowStatus>;
  private nodes: Map<string, NodeStatus>;
  private errors: FlowError[];
  private pollTimers: Map<string, NodeJS.Timeout>;
  private httpClient: AxiosInstance;
  private rev: string | null;
  private flowRevs: Map<string, string>;
  private version: string | null;
  private installedNodes: Map<string, NodeRedModuleNode>;
  private rawFlows: Map<string, NodeRedFlow>;
  private flowStates: Map<string, EntityState>;
  private trackedFlowIds: Set<string>;
  private errorCounts: Map<string, number>;
  private lastErrorCheck: Date | null;

  constructor(config: CollectorConfig) {
    super(config);
    this.nrConfig = (config.config as NodeRedCollectorConfig) || {};
    this.flows = new Map();
    this.nodes = new Map();
    this.errors = [];
    this.pollTimers = new Map();
    this.rev = null;
    this.flowRevs = new Map();
    this.version = null;
    this.installedNodes = new Map();
    this.rawFlows = new Map();
    this.flowStates = new Map();
    this.trackedFlowIds = new Set();
    this.errorCounts = new Map();
    this.lastErrorCheck = null;

    const baseURL = this.config.baseUrl.replace(/\/$/, '');
    const authType = this.config.auth?.type || 'none';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authType === 'bearer' && this.config.auth?.token) {
      headers['Authorization'] = `Bearer ${this.config.auth.token}`;
    } else if (authType === 'basic' && this.config.auth?.username && this.config.auth?.password) {
      const credentials = Buffer.from(
        `${this.config.auth.username}:${this.config.auth.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    this.httpClient = axios.create({
      baseURL,
      headers,
      timeout: 30000,
    });
  }

  public getType(): DataSourceType {
    return DataSourceType.NodeRed;
  }

  public async connect(): Promise<void> {
    try {
      await this.testRESTConnection();
      await this.collect();
      this.startPolling();
    } catch (error) {
      throw new Error(`Failed to connect to Node-RED: ${(error as Error).message}`);
    }
  }

  public async disconnect(): Promise<void> {
    this.stopPolling();
    this.flows.clear();
    this.nodes.clear();
    this.errors = [];
    this.flowRevs.clear();
    this.installedNodes.clear();
    this.rawFlows.clear();
    this.flowStates.clear();
    this.trackedFlowIds.clear();
    this.errorCounts.clear();
    this.rev = null;
    this.version = null;
    this.lastErrorCheck = null;
  }

  public async collect(): Promise<void> {
    try {
      await this.collectFlows();
      await this.collectNodes();

      if (this.nrConfig.captureErrors !== false) {
        await this.detectFlowErrors();
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
    version?: string;
    flowCount?: number;
    nodeCount?: number;
  }> {
    const startTime = Date.now();
    try {
      const settings = await this.getSettings();
      const flows = await this.getFlowsAPI();
      const latencyMs = Date.now() - startTime;
      const nodeCount = flows.reduce((count, flow) => {
        if (flow.nodes) {
          return count + flow.nodes.filter((n) => n.type !== 'tab').length;
        }
        return count;
      }, 0);
      return {
        success: true,
        latencyMs,
        version: settings.version,
        flowCount: flows.filter((f) => f.type === 'tab').length,
        nodeCount,
      };
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  public getFlows(): FlowStatus[] {
    return Array.from(this.flows.values());
  }

  public getFlow(flowId: string): FlowStatus | undefined {
    return this.flows.get(flowId);
  }

  public getNodes(flowId?: string): NodeStatus[] {
    const nodes = Array.from(this.nodes.values());
    if (flowId) {
      return nodes.filter((n) => n.flowId === flowId);
    }
    return nodes;
  }

  public getNode(nodeId: string): NodeStatus | undefined {
    return this.nodes.get(nodeId);
  }

  public getErrors(since?: Date, flowId?: string, limit?: number): FlowError[] {
    let result = [...this.errors];

    if (since) {
      result = result.filter((e) => e.timestamp >= since);
    }

    if (flowId) {
      result = result.filter((e) => e.flowId === flowId);
    }

    if (limit) {
      result = result.slice(0, limit);
    }

    return result;
  }

  public async getFlowsAPI(): Promise<NodeRedFlow[]> {
    const response: AxiosResponse<NodeRedFlow[]> = await this.httpClient.get('/flows');
    const rev = response.headers['x-node-red-rev'];
    if (rev) {
      this.rev = rev;
    }
    return response.data;
  }

  public async getFlowAPI(flowId: string): Promise<NodeRedFlow> {
    const response: AxiosResponse<NodeRedFlow> = await this.httpClient.get(`/flow/${flowId}`);
    return response.data;
  }

  public async getNodesAPI(): Promise<NodeRedModule[]> {
    const response: AxiosResponse<NodeRedModule[]> = await this.httpClient.get('/nodes');
    return response.data;
  }

  public async getSettings(): Promise<NodeRedSettings> {
    const response: AxiosResponse<NodeRedSettings> = await this.httpClient.get('/settings');
    this.version = response.data.version;
    return response.data;
  }

  public getFlowStatus(flowId: string): FlowStatus | undefined {
    return this.flows.get(flowId);
  }

  public getHealthReport(): {
    totalFlows: number;
    healthyFlows: number;
    flowsWithErrors: number;
    disabledFlows: number;
    totalNodes: number;
    nodesWithErrors: number;
    nodesWithWarnings: number;
    topErrorNodes: { nodeId: string; nodeType: string; nodeName?: string; errorCount: number }[];
  } {
    const flowValues = Array.from(this.flows.values());
    const nodeValues = Array.from(this.nodes.values());

    const totalFlows = flowValues.length;
    const healthyFlows = flowValues.filter((f) => f.status === 'running').length;
    const flowsWithErrors = flowValues.filter((f) => f.status === 'error').length;
    const disabledFlows = flowValues.filter((f) => f.status === 'disabled' || f.disabled).length;

    const totalNodes = nodeValues.length;
    const nodesWithErrors = nodeValues.filter((n) => n.fill === 'red').length;
    const nodesWithWarnings = nodeValues.filter((n) => n.fill === 'yellow').length;

    const errorNodeMap = new Map<string, { nodeId: string; nodeType: string; nodeName?: string; errorCount: number }>();
    for (const error of this.errors) {
      const existing = errorNodeMap.get(error.nodeId);
      if (existing) {
        existing.errorCount += error.count;
      } else {
        errorNodeMap.set(error.nodeId, {
          nodeId: error.nodeId,
          nodeType: error.nodeType,
          nodeName: error.nodeName,
          errorCount: error.count,
        });
      }
    }

    const topErrorNodes = Array.from(errorNodeMap.values())
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, 10);

    return {
      totalFlows,
      healthyFlows,
      flowsWithErrors,
      disabledFlows,
      totalNodes,
      nodesWithErrors,
      nodesWithWarnings,
      topErrorNodes,
    };
  }

  public getNodeTypeStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    for (const node of this.nodes.values()) {
      stats[node.type] = (stats[node.type] || 0) + 1;
    }
    return stats;
  }

  public getCurrentRev(): string | null {
    return this.rev;
  }

  public getFlowRev(flowId: string): string | undefined {
    return this.flowRevs.get(flowId);
  }

  protected shouldMonitorFlow(flowLabel: string, flowId?: string): boolean {
    if (!this.nrConfig.monitorFlows || this.nrConfig.monitorFlows.length === 0) {
      return true;
    }

    for (const pattern of this.nrConfig.monitorFlows) {
      if (this.matchPattern(flowLabel, pattern)) {
        return true;
      }
      if (flowId && this.matchPattern(flowId, pattern)) {
        return true;
      }
    }

    return false;
  }

  protected shouldMonitorNode(nodeType: string): boolean {
    if (!this.nrConfig.monitorNodeTypes || this.nrConfig.monitorNodeTypes.length === 0) {
      return true;
    }

    for (const pattern of this.nrConfig.monitorNodeTypes) {
      if (this.matchPattern(nodeType, pattern)) {
        return true;
      }
    }

    return false;
  }

  private matchPattern(str: string, pattern: string): boolean {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$', 'i');
    return regex.test(str);
  }

  private async testRESTConnection(): Promise<void> {
    const settings = await this.getSettings();
    this.version = settings.version;
  }

  private async collectFlows(): Promise<void> {
    const rawFlows = await this.getFlowsAPI();

    const tabFlows = rawFlows.filter((f) => f.type === 'tab');

    const nodeMap = new Map<string, NodeRedNode>();
    for (const flow of rawFlows) {
      if (flow.nodes) {
        for (const node of flow.nodes) {
          nodeMap.set(node.id, node);
        }
      }
    }

    for (const tabFlow of tabFlows) {
      const flowId = tabFlow.id;
      const flowLabel = tabFlow.label || flowId;

      if (!this.shouldMonitorFlow(flowLabel, flowId)) {
        continue;
      }

      const flowNodes = rawFlows.filter((f) => f.z === flowId);
      const nodeCount = flowNodes.length;

      let hasError = false;
      let hasWarning = false;
      let allDisabled = tabFlow.disabled === true;

      const now = new Date();
      const previousFlow = this.flows.get(flowId);

      for (const node of flowNodes) {
        const nodeId = node.id;
        const nodeType = node.type;
        const nodeName = node.name;

        if (!this.shouldMonitorNode(nodeType)) {
          continue;
        }

        const nodeStatus: NodeStatus = {
          id: nodeId,
          type: nodeType,
          name: nodeName,
          flowId,
          fill: 'grey',
          shape: 'dot',
          lastChanged: now,
        };

        const existingNode = this.nodes.get(nodeId);
        if (existingNode) {
          nodeStatus.fill = existingNode.fill;
          nodeStatus.shape = existingNode.shape;
          nodeStatus.text = existingNode.text;
          nodeStatus.lastChanged = existingNode.lastChanged;
        }

        this.nodes.set(nodeId, nodeStatus);
      }

      let status: 'running' | 'stopped' | 'error' | 'disabled';
      if (allDisabled) {
        status = 'disabled';
      } else if (hasError) {
        status = 'error';
      } else {
        status = 'running';
      }

      const flowStatus: FlowStatus = {
        id: flowId,
        label: flowLabel,
        disabled: allDisabled,
        nodeCount,
        lastModified: now,
        status,
      };

      this.flows.set(flowId, flowStatus);
      this.trackedFlowIds.add(flowId);
      this.rawFlows.set(flowId, tabFlow);

      const entityState = this.convertFlowToEntityState(flowStatus, tabFlow);
      const previous = this.flowStates.get(flowId);
      this.flowStates.set(flowId, entityState);

      if (!previous || previous.state !== entityState.state || previous.lastUpdated.getTime() !== entityState.lastUpdated.getTime()) {
        this.onStateChange(entityState);

        if (previous && previous.state !== entityState.state) {
          const event: CollectedEvent = {
            id: `nr_flow_state_${flowId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: now,
            source: DataSourceType.NodeRed,
            sourceId: this.config.id,
            eventType: 'flow_status_changed',
            entityId: `nodered.flow.${flowId}`,
            data: {
              flowId,
              flowLabel,
              oldStatus: previous.state,
              newStatus: entityState.state,
            },
          };
          this.onEvent(event);
        }
      }

      if (previousFlow && previousFlow.nodeCount !== nodeCount) {
        const event: CollectedEvent = {
          id: `nr_flow_changed_${flowId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          timestamp: now,
          source: DataSourceType.NodeRed,
          sourceId: this.config.id,
          eventType: 'flow_modified',
          entityId: `nodered.flow.${flowId}`,
          data: {
            flowId,
            flowLabel,
            oldNodeCount: previousFlow.nodeCount,
            newNodeCount: nodeCount,
          },
        };
        this.onEvent(event);
      }
    }

    for (const [flowId] of this.flows) {
      if (!tabFlows.find((f) => f.id === flowId)) {
        this.flows.delete(flowId);
        this.flowStates.delete(flowId);
        this.trackedFlowIds.delete(flowId);
        this.rawFlows.delete(flowId);
        this.flowRevs.delete(flowId);

        const nodesToDelete = Array.from(this.nodes.values())
          .filter((n) => n.flowId === flowId)
          .map((n) => n.id);
        for (const nodeId of nodesToDelete) {
          this.nodes.delete(nodeId);
        }
      }
    }
  }

  private async collectNodes(): Promise<void> {
    try {
      const modules = await this.getNodesAPI();
      this.installedNodes.clear();

      for (const module of modules) {
        for (const [nodeName, nodeInfo] of Object.entries(module.nodes)) {
          this.installedNodes.set(nodeName, nodeInfo);
        }
      }
    } catch (error) {
      // Nodes endpoint may not be available in all configurations
    }
  }

  private async detectFlowErrors(): Promise<void> {
    const now = new Date();

    for (const flow of this.flows.values()) {
      if (flow.disabled || flow.status === 'disabled') {
        continue;
      }

      const flowNodes = Array.from(this.nodes.values()).filter((n) => n.flowId === flow.id);
      const errorNodes = flowNodes.filter((n) => n.fill === 'red');

      if (errorNodes.length > 0) {
        flow.status = 'error';

        for (const errorNode of errorNodes) {
          const errorKey = `${flow.id}_${errorNode.id}`;
          const previousCount = this.errorCounts.get(errorKey) || 0;
          this.errorCounts.set(errorKey, previousCount + 1);

          const flowError: FlowError = {
            id: `nr_err_${flow.id}_${errorNode.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: now,
            flowId: flow.id,
            nodeId: errorNode.id,
            nodeType: errorNode.type,
            nodeName: errorNode.name,
            message: errorNode.text || `Node ${errorNode.type} is in error state`,
            count: 1,
          };

          this.errors.unshift(flowError);
          if (this.errors.length > 1000) {
            this.errors.pop();
          }

          const event: CollectedEvent = {
            id: flowError.id,
            timestamp: now,
            source: DataSourceType.NodeRed,
            sourceId: this.config.id,
            eventType: 'flow_error',
            entityId: `nodered.flow.${flow.id}`,
            data: {
              flowId: flow.id,
              flowLabel: flow.label,
              nodeId: errorNode.id,
              nodeType: errorNode.type,
              nodeName: errorNode.name,
              errorMessage: errorNode.text,
            },
          };
          this.onEvent(event);
        }
      }
    }

    this.lastErrorCheck = now;
  }

  private convertFlowToEntityState(flow: FlowStatus, rawFlow: NodeRedFlow): EntityState {
    return {
      entityId: `nodered.flow.${flow.id}`,
      state: flow.status,
      attributes: {
        label: flow.label,
        disabled: flow.disabled,
        nodeCount: flow.nodeCount,
        lastModified: flow.lastModified.toISOString(),
        flowId: flow.id,
        rawFlow: rawFlow,
        nodeTypes: this.getNodeTypesForFlow(flow.id),
      },
      lastChanged: flow.lastModified,
      lastUpdated: flow.lastModified,
      source: DataSourceType.NodeRed,
      sourceId: this.config.id,
    };
  }

  private getNodeTypesForFlow(flowId: string): Record<string, number> {
    const stats: Record<string, number> = {};
    const flowNodes = Array.from(this.nodes.values()).filter((n) => n.flowId === flowId);
    for (const node of flowNodes) {
      stats[node.type] = (stats[node.type] || 0) + 1;
    }
    return stats;
  }

  protected startPolling(): void {
    this.stopPolling();

    const collectInterval = this.nrConfig.collectInterval || this.nrConfig.statusPollInterval || 300000;

    const mainTimer = setInterval(() => {
      if (this.isConnected()) {
        this.collect().catch((error) => {
          this.onError(error);
        });
      }
    }, collectInterval);

    this.pollTimers.set('main', mainTimer);

    if (this.nrConfig.captureErrors !== false) {
      const errorInterval = this.nrConfig.errorPollInterval || collectInterval;
      const errorTimer = setInterval(() => {
        if (this.isConnected()) {
          this.detectFlowErrors().catch((error) => {
            this.onError(error);
          });
        }
      }, errorInterval);
      this.pollTimers.set('error', errorTimer);
    }
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
        trackedFlows: this.trackedFlowIds.size,
        version: this.version,
        rev: this.rev,
        installedNodeTypes: this.installedNodes.size,
        ...health,
      },
    };
  }

  protected async ping(): Promise<void> {
    await this.getSettings();
  }
}
