import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import { getKnxdEnvPath } from '../knx/knxd-env';

export interface BackupManifest {
  createdAt: string;
  version: string;
  files: string[];
}

export function createBackupArchive(dataDir: string, version: string): Buffer {
  const zip = new AdmZip();
  const manifest: BackupManifest = {
    createdAt: new Date().toISOString(),
    version,
    files: [],
  };

  const dbPath = path.join(dataDir, 'security-butler.db');
  if (fs.existsSync(dbPath)) {
    zip.addLocalFile(dbPath, '', 'security-butler.db');
    manifest.files.push('security-butler.db');
  }

  const settingsPath = path.join(dataDir, 'settings.json');
  if (fs.existsSync(settingsPath)) {
    zip.addLocalFile(settingsPath, '', 'settings.json');
    manifest.files.push('settings.json');
  }

  const knxdEnvPath = getKnxdEnvPath();
  if (fs.existsSync(knxdEnvPath)) {
    zip.addFile('knx-gateway.env', fs.readFileSync(knxdEnvPath));
    manifest.files.push('knx-gateway.env');
  }

  const projectsDir = path.join(dataDir, 'knx-projects');
  if (fs.existsSync(projectsDir)) {
    for (const file of fs.readdirSync(projectsDir)) {
      if (file.endsWith('.knxproj')) {
        zip.addLocalFile(path.join(projectsDir, file), 'knx-projects', file);
        manifest.files.push(`knx-projects/${file}`);
      }
    }
  }

  zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8'));
  return zip.toBuffer();
}

export function restoreBackupArchive(dataDir: string, buffer: Buffer): BackupManifest {
  const zip = new AdmZip(buffer);
  const manifestEntry = zip.getEntry('manifest.json');
  if (!manifestEntry) {
    throw new Error('备份包缺少 manifest.json');
  }
  const manifest = JSON.parse(manifestEntry.getData().toString('utf-8')) as BackupManifest;

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || entry.entryName === 'manifest.json') {
      continue;
    }
    if (entry.entryName === 'security-butler.db') {
      fs.writeFileSync(path.join(dataDir, 'security-butler.db'), entry.getData());
      continue;
    }
    if (entry.entryName === 'settings.json') {
      fs.writeFileSync(path.join(dataDir, 'settings.json'), entry.getData());
      continue;
    }
    if (entry.entryName === 'knx-gateway.env') {
      fs.writeFileSync(getKnxdEnvPath(), entry.getData());
      continue;
    }
    if (entry.entryName.startsWith('knx-projects/')) {
      const targetDir = path.join(dataDir, 'knx-projects');
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const fileName = entry.entryName.replace('knx-projects/', '');
      fs.writeFileSync(path.join(targetDir, fileName), entry.getData());
    }
  }

  return manifest;
}
