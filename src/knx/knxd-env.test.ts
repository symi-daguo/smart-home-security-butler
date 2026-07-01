import { describe, expect, it } from 'vitest';
import { parseKnxdEnvContent, serializeKnxdEnv, DEFAULT_KNXD_ENV_CONFIG } from './knxd-env';

describe('knxd-env', () => {
  it('parses knxd .env content', () => {
    const content = `
ADDRESS=1.1.10
CLIENT_ADDRESS=1.1.250:5
INTERFACE=tpuart
DEVICE=/dev/ttyS0
KNX_GATEWAY_NAME=Test-Gateway
DEBUG_ERROR_LEVEL=info
`;
    const config = parseKnxdEnvContent(content);
    expect(config.address).toBe('1.1.10');
    expect(config.clientAddress).toBe('1.1.250:5');
    expect(config.interface).toBe('tpuart');
    expect(config.device).toBe('/dev/ttyS0');
    expect(config.gatewayName).toBe('Test-Gateway');
  });

  it('serializes config back to env format', () => {
    const serialized = serializeKnxdEnv({
      ...DEFAULT_KNXD_ENV_CONFIG,
      address: '1.1.20',
    });
    expect(serialized).toContain('ADDRESS=1.1.20');
    expect(serialized).toContain('INTERFACE=dummy');
  });
});
