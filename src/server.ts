import { SecurityButler, TelegramNotifier, BarkNotifier, ServerChanNotifier } from './index';
import { DataSourceType, SeverityLevel, DetectionCategory, CollectorStatus, CollectorConfig, NotifierConfig, NotificationMessage } from './types';
import {
  DEFAULT_KNXD_ENV_CONFIG,
  getKnxdContainerName,
  getKnxdEnvPath,
  getKnxdHealthStatus,
  getKnxdHost,
  getKnxdPort,
  KnxdEnvConfig,
  readKnxdEnv,
  writeKnxdEnv,
} from './knx/knxd-env';
import { parseKnxprojBuffer } from './knx/knxproj-parser';
import { fetchKnxdLogs } from './knx/knxd-logs';
import { listManagedContainers, restartContainer } from './casaos/docker-control';
import { createBackupArchive, restoreBackupArchive } from './system/backup';
import * as crypto from 'crypto';
import * as http from 'http';
import * as fs from 'fs';
import * as pathModule from 'path';
import * as os from 'os';

const PORT = parseInt(process.env.PORT || '3000', 10);
const startTime = Date.now();
const butler = new SecurityButler();

const PUBLIC_DIR = pathModule.join(__dirname, '..', 'public');
const DATA_DIR = process.env.DATA_DIR || pathModule.join(__dirname, '..', 'data');
const SETTINGS_FILE = pathModule.join(DATA_DIR, 'settings.json');
const KNX_PROJECTS_DIR = pathModule.join(DATA_DIR, 'knx-projects');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

interface AppSettings {
  collectors: Array<{
    id: string;
    type: string;
    name: string;
    baseUrl: string;
    token: string;
    enabled: boolean;
  }>;
  ai: {
    provider: string;
    apiKey: string;
    model: string;
    fallbackModel: string;
  };
  notifications: {
    telegram: {
      enabled: boolean;
      botToken: string;
      chatId: string;
    };
    bark: {
      enabled: boolean;
      deviceKey: string;
      baseUrl: string;
      sound: string;
      icon: string;
      group: string;
    };
    serverchan: {
      enabled: boolean;
      sendKey: string;
      channel: string;
      openid: string;
    };
  };
  system: {
    detectionInterval: number;
    logRetentionDays: number;
    theme: string;
    maintenanceMode: boolean;
  };
}

const defaultSettings: AppSettings = {
  collectors: [
    {
      id: 'homeassistant',
      type: 'homeassistant',
      name: 'Home Assistant',
      baseUrl: 'http://172.17.0.1:8123',
      token: '',
      enabled: true,
    },
    {
      id: 'node-red',
      type: 'nodered',
      name: 'Node-RED',
      baseUrl: 'http://172.17.0.1:1880',
      token: '',
      enabled: true,
    },
    {
      id: 'matter-hub',
      type: 'matter',
      name: 'Matter Hub',
      baseUrl: 'http://172.17.0.1:5580',
      token: '',
      enabled: false,
    },
    {
      id: 'knxd',
      type: 'knxd',
      name: 'knxd 本机',
      baseUrl: '127.0.0.1:3671',
      token: '',
      enabled: true,
    },
    {
      id: 'knx-gateway',
      type: 'knx-gateway',
      name: 'KNX 网关 1',
      baseUrl: '',
      token: '',
      enabled: false,
    },
    {
      id: 'knx-gateway-2',
      type: 'knx-gateway',
      name: 'KNX 网关 2',
      baseUrl: '',
      token: '',
      enabled: false,
    },
  ],
  ai: {
    provider: 'openrouter',
    apiKey: '',
    model: 'nvidia/nemotron-3-super-120b-a12b:free',
    fallbackModel: 'openrouter/free',
  },
  notifications: {
    telegram: {
      enabled: false,
      botToken: '',
      chatId: '',
    },
    bark: {
      enabled: false,
      deviceKey: '',
      baseUrl: 'https://api.day.app',
      sound: 'minuet',
      icon: '',
      group: '',
    },
    serverchan: {
      enabled: false,
      sendKey: '',
      channel: '',
      openid: '',
    },
  },
  system: {
    detectionInterval: 300,
    logRetentionDays: 30,
    theme: 'dark',
    maintenanceMode: false,
  },
};

function loadSettings(): AppSettings {
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const content = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      const saved = JSON.parse(content);
      return {
        ...defaultSettings,
        ...saved,
        collectors: saved.collectors || defaultSettings.collectors,
        ai: { ...defaultSettings.ai, ...(saved.ai || {}) },
        notifications: {
          telegram: { ...defaultSettings.notifications.telegram, ...(saved.notifications?.telegram || {}) },
          bark: { ...defaultSettings.notifications.bark, ...(saved.notifications?.bark || {}) },
          serverchan: { ...defaultSettings.notifications.serverchan, ...(saved.notifications?.serverchan || {}) },
        },
        system: { ...defaultSettings.system, ...(saved.system || {}) },
      };
    }
  } catch (error) {
    console.error('[Settings] Failed to load settings:', error);
  }
  return { ...defaultSettings };
}

function saveSettings(settings: AppSettings): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (error) {
    console.error('[Settings] Failed to save settings:', error);
  }
}

let appSettings = loadSettings();

function mapSecurityScoreDetails(score: any): Record<string, number> {
  const details: Record<string, number> = {};
  for (const dimension of score?.dimensions || []) {
    if (dimension.name.includes('设备')) details.device = dimension.score;
    else if (dimension.name.includes('门禁')) details.door = dimension.score;
    else if (dimension.name.includes('能耗')) details.energy = dimension.score;
    else if (dimension.name.includes('离家')) details.away = dimension.score;
    else if (dimension.name.includes('自动化')) details.automation = dimension.score;
  }
  return details;
}

function buildCollectorConfig(collector: AppSettings['collectors'][number]): CollectorConfig | null {
  const typeMap: Record<string, DataSourceType> = {
    homeassistant: DataSourceType.HomeAssistant,
    nodered: DataSourceType.NodeRed,
    'knx-gateway': DataSourceType.KnxGateway,
    knxd: DataSourceType.Knxd,
    matter: DataSourceType.Matter,
  };

  const type = typeMap[collector.type];
  if (!type) {
    return null;
  }

  const auth: CollectorConfig['auth'] = collector.token
    ? { type: 'bearer', token: collector.token }
    : { type: 'none' };

  const config: CollectorConfig = {
    id: collector.id,
    type,
    baseUrl: collector.baseUrl,
    enabled: collector.enabled,
    auth,
    config:
      type === DataSourceType.HomeAssistant
        ? {
            pollInterval: 300000,
            useWebSocket: false,
            includeDomains: [
              'sensor',
              'binary_sensor',
              'switch',
              'light',
              'climate',
              'cover',
              'lock',
              'group',
              'input_boolean',
              'scene',
            ],
          }
        : type === DataSourceType.NodeRed
          ? {
              collectInterval: 300000,
              captureErrors: true,
            }
          : type === DataSourceType.Knxd
            ? {
                collectInterval: 60000,
                envPath: getKnxdEnvPath(),
                host: getKnxdHost(),
                port: getKnxdPort(),
                containerName: getKnxdContainerName(),
              }
            : {
              collectInterval: 300000,
              monitorDevices: true,
              monitorScenes: true,
              monitorAutomations: true,
            },
  };

  return config;
}

