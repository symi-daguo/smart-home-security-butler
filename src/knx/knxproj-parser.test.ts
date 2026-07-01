import AdmZip from 'adm-zip';
import { describe, expect, it } from 'vitest';
import { parseKnxprojBuffer } from './knxproj-parser';

function buildSampleKnxproj(): Buffer {
  const zip = new AdmZip();
  zip.addFile(
    'P-0001/0.xml',
    Buffer.from(`<?xml version="1.0" encoding="utf-8"?>
<Project xmlns="http://knx.org/xml/project/20" Name="Mars测试项目" ToolVersion="ETS6 6.0.1">
  <GroupAddresses>
    <GroupAddress Address="1/0/1" Name="客厅灯" DatapointType="DPST-1-1"/>
    <GroupAddress Address="1/0/2" Name="卧室灯" DPT="DPST-1-1"/>
  </GroupAddresses>
  <Installations>
    <Area Address="1" Name="主区域">
      <Line Address="1">
        <DeviceInstance Address="5" Name="开关执行器" ProductRefId="M-0002_H-1.1.1"/>
      </Line>
    </Area>
  </Installations>
</Project>`),
  );
  return zip.toBuffer();
}

describe('knxproj-parser', () => {
  it('parses group addresses and devices from knxproj zip', () => {
    const parsed = parseKnxprojBuffer(buildSampleKnxproj(), 'Mars.knxproj');
    expect(parsed.projectName).toBe('Mars测试项目');
    expect(parsed.etsVersion).toContain('ETS6');
    expect(parsed.groupAddresses.length).toBeGreaterThanOrEqual(2);
    expect(parsed.groupAddresses[0].address).toBe('1/0/1');
    expect(parsed.devices.length).toBeGreaterThanOrEqual(1);
    expect(parsed.devices[0].individualAddress).toBe('1.1.5');
  });
});
