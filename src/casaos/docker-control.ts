import * as fs from 'fs';
import * as http from 'http';

export interface DockerContainerInfo {
  name: string;
  id: string;
  image: string;
  state: string;
  status: string;
}

const DEFAULT_CONTAINERS = [
  'smart-home-butler',
  'rs232-knx-knxd',
  'homeassistant',
  'node-red',
  'mosquitto',
];

function dockerRequest(path: string, method: 'GET' | 'POST' = 'GET'): Promise<string> {
  const socketPath = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock';
  if (!fs.existsSync(socketPath)) {
    return Promise.reject(new Error(`Docker socket not found: ${socketPath}`));
  }

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        socketPath,
        path,
        method,
        headers: { Host: 'localhost', 'Content-Type': 'application/json' },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf-8');
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(body || `Docker API HTTP ${res.statusCode}`));
            return;
          }
          resolve(body);
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('Docker API timeout')));
    req.end();
  });
}

export async function listManagedContainers(): Promise<DockerContainerInfo[]> {
  const names = (process.env.CASAOS_CONTAINER_NAMES || DEFAULT_CONTAINERS.join(','))
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  const results: DockerContainerInfo[] = [];
  for (const name of names) {
    try {
      const body = await dockerRequest(`/containers/${name}/json`);
      const data = JSON.parse(body);
      results.push({
        name,
        id: (data.Id || '').slice(0, 12),
        image: data.Config?.Image || '',
        state: data.State?.Status || 'unknown',
        status: data.State?.Status || 'unknown',
      });
    } catch {
      results.push({
        name,
        id: '',
        image: '',
        state: 'not_found',
        status: 'not_found',
      });
    }
  }
  return results;
}

export async function restartContainer(name: string): Promise<{ success: boolean; message: string }> {
  const allowed = (process.env.CASAOS_CONTAINER_NAMES || DEFAULT_CONTAINERS.join(','))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (!allowed.includes(name)) {
    return { success: false, message: `不允许操作容器: ${name}` };
  }

  try {
    await dockerRequest(`/containers/${name}/restart?t=10`, 'POST');
    return { success: true, message: `容器 ${name} 已重启` };
  } catch (error: any) {
    return { success: false, message: error?.message || `重启 ${name} 失败` };
  }
}
