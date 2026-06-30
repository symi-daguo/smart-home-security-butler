import { EventEmitter } from 'events';
import { ConfigManager } from './config';
import { SQLiteStorage } from './storage/sqlite-storage';
import { HACollector } from './collectors/ha-collector';
import { NodeRedCollector } from './collectors/nodered-collector';
import { KnxCollector } from './collectors/knx-collector';
import { MatterCollector } from './collectors/matter-collector';
// import { MQTTCollector } from './collectors/mqtt-collector';
import { BaseCollector } from './collectors/base-collector';
import { BaseDetector } from './detectors/base-detector';
import { AwayModeDetector } from './detectors/away-mode-detector';
import { DeviceFaultDetector } from './detectors/device-fault-detector';
import { EnergyDetector } from './detectors/energy-detector';
import { DoorAccessDetector } from './detectors/door-access-detector';
import { NotifierBase } from './notifier/notifier-base';
import { TelegramNotifier } from './notifier/telegram-notifier';
import { BarkNotifier } from './notifier/bark-notifier';
import { ServerChanNotifier } from './notifier/serverchan-notifier';
import { AutomationGenerator } from './automation/generator';
import { TrendAnalyzer } from './analytics/trend-analyzer';
import { ReportGenerator } from './analytics/report-generator';
import { AIAgent } from './ai/agent';
import { ToolHandlerContext } from './ai/tools';
import {
  SystemStatus,
  CollectorConfig,
  NotifierConfig,
  DetectionRule,
  Alert,
  EntityState,
  CollectedEvent,
  DetectionScan,
  NotificationMessage,
  NotificationLog,
  SeverityLevel,
  DataSourceType,
  DetectionCategory,
  AlertStatus,
  AutomationPlatform,
  AutomationType,
  RequirementAnalysis,
  DeviceInfo,
  AutomationGenerationResult,
  AutomationValidationResult,
  AutomationSuggestion,
  SceneTemplate,
  AutomationRecommendation,
  TimeRange,
  ReportPeriod,
  ReportFormat,
  TrendAnalysisResult,
  SecurityScore,
  SecurityReport,
  AgentConfig,
  AgentStatus,
} from './types';

export class SecurityButler extends EventEmitter {
  private config: ConfigManager;
  private storage: SQLiteStorage;
  private collectors: Map<string, BaseCollector>;
  private detectors: Map<string, BaseDetector>;
  private notifiers: Map<string, NotifierBase>;
  private automationGenerator: AutomationGenerator;
  private trendAnalyzer: TrendAnalyzer;
  private reportGenerator: ReportGenerator;
  private aiAgent: AIAgent | null;
  private aiConfig: AgentConfig | null;
  private started: boolean;
  private startTime: number;
  private detectionTimer: NodeJS.Timeout | null;
  private cleanupTimer: NodeJS.Timeout | null;

  constructor(configPath?: string) {
    super();
    this.config = new ConfigManager(configPath);
    this.storage = new SQLiteStorage({
      databasePath: this.config.getDataDirectory() + '/security-butler.db',
      logRetentionDays: this.config.getLogRetentionDays(),
    });
    this.collectors = new Map();
    this.detectors = new Map();
    this.notifiers = new Map();
    this.automationGenerator = new AutomationGenerator();
    this.trendAnalyzer = new TrendAnalyzer();
    this.reportGenerator = new ReportGenerator();
    this.aiAgent = null;
    this.aiConfig = null;
    this.started = false;
    this.startTime = 0;
    this.detectionTimer = null;
    this.cleanupTimer = null;
  }

  public async initialize(): Promise<void> {
    await this.storage.initialize();
    await this.loadCollectors();
    await this.loadDetectors();
    await this.loadNotifiers();
    await this.initializeNotifiers();
  }

  public async start(): Promise<void> {
    if (this.started) {
      return;
    }

    await this.initialize();
    await this.initializeAIAgent();

    for (const collector of this.collectors.values()) {
      if (collector.getConfig().enabled) {
        try {
          await collector.start();
        } catch (error) {
          console.error(`Failed to start collector ${collector.getConfig().id}:`, error);
        }
      }
    }

    this.startDetectionLoop();
    this.startCleanupLoop();
    this.startAISyncLoop();

    this.started = true;
    this.startTime = Date.now();
    this.emit('started');
  }

  public setAIConfig(config: AgentConfig): void {
    this.aiConfig = config;
    if (this.aiAgent) {
      this.aiAgent = new AIAgent(config, this.storage);
      if (this.started) {
        this.initializeAIAgentContext();
      }
    }
  }

  private async initializeAIAgent(): Promise<void> {
    if (!this.aiConfig) {
      return;
    }

    try {
      this.aiAgent = new AIAgent(this.aiConfig, this.storage);
      await this.initializeAIAgentContext();
      console.log('[AI] AI Agent initialized successfully');
    } catch (error) {
      console.error('[AI] Failed to initialize AI Agent:', error);
      this.aiAgent = null;
    }
  }

