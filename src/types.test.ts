import { describe, it, expect } from 'vitest';
import { SecurityLevel, AlertSeverity, CollectorStatus, SystemStatus } from './types';

describe('Types', () => {
  describe('SecurityLevel', () => {
    it('should have valid security levels', () => {
      const levels: SecurityLevel[] = ['safe', 'low', 'medium', 'high', 'critical'];
      expect(levels).toContain('safe');
      expect(levels).toContain('low');
      expect(levels).toContain('medium');
      expect(levels).toContain('high');
      expect(levels).toContain('critical');
    });
  });

  describe('AlertSeverity', () => {
    it('should have valid alert severity levels', () => {
      const severities: AlertSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
      expect(severities).toContain('info');
      expect(severities).toContain('low');
      expect(severities).toContain('medium');
      expect(severities).toContain('high');
      expect(severities).toContain('critical');
    });
  });

  describe('CollectorStatus', () => {
    it('should have valid collector statuses', () => {
      const statuses: CollectorStatus[] = ['connected', 'disconnected', 'error', 'initializing'];
      expect(statuses).toContain('connected');
      expect(statuses).toContain('disconnected');
      expect(statuses).toContain('error');
      expect(statuses).toContain('initializing');
    });
  });

  describe('SystemStatus', () => {
    it('should have valid system statuses', () => {
      const statuses: SystemStatus['status'][] = ['healthy', 'degraded', 'error', 'initializing'];
      expect(statuses).toContain('healthy');
      expect(statuses).toContain('degraded');
      expect(statuses).toContain('error');
      expect(statuses).toContain('initializing');
    });
  });
});
