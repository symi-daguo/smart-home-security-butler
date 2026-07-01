import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import {
  Alert,
  CollectedEvent,
  EntityState,
  DetectionRule,
  NotificationLog,
  BaselineData,
  CollectorConfig,
  NotifierConfig,
  DetectionScan,
  AutomationRecommendation,
  SeverityLevel,
  AlertStatus,
  DataSourceType,
  DetectionCategory,
} from '../types';

export interface StorageConfig {
  databasePath: string;
  logRetentionDays: number;
}

const DB_VERSION = 2;

export class SQLiteStorage {
  private config: StorageConfig;
  private db: Database.Database | null;
  private initialized: boolean;
  private statements: Map<string, Database.Statement>;

  constructor(config: StorageConfig) {
    this.config = config;
    this.db = null;
    this.initialized = false;
    this.statements = new Map();
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const dbDir = path.dirname(this.config.databasePath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    this.db = new Database(this.config.databasePath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.db.pragma('synchronous = NORMAL');

    this.createTables();
    this.createIndexes();
    this.prepareStatements();
    this.initialized = true;
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.statements.clear();
    }
    this.initialized = false;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS alerts (
        id TEXT PRIMARY KEY,
        rule_id TEXT NOT NULL,
        rule_name TEXT,
        severity INTEGER NOT NULL,
        category TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        entity_id TEXT,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'new',
        acknowledged INTEGER NOT NULL DEFAULT 0,
        acknowledged_at TEXT,
        acknowledged_by TEXT,
        silenced_until TEXT,
        first_detected_at TEXT NOT NULL,
        last_detected_at TEXT NOT NULL,
        detection_count INTEGER NOT NULL DEFAULT 1,
        resolved_at TEXT,
        resolution TEXT,
        resolution_type TEXT,
        data TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS entity_states (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_id TEXT NOT NULL,
        state TEXT NOT NULL,
        attributes TEXT NOT NULL DEFAULT '{}',
        last_changed TEXT NOT NULL,
        last_updated TEXT NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS collected_events (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        entity_id TEXT,
        data TEXT NOT NULL DEFAULT '{}',
        recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notification_logs (
        id TEXT PRIMARY KEY,
        channel TEXT NOT NULL,
        alert_id TEXT,
        message_id TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        sent_at TEXT,
        delivered_at TEXT,
        failed_at TEXT,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS detection_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        severity INTEGER NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        config TEXT NOT NULL DEFAULT '{}',
        schedule_type TEXT DEFAULT 'continuous',
        schedule_value TEXT,
        schedule_interval_seconds INTEGER,
        notification_enabled INTEGER NOT NULL DEFAULT 1,
        notification_channels TEXT NOT NULL DEFAULT '[]',
        notification_throttle TEXT,
        actions TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS baseline_data (
        entity_id TEXT NOT NULL,
        metric TEXT NOT NULL,
        period TEXT NOT NULL,
        mean REAL NOT NULL,
        std_dev REAL NOT NULL,
        min REAL NOT NULL,
        max REAL NOT NULL,
        samples INTEGER NOT NULL,
        last_updated TEXT NOT NULL,
        PRIMARY KEY (entity_id, metric, period)
      );

      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS detection_scans (
        id TEXT PRIMARY KEY,
        status TEXT NOT NULL DEFAULT 'pending',
        rule_ids TEXT NOT NULL DEFAULT '[]',
        start_time TEXT NOT NULL,
        end_time TEXT,
        time_range_start TEXT,
        time_range_end TEXT,
        results TEXT,
        error TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS automation_recommendations (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        type TEXT NOT NULL,
        platform TEXT NOT NULL,
        format TEXT NOT NULL,
        code TEXT NOT NULL,
        confidence REAL NOT NULL,
        estimated_effort TEXT NOT NULL,
        impact_score REAL NOT NULL,
        risk_level TEXT NOT NULL,
        related_alerts TEXT NOT NULL DEFAULT '[]',
        prerequisites TEXT NOT NULL DEFAULT '[]',
        alternatives TEXT NOT NULL DEFAULT '[]',
        applied INTEGER NOT NULL DEFAULT 0,
        platform_entity_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS collector_configs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        base_url TEXT NOT NULL,
        auth_type TEXT DEFAULT 'none',
        auth_token TEXT,
        auth_username TEXT,
        auth_password TEXT,
        enabled INTEGER NOT NULL DEFAULT 1,
        config TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notifier_configs (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        config TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL DEFAULT 'default',
        role TEXT NOT NULL,
        content TEXT,
        tool_calls TEXT,
        tool_call_id TEXT,
        name TEXT,
        token_count INTEGER DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        title TEXT,
        last_message_at TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS db_version (
        version INTEGER PRIMARY KEY
      );
    `);

    const versionRow = this.db.prepare('SELECT version FROM db_version').get() as { version: number } | undefined;
    if (!versionRow) {
      this.db.prepare('INSERT INTO db_version (version) VALUES (?)').run(1);
    }

    this.runMigrations();
  }

  private runMigrations(): void {
    if (!this.db) return;

    const versionRow = this.db.prepare('SELECT version FROM db_version').get() as { version: number } | undefined;
    let currentVersion = versionRow?.version ?? 1;

    if (currentVersion < 2) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS knx_gateway_config (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          mode TEXT NOT NULL DEFAULT 'router',
          individual_addr TEXT NOT NULL DEFAULT '1.1.255',
          client_address TEXT NOT NULL DEFAULT '1.1.250:5',
          interface_type TEXT NOT NULL DEFAULT 'dummy',
          device_path TEXT NOT NULL DEFAULT '/dev/ttyS0',
          gateway_name TEXT NOT NULL DEFAULT 'RS232-KNX-Gateway',
          debug_error_level TEXT NOT NULL DEFAULT 'info',
          env_path TEXT,
          host TEXT NOT NULL DEFAULT '127.0.0.1',
          port INTEGER NOT NULL DEFAULT 3671,
          container_name TEXT NOT NULL DEFAULT 'rs232-knx-knxd',
          port_open INTEGER NOT NULL DEFAULT 0,
          container_status TEXT NOT NULL DEFAULT 'unknown',
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS knx_group_addresses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          address TEXT NOT NULL UNIQUE,
          name TEXT,
          dpt TEXT,
          source TEXT NOT NULL DEFAULT 'manual',
          in_use INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_knx_ga_address ON knx_group_addresses(address);
        CREATE INDEX IF NOT EXISTS idx_knx_ga_source ON knx_group_addresses(source);
      `);

      this.db.prepare('UPDATE db_version SET version = ?').run(2);
      currentVersion = 2;
    }

    if (currentVersion < DB_VERSION) {
      this.db.prepare('UPDATE db_version SET version = ?').run(DB_VERSION);
    }
  }

  private createIndexes(): void {
    if (!this.db) return;

    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
      CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
      CREATE INDEX IF NOT EXISTS idx_alerts_rule_id ON alerts(rule_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_entity_id ON alerts(entity_id);
      CREATE INDEX IF NOT EXISTS idx_alerts_first_detected ON alerts(first_detected_at);
      CREATE INDEX IF NOT EXISTS idx_alerts_last_detected ON alerts(last_detected_at);

      CREATE INDEX IF NOT EXISTS idx_entity_states_entity_id ON entity_states(entity_id);
      CREATE INDEX IF NOT EXISTS idx_entity_states_last_updated ON entity_states(last_updated);
      CREATE INDEX IF NOT EXISTS idx_entity_states_source ON entity_states(source);

      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON collected_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_event_type ON collected_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_entity_id ON collected_events(entity_id);
      CREATE INDEX IF NOT EXISTS idx_events_source ON collected_events(source);

      CREATE INDEX IF NOT EXISTS idx_notif_logs_channel ON notification_logs(channel);
      CREATE INDEX IF NOT EXISTS idx_notif_logs_alert_id ON notification_logs(alert_id);
      CREATE INDEX IF NOT EXISTS idx_notif_logs_status ON notification_logs(status);
      CREATE INDEX IF NOT EXISTS idx_notif_logs_sent_at ON notification_logs(sent_at);

      CREATE INDEX IF NOT EXISTS idx_rules_category ON detection_rules(category);
      CREATE INDEX IF NOT EXISTS idx_rules_enabled ON detection_rules(enabled);
      CREATE INDEX IF NOT EXISTS idx_rules_severity ON detection_rules(severity);

      CREATE INDEX IF NOT EXISTS idx_baseline_entity ON baseline_data(entity_id);
      CREATE INDEX IF NOT EXISTS idx_baseline_metric ON baseline_data(metric);

      CREATE INDEX IF NOT EXISTS idx_scans_status ON detection_scans(status);
      CREATE INDEX IF NOT EXISTS idx_scans_start_time ON detection_scans(start_time);

      CREATE INDEX IF NOT EXISTS idx_recs_type ON automation_recommendations(type);
      CREATE INDEX IF NOT EXISTS idx_recs_platform ON automation_recommendations(platform);
      CREATE INDEX IF NOT EXISTS idx_recs_applied ON automation_recommendations(applied);

      CREATE INDEX IF NOT EXISTS idx_chat_msgs_session ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_chat_msgs_created ON chat_messages(created_at);
    `);
  }

  private prepareStatements(): void {
    if (!this.db) return;
  }

  private getStmt(key: string): Database.Statement {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    let stmt = this.statements.get(key);
    if (!stmt) {
      throw new Error(`Statement not found: ${key}`);
    }
    return stmt;
  }

  private parseJson<T>(value: string | null | undefined, defaultValue: T): T {
    if (!value) return defaultValue;
    try {
      return JSON.parse(value) as T;
    } catch {
      return defaultValue;
    }
  }

  private toIsoString(date: Date | string | undefined): string | null {
    if (!date) return null;
    if (date instanceof Date) return date.toISOString();
    return date;
  }

  private fromIsoString(str: string | null | undefined): Date | undefined {
    if (!str) return undefined;
    return new Date(str);
  }

  public async storeEntityState(state: EntityState): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO entity_states (entity_id, state, attributes, last_changed, last_updated, source, source_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      state.entityId,
      state.state,
      JSON.stringify(state.attributes),
      state.lastChanged.toISOString(),
      state.lastUpdated.toISOString(),
      state.source,
      state.sourceId
    );
  }

  public async storeCollectedEvent(event: CollectedEvent): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO collected_events (id, timestamp, source, source_id, event_type, entity_id, data)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.timestamp.toISOString(),
      event.source,
      event.sourceId,
      event.eventType,
      event.entityId || null,
      JSON.stringify(event.data)
    );
  }

  public async getEntityStates(
    entityId: string,
    startTime?: Date,
    endTime?: Date,
    limit?: number,
  ): Promise<EntityState[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM entity_states WHERE entity_id = ?';
    const params: any[] = [entityId];

    if (startTime) {
      sql += ' AND last_updated >= ?';
      params.push(startTime.toISOString());
    }
    if (endTime) {
      sql += ' AND last_updated <= ?';
      params.push(endTime.toISOString());
    }

    sql += ' ORDER BY last_updated DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => this.rowToEntityState(row));
  }

  public async getLatestStates(entityIds?: string[]): Promise<Map<string, EntityState>> {
    if (!this.db) throw new Error('Database not initialized');

    const result = new Map<string, EntityState>();

    if (entityIds && entityIds.length === 0) {
      return result;
    }

    let sql: string;
    let params: any[];

    if (entityIds) {
      const placeholders = entityIds.map(() => '?').join(',');
      sql = `
        SELECT es.* FROM entity_states es
        INNER JOIN (
          SELECT entity_id, MAX(last_updated) as max_updated
          FROM entity_states
          WHERE entity_id IN (${placeholders})
          GROUP BY entity_id
        ) latest ON es.entity_id = latest.entity_id AND es.last_updated = latest.max_updated
      `;
      params = entityIds;
    } else {
      sql = `
        SELECT es.* FROM entity_states es
        INNER JOIN (
          SELECT entity_id, MAX(last_updated) as max_updated
          FROM entity_states
          GROUP BY entity_id
        ) latest ON es.entity_id = latest.entity_id AND es.last_updated = latest.max_updated
      `;
      params = [];
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    for (const row of rows) {
      const state = this.rowToEntityState(row);
      result.set(state.entityId, state);
    }

    return result;
  }

  private rowToEntityState(row: any): EntityState {
    return {
      entityId: row.entity_id,
      state: row.state,
      attributes: this.parseJson(row.attributes, {}),
      lastChanged: new Date(row.last_changed),
      lastUpdated: new Date(row.last_updated),
      source: row.source as DataSourceType,
      sourceId: row.source_id,
    };
  }

  public async getEvents(
    startTime: Date,
    endTime: Date,
    eventType?: string,
    source?: string,
    limit?: number,
  ): Promise<CollectedEvent[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM collected_events WHERE timestamp >= ? AND timestamp <= ?';
    const params: any[] = [startTime.toISOString(), endTime.toISOString()];

    if (eventType) {
      sql += ' AND event_type = ?';
      params.push(eventType);
    }
    if (source) {
      sql += ' AND source = ?';
      params.push(source);
    }

    sql += ' ORDER BY timestamp DESC';

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => this.rowToCollectedEvent(row));
  }

  private rowToCollectedEvent(row: any): CollectedEvent {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      source: row.source as DataSourceType,
      sourceId: row.source_id,
      eventType: row.event_type,
      entityId: row.entity_id || undefined,
      data: this.parseJson(row.data, {}),
    };
  }

  public async createAlert(alert: Alert): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO alerts (
        id, rule_id, rule_name, severity, category, title, description,
        entity_id, source, source_id, status, acknowledged,
        first_detected_at, last_detected_at, detection_count, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      alert.id,
      alert.ruleId,
      alert.ruleName || null,
      alert.severity,
      alert.category,
      alert.title,
      alert.description,
      alert.entityId || null,
      alert.source,
      alert.sourceId,
      alert.status,
      alert.acknowledged ? 1 : 0,
      alert.firstDetectedAt.toISOString(),
      alert.lastDetectedAt.toISOString(),
      alert.detectionCount,
      JSON.stringify(alert.data)
    );
  }

  public async updateAlert(alertId: string, updates: Partial<Alert>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.acknowledged !== undefined) {
      fields.push('acknowledged = ?');
      params.push(updates.acknowledged ? 1 : 0);
    }
    if (updates.acknowledgedAt !== undefined) {
      fields.push('acknowledged_at = ?');
      params.push(this.toIsoString(updates.acknowledgedAt));
    }
    if (updates.acknowledgedBy !== undefined) {
      fields.push('acknowledged_by = ?');
      params.push(updates.acknowledgedBy || null);
    }
    if (updates.silencedUntil !== undefined) {
      fields.push('silenced_until = ?');
      params.push(this.toIsoString(updates.silencedUntil));
    }
    if (updates.lastDetectedAt !== undefined) {
      fields.push('last_detected_at = ?');
      params.push(this.toIsoString(updates.lastDetectedAt));
    }
    if (updates.detectionCount !== undefined) {
      fields.push('detection_count = ?');
      params.push(updates.detectionCount);
    }
    if (updates.resolvedAt !== undefined) {
      fields.push('resolved_at = ?');
      params.push(this.toIsoString(updates.resolvedAt));
    }
    if (updates.resolution !== undefined) {
      fields.push('resolution = ?');
      params.push(updates.resolution || null);
    }
    if (updates.resolutionType !== undefined) {
      fields.push('resolution_type = ?');
      params.push(updates.resolutionType || null);
    }
    if (updates.data !== undefined) {
      fields.push('data = ?');
      params.push(JSON.stringify(updates.data));
    }

    if (fields.length === 0) return;

    fields.push("updated_at = datetime('now')");
    params.push(alertId);

    const sql = `UPDATE alerts SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params);
  }

  public async getAlert(alertId: string): Promise<Alert | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db.prepare('SELECT * FROM alerts WHERE id = ?').get(alertId) as any;
    if (!row) return null;
    return this.rowToAlert(row);
  }

  public async getAlerts(filters?: {
    status?: string;
    severity?: string;
    ruleId?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
    offset?: number;
  }): Promise<{ alerts: Alert[]; total: number }> {
    if (!this.db) throw new Error('Database not initialized');

    let whereSql = 'WHERE 1=1';
    const params: any[] = [];

    if (filters?.status) {
      whereSql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.severity) {
      whereSql += ' AND severity = ?';
      params.push(parseInt(filters.severity, 10));
    }
    if (filters?.ruleId) {
      whereSql += ' AND rule_id = ?';
      params.push(filters.ruleId);
    }
    if (filters?.startTime) {
      whereSql += ' AND last_detected_at >= ?';
      params.push(filters.startTime.toISOString());
    }
    if (filters?.endTime) {
      whereSql += ' AND last_detected_at <= ?';
      params.push(filters.endTime.toISOString());
    }

    const countRow = this.db.prepare(`SELECT COUNT(*) as count FROM alerts ${whereSql}`).get(...params) as { count: number };
    const total = countRow.count;

    let sql = `SELECT * FROM alerts ${whereSql} ORDER BY last_detected_at DESC`;
    const queryParams = [...params];

    if (filters?.limit) {
      sql += ' LIMIT ?';
      queryParams.push(filters.limit);
    }
    if (filters?.offset) {
      sql += ' OFFSET ?';
      queryParams.push(filters.offset);
    }

    const rows = this.db.prepare(sql).all(...queryParams) as any[];
    const alerts = rows.map((row) => this.rowToAlert(row));

    return { alerts, total };
  }

  public async getActiveAlerts(severity?: string): Promise<Alert[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = `
      SELECT * FROM alerts
      WHERE status IN ('new', 'active', 'acknowledged')
    `;
    const params: any[] = [];

    if (severity !== undefined) {
      sql += ' AND severity = ?';
      params.push(parseInt(severity, 10));
    }

    sql += ' ORDER BY severity DESC, last_detected_at DESC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => this.rowToAlert(row));
  }

  private rowToAlert(row: any): Alert {
    return {
      id: row.id,
      ruleId: row.rule_id,
      ruleName: row.rule_name || undefined,
      severity: row.severity as SeverityLevel,
      category: row.category as DetectionCategory,
      title: row.title,
      description: row.description,
      entityId: row.entity_id || undefined,
      source: row.source as DataSourceType,
      sourceId: row.source_id,
      status: row.status as AlertStatus,
      acknowledged: row.acknowledged === 1,
      acknowledgedAt: this.fromIsoString(row.acknowledged_at),
      acknowledgedBy: row.acknowledged_by || undefined,
      silencedUntil: this.fromIsoString(row.silenced_until),
      firstDetectedAt: new Date(row.first_detected_at),
      lastDetectedAt: new Date(row.last_detected_at),
      detectionCount: row.detection_count,
      resolvedAt: this.fromIsoString(row.resolved_at),
      resolution: row.resolution || undefined,
      resolutionType: row.resolution_type || undefined,
      data: this.parseJson(row.data, {}),
    };
  }

  public async saveRule(rule: DetectionRule): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = this.db.prepare('SELECT id FROM detection_rules WHERE id = ?').get(rule.id);

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE detection_rules SET
          name = ?, description = ?, category = ?, severity = ?, enabled = ?,
          config = ?, schedule_type = ?, schedule_value = ?, schedule_interval_seconds = ?,
          notification_enabled = ?, notification_channels = ?, notification_throttle = ?,
          actions = ?, updated_at = datetime('now')
        WHERE id = ?
      `);

      stmt.run(
        rule.name,
        rule.description,
        rule.category,
        rule.severity,
        rule.enabled ? 1 : 0,
        JSON.stringify(rule.config),
        rule.schedule?.type || 'continuous',
        rule.schedule?.value || null,
        rule.schedule?.intervalSeconds || null,
        rule.notification.enabled ? 1 : 0,
        JSON.stringify(rule.notification.channels),
        rule.notification.throttle ? JSON.stringify(rule.notification.throttle) : null,
        JSON.stringify(rule.actions || []),
        rule.id
      );
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO detection_rules (
          id, name, description, category, severity, enabled,
          config, schedule_type, schedule_value, schedule_interval_seconds,
          notification_enabled, notification_channels, notification_throttle,
          actions, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `);

      stmt.run(
        rule.id,
        rule.name,
        rule.description,
        rule.category,
        rule.severity,
        rule.enabled ? 1 : 0,
        JSON.stringify(rule.config),
        rule.schedule?.type || 'continuous',
        rule.schedule?.value || null,
        rule.schedule?.intervalSeconds || null,
        rule.notification.enabled ? 1 : 0,
        JSON.stringify(rule.notification.channels),
        rule.notification.throttle ? JSON.stringify(rule.notification.throttle) : null,
        JSON.stringify(rule.actions || []),
        rule.id
      );
    }
  }

  public async getRule(ruleId: string): Promise<DetectionRule | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db.prepare('SELECT * FROM detection_rules WHERE id = ?').get(ruleId) as any;
    if (!row) return null;
    return this.rowToDetectionRule(row);
  }

  public async getRules(filters?: {
    enabled?: boolean;
    category?: string;
    severity?: string;
  }): Promise<DetectionRule[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM detection_rules WHERE 1=1';
    const params: any[] = [];

    if (filters?.enabled !== undefined) {
      sql += ' AND enabled = ?';
      params.push(filters.enabled ? 1 : 0);
    }
    if (filters?.category) {
      sql += ' AND category = ?';
      params.push(filters.category);
    }
    if (filters?.severity) {
      sql += ' AND severity = ?';
      params.push(parseInt(filters.severity, 10));
    }

    sql += ' ORDER BY severity DESC, name ASC';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => this.rowToDetectionRule(row));
  }