  private async initializeAIAgentContext(): Promise<void> {
    if (!this.aiAgent) return;

    const toolContext: ToolHandlerContext = {
      getDeviceStatus: async (entityId?: string) => {
        const states = await this.getEntityStates(entityId ? [entityId] : undefined);
        const result: Record<string, any> = {};
        for (const [id, state] of states.entries()) {
          result[id] = {
            state: state.state,
            attributes: state.attributes,
            lastChanged: state.lastChanged,
            lastUpdated: state.lastUpdated,
            source: state.source,
          };
        }
        return entityId ? result[entityId] || null : result;
      },
      getAlerts: async (filters?: { status?: string; severity?: string; limit?: number }) => {
        const { alerts, total } = await this.getAlerts({
          status: filters?.status,
          severity: filters?.severity,
          limit: filters?.limit || 20,
        });
        return { alerts, total };
      },
      acknowledgeAlert: async (alertId: string) => {
        return this.acknowledgeAlert(alertId);
      },
      closeAlert: async (alertId: string, resolution: string) => {
        return this.closeAlert(alertId, resolution);
      },
      controlDevice: async (entityId: string, action: string, params?: Record<string, any>) => {
        return this.controlDevice(entityId, action, params);
      },
      runSecurityCheck: async () => {
        const scan = await this.runDetectionScan();
        return scan;
      },
      getSecurityScore: async () => {
        return this.getSecurityScore();
      },
      generateAutomation: async (description: string, platform?: string) => {
        const result = await this.generateAutomation(
          description,
          (platform as AutomationPlatform) || 'homeassistant',
        );
        return result;
      },
      getTrends: async (timeRange?: string) => {
        return this.getTrends((timeRange as TimeRange) || 'week');
      },
      generateReport: async (period?: string, format?: string) => {
        return this.generateReport(
          (period as ReportPeriod) || 'weekly',
          (format as ReportFormat) || 'markdown',
        );
      },
    };

    await this.aiAgent.initialize(toolContext);
  }

