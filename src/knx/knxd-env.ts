import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import { execSync } from 'child_process';

export interface KnxdEnvConfig {
  address: string;
  clientAddress: string;
  interface: string;
  device: string;
  gatewayName: string;
  debugErrorLevel: string;
}

export interface KnxdHealthStatus {
  envPath: string;
  envExists: boolean;
  config: KnxdEnvConfig | null;
  host: string;
  port: number;
  portOpen: boolean;
  containerName: string;
  containerStatus: 'running' | 'stopped' | 'unknown';
  checkedAt: string;
}

const ENV_KEY_MAP: Record<string, keyof KnxdEnvConfig> = {
  ADDRESS: 'address',
  CLIENT_ADDRESS: 'clientAddress',
  INTERFACE: 'interface',
  DEVICE: 'device',
  KNX_GATEWAY_NAME: 'gatewayName',
  DEBUG_ERROR_LEVEL: 'debugErrorLevel',
};

const CONFIG_TO_ENV: Record<keyof KnxdEnvConfig, string> = {
  address: 'ADDRESS',
  clientAddress: 'CLIENT_ADDRESS',
  interface: 'INTERFACE',
  device: 'DEVICE',
  gatewayName: 'KNX_GATEWAY_NAME',
  debugErrorLevel: 'DEBUG_ERROR_LEVEL',
};

export const DEFAULT_KNXD_ENV_CONFIG: KnxdEnvConfig = {
  address: '1.1.255',
  clientAddress: '1.1.250:5',
  interface: 'dummy',
  device: '/dev/ttyS0',
  gatewayName: 'RS232-KNX-Gateway',
  debugErrorLevel: 'info',
};

export function getKnxdEnvPath(): string {
  return process.env.KNXD_ENV_PATH || '/DATA/AppData/knx-gateway/.env';
}

export function getKnxdHost(): string {
  return process.env.KNXD_HOST || '127.0.0.1';
}

export function getKnxdPort(): number {
  return parseInt(process.env.KNXD_PORT || '3671', 10);
}

export function getKnxdContainerName(): string {
  return process.env.KNXD_CONTAINER_NAME || 'rs232-knx-knxd';
}

export function parseKnxdEnvContent(content: string): KnxdEnvConfig {
  const config: KnxdEnvConfig = { ...DEFAULT_KNXD_ENV_CONFIG };
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    const mapped = ENV_KEY_MAP[key];
    if (mapped) {
      config[mapped] = value;
    }
  }

  return config;
}

export function serializeKnxdEnv(config: KnxdEnvConfig): string {
  const lines = [
    '# KNX 网关配置 — 由 Security Butler 管理',
    '# 修改后请在 CasaOS 重启「KNX 网关」应用',
    '',
    `${CONFIG_TO_ENV.address}=${config.address}`,
    `${CONFIG_TO_ENV.clientAddress}=${config.clientAddress}`,
    '',
    `${CONFIG_TO_ENV.interface}=${config.interface}`,
    `${CONFIG_TO_ENV.device}=${config.device}`,
    '',
    `${CONFIG_TO_ENV.gatewayName}=${config.gatewayName}`,
    `${CONFIG_TO_ENV.debugErrorLevel}=${config.debugErrorLevel}`,
    '',
  ];
  return lines.join('\n');
}

export function readKnxdEnv(envPath: string = getKnxdEnvPath()): KnxdEnvConfig | null {
  if (!fs.existsSync(envPath)) {
    return null;
  }
  const content = fs.readFileSync(envPath, 'utf-8');
  return parseKnxdEnvContent(content);
}

export function writeKnxdEnv(config: KnxdEnvConfig, envPath: string = getKnxdEnvPath()): void {
  const dir = path.dirname(envPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(envPath, serializeKnxdEnv(config), 'utf-8');
}

export function checkTcpPort(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const finish = (result: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
    socket.connect(port, host);
  });
}

export function getDockerContainerStatus(containerName: string): 'running' | 'stopped' | 'unknown' {
  try {
    const output = execSync(`docker inspect -f '{{.State.Running}}' ${containerName}`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return output === 'true' ? 'running' : 'stopped';
  } catch {
    return 'unknown';
  }
}

export async function getKnxdHealthStatus(): Promise<KnxdHealthStatus> {
  const envPath = getKnxdEnvPath();
  const host = getKnxdHost();
  const port = getKnxdPort();
  const containerName = getKnxdContainerName();
  const envExists = fs.existsSync(envPath);
  const config = envExists ? readKnxdEnv(envPath) : null;
  const [portOpen, containerStatus] = await Promise.all([
    checkTcpPort(host, port),
    Promise.resolve(getDockerContainerStatus(containerName)),
  ]);

  return {
    envPath,
    envExists,
    config,
    host,
    port,
    portOpen,
    containerName,
    containerStatus,
    checkedAt: new Date().toISOString(),
  };
}