async function applySettings(settings: AppSettings): Promise<void> {
  if (settings.ai.apiKey) {
    butler.setAIConfig({
      openrouter: {
        apiKey: settings.ai.apiKey,
        baseModel: settings.ai.model,
        fallbackModel: settings.ai.fallbackModel,
        siteUrl: 'https://local-smart-home.local',
        appTitle: 'Smart Home Security Butler',
        maxRetries: 2,
        timeout: 30000,
      },
    });
  }

  for (const collector of settings.collectors) {
    if (!collector.enabled) {
      butler.removeCollector(collector.id);
      continue;
    }

    if (collector.type !== 'knxd' && !collector.baseUrl) {
      butler.removeCollector(collector.id);
      continue;
    }

    const requiresToken =
      collector.type === 'homeassistant' || collector.type === 'knx-gateway';
    if (requiresToken && !collector.token) {
      butler.removeCollector(collector.id);
      continue;
    }

    const config = buildCollectorConfig(collector);
    if (config) {
      butler.addCollector(config);
    }
  }

  if (
    settings.notifications.telegram.enabled &&
    settings.notifications.telegram.botToken &&
    settings.notifications.telegram.chatId
  ) {
    butler.addNotifier({
      id: 'telegram',
      type: 'telegram',
      name: 'Telegram',
      enabled: true,
      config: {
        botToken: settings.notifications.telegram.botToken,
        chatId: settings.notifications.telegram.chatId,
        parseMode: 'HTML',
      },
    });
  } else {
    butler.removeNotifier('telegram');
  }

  if (
    settings.notifications.bark.enabled &&
    settings.notifications.bark.deviceKey
  ) {
    const barkConfig: Record<string, any> = {
      deviceKey: settings.notifications.bark.deviceKey,
    };
    if (settings.notifications.bark.baseUrl) {
      barkConfig.baseUrl = settings.notifications.bark.baseUrl;
    }
    if (settings.notifications.bark.sound) {
      barkConfig.sound = settings.notifications.bark.sound;
    }
    if (settings.notifications.bark.icon) {
      barkConfig.icon = settings.notifications.bark.icon;
    }
    if (settings.notifications.bark.group) {
      barkConfig.group = settings.notifications.bark.group;
    }

    butler.addNotifier({
      id: 'bark',
      type: 'bark',
      name: 'Bark',
      enabled: true,
      config: barkConfig,
    });
  } else {
    butler.removeNotifier('bark');
  }

  if (
    settings.notifications.serverchan.enabled &&
    settings.notifications.serverchan.sendKey
  ) {
    const serverchanConfig: Record<string, any> = {
      sendKey: settings.notifications.serverchan.sendKey,
    };
    if (settings.notifications.serverchan.channel) {
      serverchanConfig.channel = parseInt(settings.notifications.serverchan.channel, 10);
    }
    if (settings.notifications.serverchan.openid) {
      serverchanConfig.openid = settings.notifications.serverchan.openid;
    }

    butler.addNotifier({
      id: 'serverchan',
      type: 'serverchan',
      name: 'Server酱',
      enabled: true,
      config: serverchanConfig,
    });
  } else {
    butler.removeNotifier('serverchan');
  }

  butler.setDetectionInterval(settings.system.detectionInterval);
  butler.setLogRetentionDays(settings.system.logRetentionDays);
  butler.setMaintenanceMode(!!settings.system.maintenanceMode);
}

async function testAIConnection(
  apiKey: string,
  model: string,
): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://local-smart-home.local',
        'X-Title': 'Smart Home Security Butler',
      },
      body: JSON.stringify({
        model: model || 'openrouter/free',
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 8,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response.ok) {
      return { success: true, message: 'AI 连接成功', latency };
    }

    const errorBody = await response.text();
    return { success: false, message: `AI 连接失败: HTTP ${response.status} ${errorBody}`, latency };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'AI 连接失败',
      latency: Date.now() - startTime,
    };
  }
}