  public async chat(
    message: string,
    options?: {
      stream?: boolean;
      onChunk?: (chunk: string, fullContent: string) => void;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<string> {
    if (!this.aiAgent || !this.aiAgent.isInitialized()) {
      throw new Error('AI Agent is not initialized. Please configure and start the system first.');
    }

    try {
      const response = await this.aiAgent.sendMessage(message, options);
      this.emit('ai_message', { role: 'user', content: message });
      this.emit('ai_response', { role: 'assistant', content: response });
      return response;
    } catch (error) {
      console.error('[AI] Chat error:', error);
      throw error;
    }
  }

  public getAIStatus(): AgentStatus {
    if (!this.aiAgent) {
      return {
        initialized: false,
        model: '',
        totalTokensUsed: 0,
        messageCount: 0,
        memory: {
          shortTermCount: 0,
          longTermCount: 0,
          systemContextCount: 0,
        },
      };
    }
    return this.aiAgent.getStatus();
  }

  public clearAIMemory(): void {
    if (this.aiAgent) {
      this.aiAgent.clearMemory();
    }
  }

  public addAISystemContext(context: string): void {
    if (this.aiAgent) {
      this.aiAgent.addSystemContext(context);
    }
  }

  public async stop(): Promise<void> {
    if (!this.started) {
      return;
    }

    if (this.detectionTimer) {
      clearInterval(this.detectionTimer);
      this.detectionTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    for (const collector of this.collectors.values()) {
      try {
        await collector.stop();
      } catch (error) {
        console.error(`Failed to stop collector ${collector.getConfig().id}:`, error);
      }
    }

    for (const notifier of this.notifiers.values()) {
      try {
        await notifier.cleanup();
      } catch (error) {
        console.error(`Failed to cleanup notifier ${notifier.getId()}:`, error);
      }
    }

    await this.storage.close();
    this.started = false;
    this.emit('stopped');
  }

  public isStarted(): boolean {
    return this.started;
  }

  public getUptime(): number {
    if (!this.started || this.startTime === 0) {
      return 0;
    }
    return Math.floor((Date.now() - this.startTime) / 1000);
  }

  private async loadCollectors(): Promise<void> {
    const configs = await this.storage.getCollectorConfigs();

    for (const config of configs) {
      const collector = this.createCollector(config);
      if (collector) {
        this.collectors.set(config.id, collector);
        this.setupCollectorEvents(collector);
      }
    }
  }

  private createCollector(config: CollectorConfig): BaseCollector | null {
    switch (config.type) {
      case DataSourceType.HomeAssistant:
        return new HACollector(config);
      case DataSourceType.NodeRed:
        return new NodeRedCollector(config);
      case DataSourceType.KnxGateway:
        return new KnxCollector(config);
      case DataSourceType.Matter:
        return new MatterCollector(config);
      // case DataSourceType.MQTT:
      //   return new MQTTCollector(config);
      default:
        return null;
    }
  }

  private setupCollectorEvents(collector: BaseCollector): void {
    collector.on('event', (event: CollectedEvent) => {
      this.handleCollectedEvent(event).catch((error) => {
        console.error('Handle collected event error:', error);
      });
    });

    collector.on('state_change', (state: EntityState) => {
      this.handleStateChange(state).catch((error) => {
        console.error('Handle state change error:', error);
      });
    });

    collector.on('error', (error: Error) => {
      console.error(`Collector ${collector.getConfig().id} error:`, error);
      this.emit('collector_error', collector.getConfig().id, error);
    });

    collector.on('statusChange', (status: string) => {
      this.emit('collector_status_change', collector.getConfig().id, status);
    });
  }

  private async loadDetectors(): Promise<void> {
    const rules = await this.storage.getRules();

    for (const rule of rules) {
      const detector = this.createDetector(rule);
      if (detector) {
        this.detectors.set(rule.id, detector);
        this.setupDetectorEvents(detector);
      }
    }
  }

  private createDetector(rule: DetectionRule): BaseDetector | null {
    switch (rule.category) {
      case DetectionCategory.AwayMode:
        return new AwayModeDetector(rule);
      case DetectionCategory.DeviceFault:
        return new DeviceFaultDetector(rule);
      case DetectionCategory.EnergyAnomaly:
        return new EnergyDetector(rule);
      case DetectionCategory.DoorAccess:
        return new DoorAccessDetector(rule);
      default:
        return null;
    }
  }

  private setupDetectorEvents(detector: BaseDetector): void {
    detector.on('alert_created', async (alert: Alert) => {
      try {
        await this.storage.createAlert(alert);
        await this.dispatchAlertNotification(alert);
        this.emit('alert_created', alert);
      } catch (error) {
        console.error('Alert created handler error:', error);
      }
    });

    detector.on('alert_updated', async (alert: Alert) => {
      try {
        await this.storage.updateAlert(alert.id, alert);
        this.emit('alert_updated', alert);
      } catch (error) {
        console.error('Alert updated handler error:', error);
      }
    });

    detector.on('alert_resolved', async (alert: Alert) => {
      try {
        await this.storage.updateAlert(alert.id, alert);
        this.emit('alert_resolved', alert);
      } catch (error) {
        console.error('Alert resolved handler error:', error);
      }
    });
  }

  private async loadNotifiers(): Promise<void> {
    const configs = await this.storage.getNotifierConfigs();

    for (const config of configs) {
      const notifier = this.createNotifier(config);
      if (notifier) {
        this.notifiers.set(config.id, notifier);
        this.setupNotifierEvents(notifier);
      }
    }
  }

  private async initializeNotifiers(): Promise<void> {
    for (const notifier of this.notifiers.values()) {
      if (notifier.isEnabled()) {
        try {
          await notifier.initialize();
        } catch (error) {
          console.error(`Failed to initialize notifier ${notifier.getId()}:`, error);
        }
      }
    }
  }

  private createNotifier(config: NotifierConfig): NotifierBase | null {
    switch (config.type) {
      case 'telegram':
        return new TelegramNotifier(config);
      case 'bark':
        return new BarkNotifier(config);
      case 'serverchan':
        return new ServerChanNotifier(config);
      default:
        return null;
    }
  }

  private setupNotifierEvents(notifier: NotifierBase): void {
    notifier.on('notification_sent', (log: NotificationLog) => {
      this.storage.recordNotificationLog(log).catch((error) => {
        console.error('Record notification log error:', error);
      });
      this.emit('notification_sent', log);
    });

    notifier.on('notification_failed', (log: NotificationLog) => {
      this.storage.recordNotificationLog(log).catch((error) => {
        console.error('Record notification log error:', error);
      });
      this.emit('notification_failed', log);
    });
  }

  private startDetectionLoop(): void {
    const interval = this.config.getDetectionInterval() * 1000;

    this.detectionTimer = setInterval(() => {
      this.runDetectionCycle().catch((error) => {
        console.error('Detection cycle error:', error);
      });
    }, interval);
  }

  private startCleanupLoop(): void {
    this.cleanupTimer = setInterval(() => {
      this.storage.cleanupOldData().catch((error) => {
        console.error('Cleanup error:', error);
      });
    }, 24 * 60 * 60 * 1000);
  }

  private startAISyncLoop(): void {
    this.updateAISystemContext().catch((err) => {
      console.error('[AI] Initial context update error:', err);
    });

    setInterval(() => {
      this.updateAISystemContext().catch((err) => {
        console.error('[AI] Context update error:', err);
      });
    }, 5 * 60 * 1000);
  }

  private async updateAISystemContext(): Promise<void> {
    if (!this.aiAgent || !this.aiAgent.isInitialized()) {
      return;
    }

    const states = await this.getAllCurrentStates();
    const deviceCount = states.length;

    const typeCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    let onlineCount = 0;
    const rooms = new Set<string>();

    for (const state of states) {
      const domain = state.entityId.split('.')[0] || 'unknown';
      typeCounts[domain] = (typeCounts[domain] || 0) + 1;

      const src = state.source || 'unknown';
      sourceCounts[src] = (sourceCounts[src] || 0) + 1;

      const stateLower = String(state.state || '').toLowerCase();
      if (stateLower !== 'unavailable' && stateLower !== 'unknown' && stateLower !== 'offline') {
        onlineCount++;
      }

      if (state.attributes?.roomName) {
        rooms.add(state.attributes.roomName);
      }
    }

    const activeResult = await this.storage.getAlerts({ status: 'active' });
    const newResult = await this.storage.getAlerts({ status: 'new' });

    const summary = [
      `系统状态更新时间: ${new Date().toISOString()}`,
      `设备总数: ${deviceCount}台`,
      `在线设备: ${onlineCount}台`,
      `数据源: ${Object.entries(sourceCounts).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      `设备类型分布: ${Object.entries(typeCounts).slice(0, 8).map(([k, v]) => `${k}=${v}`).join(', ')}`,
      `房间数: ${rooms.size}个`,
      `活跃告警: ${activeResult.alerts.length}条`,
      `新告警: ${newResult.alerts.length}条`,
    ].join('\n');

    this.aiAgent.clearSystemContext();
    this.aiAgent.addSystemContext(summary);
  }

  private async runDetectionCycle(): Promise<void> {
    const states = await this.getAllCurrentStates();
    const events: CollectedEvent[] = [];
    const context = this.buildDetectionContext(states);

    for (const detector of this.detectors.values()) {
      if (!detector.isEnabled()) {
        continue;
      }

      try {
        await detector.run(states, events, context);
      } catch (error) {
        console.error(`Detector ${detector.getRule().id} error:`, error);
      }
    }
  }

  private async getAllCurrentStates(): Promise<EntityState[]> {
    const stateMap = await this.storage.getLatestStates();
    return Array.from(stateMap.values());
  }

  private buildDetectionContext(states: EntityState[]): {
    awayMode: boolean;
    nightMode: boolean;
  } {
    let awayMode = false;
    let nightMode = false;

    const awayEntity = states.find((s) => s.entityId === 'input_boolean.away_mode');
    if (awayEntity) {
      awayMode = awayEntity.state === 'on' || awayEntity.state === 'true';
    }

    const hour = new Date().getHours();
    nightMode = hour >= 22 || hour < 6;

    return { awayMode, nightMode };
  }

  private async handleCollectedEvent(event: CollectedEvent): Promise<void> {
    await this.storage.storeCollectedEvent(event);
    this.emit('event_collected', event);
  }

  private async handleStateChange(state: EntityState): Promise<void> {
    await this.storage.storeEntityState(state);
    this.emit('state_changed', state);
  }

  private async dispatchAlertNotification(alert: Alert): Promise<void> {
    const message: NotificationMessage = {
      id: `msg_${alert.id}`,
      title: alert.title,
      message: alert.description,
      severity: alert.severity,
      alertId: alert.id,
      format: 'html',
      buttons: [
        {
          text: '确认告警',
          action: `acknowledge:${alert.id}`,
        },
        {
          text: '查看详情',
          action: `view:${alert.id}`,
          data: { url: '#' },
        },
      ],
    };

    for (const notifier of this.notifiers.values()) {
      if (!notifier.isEnabled()) {
        continue;
      }

      try {
        await notifier.notify(message);
      } catch (error) {
        console.error(`Notifier ${notifier.getConfig().id} error:`, error);
      }
    }
  }

  public addCollector(config: CollectorConfig): void {
    const existing = this.collectors.get(config.id);
    if (existing) {
      existing.stop().catch(() => {});
    }

    const collector = this.createCollector(config);
    if (collector) {
      this.collectors.set(config.id, collector);
      this.setupCollectorEvents(collector);
      this.storage.saveCollectorConfig(config).catch(() => {});

      if (this.started && config.enabled) {
        collector.start().catch((error) => {
          console.error(`Failed to start collector ${config.id}:`, error);
        });
      }
    }
  }

  public removeCollector(id: string): boolean {
    const collector = this.collectors.get(id);
    if (!collector) {
      return false;
    }

    collector.stop().catch(() => {});
    this.collectors.delete(id);
    return true;
  }

  public getCollector(id: string): BaseCollector | undefined {
    return this.collectors.get(id);
  }

  public getCollectors(): BaseCollector[] {
    return Array.from(this.collectors.values());
  }

  public addDetector(rule: DetectionRule): void {
    const existing = this.detectors.get(rule.id);
    if (existing) {
      this.detectors.delete(rule.id);
    }

    const detector = this.createDetector(rule);
    if (detector) {
      this.detectors.set(rule.id, detector);
      this.setupDetectorEvents(detector);
      this.storage.saveRule(rule).catch(() => {});
    }
  }

  public removeDetector(ruleId: string): boolean {
    const detector = this.detectors.get(ruleId);
    if (!detector) {
      return false;
    }

    this.detectors.delete(ruleId);
    this.storage.deleteRule(ruleId).catch(() => {});
    return true;
  }

  public getDetector(ruleId: string): BaseDetector | undefined {
    return this.detectors.get(ruleId);
  }

  public getDetectors(): BaseDetector[] {
    return Array.from(this.detectors.values());
  }

  public addNotifier(config: NotifierConfig): void {
    const existing = this.notifiers.get(config.id);
    if (existing) {
      existing.cleanup().catch(() => {});
      this.notifiers.delete(config.id);
    }

    const notifier = this.createNotifier(config);
    if (notifier) {
      this.notifiers.set(config.id, notifier);
      this.setupNotifierEvents(notifier);
      this.storage.saveNotifierConfig(config).catch(() => {});

      if (this.started && config.enabled) {
        notifier.initialize().catch((error) => {
          console.error(`Failed to initialize notifier ${config.id}:`, error);
        });
      }
    }
  }

  public removeNotifier(id: string): boolean {
    const notifier = this.notifiers.get(id);
    if (!notifier) {
      return false;
    }

    notifier.cleanup().catch(() => {});
    this.notifiers.delete(id);
    return true;
  }

  public getNotifier(id: string): NotifierBase | undefined {
    return this.notifiers.get(id);
  }

  public getNotifiers(): NotifierBase[] {
    return Array.from(this.notifiers.values());
  }

  public async runDetection(ruleIds?: string[]): Promise<DetectionScan> {
    return this.runDetectionScan(ruleIds);
  }

  public async runDetectionScan(ruleIds?: string[]): Promise<DetectionScan> {
    const scan: DetectionScan = {
      id: `scan_${Date.now()}`,
      status: 'running',
      ruleIds: ruleIds || Array.from(this.detectors.keys()),
      startTime: new Date(),
    };

    await this.storage.createScan(scan);

    const states = await this.getAllCurrentStates();
    const events: CollectedEvent[] = [];
    const context = this.buildDetectionContext(states);

    for (const ruleId of scan.ruleIds) {
      const detector = this.detectors.get(ruleId);
      if (detector && detector.isEnabled()) {
        try {
          await detector.run(states, events, context);
        } catch (error) {
          console.error(`Scan detector ${ruleId} error:`, error);
        }
      }
    }

    scan.status = 'completed';
    scan.endTime = new Date();
    await this.storage.updateScan(scan.id, scan);

    return scan;
  }

  public async getAlerts(filters?: {
    status?: string;
    severity?: string;
    ruleId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: Alert[]; total: number }> {
    return this.storage.getAlerts(filters);
  }

  public async getAlert(alertId: string): Promise<Alert | null> {
    return this.storage.getAlert(alertId);
  }

  public async acknowledgeAlert(alertId: string, acknowledgedBy?: string): Promise<boolean> {
    const alert = await this.storage.getAlert(alertId);
    if (!alert) {
      return false;
    }

    for (const detector of this.detectors.values()) {
      if (detector.getAlert(alertId)) {
        detector.acknowledgeAlert(alertId);
        return true;
      }
    }

    await this.storage.updateAlert(alertId, {
      acknowledged: true,
      acknowledgedAt: new Date(),
      acknowledgedBy,
      status: AlertStatus.Acknowledged,
    });

    this.emit('alert_acknowledged', alertId, acknowledgedBy);
    return true;
  }

  public async closeAlert(alertId: string, resolution: string, resolutionType?: string): Promise<boolean> {
    const alert = await this.storage.getAlert(alertId);
    if (!alert) {
      return false;
    }

    for (const detector of this.detectors.values()) {
      if (detector.getAlert(alertId)) {
        detector.resolveAlert(alertId, resolution, resolutionType || 'manual');
        return true;
      }
    }

    await this.storage.updateAlert(alertId, {
      status: AlertStatus.Closed,
      resolvedAt: new Date(),
      resolution,
      resolutionType: resolutionType || 'manual',
    });

    this.emit('alert_closed', alertId, resolution);
    return true;
  }

  public setDetectionInterval(seconds: number): void {
    const intervalSeconds = Math.max(60, seconds);
    this.config.update({ detectionIntervalSeconds: intervalSeconds });

    if (this.detectionTimer) {
      clearInterval(this.detectionTimer);
      this.detectionTimer = null;
    }

    if (this.started) {
      this.startDetectionLoop();
    }
  }

  public setLogRetentionDays(days: number): void {
    const retentionDays = Math.max(1, days);
    this.config.update({ logRetentionDays: retentionDays });
    this.storage.setLogRetentionDays(retentionDays);
  }

  public async controlDevice(
    entityId: string,
    action: string,
    params?: Record<string, any>,
  ): Promise<{ success: boolean; error?: string; result?: any }> {
    if (entityId.startsWith('knx.device.')) {
      const deviceUuid = entityId.replace('knx.device.', '');
      for (const collector of this.collectors.values()) {
        if (collector.getConfig().type !== DataSourceType.KnxGateway || !collector.getConfig().enabled) {
          continue;
        }
        try {
          const success = await (collector as KnxCollector).controlDevice(deviceUuid, action, params);
          return success
            ? { success: true }
            : { success: false, error: 'KNX 设备控制失败' };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { success: false, error: message };
        }
      }
      return { success: false, error: '未找到可用的 KNX 采集器' };
    }

    const haCollector = Array.from(this.collectors.values()).find(
      (c) => c.getConfig().type === DataSourceType.HomeAssistant && c.getConfig().enabled,
    ) as HACollector | undefined;

    if (!haCollector) {
      return { success: false, error: '未找到可用的 Home Assistant 采集器' };
    }

    const [domain] = entityId.split('.');
    if (!domain) {
      return { success: false, error: '无效的设备实体 ID' };
    }

    try {
      const result = await haCollector.callService(domain, action, {
        entity_id: entityId,
        ...(params || {}),
      });
      return { success: true, result };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }

  public async getScenes(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      type: string;
      enabled: boolean;
      source: string;
    }>
  > {
    const scenes: Array<{
      id: string;
      name: string;
      description: string;
      type: string;
      enabled: boolean;
      source: string;
    }> = [];

    for (const collector of this.collectors.values()) {
      if (collector.getConfig().type !== DataSourceType.KnxGateway || !collector.getConfig().enabled) {
        continue;
      }

      const knxScenes = (collector as KnxCollector).getScenes();
      for (const scene of knxScenes) {
        scenes.push({
          id: scene.uuid,
          name: scene.name,
          description: 'KNX 场景',
          type: 'knx-scene',
          enabled: scene.enabled !== false,
          source: collector.getConfig().id,
        });
      }
    }

    const templates = this.getAutomationTemplates();
    for (const [index, template] of templates.entries()) {
      scenes.push({
        id: `template_${index}`,
        name: template.name || `场景 ${index + 1}`,
        description: template.description || '自动化模板',
        type: 'automation-template',
        enabled: index < 4,
        source: 'builtin',
      });
    }

    return scenes;
  }

  public async activateScene(
    sceneIdOrName: string,
  ): Promise<{ success: boolean; message: string }> {
    for (const collector of this.collectors.values()) {
      if (collector.getConfig().type !== DataSourceType.KnxGateway || !collector.getConfig().enabled) {
        continue;
      }

      const knxCollector = collector as KnxCollector;
      const scene = knxCollector
        .getScenes()
        .find((item) => item.uuid === sceneIdOrName || item.name === sceneIdOrName);

      if (scene) {
        const success = await knxCollector.executeScene(scene.uuid);
        return {
          success,
          message: success ? `场景「${scene.name}」已激活` : `场景「${scene.name}」激活失败`,
        };
      }
    }

    const haCollector = Array.from(this.collectors.values()).find(
      (c) => c.getConfig().type === DataSourceType.HomeAssistant && c.getConfig().enabled,
    ) as HACollector | undefined;

    if (haCollector) {
      const states = await this.getEntityStates();
      const sceneEntity = Array.from(states.values()).find((state) => {
        const name = state.attributes?.friendly_name || state.entityId;
        return (
          state.entityId.startsWith('scene.') &&
          (state.entityId === sceneIdOrName || name === sceneIdOrName)
        );
      });

      if (sceneEntity) {
        try {
          await haCollector.callService('scene', 'turn_on', { entity_id: sceneEntity.entityId });
          return {
            success: true,
            message: `场景「${sceneEntity.attributes?.friendly_name || sceneEntity.entityId}」已激活`,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          return { success: false, message };
        }
      }
    }

    return { success: false, message: `未找到场景: ${sceneIdOrName}` };
  }

  public async getEntityStates(entityIds?: string[]): Promise<Map<string, EntityState>> {
    return this.storage.getLatestStates(entityIds);
  }

  public async getSystemStatus(): Promise<SystemStatus> {
    const storageStats = await this.storage.getStats();

    const collectorStatuses = Array.from(this.collectors.values()).map((c) => c.getStatus());
    const connectedCollectors = collectorStatuses.filter(
      (s) => s.status === 'connected',
    ).length;

    const activeDetectors = Array.from(this.detectors.values()).filter((d) =>
      d.isEnabled(),
    ).length;

    const activeAlerts = await this.storage.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter((a) => a.severity === SeverityLevel.Critical).length;
    const highAlerts = activeAlerts.filter((a) => a.severity === SeverityLevel.High).length;
    const mediumAlerts = activeAlerts.filter((a) => a.severity === SeverityLevel.Medium).length;
    const lowAlerts = activeAlerts.filter((a) => a.severity === SeverityLevel.Low).length;

    const overallStatus =
      criticalAlerts > 0
        ? 'unhealthy'
        : connectedCollectors < this.collectors.size
          ? 'degraded'
          : 'healthy';

    return {
      status: overallStatus as SystemStatus['status'],
      version: '0.6.1',
      uptime: this.getUptime(),
      components: {
        collectors: {
          status:
            connectedCollectors === this.collectors.size
              ? 'healthy'
              : connectedCollectors > 0
                ? 'degraded'
                : 'unhealthy',
          active: connectedCollectors,
          total: this.collectors.size,
        },
        detection: {
          status: activeDetectors > 0 ? 'healthy' : 'degraded',
          activeRules: activeDetectors,
          totalRules: this.detectors.size,
          pendingScans: 0,
        },
        notification: {
          status: this.notifiers.size > 0 ? 'healthy' : 'degraded',
          active: Array.from(this.notifiers.values()).filter((n) => n.isEnabled()).length,
          total: this.notifiers.size,
          queued: 0,
        },
        storage: {
          status: 'healthy',
          usedPercent: 0,
          databaseSize: storageStats.databaseSize,
        },
      },
      alerts: {
        active: activeAlerts.length,
        critical: criticalAlerts,
        high: highAlerts,
        medium: mediumAlerts,
        low: lowAlerts,
      },
    };
  }

  public getStatus(): Promise<SystemStatus> {
    return this.getSystemStatus();
  }

  public getConfigManager(): ConfigManager {
    return this.config;
  }

  public getStorage(): SQLiteStorage {
    return this.storage;
  }

  public getAutomationGenerator(): AutomationGenerator {
    return this.automationGenerator;
  }

  public async analyzeAutomationRequirement(description: string): Promise<RequirementAnalysis> {
    await this.refreshDeviceList();
    return this.automationGenerator.analyzeRequirement(description);
  }

  public async generateAutomation(
    requirements: RequirementAnalysis | string,
    platform: AutomationPlatform = 'homeassistant',
  ): Promise<AutomationGenerationResult> {
    await this.refreshDeviceList();
    const result = this.automationGenerator.generateAutomation(requirements, platform);

    const recommendation: AutomationRecommendation = {
      id: `rec_${Date.now()}`,
      title: (result.config as any).alias || (result.config as any).name || '生成的自动化',
      description: typeof requirements === 'string' ? requirements : requirements.rawDescription,
      type: 'enhancement',
      platform,
      format: result.format,
      code: result.format === 'yaml' ? this.configToYaml(result.config) : JSON.stringify(result.config, null, 2),
      confidence: result.validation.valid ? 0.8 : 0.5,
      estimatedEffort: 'low',
      impactScore: 0.7,
      riskLevel: 'low',
      relatedAlerts: [],
      prerequisites: [],
      alternatives: [],
      createdAt: new Date(),
    };

    await this.storage.saveRecommendation(recommendation);
    this.emit('automation_generated', result, recommendation);

    return result;
  }

  public async generateAutomationFromTemplate(
    templateId: string,
    params: Record<string, any>,
  ): Promise<AutomationGenerationResult | null> {
    await this.refreshDeviceList();
    const result = this.automationGenerator.generateFromTemplate(templateId, params);

    if (result) {
      const template = this.automationGenerator.getTemplate(templateId);
      const recommendation: AutomationRecommendation = {
        id: `rec_${Date.now()}`,
        title: template?.name || '模板自动化',
        description: template?.description || '',
        type: 'enhancement',
        platform: result.platform,
        format: result.format,
        code: result.format === 'yaml' ? this.configToYaml(result.config) : JSON.stringify(result.config, null, 2),
        confidence: result.validation.valid ? 0.9 : 0.6,
        estimatedEffort: 'low',
        impactScore: 0.75,
        riskLevel: 'low',
        relatedAlerts: [],
        prerequisites: [],
        alternatives: [],
        createdAt: new Date(),
      };

      await this.storage.saveRecommendation(recommendation);
      this.emit('automation_generated', result, recommendation);
    }

    return result;
  }

  public validateAutomation(
    config: any,
    platform: AutomationPlatform,
  ): AutomationValidationResult {
    return this.automationGenerator.validateAutomation(config, platform);
  }

  public async applyAutomation(
    config: any,
    platform: AutomationPlatform,
    options?: {
      apiUrl?: string;
      token?: string;
      verifyOnly?: boolean;
    },
  ): Promise<{
    success: boolean;
    applied: boolean;
    platformEntityId?: string;
    warnings: string[];
    errors: string[];
  }> {
    const result = await this.automationGenerator.applyAutomation(config, platform, options);

    if (result.applied && result.platformEntityId) {
      this.emit('automation_applied', result.platformEntityId, platform);
    }

    return result;
  }

  public async suggestAutomationImprovements(alerts: Alert[]): Promise<AutomationSuggestion[]> {
    await this.refreshDeviceList();
    const suggestions = this.automationGenerator.suggestImprovements(alerts);

    for (const suggestion of suggestions) {
      const template = this.automationGenerator.getTemplate(suggestion.templateId);
      if (template) {
        const recommendation: AutomationRecommendation = {
          id: `rec_${suggestion.id}`,
          title: suggestion.title,
          description: suggestion.description,
          type: 'remediation',
          platform: suggestion.platform,
          format: suggestion.platform === 'homeassistant' ? 'yaml' : 'json',
          code: '',
          confidence: suggestion.confidence,
          estimatedEffort: suggestion.riskLevel === 'low' ? 'low' : suggestion.riskLevel === 'medium' ? 'medium' : 'high',
          impactScore: suggestion.estimatedImpact,
          riskLevel: suggestion.riskLevel,
          relatedAlerts: suggestion.relatedAlerts,
          prerequisites: template.requiredDevices,
          alternatives: [],
          createdAt: new Date(),
        };
        await this.storage.saveRecommendation(recommendation);
      }
    }

    this.emit('automation_suggestions', suggestions);
    return suggestions;
  }

  public getAutomationTemplates(category?: AutomationType, platform?: AutomationPlatform): SceneTemplate[] {
    return this.automationGenerator.getTemplates(category, platform);
  }

  public getAutomationTemplate(templateId: string): SceneTemplate | undefined {
    return this.automationGenerator.getTemplate(templateId);
  }

  public async getAvailableDevices(): Promise<DeviceInfo[]> {
    await this.refreshDeviceList();
    return this.automationGenerator.discoverDevices();
  }

  private async refreshDeviceList(): Promise<void> {
    const states = await this.storage.getLatestStates();
    const devices: DeviceInfo[] = Array.from(states.values()).map((state) => {
      const domain = state.entityId.split('.')[0];
      return {
        entityId: state.entityId,
        name: state.attributes.friendly_name || state.entityId,
        domain,
        state: state.state,
        attributes: state.attributes,
        area: state.attributes.area_name,
        source: state.source,
      };
    });
    this.automationGenerator.setDevices(devices);
  }

  private configToYaml(config: any): string {
    if (config.trigger && config.action) {
      const { HAAutomationBuilder } = require('./automation/ha-automation-builder');
      return HAAutomationBuilder.fromConfig(config).toYaml();
    }
    return JSON.stringify(config, null, 2);
  }

  public async getTrends(timeRange: TimeRange = 'week', customStart?: Date, customEnd?: Date): Promise<TrendAnalysisResult> {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (timeRange) {
      case 'day':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'custom':
        startDate = customStart || now;
        endDate = customEnd || now;
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    }

    const { alerts: alertList } = await this.storage.getAlerts({
      startTime: startDate,
      endTime: endDate,
      limit: 10000,
    });

    const statesMap = await this.storage.getLatestStates();
    const states = Array.from(statesMap.values());

    const events = await this.storage.getEvents(startDate, endDate, undefined, undefined, 10000);

    const result = this.trendAnalyzer.analyzeTrends(
      alertList,
      states,
      events,
      timeRange,
      startDate,
      endDate,
    );

    this.emit('trends_generated', result);
    return result;
  }

  public async getSecurityScore(): Promise<SecurityScore> {
    const trends = await this.getTrends('week');
    return trends.securityScore;
  }

  public async generateReport(
    period: ReportPeriod = 'weekly',
    format: ReportFormat = 'markdown',
  ): Promise<SecurityReport> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(startDate.getDate() - 7);
    }

    const trends = await this.getTrends(period === 'weekly' ? 'week' : 'month');

    const { alerts: alertList } = await this.storage.getAlerts({
      startTime: startDate,
      endTime: now,
      limit: 10000,
    });

    const report = this.reportGenerator.generateReport(trends, period, format, alertList);

    this.emit('report_generated', report);
    return report;
  }

  public getTrendAnalyzer(): TrendAnalyzer {
    return this.trendAnalyzer;
  }

  public getReportGenerator(): ReportGenerator {
    return this.reportGenerator;
  }
}

export * from './types';
export { ConfigManager } from './config';
export { SQLiteStorage } from './storage/sqlite-storage';
export { HACollector } from './collectors/ha-collector';
export { NodeRedCollector } from './collectors/nodered-collector';
export { KnxCollector } from './collectors/knx-collector';
export { MatterCollector } from './collectors/matter-collector';
export { BaseCollector } from './collectors/base-collector';
export { BaseDetector, DetectionContext } from './detectors/base-detector';
export { AwayModeDetector } from './detectors/away-mode-detector';
export { DeviceFaultDetector } from './detectors/device-fault-detector';
export { EnergyDetector } from './detectors/energy-detector';
export { DoorAccessDetector } from './detectors/door-access-detector';
export { NotifierBase } from './notifier/notifier-base';
export { TelegramNotifier } from './notifier/telegram-notifier';
export { BarkNotifier } from './notifier/bark-notifier';
export { ServerChanNotifier } from './notifier/serverchan-notifier';
export { AutomationGenerator } from './automation/generator';
export { HAAutomationBuilder } from './automation/ha-automation-builder';
export { KNXSceneBuilder, KNXWorkflowBuilder } from './automation/knx-scene-builder';
export { TrendAnalyzer } from './analytics/trend-analyzer';
export { ReportGenerator } from './analytics/report-generator';
export { AIAgent } from './ai/agent';
export { OpenRouterClient } from './ai/openrouter-client';
export { toolDefinitions, executeTool } from './ai/tools';
export {
  sceneTemplates,
  getAllTemplates,
  getTemplatesByCategory,
  getTemplatesByPlatform,
  getTemplateById,
} from './automation/templates';

export default SecurityButler;
