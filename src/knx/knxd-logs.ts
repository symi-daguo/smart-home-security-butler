import * as fs from 'fs';
import * as http from 'http';
import { getKnxdContainerName } from './knxd-env';

export interface KnxdLogResult {
  containerName: string;
  lines: string[];
  text: string;
  fetchedAt: string;
  error?: string;
}

function stripDockerLogFrame(buffer: Buffer): string {
  let offset = 0;
  const parts: string[] = [];

  while (offset + 8 <= buffer.length) {
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;
    if (size <= 0 || offset + size > buffer.length) {
      break;
    }
    parts.push(buffer.subarray(offset, offset + size).toString('utf-8'));
    offset += size;
  }

  if (parts.length > 0) {
    return parts.join('');
  }

  return buffer.toString('utf-8');
}

function fetchLogsViaDockerSocket(containerName: string, lineCount: number): Promise<string> {
  const socketPath = process.env.DOCKER_SOCKET_PATH || '/var/run/docker.sock';
  if (!fs.existsSync(socketPath)) {
    return Promise.reject(new Error(`Docker socket not found: ${socketPath}`));
  }

  return new Promise<string>((resolve, reject) => {
    const req = http.request(
      {
        socketPath,
        path: `/containers/${containerName}/logs?stdout=true&stderr=true&tail=${lineCount}`,
        method: 'GET',
        headers: { Host: 'localhost' },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on('end', () => {
          const raw = Buffer.concat(chunks);
          if (res.statusCode && res.statusCode >= 404) {
            reject(new Error(raw.toString('utf-8') || `Docker API HTTP ${res.statusCode}`));
            return;
          }
          resolve(stripDockerLogFrame(raw));
        });
      },
    );
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error('Docker log request timeout'));
    });
    req.end();
  });
}

export async function fetchKnxdLogs(lineCount = 100): Promise<KnxdLogResult> {
  const containerName = getKnxdContainerName();
  const fetchedAt = new Date().toISOString();

  try {
    const text = await fetchLogsViaDockerSocket(containerName, lineCount);
    const lines = text.split(/\r?\n/).filter((line) => line.length > 0);
    return {
      containerName,
      lines,
      text,
      fetchedAt,
    };
  } catch (error: any) {
    const output = error?.message || '无法读取 knxd 日志';
    return {
      containerName,
      lines: [],
      text: output,
      fetchedAt,
      error: output,
    };
  }
}