  public async deleteRule(ruleId: string): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    const result = this.db.prepare('DELETE FROM detection_rules WHERE id = ?').run(ruleId);
    return result.changes > 0;
  }

  private rowToDetectionRule(row: any): DetectionRule {
    const schedule = row.schedule_type
      ? {
          type: row.schedule_type as 'continuous' | 'interval' | 'cron',
          value: row.schedule_value || undefined,
          intervalSeconds: row.schedule_interval_seconds || undefined,
        }
      : undefined;

    return {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category as DetectionCategory,
      severity: row.severity as SeverityLevel,
      enabled: row.enabled === 1,
      config: this.parseJson(row.config, {}),
      schedule,
      notification: {
        enabled: row.notification_enabled === 1,
        channels: this.parseJson(row.notification_channels, []),
        throttle: this.parseJson(row.notification_throttle, null) as any,
      },
      actions: this.parseJson(row.actions, []),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  public async recordNotificationLog(log: NotificationLog): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO notification_logs (id, channel, alert_id, message_id, status, sent_at, delivered_at, failed_at, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      log.id,
      log.channel,
      log.alertId || null,
      log.messageId || null,
      log.status,
      this.toIsoString(log.sentAt),
      this.toIsoString(log.deliveredAt),
      this.toIsoString(log.failedAt),
      log.error || null
    );
  }

  public async getNotificationLogs(filters?: {
    channel?: string;
    alertId?: string;
    status?: string;
    startTime?: Date;
    endTime?: Date;
    limit?: number;
  }): Promise<NotificationLog[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM notification_logs WHERE 1=1';
    const params: any[] = [];

    if (filters?.channel) {
      sql += ' AND channel = ?';
      params.push(filters.channel);
    }
    if (filters?.alertId) {
      sql += ' AND alert_id = ?';
      params.push(filters.alertId);
    }
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.startTime) {
      sql += ' AND (sent_at >= ? OR failed_at >= ?)';
      params.push(filters.startTime.toISOString(), filters.startTime.toISOString());
    }
    if (filters?.endTime) {
      sql += ' AND created_at <= ?';
      params.push(filters.endTime.toISOString());
    }

    sql += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => ({
      id: row.id,
      channel: row.channel,
      alertId: row.alert_id || undefined,
      messageId: row.message_id || undefined,
      status: row.status as 'pending' | 'sent' | 'delivered' | 'failed',
      sentAt: this.fromIsoString(row.sent_at),
      deliveredAt: this.fromIsoString(row.delivered_at),
      failedAt: this.fromIsoString(row.failed_at),
      error: row.error || undefined,
    }));
  }

  public async saveBaseline(baseline: BaselineData): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO baseline_data (entity_id, metric, period, mean, std_dev, min, max, samples, last_updated)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(entity_id, metric, period) DO UPDATE SET
        mean = excluded.mean,
        std_dev = excluded.std_dev,
        min = excluded.min,
        max = excluded.max,
        samples = excluded.samples,
        last_updated = excluded.last_updated
    `);

    stmt.run(
      baseline.entityId,
      baseline.metric,
      baseline.period,
      baseline.mean,
      baseline.stdDev,
      baseline.min,
      baseline.max,
      baseline.samples,
      baseline.lastUpdated.toISOString()
    );
  }

  public async getBaseline(entityId: string, metric: string): Promise<BaselineData | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db.prepare(
      'SELECT * FROM baseline_data WHERE entity_id = ? AND metric = ?'
    ).get(entityId, metric) as any;

    if (!row) return null;
    return this.rowToBaselineData(row);
  }

  public async getBaselines(metric?: string): Promise<BaselineData[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM baseline_data';
    const params: any[] = [];

    if (metric) {
      sql += ' WHERE metric = ?';
      params.push(metric);
    }

    sql += ' ORDER BY entity_id, metric, period';

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => this.rowToBaselineData(row));
  }

  private rowToBaselineData(row: any): BaselineData {
    return {
      entityId: row.entity_id,
      metric: row.metric,
      period: row.period,
      mean: row.mean,
      stdDev: row.std_dev,
      min: row.min,
      max: row.max,
      samples: row.samples,
      lastUpdated: new Date(row.last_updated),
    };
  }

  public async saveCollectorConfig(config: CollectorConfig): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = this.db.prepare('SELECT id FROM collector_configs WHERE id = ?').get(config.id);

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE collector_configs SET
          type = ?, base_url = ?, auth_type = ?, auth_token = ?,
          auth_username = ?, auth_password = ?, enabled = ?, config = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `);

      stmt.run(
        config.type,
        config.baseUrl,
        config.auth?.type || 'none',
        config.auth?.token || null,
        config.auth?.username || null,
        config.auth?.password || null,
        config.enabled ? 1 : 0,
        JSON.stringify(config.config || {}),
        config.id
      );
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO collector_configs (
          id, type, base_url, auth_type, auth_token,
          auth_username, auth_password, enabled, config
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        config.id,
        config.type,
        config.baseUrl,
        config.auth?.type || 'none',
        config.auth?.token || null,
        config.auth?.username || null,
        config.auth?.password || null,
        config.enabled ? 1 : 0,
        JSON.stringify(config.config || {})
      );
    }
  }

  public async getCollectorConfigs(): Promise<CollectorConfig[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.prepare('SELECT * FROM collector_configs ORDER BY created_at').all() as any[];
    return rows.map((row) => ({
      id: row.id,
      type: row.type as DataSourceType,
      baseUrl: row.base_url,
      auth: row.auth_type && row.auth_type !== 'none'
        ? {
            type: row.auth_type as 'bearer' | 'basic' | 'none',
            token: row.auth_token || undefined,
            username: row.auth_username || undefined,
            password: row.auth_password || undefined,
          }
        : undefined,
      enabled: row.enabled === 1,
      config: this.parseJson(row.config, {}),
    }));
  }

  public async saveNotifierConfig(config: NotifierConfig): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = this.db.prepare('SELECT id FROM notifier_configs WHERE id = ?').get(config.id);

    if (existing) {
      const stmt = this.db.prepare(`
        UPDATE notifier_configs SET
          type = ?, name = ?, enabled = ?, config = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `);

      stmt.run(
        config.type,
        config.name,
        config.enabled ? 1 : 0,
        JSON.stringify(config.config || {}),
        config.id
      );
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO notifier_configs (id, type, name, enabled, config)
        VALUES (?, ?, ?, ?, ?)
      `);

      stmt.run(
        config.id,
        config.type,
        config.name,
        config.enabled ? 1 : 0,
        JSON.stringify(config.config || {})
      );
    }
  }

  public async getNotifierConfigs(): Promise<NotifierConfig[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.prepare('SELECT * FROM notifier_configs ORDER BY created_at').all() as any[];
    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      name: row.name,
      enabled: row.enabled === 1,
      config: this.parseJson(row.config, {}),
    }));
  }

  public async createScan(scan: DetectionScan): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO detection_scans (id, status, rule_ids, start_time, end_time, time_range_start, time_range_end, results, error)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      scan.id,
      scan.status,
      JSON.stringify(scan.ruleIds),
      scan.startTime.toISOString(),
      scan.endTime?.toISOString() || null,
      scan.timeRange?.start.toISOString() || null,
      scan.timeRange?.end.toISOString() || null,
      scan.results ? JSON.stringify(scan.results) : null,
      scan.error || null
    );
  }

  public async updateScan(scanId: string, updates: Partial<DetectionScan>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const fields: string[] = [];
    const params: any[] = [];

    if (updates.status !== undefined) {
      fields.push('status = ?');
      params.push(updates.status);
    }
    if (updates.endTime !== undefined) {
      fields.push('end_time = ?');
      params.push(this.toIsoString(updates.endTime));
    }
    if (updates.results !== undefined) {
      fields.push('results = ?');
      params.push(JSON.stringify(updates.results));
    }
    if (updates.error !== undefined) {
      fields.push('error = ?');
      params.push(updates.error || null);
    }

    if (fields.length === 0) return;

    params.push(scanId);
    const sql = `UPDATE detection_scans SET ${fields.join(', ')} WHERE id = ?`;
    this.db.prepare(sql).run(...params);
  }

  public async getScan(scanId: string): Promise<DetectionScan | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db.prepare('SELECT * FROM detection_scans WHERE id = ?').get(scanId) as any;
    if (!row) return null;
    return this.rowToDetectionScan(row);
  }

  public async getScans(limit?: number, offset?: number): Promise<DetectionScan[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM detection_scans ORDER BY start_time DESC';
    const params: any[] = [];

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    if (offset) {
      sql += ' OFFSET ?';
      params.push(offset);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => this.rowToDetectionScan(row));
  }

  private rowToDetectionScan(row: any): DetectionScan {
    return {
      id: row.id,
      status: row.status as 'pending' | 'running' | 'completed' | 'failed',
      ruleIds: this.parseJson(row.rule_ids, []),
      startTime: new Date(row.start_time),
      endTime: this.fromIsoString(row.end_time),
      timeRange: row.time_range_start && row.time_range_end
        ? {
            start: new Date(row.time_range_start),
            end: new Date(row.time_range_end),
          }
        : undefined,
      results: this.parseJson(row.results, undefined),
      error: row.error || undefined,
    };
  }

  public async saveRecommendation(rec: AutomationRecommendation): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO automation_recommendations (
        id, title, description, type, platform, format, code,
        confidence, estimated_effort, impact_score, risk_level,
        related_alerts, prerequisites, alternatives, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      rec.id,
      rec.title,
      rec.description,
      rec.type,
      rec.platform,
      rec.format,
      rec.code,
      rec.confidence,
      rec.estimatedEffort,
      rec.impactScore,
      rec.riskLevel,
      JSON.stringify(rec.relatedAlerts),
      JSON.stringify(rec.prerequisites),
      JSON.stringify(rec.alternatives)
    );
  }

  public async getRecommendations(filters?: {
    platform?: string;
    type?: string;
    applied?: boolean;
    limit?: number;
  }): Promise<AutomationRecommendation[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM automation_recommendations WHERE 1=1';
    const params: any[] = [];

    if (filters?.platform) {
      sql += ' AND platform = ?';
      params.push(filters.platform);
    }
    if (filters?.type) {
      sql += ' AND type = ?';
      params.push(filters.type);
    }
    if (filters?.applied !== undefined) {
      sql += ' AND applied = ?';
      params.push(filters.applied ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type as 'remediation' | 'prevention' | 'enhancement' | 'response' | 'monitoring',
      platform: row.platform,
      format: row.format,
      code: row.code,
      confidence: row.confidence,
      estimatedEffort: row.estimated_effort as 'low' | 'medium' | 'high',
      impactScore: row.impact_score,
      riskLevel: row.risk_level as 'low' | 'medium' | 'high',
      relatedAlerts: this.parseJson(row.related_alerts, []),
      prerequisites: this.parseJson(row.prerequisites, []),
      alternatives: this.parseJson(row.alternatives, []),
      createdAt: new Date(row.created_at),
    }));
  }

  public async markRecommendationApplied(recId: string, platformEntityId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.prepare(
      'UPDATE automation_recommendations SET applied = 1, platform_entity_id = ? WHERE id = ?'
    ).run(platformEntityId, recId);
  }

  public async cleanupOldData(): Promise<{
    deletedStates: number;
    deletedEvents: number;
    deletedLogs: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const retentionDays = this.config.logRetentionDays;
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

    const result = {
      deletedStates: 0,
      deletedEvents: 0,
      deletedLogs: 0,
    };

    const tx = this.db.transaction(() => {
      let res;

      res = this.db!.prepare(
        'DELETE FROM entity_states WHERE recorded_at < ?'
      ).run(cutoffDate);
      result.deletedStates = res.changes;

      res = this.db!.prepare(
        'DELETE FROM collected_events WHERE recorded_at < ?'
      ).run(cutoffDate);
      result.deletedEvents = res.changes;

      res = this.db!.prepare(
        'DELETE FROM notification_logs WHERE created_at < ?'
      ).run(cutoffDate);
      result.deletedLogs = res.changes;
    });

    tx();
    return result;
  }

  public async getStats(): Promise<{
    entityStates: number;
    events: number;
    alerts: number;
    activeAlerts: number;
    rules: number;
    baselines: number;
    notifications: number;
    databaseSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const entityStatesRow = this.db.prepare('SELECT COUNT(*) as count FROM entity_states').get() as { count: number };
    const eventsRow = this.db.prepare('SELECT COUNT(*) as count FROM collected_events').get() as { count: number };
    const alertsRow = this.db.prepare('SELECT COUNT(*) as count FROM alerts').get() as { count: number };
    const activeAlertsRow = this.db.prepare(
      "SELECT COUNT(*) as count FROM alerts WHERE status IN ('new', 'active', 'acknowledged')"
    ).get() as { count: number };
    const rulesRow = this.db.prepare('SELECT COUNT(*) as count FROM detection_rules').get() as { count: number };
    const baselinesRow = this.db.prepare('SELECT COUNT(*) as count FROM baseline_data').get() as { count: number };
    const notificationsRow = this.db.prepare('SELECT COUNT(*) as count FROM notification_logs').get() as { count: number };

    let databaseSize = 0;
    try {
      const pageCountRow = this.db.prepare('PRAGMA page_count').get() as { page_count: number };
      const pageSizeRow = this.db.prepare('PRAGMA page_size').get() as { page_size: number };
      databaseSize = pageCountRow.page_count * pageSizeRow.page_size;
    } catch {
      // Ignore size calculation errors
    }

    return {
      entityStates: entityStatesRow.count,
      events: eventsRow.count,
      alerts: alertsRow.count,
      activeAlerts: activeAlertsRow.count,
      rules: rulesRow.count,
      baselines: baselinesRow.count,
      notifications: notificationsRow.count,
      databaseSize,
    };
  }

  public getDatabasePath(): string {
    return this.config.databasePath;
  }

  public getLogRetentionDays(): number {
    return this.config.logRetentionDays;
  }

  public setLogRetentionDays(days: number): void {
    this.config.logRetentionDays = Math.max(1, days);
  }

  public async getSystemConfig(key: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db.prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value || null;
  }

  public async setSystemConfig(key: string, value: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.prepare(`
      INSERT INTO system_config (key, value, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
    `).run(key, value);
  }

  public async runTransaction<T>(fn: () => T): Promise<T> {
    if (!this.db) throw new Error('Database not initialized');

    const tx = this.db.transaction(fn);
    return tx();
  }

  public async saveChatMessage(
    sessionId: string,
    message: {
      role: string;
      content: string | null;
      tool_calls?: any[];
      tool_call_id?: string;
      name?: string;
    },
    tokenCount?: number,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const stmt = this.db.prepare(`
      INSERT INTO chat_messages (session_id, role, content, tool_calls, tool_call_id, name, token_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      sessionId,
      message.role,
      message.content,
      message.tool_calls ? JSON.stringify(message.tool_calls) : null,
      message.tool_call_id || null,
      message.name || null,
      tokenCount || 0
    );

    this.db.prepare(`
      INSERT INTO chat_sessions (id, title, last_message_at, updated_at)
      VALUES (?, ?, datetime('now'), datetime('now'))
      ON CONFLICT(id) DO UPDATE SET
        last_message_at = datetime('now'),
        updated_at = datetime('now')
    `).run(sessionId, sessionId);
  }

  public async getChatMessages(sessionId: string, limit?: number): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC';
    const params: any[] = [sessionId];

    if (limit) {
      sql += ' LIMIT ?';
      params.push(limit);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];
    return rows.map((row) => ({
      role: row.role,
      content: row.content,
      tool_calls: row.tool_calls ? JSON.parse(row.tool_calls) : undefined,
      tool_call_id: row.tool_call_id || undefined,
      name: row.name || undefined,
    }));
  }

  public async clearChatMessages(sessionId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.prepare('DELETE FROM chat_messages WHERE session_id = ?').run(sessionId);
    this.db.prepare('DELETE FROM chat_sessions WHERE id = ?').run(sessionId);
  }

  public async getChatSessions(): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.prepare('SELECT * FROM chat_sessions ORDER BY last_message_at DESC').all() as any[];
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      lastMessageAt: row.last_message_at ? new Date(row.last_message_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  }

  public async upsertKnxGatewayConfig(config: {
    mode?: string;
    individualAddr: string;
    clientAddress: string;
    interfaceType: string;
    devicePath: string;
    gatewayName: string;
    debugErrorLevel: string;
    envPath: string;
    host: string;
    port: number;
    containerName: string;
    portOpen: boolean;
    containerStatus: string;
  }): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.prepare(`
      INSERT INTO knx_gateway_config (
        id, mode, individual_addr, client_address, interface_type, device_path,
        gateway_name, debug_error_level, env_path, host, port, container_name,
        port_open, container_status, updated_at
      ) VALUES (
        1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now')
      )
      ON CONFLICT(id) DO UPDATE SET
        mode = excluded.mode,
        individual_addr = excluded.individual_addr,
        client_address = excluded.client_address,
        interface_type = excluded.interface_type,
        device_path = excluded.device_path,
        gateway_name = excluded.gateway_name,
        debug_error_level = excluded.debug_error_level,
        env_path = excluded.env_path,
        host = excluded.host,
        port = excluded.port,
        container_name = excluded.container_name,
        port_open = excluded.port_open,
        container_status = excluded.container_status,
        updated_at = datetime('now')
    `).run(
      config.mode || 'router',
      config.individualAddr,
      config.clientAddress,
      config.interfaceType,
      config.devicePath,
      config.gatewayName,
      config.debugErrorLevel,
      config.envPath,
      config.host,
      config.port,
      config.containerName,
      config.portOpen ? 1 : 0,
      config.containerStatus,
    );
  }

  public async getKnxGatewayConfig(): Promise<Record<string, unknown> | null> {
    if (!this.db) throw new Error('Database not initialized');

    const row = this.db.prepare('SELECT * FROM knx_gateway_config WHERE id = 1').get() as any;
    if (!row) {
      return null;
    }

    return {
      mode: row.mode,
      individualAddr: row.individual_addr,
      clientAddress: row.client_address,
      interfaceType: row.interface_type,
      devicePath: row.device_path,
      gatewayName: row.gateway_name,
      debugErrorLevel: row.debug_error_level,
      envPath: row.env_path,
      host: row.host,
      port: row.port,
      containerName: row.container_name,
      portOpen: row.port_open === 1,
      containerStatus: row.container_status,
      updatedAt: row.updated_at,
    };
  }

  public async listKnxGroupAddresses(limit = 100): Promise<Array<Record<string, unknown>>> {
    if (!this.db) throw new Error('Database not initialized');

    const rows = this.db.prepare(
      'SELECT * FROM knx_group_addresses ORDER BY address ASC LIMIT ?',
    ).all(limit) as any[];

    return rows.map((row) => ({
      id: row.id,
      address: row.address,
      name: row.name,
      dpt: row.dpt,
      source: row.source,
      inUse: row.in_use === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }
}
