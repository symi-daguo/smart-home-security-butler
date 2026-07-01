export enum SeverityLevel {
  Info = 0,
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

export type SeverityLevelString = 'info' | 'low' | 'medium' | 'high' | 'critical';

export enum CollectorStatus {
  Disconnected = 'disconnected',
  Connecting = 'connecting',
  Connected = 'connected',
  Error = 'error',
}

export enum AlertStatus {
  New = 'new',
  Active = 'active',
  Acknowledged = 'acknowledged',
  Silenced = 'silenced',
  Resolved = 'resolved',
  Closed = 'closed',
}

export enum DetectionCategory {
  AwayMode = 'away-mode',
  DeviceFault = 'device-fault',
  EnergyAnomaly = 'energy-anomaly',
  DoorAccess = 'door-access',
  Environmental = 'environmental',
  SecuritySystem = 'security-system',
}

export enum DataSourceType {
  HomeAssistant = 'homeassistant',
  NodeRed = 'nodered',
  KnxGateway = 'knx-gateway',
  Knxd = 'knxd',
  Matter = 'matter',
  MQTT = 'mqtt',
}

export interface CollectorConfig {
  id: string;
  type: DataSourceType;
  baseUrl: string;
  auth?: CollectorAuth;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface CollectorAuth {
  type: 'bearer' | 'basic' | 'none';
  token?: string;
  username?: string;
  password?: string;
}

export interface CollectorStatusInfo {
  id: string;
  type: DataSourceType;
  status: CollectorStatus;
  uptime: number;
  connectedAt?: Date;
  lastMessageAt?: Date;
  messageCount: number;
  errorCount: number;
  metrics?: Record<string, any>;
}

export interface EntityState {
  entityId: string;
  state: string;
  attributes: Record<string, any>;
  lastChanged: Date;
  lastUpdated: Date;
  source: DataSourceType;
  sourceId: string;
}

export interface CollectedEvent {
  id: string;
  timestamp: Date;
  source: DataSourceType;
  sourceId: string;
  eventType: string;
  entityId?: string;
  data: Record<string, any>;
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  category: DetectionCategory;
  severity: SeverityLevel;
  enabled: boolean;
  config: Record<string, any>;
  schedule?: DetectionSchedule;
  notification: NotificationConfig;
  actions?: DetectionAction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface DetectionSchedule {
  type: 'continuous' | 'interval' | 'cron';
  value?: string;
  intervalSeconds?: number;
}

export interface NotificationConfig {
  enabled: boolean;
  channels: string[];
  throttle?: ThrottleConfig;
}

export interface ThrottleConfig {
  maxPerHour: number;
  cooldownSeconds: number;
}

export interface DetectionAction {
  type: 'notify' | 'automation' | 'webhook';
  config: Record<string, any>;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName?: string;
  severity: SeverityLevel;
  category: DetectionCategory;
  title: string;
  description: string;
  entityId?: string;
  source: DataSourceType;
  sourceId: string;
  status: AlertStatus;
  acknowledged: boolean;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  silencedUntil?: Date;
  firstDetectedAt: Date;
  lastDetectedAt: Date;
  detectionCount: number;
  resolvedAt?: Date;
  resolution?: string;
  resolutionType?: string;
  data: Record<string, any>;
}

export interface DetectionResult {
  ruleId: string;
  alerts: Alert[];
  scannedEntities: number;
  durationMs: number;
  errors: string[];
}

export interface DetectionScan {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  ruleIds: string[];
  startTime: Date;
  endTime?: Date;
  timeRange?: {
    start: Date;
    end: Date;
  };
  results?: DetectionResult[];
  error?: string;
}

export interface NotifierConfig {
  id: string;
  type: string;
  enabled: boolean;
  name: string;
  config: Record<string, any>;
}

export interface NotificationMessage {
  id?: string;
  title: string;
  message: string;
  severity: SeverityLevel;
  alertId?: string;
  channel?: string;
  format?: 'text' | 'html' | 'markdown';
  attachments?: NotificationAttachment[];
  buttons?: NotificationButton[];
}

export interface NotificationAttachment {
  type: 'image' | 'file';
  url?: string;
  data?: Buffer;
  filename?: string;
  mimeType?: string;
}

export interface NotificationButton {
  text: string;
  action: string;
  data?: Record<string, any>;
}

export interface NotificationLog {
  id: string;
  channel: string;
  alertId?: string;
  messageId?: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  error?: string;
}

export interface AutomationRecommendation {
  id: string;
  title: string;
  description: string;
  type: 'remediation' | 'prevention' | 'enhancement' | 'response' | 'monitoring';
  platform: DataSourceType | 'homeassistant' | 'nodered' | 'knx-gateway';
  format: string;
  code: string;
  confidence: number;
  estimatedEffort: 'low' | 'medium' | 'high';
  impactScore: number;
  riskLevel: 'low' | 'medium' | 'high';
  relatedAlerts: string[];
  prerequisites: string[];
  alternatives: string[];
  createdAt: Date;
}

export interface ApplyResult {
  success: boolean;
  applied: boolean;
  platformEntityId?: string;
  backupCreated?: string;
  warnings: string[];
  errors: string[];
}

export interface BaselineData {
  entityId: string;
  metric: string;
  period: string;
  mean: number;
  stdDev: number;
  min: number;
  max: number;
  samples: number;
  lastUpdated: Date;
}

export interface SystemStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
  components: {
    collectors: ComponentStatus;
    detection: ComponentStatus;
    notification: ComponentStatus;
    storage: ComponentStatus;
  };
  alerts: {
    active: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ComponentStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  [key: string]: any;
}

export type AutomationPlatform = 'homeassistant' | 'knx-gateway';

export type AutomationType = 'scene' | 'security' | 'energy' | 'notification';

export type TriggerType =
  | 'state'
  | 'time'
  | 'sun'
  | 'event'
  | 'zone'
  | 'numeric_state'
  | 'device_event'
  | 'cron'
  | 'sun_event'
  | 'manual'
  | 'webhook';

export type ConditionType = 'state' | 'time' | 'numeric_state' | 'and' | 'or' | 'not';

export type ActionType = 'service' | 'scene' | 'delay' | 'choose' | 'device_control' | 'scene_exec' | 'condition' | 'transform';

export interface AutomationTrigger {
  platform: TriggerType;
  [key: string]: any;
}

export interface AutomationCondition {
  condition: ConditionType;
  [key: string]: any;
}

export interface AutomationAction {
  [key: string]: any;
}

export interface HAAutomationConfig {
  id: string;
  alias: string;
  description?: string;
  trigger: AutomationTrigger[];
  condition: AutomationCondition[];
  action: AutomationAction[];
  mode?: 'single' | 'restart' | 'queued' | 'parallel';
  max_exceeded?: string;
  [key: string]: any;
}

export interface KnxSceneConfig {
  id: string;
  name: string;
  description?: string;
  devices: KnxSceneDevice[];
}

export interface KnxSceneDevice {
  deviceId: string;
  function: string;
  value: any;
}

export interface KnxWorkflowConfig {
  id: string;
  name: string;
  description?: string;
  trigger: KnxWorkflowTrigger;
  nodes: KnxWorkflowNode[];
  edges: KnxWorkflowEdge[];
}

export interface KnxWorkflowTrigger {
  type: TriggerType;
  config: Record<string, any>;
}

export interface KnxWorkflowNode {
  id: string;
  type: ActionType;
  name: string;
  config: Record<string, any>;
  position?: { x: number; y: number };
}

export interface KnxWorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface RequirementAnalysis {
  rawDescription: string;
  automationType: AutomationType;
  platform: AutomationPlatform;
  devices: string[];
  triggers: AutomationTrigger[];
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  confidence: number;
  entities: string[];
  parameters: Record<string, any>;
}

export interface DeviceInfo {
  entityId: string;
  name: string;
  domain: string;
  state: string;
  attributes: Record<string, any>;
  area?: string;
  source: DataSourceType;
}

export interface AutomationGenerationResult {
  success: boolean;
  config: HAAutomationConfig | KnxWorkflowConfig | KnxSceneConfig;
  format: 'yaml' | 'json';
  platform: AutomationPlatform;
  validation: AutomationValidationResult;
  warnings: string[];
  errors: string[];
}

export interface AutomationValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingEntities: string[];
  conflicts: string[];
}

export interface SceneTemplate {
  id: string;
  name: string;
  description: string;
  category: AutomationType;
  platform: AutomationPlatform[];
  requiredDevices: string[];
  parameters: SceneTemplateParameter[];
  generate: (params: Record<string, any>, devices: DeviceInfo[]) => AutomationGenerationResult;
}

export interface SceneTemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'time' | 'entity' | 'select';
  label: string;
  description?: string;
  required: boolean;
  default?: any;
  options?: { label: string; value: any }[];
}

export interface AutomationSuggestion {
  id: string;
  title: string;
  description: string;
  type: AutomationType;
  platform: AutomationPlatform;
  templateId: string;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  relatedAlerts: string[];
  estimatedImpact: number;
}

export interface AutomationGenerationHistory {
  id: string;
  description: string;
  platform: AutomationPlatform;
  type: AutomationType;
  config: string;
  format: 'yaml' | 'json';
  applied: boolean;
  createdAt: Date;
  appliedAt?: Date;
}

export interface SecurityButlerConfig {
  logRetentionDays: number;
  detectionIntervalSeconds: number;
  baselineLearningDays: number;
  maxNotificationsPerHour: number;
  dataDirectory: string;
  collectors: CollectorConfig[];
  notifiers: NotifierConfig[];
}

export type TimeRange = 'day' | 'week' | 'month' | 'year' | 'custom';

export type ReportPeriod = 'weekly' | 'monthly';

export type ReportFormat = 'text' | 'markdown';

export interface AlertTrendDataPoint {
  timestamp: Date;
  count: number;
}

export interface AlertCategoryBreakdown {
  category: DetectionCategory;
  count: number;
  percentage: number;
}

export interface AlertSeverityBreakdown {
  severity: SeverityLevel;
  count: number;
  percentage: number;
}

export interface TopAlertDevice {
  entityId: string;
  entityName?: string;
  count: number;
  category: DetectionCategory;
  lastAlertAt: Date;
}

export interface HourlyAlertDistribution {
  hour: number;
  count: number;
}

export interface AlertTrends {
  daily: AlertTrendDataPoint[];
  weekly: AlertTrendDataPoint[];
  monthly: AlertTrendDataPoint[];
  byCategory: AlertCategoryBreakdown[];
  bySeverity: AlertSeverityBreakdown[];
  topDevices: TopAlertDevice[];
  hourlyDistribution: HourlyAlertDistribution[];
  totalAlerts: number;
  resolvedAlerts: number;
  activeAlerts: number;
  resolutionRate: number;
  averageResponseTimeMinutes?: number;
}

export interface DeviceOnlineRatePoint {
  timestamp: Date;
  onlineRate: number;
  totalDevices: number;
  onlineDevices: number;
}

export interface DeviceFaultTrend {
  timestamp: Date;
  faultCount: number;
  faultDevices: string[];
}

export interface DeviceStateChangeFrequency {
  entityId: string;
  entityName?: string;
  changeCount: number;
  frequencyPerHour: number;
}

export interface DeviceTrends {
  onlineRate: DeviceOnlineRatePoint[];
  currentOnlineRate: number;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: string[];
  faultTrend: DeviceFaultTrend[];
  stateChangeFrequency: DeviceStateChangeFrequency[];
  highFrequencyDevices: DeviceStateChangeFrequency[];
}

export interface EnergyDataPoint {
  timestamp: Date;
  consumption: number;
  cost?: number;
}

export interface EnergyComparison {
  currentPeriod: number;
  previousPeriod: number;
  changePercent: number;
  changeAbsolute: number;
}

export interface PeakHour {
  hour: number;
  consumption: number;
  percentage: number;
}

export interface EnergyTrends {
  daily: EnergyDataPoint[];
  weekly: EnergyDataPoint[];
  monthly: EnergyDataPoint[];
  totalConsumption: number;
  dailyAverage: number;
  weekOverWeek: EnergyComparison;
  monthOverMonth: EnergyComparison;
  peakHours: PeakHour[];
  topConsumers: { entityId: string; consumption: number; percentage: number }[];
  hasEnergyData: boolean;
}

export interface SecurityDimensionScore {
  name: string;
  score: number;
  weight: number;
  description: string;
  factors: string[];
  recommendations: string[];
}

export interface SecurityScore {
  overall: number;
  grade: string;
  dimensions: SecurityDimensionScore[];
  calculatedAt: Date;
  previousScore?: number;
  change: number;
  trend: 'improving' | 'declining' | 'stable';
  strengths: string[];
  weaknesses: string[];
}

export interface TrendAnalysisResult {
  timeRange: TimeRange;
  startDate: Date;
  endDate: Date;
  alerts: AlertTrends;
  devices: DeviceTrends;
  energy: EnergyTrends;
  securityScore: SecurityScore;
}

export interface SecurityReport {
  period: ReportPeriod;
  format: ReportFormat;
  generatedAt: Date;
  startDate: Date;
  endDate: Date;
  summary: {
    totalAlerts: number;
    resolvedAlerts: number;
    resolutionRate: number;
    criticalAlerts: number;
    highAlerts: number;
    securityScore: number;
    previousScore: number;
    scoreChange: number;
  };
  alertTrends: AlertTrends;
  topRisks: TopRiskItem[];
  deviceHealth: DeviceHealthSummary;
  automationSuggestions: string[];
  recommendations: string[];
  content: string;
}

export interface TopRiskItem {
  rank: number;
  title: string;
  description: string;
  severity: SeverityLevel;
  category: DetectionCategory;
  occurrenceCount: number;
  firstOccurredAt: Date;
  lastOccurredAt: Date;
  affectedEntities: string[];
  recommendation: string;
}

export interface DeviceHealthSummary {
  totalDevices: number;
  healthyDevices: number;
  warningDevices: number;
  criticalDevices: number;
  onlineRate: number;
  lowBatteryDevices: string[];
  offlineDevices: string[];
  highFrequencyDevices: string[];
  healthScore: number;
}

export interface OpenRouterConfig {
  apiKey: string;
  baseModel: string;
  fallbackModel?: string;
  baseUrl?: string;
  siteUrl?: string;
  appTitle?: string;
  maxRetries?: number;
  initialRetryDelay?: number;
  timeout?: number;
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export type ChatRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface ChatCompletionOptions {
  stream?: boolean;
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AgentMemory {
  shortTerm: ChatMessage[];
  longTerm: string[];
  systemContext: string[];
  maxShortTermMessages: number;
  maxContextTokens: number;
}

export interface AgentConfig {
  openrouter: OpenRouterConfig;
  memory?: {
    maxShortTermMessages?: number;
    maxContextTokens?: number;
  };
  systemPrompt?: string;
}

export interface AgentStatus {
  initialized: boolean;
  model: string;
  totalTokensUsed: number;
  messageCount: number;
  memory: {
    shortTermCount: number;
    longTermCount: number;
    systemContextCount: number;
  };
}