function serveStaticFile(req: http.IncomingMessage, res: http.ServerResponse, filePath: string): boolean {
  const ext = pathModule.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  if (!fs.existsSync(filePath)) {
    return false;
  }

  const stat = fs.statSync(filePath);
  if (stat.isDirectory()) {
    return false;
  }

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Length', stat.size);
  res.statusCode = 200;
  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function setupFromEnv() {
  const openrouterApiKey = process.env.OPENROUTER_API_KEY || appSettings.ai.apiKey;
  const openrouterModel = process.env.OPENROUTER_MODEL || appSettings.ai.model;
  const openrouterFallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || appSettings.ai.fallbackModel;

  if (openrouterApiKey) {
    butler.setAIConfig({
      openrouter: {
        apiKey: openrouterApiKey,
        baseModel: openrouterModel,
        fallbackModel: openrouterFallbackModel,
        siteUrl: 'https://local-smart-home.local',
        appTitle: 'Smart Home Security Butler',
        maxRetries: 2,
        timeout: 30000,
      },
    });
    console.log('[Setup] AI configured with OpenRouter');
    appSettings.ai.apiKey = openrouterApiKey;
    appSettings.ai.model = openrouterModel;
    appSettings.ai.fallbackModel = openrouterFallbackModel;
  }

  const haBaseUrl = process.env.HA_BASE_URL || appSettings.collectors.find(c => c.id === 'homeassistant')?.baseUrl;
  const haToken = process.env.HA_TOKEN || appSettings.collectors.find(c => c.id === 'homeassistant')?.token;
  if (haBaseUrl && haToken) {
    butler.addCollector({
      id: 'homeassistant',
      type: DataSourceType.HomeAssistant,
      baseUrl: haBaseUrl,
      enabled: true,
      auth: {
        type: 'bearer',
        token: haToken,
      },
      config: {
        pollInterval: 300000,
        useWebSocket: false,
        includeDomains: ['sensor', 'binary_sensor', 'switch', 'light', 'climate', 'cover', 'lock', 'group', 'input_boolean'],
      },
    });
    console.log('[Setup] Home Assistant collector added');
    const ha = appSettings.collectors.find(c => c.id === 'homeassistant');
    if (ha) {
      ha.baseUrl = haBaseUrl;
      ha.token = haToken;
      ha.enabled = true;
    }
  }

  const nrBaseUrl = process.env.NODERED_BASE_URL || appSettings.collectors.find(c => c.id === 'node-red')?.baseUrl;
  const nrToken = process.env.NODERED_TOKEN || appSettings.collectors.find(c => c.id === 'node-red')?.token;
  if (nrBaseUrl) {
    const authConfig: any = { type: 'none' };
    if (nrToken) {
      authConfig.type = 'bearer';
      authConfig.token = nrToken;
    }
    butler.addCollector({
      id: 'node-red',
      type: DataSourceType.NodeRed,
      baseUrl: nrBaseUrl,
      enabled: true,
      auth: authConfig,
      config: {
        collectInterval: 300000,
        captureErrors: true,
      },
    });
    console.log('[Setup] Node-RED collector added');
    const nr = appSettings.collectors.find(c => c.id === 'node-red');
    if (nr) {
      nr.baseUrl = nrBaseUrl;
      nr.token = nrToken || '';
      nr.enabled = true;
    }
  }

  const knxBaseUrl = process.env.KNX_BASE_URL || appSettings.collectors.find(c => c.id === 'knx-gateway')?.baseUrl;
  const knxToken = process.env.KNX_TOKEN || appSettings.collectors.find(c => c.id === 'knx-gateway')?.token;
  if (knxBaseUrl && knxToken) {
    butler.addCollector({
      id: 'knx-gateway',
      type: DataSourceType.KnxGateway,
      baseUrl: knxBaseUrl,
      enabled: true,
      auth: {
        type: 'bearer',
        token: knxToken,
      },
      config: {
        collectInterval: 300000,
        monitorDevices: true,
        monitorScenes: true,
        monitorAutomations: true,
      },
    });
    console.log('[Setup] KNX Gateway collector added');
    const knx = appSettings.collectors.find(c => c.id === 'knx-gateway');
    if (knx) {
      knx.baseUrl = knxBaseUrl;
      knx.token = knxToken;
      knx.enabled = true;
    }
  }

  const knx2BaseUrl = process.env.KNX2_BASE_URL || appSettings.collectors.find(c => c.id === 'knx-gateway-2')?.baseUrl;
  const knx2Token = process.env.KNX2_TOKEN || appSettings.collectors.find(c => c.id === 'knx-gateway-2')?.token;
  if (knx2BaseUrl && knx2Token) {
    butler.addCollector({
      id: 'knx-gateway-2',
      type: DataSourceType.KnxGateway,
      baseUrl: knx2BaseUrl,
      enabled: true,
      auth: {
        type: 'bearer',
        token: knx2Token,
      },
      config: {
        collectInterval: 300000,
        monitorDevices: true,
        monitorScenes: true,
        monitorAutomations: true,
      },
    });
    console.log('[Setup] KNX Gateway 2 collector added');
    const knx2 = appSettings.collectors.find(c => c.id === 'knx-gateway-2');
    if (knx2) {
      knx2.baseUrl = knx2BaseUrl;
      knx2.token = knx2Token;
      knx2.enabled = true;
    }
  }

  const knxdEnabled = process.env.KNXD_COLLECTOR_ENABLED !== 'false';
  if (knxdEnabled) {
    butler.addCollector({
      id: 'knxd',
      type: DataSourceType.Knxd,
      baseUrl: `${getKnxdHost()}:${getKnxdPort()}`,
      enabled: true,
      auth: { type: 'none' },
      config: {
        collectInterval: 60000,
        envPath: getKnxdEnvPath(),
        host: getKnxdHost(),
        port: getKnxdPort(),
        containerName: getKnxdContainerName(),
      },
    });
    console.log('[Setup] knxd collector added');
    const knxd = appSettings.collectors.find((c) => c.id === 'knxd');
    if (knxd) {
      knxd.baseUrl = `${getKnxdHost()}:${getKnxdPort()}`;
      knxd.enabled = true;
    }
  }

  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || appSettings.notifications.telegram.botToken;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID || appSettings.notifications.telegram.chatId;
  if (telegramBotToken && telegramChatId) {
    butler.addNotifier({
      id: 'telegram',
      type: 'telegram',
      name: 'Telegram',
      enabled: true,
      config: {
        botToken: telegramBotToken,
        chatId: telegramChatId,
        parseMode: 'HTML',
      },
    });
    console.log('[Setup] Telegram notifier added');
    appSettings.notifications.telegram.enabled = true;
    appSettings.notifications.telegram.botToken = telegramBotToken;
    appSettings.notifications.telegram.chatId = telegramChatId;
  }

  const barkDeviceKey = process.env.BARK_DEVICE_KEY || appSettings.notifications.bark.deviceKey;
  const barkBaseUrl = process.env.BARK_BASE_URL || appSettings.notifications.bark.baseUrl;
  if (barkDeviceKey) {
    const barkConfig: Record<string, any> = {
      deviceKey: barkDeviceKey,
    };
    if (barkBaseUrl) {
      barkConfig.baseUrl = barkBaseUrl;
    }
    butler.addNotifier({
      id: 'bark',
      type: 'bark',
      name: 'Bark',
      enabled: true,
      config: barkConfig,
    });
    console.log('[Setup] Bark notifier added');
    appSettings.notifications.bark.enabled = true;
    appSettings.notifications.bark.deviceKey = barkDeviceKey;
    if (barkBaseUrl) {
      appSettings.notifications.bark.baseUrl = barkBaseUrl;
    }
  }

  const serverchanSendKey = process.env.SERVERCHAN_SEND_KEY || appSettings.notifications.serverchan.sendKey;
  if (serverchanSendKey) {
    butler.addNotifier({
      id: 'serverchan',
      type: 'serverchan',
      name: 'Server酱',
      enabled: true,
      config: {
        sendKey: serverchanSendKey,
      },
    });
    console.log('[Setup] ServerChan notifier added');
    appSettings.notifications.serverchan.enabled = true;
    appSettings.notifications.serverchan.sendKey = serverchanSendKey;
  }

  const now = new Date();

  butler.addDetector({
    id: 'away-mode',
    name: '离家模式异常检测',
    category: DetectionCategory.AwayMode,
    severity: SeverityLevel.High,
    enabled: true,
    description: '检测离家模式下不应开启的设备',
    config: {
      awayModeEntity: 'input_boolean.away_mode',
      monitoredDomains: ['light', 'switch', 'climate', 'media_player', 'fan'],
      minAwayDuration: 300000,
    },
    notification: {
      enabled: true,
      channels: ['telegram'],
      throttle: {
        maxPerHour: 10,
        cooldownSeconds: 1800,
      },
    },
    createdAt: now,
    updatedAt: now,
  });
  console.log('[Setup] Away mode detector added');

  butler.addDetector({
    id: 'device-fault',
    name: '设备故障检测',
    category: DetectionCategory.DeviceFault,
    severity: SeverityLevel.Medium,
    enabled: true,
    description: '检测离线、不可用的设备',
    config: {
      offlineTimeout: 600000,
      unavailableTimeout: 300000,
    },
    notification: {
      enabled: true,
      channels: ['telegram'],
      throttle: {
        maxPerHour: 5,
        cooldownSeconds: 3600,
      },
    },
    createdAt: now,
    updatedAt: now,
  });
  console.log('[Setup] Device fault detector added');

  butler.addDetector({
    id: 'door-access',
    name: '门禁异常检测',
    category: DetectionCategory.DoorAccess,
    severity: SeverityLevel.Critical,
    enabled: true,
    description: '检测门禁、门窗的异常开启',
    config: {
      quietHoursStart: '22:00',
      quietHoursEnd: '06:00',
      awayModeEntity: 'input_boolean.away_mode',
      doorSensors: ['binary_sensor.*door*', 'binary_sensor.*entry*'],
      windowSensors: ['binary_sensor.*window*'],
      lockSensors: ['lock.*'],
      doorOpenTimeoutMinutes: 30,
      windowOpenTimeoutMinutes: 60,
    },
    notification: {
      enabled: true,
      channels: ['telegram'],
      throttle: {
        maxPerHour: 20,
        cooldownSeconds: 600,
      },
    },
    createdAt: now,
    updatedAt: now,
  });
  console.log('[Setup] Door access detector added');

  butler.addDetector({
    id: 'energy',
    name: '能耗异常检测',
    category: DetectionCategory.EnergyAnomaly,
    severity: SeverityLevel.Low,
    enabled: true,
    description: '检测异常能耗',
    config: {
      spikeThreshold: 2.0,
      baselineDays: 7,
    },
    notification: {
      enabled: true,
      channels: ['telegram'],
      throttle: {
        maxPerHour: 2,
        cooldownSeconds: 3600,
      },
    },
    createdAt: now,
    updatedAt: now,
  });
  console.log('[Setup] Energy detector added');

  saveSettings(appSettings);
}

async function applySettingsAfterBoot(): Promise<void> {
  try {
    await applySettings(appSettings);
  } catch (error) {
    console.error('[Setup] Failed to apply persisted settings:', error);
  }
}

function parseBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function syncKnxGatewayConfigSnapshot(): Promise<void> {
  try {
    const health = await getKnxdHealthStatus();
    const config = health.config || DEFAULT_KNXD_ENV_CONFIG;
    const storage = butler.getStorage();
    if (!storage.isInitialized()) {
      return;
    }
    await storage.upsertKnxGatewayConfig({
      individualAddr: config.address,
      clientAddress: config.clientAddress,
      interfaceType: config.interface,
      devicePath: config.device,
      gatewayName: config.gatewayName,
      debugErrorLevel: config.debugErrorLevel,
      envPath: health.envPath,
      host: health.host,
      port: health.port,
      containerName: health.containerName,
      portOpen: health.portOpen,
      containerStatus: health.containerStatus,
    });
  } catch (error) {
    console.error('[KNX] Failed to sync knxd config snapshot:', error);
  }
}

function ensureKnxProjectsDir(): void {
  if (!fs.existsSync(KNX_PROJECTS_DIR)) {
    fs.mkdirSync(KNX_PROJECTS_DIR, { recursive: true });
  }
}

function getDbSize(): number {
  try {
    const dbPath = pathModule.join(DATA_DIR, 'security-butler.db');
    if (fs.existsSync(dbPath)) {
      return fs.statSync(dbPath).size;
    }
  } catch {}
  return 0;
}

function getSystemInfo(): {
  cpuUsage: number;
  memoryTotal: number;
  memoryUsed: number;
  memoryUsage: number;
  diskTotal: number;
  diskUsed: number;
  diskUsage: number;
  loadAverage: number[];
  uptime: number;
  hostname: string;
  platform: string;
  arch: string;
  cpuCores: number;
} {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  let diskTotal = 0;
  let diskUsed = 0;
  try {
    const statfs = (fs as any).statfsSync;
    if (statfs) {
      const stat = statfs(DATA_DIR);
      diskTotal = stat.blocks * stat.bsize;
      diskUsed = (stat.blocks - stat.bfree) * stat.bsize;
    }
  } catch {}

  const loadAvg = os.loadavg();

  return {
    cpuUsage: Math.min(100, Math.round(loadAvg[0] * 100 / os.cpus().length * 10) / 10),
    memoryTotal: totalMem,
    memoryUsed: usedMem,
    memoryUsage: Math.round((usedMem / totalMem) * 1000) / 10,
    diskTotal,
    diskUsed,
    diskUsage: diskTotal > 0 ? Math.round((diskUsed / diskTotal) * 1000) / 10 : 0,
    loadAverage: loadAvg,
    uptime: os.uptime(),
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    cpuCores: os.cpus().length,
  };
}

async function getChatSessionCount(): Promise<number> {
  try {
    const storage = (butler as any).storage;
    if (storage && storage.getChatSessions) {
      const sessions = await storage.getChatSessions();
      return sessions.length;
    }
  } catch {}
  return 0;
}

async function testCollectorConnection(type: string, baseUrl: string, token: string): Promise<{ success: boolean; message: string; latency?: number }> {
  const startTime = Date.now();
  try {
    let url = baseUrl;
    let headers: Record<string, string> = {};

    if (type === 'homeassistant') {
      url = `${baseUrl.replace(/\/$/, '')}/api/`;
      headers['Authorization'] = `Bearer ${token}`;
    } else if (type === 'knx-gateway') {
      url = `${baseUrl.replace(/\/$/, '')}/api/devices`;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else if (type === 'nodered') {
      url = `${baseUrl.replace(/\/$/, '')}/settings`;
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    } else if (type === 'matter') {
      url = baseUrl;
    } else {
      return { success: false, message: '未知的采集器类型' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response.ok) {
      return { success: true, message: '连接成功', latency };
    } else {
      return { success: false, message: `连接失败: HTTP ${response.status}`, latency };
    }
  } catch (error: any) {
    const latency = Date.now() - startTime;
    return { success: false, message: error.message || '连接失败', latency };
  }
}

function computeEntityMetrics(states: Iterable<any>): {
  entityCount: number;
  domainCount: number;
  unavailableCount: number;
  unknownCount: number;
  reportingCount: number;
} {
  const domains = new Set<string>();
  let unavailableCount = 0;
  let unknownCount = 0;
  let entityCount = 0;

  for (const s of states) {
    entityCount++;
    const entityId = s.entityId || s.entity_id || '';
    const domain = entityId.split('.')[0];
    if (domain) domains.add(domain);
    const state = String(s.state || '').toLowerCase();
    if (state === 'unavailable') unavailableCount++;
    else if (state === 'unknown') unknownCount++;
  }

  return {
    entityCount,
    domainCount: domains.size,
    unavailableCount,
    unknownCount,
    reportingCount: entityCount - unavailableCount - unknownCount,
  };
}

function extractRoomsFromDevices(devices: any[]): Array<{ id: string; name: string; deviceCount: number; onlineCount: number; offlineCount: number }> {
  const roomMap = new Map<string, { id: string; name: string; devices: Set<string>; online: Set<string> }>();

  for (const device of devices) {
    const area = device.attributes?.area_name || device.attributes?.room || '未分类';
    const areaId = area.toLowerCase().replace(/\s+/g, '-');

    if (!roomMap.has(areaId)) {
      roomMap.set(areaId, {
        id: areaId,
        name: area,
        devices: new Set(),
        online: new Set(),
      });
    }

    const room = roomMap.get(areaId)!;
    room.devices.add(device.id || device.entity_id);

    const state = device.state?.toLowerCase();
    if (state && state !== 'unavailable' && state !== 'unknown' && state !== 'offline') {
      room.online.add(device.id || device.entity_id);
    }
  }

  return Array.from(roomMap.values()).map(r => ({
    id: r.id,
    name: r.name,
    deviceCount: r.devices.size,
    onlineCount: r.online.size,
    offlineCount: r.devices.size - r.online.size,
  })).sort((a, b) => b.deviceCount - a.deviceCount);
}

async function handleApiRequest(req: http.IncomingMessage, res: http.ServerResponse, url: URL, reqPath: string, method: string): Promise<boolean> {
  res.setHeader('Content-Type', 'application/json');

  try {
    if (reqPath === '/api/health' && method === 'GET') {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      res.statusCode = 200;
      res.end(JSON.stringify({
        status: 'healthy',
        uptime,
        version: '0.7.0',
        timestamp: new Date().toISOString(),
      }));
      return true;
    }

    if (reqPath === '/api/status' && method === 'GET') {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      const states = await butler.getEntityStates();
      const alertsResult = await butler.getAlerts({ limit: 100 });
      const chatCount = await getChatSessionCount();
      const score = await butler.getSecurityScore().catch(() => null);
      const scoreDetails = score ? mapSecurityScoreDetails(score) : {
        device: 0,
        door: 0,
        energy: 0,
        away: 0,
      };

      const activeAlerts = (alertsResult?.alerts || []).filter((a: any) =>
        a.status === 'new' || a.status === 'active'
      ).length;

      const collectors = butler.getCollectors();
      const collectorStatuses = collectors.map(c => {
        const config = c.getConfig();
        const statusInfo = c.getStatus();
        return {
          id: config.id,
          type: config.type,
          name: config.type === 'homeassistant' ? 'Home Assistant' :
                config.type === 'nodered' ? 'Node-RED' :
                config.type === 'knxd' ? 'knxd 本机' :
                config.type === 'knx-gateway' ? 'KNX 网关' : config.type,
          enabled: config.enabled,
          status: statusInfo.status || CollectorStatus.Disconnected,
        };
      });

      const sysInfo = getSystemInfo();
      const scenes = await butler.getScenes();
      const entityMetrics = computeEntityMetrics(states.values());
      const connectedCollectors = collectorStatuses.filter((c) => c.status === 'connected').length;

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        data: {
          status: butler.isStarted() ? 'running' : 'starting',
          uptime,
          deviceCount: states.size,
          activeAlerts,
          automationCount: scenes.filter((scene) => scene.type !== 'knx-scene').length,
          sceneCount: scenes.filter((scene) => scene.type === 'knx-scene').length,
          chatSessionCount: chatCount,
          securityScore: score?.overall ?? 0,
          scoreDetails,
          dbSize: getDbSize(),
          version: '0.7.0',
          collectors: collectorStatuses,
          entityMetrics,
          system: sysInfo,
          gateway: {
            hostname: sysInfo.hostname,
            platform: `${sysInfo.platform}/${sysInfo.arch}`,
            cpuCores: sysInfo.cpuCores,
            cpuUsage: sysInfo.cpuUsage,
            memoryUsage: sysInfo.memoryUsage,
            deviceCount: states.size,
            connectedCollectors,
            collectorCount: collectorStatuses.length,
            hostUptime: sysInfo.uptime,
          },
        },
      }));
      return true;
    }

    if (reqPath === '/api/settings' && method === 'GET') {
      const settings = loadSettings();
      const sanitized = JSON.parse(JSON.stringify(settings));
      for (const collector of sanitized.collectors) {
        if (collector.token) {
          collector.token = '***' + collector.token.slice(-4);
        }
      }
      if (sanitized.ai.apiKey) {
        sanitized.ai.apiKey = '***' + sanitized.ai.apiKey.slice(-4);
      }
      if (sanitized.notifications?.telegram?.botToken) {
        sanitized.notifications.telegram.botToken = '***' + sanitized.notifications.telegram.botToken.slice(-4);
      }
      if (sanitized.notifications?.bark?.deviceKey) {
        sanitized.notifications.bark.deviceKey = '***' + sanitized.notifications.bark.deviceKey.slice(-4);
      }
      if (sanitized.notifications?.serverchan?.sendKey) {
        sanitized.notifications.serverchan.sendKey = '***' + sanitized.notifications.serverchan.sendKey.slice(-4);
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: sanitized }));
      return true;
    }

    if (reqPath === '/api/settings' && method === 'PUT') {
      const body = await parseBody(req);
      const newSettings = JSON.parse(body) as AppSettings;

      const currentSettings = loadSettings();

      for (let i = 0; i < newSettings.collectors.length; i++) {
        const newCollector = newSettings.collectors[i];
        const currentCollector = currentSettings.collectors.find(c => c.id === newCollector.id);

        if (newCollector.token && newCollector.token.startsWith('***')) {
          newCollector.token = currentCollector?.token || '';
        }
      }

      if (newSettings.ai.apiKey && newSettings.ai.apiKey.startsWith('***')) {
        newSettings.ai.apiKey = currentSettings.ai.apiKey;
      }

      if (newSettings.notifications?.telegram?.botToken && newSettings.notifications.telegram.botToken.startsWith('***')) {
        newSettings.notifications.telegram.botToken = currentSettings.notifications.telegram.botToken;
      }

      if (newSettings.notifications?.bark?.deviceKey && newSettings.notifications.bark.deviceKey.startsWith('***')) {
        newSettings.notifications.bark.deviceKey = currentSettings.notifications.bark.deviceKey;
      }

      if (newSettings.notifications?.serverchan?.sendKey && newSettings.notifications.serverchan.sendKey.startsWith('***')) {
        newSettings.notifications.serverchan.sendKey = currentSettings.notifications.serverchan.sendKey;
      }

      newSettings.notifications = {
        telegram: { ...defaultSettings.notifications.telegram, ...(newSettings.notifications?.telegram || {}) },
        bark: { ...defaultSettings.notifications.bark, ...(newSettings.notifications?.bark || {}) },
        serverchan: { ...defaultSettings.notifications.serverchan, ...(newSettings.notifications?.serverchan || {}) },
      };

      saveSettings(newSettings);
      appSettings = newSettings;

      try {
        await applySettings(newSettings);
      } catch (error: any) {
        console.error('[Settings] Failed to apply settings:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message || '设置保存成功但应用失败' }));
        return true;
      }

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: '设置已保存并立即生效' }));
      return true;
    }

    if (reqPath === '/api/notifications/test' && method === 'POST') {
      const body = await parseBody(req);
      const { channel, config } = JSON.parse(body);

      try {
        const notifierConfig: NotifierConfig = {
          id: `test-${channel}`,
          name: `Test ${channel}`,
          type: channel,
          enabled: true,
          config: config || {},
        };

        let notifier;
        switch (channel) {
          case 'telegram':
            notifier = new TelegramNotifier(notifierConfig);
            break;
          case 'bark':
            notifier = new BarkNotifier(notifierConfig);
            break;
          case 'serverchan':
            notifier = new ServerChanNotifier(notifierConfig);
            break;
          default:
            res.statusCode = 400;
            res.end(JSON.stringify({ success: false, error: `不支持的通知渠道: ${channel}` }));
            return true;
        }

        const result = await notifier.test();
        notifier.cleanup().catch(() => {});

        res.statusCode = 200;
        res.end(JSON.stringify({ success: result.success, latencyMs: result.latencyMs, error: result.error }));
      } catch (error: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message || '测试失败' }));
      }
      return true;
    }

    if (reqPath === '/api/ai/test' && method === 'POST') {
      const body = await parseBody(req);
      const { apiKey, model } = JSON.parse(body);
      const currentSettings = loadSettings();
      const resolvedApiKey =
        apiKey && !apiKey.startsWith('***') ? apiKey : currentSettings.ai.apiKey;
      const resolvedModel = model || currentSettings.ai.model;

      if (!resolvedApiKey) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'API Key 未配置' }));
        return true;
      }

      const result = await testAIConnection(resolvedApiKey, resolvedModel);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: result.success, data: result, error: result.success ? undefined : result.message }));
      return true;
    }

    if (reqPath === '/api/insights' && method === 'GET') {
      const score = await butler.getSecurityScore().catch(() => null);
      const alertsResult = await butler.getAlerts({ limit: 5 });
      const alerts = (alertsResult as any)?.alerts || alertsResult || [];
      const recommendations = (score?.dimensions || [])
        .flatMap((dimension: any) => dimension.recommendations || [])
        .filter(Boolean)
        .slice(0, 3);

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        data: {
          securityScore: score?.overall ?? 0,
          grade: score?.grade ?? 'N/A',
          strengths: score?.strengths || [],
          weaknesses: score?.weaknesses || [],
          recommendations,
          recentAlerts: alerts.slice(0, 3).map((alert: any) => ({
            title: alert.title || alert.ruleName || '安全告警',
            severity: alert.severity || 'medium',
            timestamp: alert.timestamp || alert.createdAt,
          })),
        },
      }));
      return true;
    }

    if (reqPath === '/api/knxd/status' && method === 'GET') {
      const health = await getKnxdHealthStatus();
      await syncKnxGatewayConfigSnapshot();
      const dbConfig = await butler.getStorage().getKnxGatewayConfig();
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        data: {
          health,
          dbConfig,
          healthy: health.portOpen && health.containerStatus !== 'stopped',
        },
      }));
      return true;
    }

    if (reqPath === '/api/knxd/config' && method === 'GET') {
      const envPath = getKnxdEnvPath();
      const config = readKnxdEnv(envPath) || { ...DEFAULT_KNXD_ENV_CONFIG };
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        data: {
          envPath,
          envExists: fs.existsSync(envPath),
          config,
        },
      }));
      return true;
    }

    if (reqPath === '/api/knxd/config' && method === 'PUT') {
      const body = await parseBody(req);
      const payload = JSON.parse(body) as Partial<KnxdEnvConfig>;
      const envPath = getKnxdEnvPath();
      const current = readKnxdEnv(envPath) || { ...DEFAULT_KNXD_ENV_CONFIG };
      const nextConfig: KnxdEnvConfig = {
        address: payload.address ?? current.address,
        clientAddress: payload.clientAddress ?? current.clientAddress,
        interface: payload.interface ?? current.interface,
        device: payload.device ?? current.device,
        gatewayName: payload.gatewayName ?? current.gatewayName,
        debugErrorLevel: payload.debugErrorLevel ?? current.debugErrorLevel,
      };

      writeKnxdEnv(nextConfig, envPath);
      await syncKnxGatewayConfigSnapshot();

      const knxdCollector = butler.getCollector('knxd');
      if (knxdCollector) {
        await knxdCollector.collect().catch(() => undefined);
      }

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        data: {
          config: nextConfig,
          envPath,
          restartRequired: true,
          message: '配置已保存，请在 CasaOS 重启「KNX 网关」应用使 knxd 生效。',
        },
      }));
      return true;
    }

    if (reqPath === '/api/knxd/logs' && method === 'GET') {
      const lines = parseInt(url.searchParams.get('lines') || '100', 10);
      const logs = await fetchKnxdLogs(Number.isFinite(lines) ? lines : 100);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: logs }));
      return true;
    }

    if (reqPath === '/api/knx/ets/projects' && method === 'GET') {
      const storage = butler.getStorage();
      const projects = await storage.listKnxEtsProjects();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: projects, total: projects.length }));
      return true;
    }

    if (reqPath === '/api/knx/ets/devices' && method === 'GET') {
      const projectId = url.searchParams.get('projectId') || '';
      if (!projectId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'projectId is required' }));
        return true;
      }
      const storage = butler.getStorage();
      const devices = await storage.listKnxEtsDevices(projectId);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: devices, total: devices.length }));
      return true;
    }

    if (reqPath === '/api/knx/ets/import' && method === 'POST') {
      const body = await parseBody(req);
      const payload = JSON.parse(body) as { filename?: string; data?: string; importAddresses?: boolean };
      if (!payload.data) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'data (base64) is required' }));
        return true;
      }

      const fileName = payload.filename || 'project.knxproj';
      if (!fileName.toLowerCase().endsWith('.knxproj')) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'only .knxproj files are supported' }));
        return true;
      }

      const buffer = Buffer.from(payload.data, 'base64');
      const parsed = parseKnxprojBuffer(buffer, fileName);
      const projectId = crypto.createHash('sha1').update(parsed.fileHash).digest('hex').slice(0, 16);

      ensureKnxProjectsDir();
      const filePath = pathModule.join(KNX_PROJECTS_DIR, `${projectId}.knxproj`);
      fs.writeFileSync(filePath, buffer);

      const storage = butler.getStorage();
      await storage.saveKnxEtsProject({
        id: projectId,
        projectName: parsed.projectName,
        etsVersion: parsed.etsVersion,
        fileName,
        fileHash: parsed.fileHash,
        filePath,
        groupAddressCount: parsed.groupAddresses.length,
        deviceCount: parsed.devices.length,
        rawMeta: { xmlFileCount: parsed.xmlFileCount },
      });
      await storage.replaceKnxEtsDevices(projectId, parsed.devices);

      let importedAddressCount = 0;
      if (payload.importAddresses !== false && parsed.groupAddresses.length > 0) {
        importedAddressCount = await storage.importKnxGroupAddresses(
          parsed.groupAddresses.map((ga) => ({
            address: ga.address,
            name: ga.name,
            dpt: ga.dpt,
            source: `ets:${projectId}`,
          })),
        );
      }

      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        data: {
          projectId,
          projectName: parsed.projectName,
          etsVersion: parsed.etsVersion,
          groupAddressCount: parsed.groupAddresses.length,
          deviceCount: parsed.devices.length,
          importedAddressCount,
          fileHash: parsed.fileHash,
        },
      }));
      return true;
    }

    if (reqPath === '/api/knx/address-book' && method === 'GET') {
      const storage = butler.getStorage();
      const source = url.searchParams.get('source') || undefined;
      let entries: Array<Record<string, unknown>>;
      if (source === 'ets-import') {
        entries = await storage.listKnxGroupAddresses(1000);
        entries = entries.filter((e) => String(e.source || '').startsWith('ets:'));
      } else {
        entries = await storage.listKnxGroupAddresses(1000, source || undefined);
      }
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: entries, total: entries.length }));
      return true;
    }

    if (reqPath === '/api/knx/address-book' && method === 'POST') {
      const body = await parseBody(req);
      const payload = JSON.parse(body) as { address: string; name?: string; dpt?: string; inUse?: boolean };
      if (!payload.address) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'address is required' }));
        return true;
      }
      const storage = butler.getStorage();
      const id = await storage.createKnxGroupAddress({
        address: payload.address,
        name: payload.name,
        dpt: payload.dpt,
        source: 'manual',
        inUse: payload.inUse,
      });
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: { id } }));
      return true;
    }

    if (reqPath.startsWith('/api/knx/address-book/') && method === 'PUT') {
      const id = parseInt(reqPath.split('/')[4], 10);
      const body = await parseBody(req);
      const payload = JSON.parse(body) as { address?: string; name?: string; dpt?: string; inUse?: boolean };
      const storage = butler.getStorage();
      const updated = await storage.updateKnxGroupAddress(id, payload);
      res.statusCode = updated ? 200 : 404;
      res.end(JSON.stringify({ success: updated }));
      return true;
    }

    if (reqPath.startsWith('/api/knx/address-book/') && method === 'DELETE') {
      const id = parseInt(reqPath.split('/')[4], 10);
      const storage = butler.getStorage();
      const deleted = await storage.deleteKnxGroupAddress(id);
      res.statusCode = deleted ? 200 : 404;
      res.end(JSON.stringify({ success: deleted }));
      return true;
    }

    if (reqPath === '/api/knx/address-book/import-from-project' && method === 'POST') {
      const body = await parseBody(req);
      const payload = JSON.parse(body) as { projectId: string };
      if (!payload.projectId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'projectId is required' }));
        return true;
      }
      const storage = butler.getStorage();
      const project = await storage.getKnxEtsProject(payload.projectId);
      if (!project) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'project not found' }));
        return true;
      }
      const filePath = project.filePath as string;
      if (!filePath || !fs.existsSync(filePath)) {
        res.statusCode = 404;
        res.end(JSON.stringify({ success: false, error: 'project file missing on disk' }));
        return true;
      }
      const parsed = parseKnxprojBuffer(fs.readFileSync(filePath), project.fileName as string);
      const imported = await storage.importKnxGroupAddresses(
        parsed.groupAddresses.map((ga) => ({
          address: ga.address,
          name: ga.name,
          dpt: ga.dpt,
          source: `ets:${payload.projectId}`,
        })),
      );
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: { imported } }));
      return true;
    }

    if (reqPath === '/api/collectors' && method === 'GET') {
      const collectors = butler.getCollectors();
      const result = collectors.map(c => {
        const config = c.getConfig();
        const statusInfo = c.getStatus();
        return {
          id: config.id,
          type: config.type,
          name: config.type === 'homeassistant' ? 'Home Assistant' :
                config.type === 'nodered' ? 'Node-RED' :
                config.type === 'knxd' ? 'knxd 本机' :
                config.type === 'knx-gateway' ? 'KNX 网关' : config.type,
          baseUrl: config.baseUrl,
          enabled: config.enabled,
          status: statusInfo.status || CollectorStatus.Disconnected,
        };
      });

      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: result, total: result.length }));
      return true;
    }

    if (reqPath === '/api/collectors/test' && method === 'POST') {
      const body = await parseBody(req);
      const { type, baseUrl, token } = JSON.parse(body);
      const result = await testCollectorConnection(type, baseUrl, token);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: result.success, data: result }));
      return true;
    }

    if (reqPath === '/api/rooms' && method === 'GET') {
      const states = await butler.getEntityStates();
      const devices = Array.from(states.values()).map((s: any) => ({
        id: s.entityId,
        entity_id: s.entityId,
        state: s.state,
        attributes: s.attributes || {},
        source: s.source,
      }));
      const rooms = extractRoomsFromDevices(devices);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: rooms, total: rooms.length }));
      return true;
    }

    if (reqPath === '/api/scenes' && method === 'GET') {
      const scenes = await butler.getScenes();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: scenes, total: scenes.length }));
      return true;
    }

    if (reqPath === '/api/scenes/activate' && method === 'POST') {
      const body = await parseBody(req);
      const { id, name } = JSON.parse(body);
      const sceneKey = id || name;
      if (!sceneKey) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'id or name is required' }));
        return true;
      }

      const result = await butler.activateScene(sceneKey);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: result.success, data: result }));
      return true;
    }

    if (reqPath === '/api/alerts' && method === 'GET') {
      const limit = parseInt(url.searchParams.get('limit') || '50', 10);
      const result = await butler.getAlerts({ limit });
      const alerts = (result as any)?.alerts || result || [];
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        data: alerts.map((a: any) => ({
          id: a.id || a._id || Math.random().toString(36).slice(2),
          title: a.title || a.ruleName || '安全告警',
          description: a.description || a.message || '',
          severity: a.severity || 'medium',
          status: a.status || 'new',
          timestamp: a.timestamp || a.createdAt || new Date().toISOString(),
          device: a.deviceId || a.entityId,
        })),
        total: alerts.length,
      }));
      return true;
    }

    if (reqPath.startsWith('/api/alerts/') && reqPath.endsWith('/acknowledge') && method === 'POST') {
      const alertId = reqPath.split('/')[3];
      const success = await butler.acknowledgeAlert(alertId, 'web');
      res.statusCode = 200;
      res.end(JSON.stringify({ success: !!success }));
      return true;
    }

    if (reqPath.startsWith('/api/alerts/') && reqPath.endsWith('/close') && method === 'POST') {
      const alertId = reqPath.split('/')[3];
      const success = await butler.closeAlert(alertId, 'manual');
      res.statusCode = 200;
      res.end(JSON.stringify({ success: !!success }));
      return true;
    }

    if (reqPath === '/api/devices/control' && method === 'POST') {
      const body = await parseBody(req);
      const { entityId, action, params } = JSON.parse(body);
      if (!entityId || !action) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'entityId and action are required' }));
        return true;
      }

      const result = await butler.controlDevice(entityId, action, params);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: result.success, data: result, error: result.error }));
      return true;
    }

    if (reqPath === '/api/devices' && method === 'GET') {
      const states = await butler.getEntityStates();
      const devices = Array.from(states.values()).map((s: any) => ({
        id: s.entityId,
        entity_id: s.entityId,
        state: s.state,
        name: s.attributes?.friendly_name || s.entityId,
        attributes: s.attributes || {},
        last_updated: s.lastUpdated,
        source: s.source,
      }));
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        data: devices,
        total: devices.length,
      }));
      return true;
    }

    if (reqPath === '/api/detect' && method === 'POST') {
      const result = await butler.runDetection();
      res.statusCode = 200;
      res.end(JSON.stringify({
        success: true,
        data: result,
      }));
      return true;
    }

    if (reqPath === '/api/ai/test' && method === 'GET') {
      try {
        const aiAgent = (butler as any).aiAgent;
        if (!aiAgent || !aiAgent.isInitialized()) {
          res.statusCode = 503;
          res.end(JSON.stringify({
            success: false,
            error: 'AI Agent 未初始化',
          }));
          return true;
        }

        const client = aiAgent.getOpenRouterClient();
        const startTime = Date.now();

        const response = await client.createChatCompletion(
          [
            { role: 'system', content: '你是一个测试助手。' },
            { role: 'user', content: '只回复"连接成功"三个字，不要其他内容。' },
          ],
          { maxTokens: 20, temperature: 0.1 },
        );

        const latency = Date.now() - startTime;
        const model = response.model || client.getBaseModel();
        const usage = response.usage || {};

        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          data: {
            connected: true,
            model,
            latency,
            usage,
            reply: response.choices?.[0]?.message?.content || '',
          },
        }));
      } catch (error: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({
          success: false,
          error: error.message || '连接失败',
        }));
      }
      return true;
    }

    if (reqPath === '/api/chat' && method === 'POST') {
      const body = await parseBody(req);
      const { message } = JSON.parse(body);
      if (!message) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'message is required' }));
        return true;
      }
      try {
        const response = await butler.chat(message);
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          data: {
            message: response.reply,
            reply: response.reply,
            route: response.route,
            pendingAction: response.pendingAction,
          },
        }));
      } catch (error: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return true;
    }

    if (reqPath === '/api/ai/confirm' && method === 'POST') {
      const body = await parseBody(req);
      const { actionId } = JSON.parse(body);
      if (!actionId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'actionId is required' }));
        return true;
      }
      try {
        const result = await butler.confirmWriteAction(actionId);
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, data: result }));
      } catch (error: any) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return true;
    }

    if (reqPath === '/api/casaos/containers' && method === 'GET') {
      try {
        const containers = await listManagedContainers();
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, data: containers }));
      } catch (error: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return true;
    }

    if (reqPath.startsWith('/api/casaos/containers/') && reqPath.endsWith('/restart') && method === 'POST') {
      const name = decodeURIComponent(reqPath.split('/')[4] || '');
      if (!name) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'container name is required' }));
        return true;
      }
      const result = await restartContainer(name);
      res.statusCode = result.success ? 200 : 400;
      res.end(JSON.stringify({ success: result.success, data: result, message: result.message }));
      return true;
    }

    if (reqPath === '/api/system/backup' && method === 'GET') {
      try {
        const buffer = createBackupArchive(DATA_DIR, '0.7.0');
        const filename = `butler-backup-${new Date().toISOString().slice(0, 10)}.zip`;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.end(buffer);
      } catch (error: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return true;
    }

    if (reqPath === '/api/system/restore' && method === 'POST') {
      const body = await parseBody(req);
      const payload = JSON.parse(body) as { backupBase64?: string };
      if (!payload.backupBase64) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'backupBase64 is required' }));
        return true;
      }
      try {
        const buffer = Buffer.from(payload.backupBase64, 'base64');
        const manifest = restoreBackupArchive(DATA_DIR, buffer);
        appSettings = loadSettings();
        await applySettings(appSettings);
        res.statusCode = 200;
        res.end(JSON.stringify({
          success: true,
          data: manifest,
          message: '配置已还原，建议重启 Butler 容器使数据库变更完全生效',
        }));
      } catch (error: any) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return true;
    }

    if (reqPath === '/api/chat/sessions' && method === 'GET') {
      try {
        const storage = (butler as any).storage;
        const sessions = storage && storage.getChatSessions
          ? await storage.getChatSessions()
          : [];
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, data: sessions, total: sessions.length }));
      } catch (error: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return true;
    }

    if (reqPath.startsWith('/api/chat/sessions/') && reqPath.endsWith('/messages') && method === 'GET') {
      const sessionId = reqPath.split('/')[4];
      if (!sessionId) {
        res.statusCode = 400;
        res.end(JSON.stringify({ success: false, error: 'session id is required' }));
        return true;
      }
      try {
        const storage = (butler as any).storage;
        const messages = storage && storage.getChatMessages
          ? await storage.getChatMessages(sessionId, 100)
          : [];
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true, data: messages, sessionId }));
      } catch (error: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return true;
    }

    if (reqPath === '/api/chat/clear' && method === 'POST') {
      try {
        const storage = (butler as any).storage;
        if (storage && storage.clearChatMessages) {
          await storage.clearChatMessages('default');
        }
        if ((butler as any).aiAgent) {
          (butler as any).aiAgent.clearShortTermMemory();
        }
        res.statusCode = 200;
        res.end(JSON.stringify({ success: true }));
      } catch (error: any) {
        res.statusCode = 500;
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
      return true;
    }

    if (reqPath === '/api/security-score' && method === 'GET') {
      const score = await butler.getSecurityScore();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: score }));
      return true;
    }

    if (reqPath === '/api/trends' && method === 'GET') {
      const timeRange = (url.searchParams.get('range') as any) || 'week';
      const trends = await butler.getTrends(timeRange);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: trends }));
      return true;
    }

    if (reqPath === '/api/templates' && method === 'GET') {
      const templates = butler.getAutomationTemplates();
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: templates, total: templates.length }));
      return true;
    }

    if (reqPath === '/api/automation/generate' && method === 'POST') {
      const body = await parseBody(req);
      const { description, platform = 'homeassistant' } = JSON.parse(body);
      const result = await butler.generateAutomation(description, platform as any);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, data: result }));
      return true;
    }

    if (reqPath === '/api/automation/apply' && method === 'POST') {
      const body = await parseBody(req);
      const { automation } = JSON.parse(body);
      res.statusCode = 200;
      res.end(JSON.stringify({ success: true, message: '已保存到待应用列表' }));
      return true;
    }

    return false;
  } catch (error: any) {
    console.error('[API] Error:', error);
    res.statusCode = 500;
    res.end(JSON.stringify({ success: false, error: error.message }));
    return true;
  }
}

