import AdmZip from 'adm-zip';
import * as crypto from 'crypto';

export interface KnxprojGroupAddress {
  address: string;
  name: string;
  dpt: string;
}

export interface KnxprojDevice {
  individualAddress: string;
  name: string;
  product: string;
  area: string;
  line: string;
  serialNumber: string;
}

export interface KnxprojParseResult {
  projectName: string;
  etsVersion: string;
  fileHash: string;
  groupAddresses: KnxprojGroupAddress[];
  devices: KnxprojDevice[];
  xmlFileCount: number;
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function extractAttr(tag: string, attr: string): string {
  const re = new RegExp(`\\b${attr}="([^"]*)"`, 'i');
  const match = tag.match(re);
  return match ? decodeXmlEntities(match[1]) : '';
}

function normalizeGroupAddress(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/').map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 3) {
      return `${parts[0]}/${parts[1]}/${parts[2]}`;
    }
  }
  return trimmed;
}

function normalizeIndividualAddress(raw: string, area = '', line = ''): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (trimmed.includes('.')) {
    const parts = trimmed.split('.').map((p) => p.trim());
    if (parts.length >= 3) {
      return `${parts[0]}.${parts[1]}.${parts[2]}`;
    }
  }
  if (/^\d+$/.test(trimmed) && area && line) {
    return `${area}.${line}.${trimmed}`;
  }
  return trimmed;
}

function parseProjectMeta(xml: string): { projectName: string; etsVersion: string } {
  const projectTag = xml.match(/<Project\b[^>]*>/i)?.[0] || '';
  const projectName =
    extractAttr(projectTag, 'Name') ||
    extractAttr(projectTag, 'ProjectName') ||
    '未命名项目';
  const etsVersion =
    extractAttr(projectTag, 'ToolVersion') ||
    extractAttr(projectTag, 'ETSVersion') ||
    extractAttr(projectTag, 'Version') ||
    '';
  return { projectName, etsVersion };
}

function parseGroupAddresses(xml: string): KnxprojGroupAddress[] {
  const results: KnxprojGroupAddress[] = [];
  const seen = new Set<string>();
  const tagRe = /<GroupAddress\b[^>]*\/?>/gi;
  let match: RegExpExecArray | null;

  while ((match = tagRe.exec(xml)) !== null) {
    const tag = match[0];
    const address = normalizeGroupAddress(
      extractAttr(tag, 'Address') || extractAttr(tag, 'GroupAddress'),
    );
    if (!address || seen.has(address)) {
      continue;
    }
    seen.add(address);
    results.push({
      address,
      name: extractAttr(tag, 'Name') || extractAttr(tag, 'Text'),
      dpt:
        extractAttr(tag, 'DatapointType') ||
        extractAttr(tag, 'DPTs') ||
        extractAttr(tag, 'DPT') ||
        '',
    });
  }

  return results.sort((a, b) => a.address.localeCompare(b.address, undefined, { numeric: true }));
}

