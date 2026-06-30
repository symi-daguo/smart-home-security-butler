import { describe, it, expect, beforeEach } from 'vitest';
import { ConfigManager } from './config';
import { CollectorConfig, CollectorType, NotifierConfig, NotifierType } from './types';

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager('/tmp/test-config.json');
  });

  describe('default config', () => {
    it('should have default detection interval of 300 seconds', () => {
      expect(configManager.getDetectionInterval()).toBe(300);
    });

    it('should have default log retention of 30 days', () => {
      expect(configManager.getLogRetentionDays()).toBe(30);
    });

    it('should have default baseline learning of 14 days', () => {
      expect(configManager.getBaselineLearningDays()).toBe(14);
    });

    it('should start with empty collectors', () => {
      expect(configManager.getCollectors()).toEqual([]);
    });

    it('should start with empty notifiers', () => {
      expect(configManager.getNotifiers()).toEqual([]);
    });
  });

  describe('collector management', () => {
    const testCollector: CollectorConfig = {
      id: 'test-ha',
      type: 'homeassistant' as CollectorType,
      name: 'Test HA',
      enabled: true,
      config: {},
    };

    it('should add a collector', () => {
      configManager.addCollector(testCollector);
      expect(configManager.getCollectors()).toHaveLength(1);
      expect(configManager.getCollector('test-ha')?.name).toBe('Test HA');
    });

    it('should update existing collector with same id', () => {
      configManager.addCollector(testCollector);
      const updated = { ...testCollector, name: 'Updated HA' };
      configManager.addCollector(updated);
      expect(configManager.getCollectors()).toHaveLength(1);
      expect(configManager.getCollector('test-ha')?.name).toBe('Updated HA');
    });

    it('should remove a collector', () => {
      configManager.addCollector(testCollector);
      const result = configManager.removeCollector('test-ha');
      expect(result).toBe(true);
      expect(configManager.getCollectors()).toHaveLength(0);
    });

    it('should return false when removing non-existent collector', () => {
      const result = configManager.removeCollector('non-existent');
      expect(result).toBe(false);
    });

    it('should return undefined for non-existent collector', () => {
      expect(configManager.getCollector('non-existent')).toBeUndefined();
    });
  });

  describe('notifier management', () => {
    const testNotifier: NotifierConfig = {
      id: 'test-telegram',
      type: 'telegram' as NotifierType,
      name: 'Test Telegram',
      enabled: true,
      config: {},
    };

    it('should add a notifier', () => {
      configManager.addNotifier(testNotifier);
      expect(configManager.getNotifiers()).toHaveLength(1);
      expect(configManager.getNotifier('test-telegram')?.name).toBe('Test Telegram');
    });

    it('should update existing notifier with same id', () => {
      configManager.addNotifier(testNotifier);
      const updated = { ...testNotifier, name: 'Updated Telegram' };
      configManager.addNotifier(updated);
      expect(configManager.getNotifiers()).toHaveLength(1);
      expect(configManager.getNotifier('test-telegram')?.name).toBe('Updated Telegram');
    });

    it('should remove a notifier', () => {
      configManager.addNotifier(testNotifier);
      const result = configManager.removeNotifier('test-telegram');
      expect(result).toBe(true);
      expect(configManager.getNotifiers()).toHaveLength(0);
    });

    it('should return false when removing non-existent notifier', () => {
      const result = configManager.removeNotifier('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('config update', () => {
    it('should update detection interval', () => {
      configManager.update({ detectionIntervalSeconds: 600 });
      expect(configManager.getDetectionInterval()).toBe(600);
    });

    it('should update log retention days', () => {
      configManager.update({ logRetentionDays: 60 });
      expect(configManager.getLogRetentionDays()).toBe(60);
    });

    it('should update max notifications per hour', () => {
      configManager.update({ maxNotificationsPerHour: 30 });
      expect(configManager.getMaxNotificationsPerHour()).toBe(30);
    });
  });
});