async function handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const reqPath = url.pathname;
  const method = req.method || 'GET';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (reqPath.startsWith('/api/')) {
    await handleApiRequest(req, res, url, reqPath, method);
    return;
  }

  if (method === 'GET') {
    let filePath = reqPath === '/' ? 'index.html' : reqPath.slice(1);
    filePath = pathModule.join(PUBLIC_DIR, filePath);

    if (serveStaticFile(req, res, filePath)) {
      return;
    }

    if (reqPath !== '/' && !reqPath.startsWith('/api/')) {
      const indexPath = pathModule.join(PUBLIC_DIR, 'index.html');
      if (serveStaticFile(req, res, indexPath)) {
        return;
      }
    }
  }

  res.statusCode = 404;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ error: 'Not found', path: reqPath }));
}

async function main() {
  console.log('========================================');
  console.log('Smart Home Security Butler v0.7.0');
  console.log('========================================');

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  try {
    await setupFromEnv();
    await applySettingsAfterBoot();
  } catch (error) {
    console.error('[Setup] Error:', error);
  }

  try {
    await butler.start();
    console.log('[Server] Security butler started successfully');
    await syncKnxGatewayConfigSnapshot();
  } catch (error) {
    console.error('[Server] Failed to start butler:', error);
  }

  const server = http.createServer(handleRequest);
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] HTTP API listening on port ${PORT}`);
    console.log(`[Server] Web UI: http://localhost:${PORT}`);
  });

  process.on('SIGTERM', async () => {
    console.log('[Server] SIGTERM received, shutting down...');
    await butler.stop();
    server.close(() => process.exit(0));
  });

  process.on('SIGINT', async () => {
    console.log('[Server] SIGINT received, shutting down...');
    await butler.stop();
    server.close(() => process.exit(0));
  });
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