function parseDevices(xml: string): KnxprojDevice[] {
  const results: KnxprojDevice[] = [];
  const seen = new Set<string>();

  const areaMatches = [...xml.matchAll(/<Area\b[^>]*\bAddress="(\d+)"[^>]*\bName="([^"]*)"/gi)];
  const areaMap = new Map<string, string>();
  for (const m of areaMatches) {
    areaMap.set(m[1], decodeXmlEntities(m[2] || ''));
  }

  const lineRe = /<(?:Line|MainLine)\b[^>]*\bAddress="(\d+)"[^>]*>/gi;
  const deviceRe = /<DeviceInstance\b[^>]*\/?>/gi;

  const lines: Array<{ area: string; line: string; start: number; end: number }> = [];
  let lineMatch: RegExpExecArray | null;
  let currentArea = '';

  const areaBlockRe = /<Area\b[^>]*\bAddress="(\d+)"[^>]*>([\s\S]*?)<\/Area>/gi;
  let areaBlock: RegExpExecArray | null;
  while ((areaBlock = areaBlockRe.exec(xml)) !== null) {
    const areaNum = areaBlock[1];
    const areaContent = areaBlock[2];
    const lineInAreaRe = /<(?:Line|MainLine)\b[^>]*\bAddress="(\d+)"[^>]*>([\s\S]*?)<\/(?:Line|MainLine)>/gi;
    let lineBlock: RegExpExecArray | null;
    while ((lineBlock = lineInAreaRe.exec(areaContent)) !== null) {
      const lineNum = lineBlock[1];
      const lineContent = lineBlock[2];
      let devMatch: RegExpExecArray | null;
      const localDeviceRe = /<DeviceInstance\b[^>]*\/?>/gi;
      while ((devMatch = localDeviceRe.exec(lineContent)) !== null) {
        const tag = devMatch[0];
        const individualAddress = normalizeIndividualAddress(
          extractAttr(tag, 'Address'),
          areaNum,
          lineNum,
        );
        if (!individualAddress || seen.has(individualAddress)) {
          continue;
        }
        seen.add(individualAddress);
        results.push({
          individualAddress,
          name: extractAttr(tag, 'Name') || extractAttr(tag, 'Description'),
          product:
            extractAttr(tag, 'ProductRefId') ||
            extractAttr(tag, 'ProductRef') ||
            extractAttr(tag, 'Hardware2ProgramRefId') ||
            '',
          area: areaMap.get(areaNum) || areaNum,
          line: lineNum,
          serialNumber: extractAttr(tag, 'SerialNumber') || extractAttr(tag, 'SerialNr'),
        });
      }
    }
  }

  if (results.length === 0) {
    let devMatch: RegExpExecArray | null;
    while ((devMatch = deviceRe.exec(xml)) !== null) {
      const tag = devMatch[0];
      const individualAddress = normalizeIndividualAddress(extractAttr(tag, 'Address'));
      if (!individualAddress || seen.has(individualAddress)) {
        continue;
      }
      seen.add(individualAddress);
      results.push({
        individualAddress,
        name: extractAttr(tag, 'Name') || extractAttr(tag, 'Description'),
        product:
          extractAttr(tag, 'ProductRefId') ||
          extractAttr(tag, 'ProductRef') ||
          extractAttr(tag, 'Hardware2ProgramRefId') ||
          '',
        area: '',
        line: '',
        serialNumber: extractAttr(tag, 'SerialNumber') || extractAttr(tag, 'SerialNr'),
      });
    }
  }

  return results.sort((a, b) =>
    a.individualAddress.localeCompare(b.individualAddress, undefined, { numeric: true }),
  );
}

export function parseKnxprojBuffer(buffer: Buffer, fallbackName = 'project.knxproj'): KnxprojParseResult {
  const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter((e) => !e.isDirectory && e.entryName.toLowerCase().endsWith('.xml'));

  let projectName = fallbackName.replace(/\.knxproj$/i, '');
  let etsVersion = '';
  const groupMap = new Map<string, KnxprojGroupAddress>();
  const deviceMap = new Map<string, KnxprojDevice>();

  for (const entry of entries) {
    const xml = entry.getData().toString('utf-8');
    if (!xml.includes('<')) {
      continue;
    }

    if (entry.entryName.endsWith('/0.xml') || entry.entryName.endsWith('\\0.xml')) {
      const meta = parseProjectMeta(xml);
      if (meta.projectName && meta.projectName !== '未命名项目') {
        projectName = meta.projectName;
      }
      if (meta.etsVersion) {
        etsVersion = meta.etsVersion;
      }
    }

    for (const ga of parseGroupAddresses(xml)) {
      groupMap.set(ga.address, ga);
    }
    for (const device of parseDevices(xml)) {
      deviceMap.set(device.individualAddress, device);
    }
  }

  return {
    projectName,
    etsVersion,
    fileHash,
    groupAddresses: [...groupMap.values()],
    devices: [...deviceMap.values()],
    xmlFileCount: entries.length,
  };
}
