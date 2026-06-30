import {
  HAAutomationConfig,
  AutomationTrigger,
  AutomationCondition,
  AutomationAction,
  AutomationValidationResult,
  DeviceInfo,
  TriggerType,
  ConditionType,
  ActionType,
} from '../types';

const VALID_TRIGGER_PLATFORMS: TriggerType[] = [
  'state',
  'time',
  'sun',
  'event',
  'zone',
  'numeric_state',
];

const VALID_CONDITION_TYPES: ConditionType[] = [
  'state',
  'time',
  'numeric_state',
  'and',
  'or',
  'not',
];

const VALID_ACTION_TYPES: ActionType[] = ['service', 'scene', 'delay', 'choose'];

export class HAAutomationBuilder {
  private config: HAAutomationConfig;
  private availableDevices: DeviceInfo[];

  constructor(id?: string, alias?: string) {
    this.config = {
      id: id || this.generateId(),
      alias: alias || 'Unnamed Automation',
      description: '',
      trigger: [],
      condition: [],
      action: [],
      mode: 'single',
    };
    this.availableDevices = [];
  }

  private generateId(): string {
    return `auto_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  public setId(id: string): HAAutomationBuilder {
    this.config.id = id;
    return this;
  }

  public setAlias(alias: string): HAAutomationBuilder {
    this.config.alias = alias;
    return this;
  }

  public setDescription(description: string): HAAutomationBuilder {
    this.config.description = description;
    return this;
  }

  public setMode(mode: 'single' | 'restart' | 'queued' | 'parallel'): HAAutomationBuilder {
    this.config.mode = mode;
    return this;
  }

  public setAvailableDevices(devices: DeviceInfo[]): HAAutomationBuilder {
    this.availableDevices = devices;
    return this;
  }

  public addTrigger(trigger: AutomationTrigger): HAAutomationBuilder {
    this.config.trigger.push(trigger);
    return this;
  }

  public addStateTrigger(
    entityId: string,
    options?: {
      from?: string;
      to?: string;
      for?: string;
      id?: string;
    },
  ): HAAutomationBuilder {
    const trigger: AutomationTrigger = {
      platform: 'state',
      entity_id: entityId,
      ...options,
    };
    this.config.trigger.push(trigger);
    return this;
  }

  public addTimeTrigger(at: string, id?: string): HAAutomationBuilder {
    const trigger: AutomationTrigger = {
      platform: 'time',
      at,
    };
    if (id) {
      trigger.id = id;
    }
    this.config.trigger.push(trigger);
    return this;
  }

  public addSunTrigger(
    event: 'sunrise' | 'sunset',
    options?: {
      offset?: string;
      id?: string;
    },
  ): HAAutomationBuilder {
    const trigger: AutomationTrigger = {
      platform: 'sun',
      event,
      ...options,
    };
    this.config.trigger.push(trigger);
    return this;
  }

  public addEventTrigger(
    eventType: string,
    options?: {
      eventData?: Record<string, any>;
      id?: string;
    },
  ): HAAutomationBuilder {
    const trigger: AutomationTrigger = {
      platform: 'event',
      event_type: eventType,
      ...(options?.eventData ? { event_data: options.eventData } : {}),
    };
    if (options?.id) {
      trigger.id = options.id;
    }
    this.config.trigger.push(trigger);
    return this;
  }

  public addZoneTrigger(
    entityId: string,
    zone: string,
    event: 'enter' | 'leave' = 'enter',
    id?: string,
  ): HAAutomationBuilder {
    const trigger: AutomationTrigger = {
      platform: 'zone',
      entity_id: entityId,
      zone,
      event,
    };
    if (id) {
      trigger.id = id;
    }
    this.config.trigger.push(trigger);
    return this;
  }

  public addNumericStateTrigger(
    entityId: string,
    options: {
      above?: number;
      below?: number;
      for?: string;
      value_template?: string;
      id?: string;
    },
  ): HAAutomationBuilder {
    const trigger: AutomationTrigger = {
      platform: 'numeric_state',
      entity_id: entityId,
      ...options,
    };
    this.config.trigger.push(trigger);
    return this;
  }

  public addCondition(condition: AutomationCondition): HAAutomationBuilder {
    this.config.condition.push(condition);
    return this;
  }

  public addStateCondition(
    entityId: string,
    state: string | string[],
    options?: {
      for?: string;
      attribute?: string;
    },
  ): HAAutomationBuilder {
    const condition: AutomationCondition = {
      condition: 'state',
      entity_id: entityId,
      state,
      ...options,
    };
    this.config.condition.push(condition);
    return this;
  }

  public addTimeCondition(
    options: {
      after?: string;
      before?: string;
      weekday?: string[];
    },
  ): HAAutomationBuilder {
    const condition: AutomationCondition = {
      condition: 'time',
      ...options,
    };
    this.config.condition.push(condition);
    return this;
  }

  public addNumericStateCondition(
    entityId: string,
    options: {
      above?: number;
      below?: number;
      value_template?: string;
    },
  ): HAAutomationBuilder {
    const condition: AutomationCondition = {
      condition: 'numeric_state',
      entity_id: entityId,
      ...options,
    };
    this.config.condition.push(condition);
    return this;
  }

  public addAndCondition(conditions: AutomationCondition[]): HAAutomationBuilder {
    const condition: AutomationCondition = {
      condition: 'and',
      conditions,
    };
    this.config.condition.push(condition);
    return this;
  }

  public addOrCondition(conditions: AutomationCondition[]): HAAutomationBuilder {
    const condition: AutomationCondition = {
      condition: 'or',
      conditions,
    };
    this.config.condition.push(condition);
    return this;
  }

  public addNotCondition(condition: AutomationCondition): HAAutomationBuilder {
    const cond: AutomationCondition = {
      condition: 'not',
      conditions: [condition],
    };
    this.config.condition.push(cond);
    return this;
  }

  public addAction(action: AutomationAction): HAAutomationBuilder {
    this.config.action.push(action);
    return this;
  }

  public addServiceAction(
    service: string,
    options?: {
      target?: Record<string, any>;
      data?: Record<string, any>;
      data_template?: Record<string, any>;
    },
  ): HAAutomationBuilder {
    const action: AutomationAction = {
      service,
      ...options,
    };
    this.config.action.push(action);
    return this;
  }

  public addSceneAction(scene: string): HAAutomationBuilder {
    const action: AutomationAction = {
      scene: scene,
    };
    this.config.action.push(action);
    return this;
  }

  public addDelayAction(delay: string | number): HAAutomationBuilder {
    const action: AutomationAction = {
      delay,
    };
    this.config.action.push(action);
    return this;
  }

  public addChooseAction(
    options: {
      conditions: AutomationCondition[];
      sequence: AutomationAction[];
    }[],
    defaultActions?: AutomationAction[],
  ): HAAutomationBuilder {
    const action: AutomationAction = {
      choose: options.map((opt) => ({
        conditions: opt.conditions,
        sequence: opt.sequence,
      })),
    };
    if (defaultActions) {
      action.default = defaultActions;
    }
    this.config.action.push(action);
    return this;
  }

  public build(): HAAutomationConfig {
    return { ...this.config };
  }

  public toYaml(): string {
    return this.convertToYaml(this.config);
  }

  private convertToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let result = '';

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (typeof item === 'object' && item !== null) {
          result += `${spaces}-\n`;
          result += this.convertToYaml(item, indent + 1);
        } else {
          result += `${spaces}- ${this.formatValue(item)}\n`;
        }
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) {
          continue;
        }
        if (typeof value === 'object' && !Array.isArray(value)) {
          result += `${spaces}${key}:\n`;
          result += this.convertToYaml(value, indent + 1);
        } else if (Array.isArray(value)) {
          if (value.length === 0) {
            result += `${spaces}${key}: []\n`;
          } else {
            result += `${spaces}${key}:\n`;
            result += this.convertToYaml(value, indent + 1);
          }
        } else {
          result += `${spaces}${key}: ${this.formatValue(value)}\n`;
        }
      }
    }

    return result;
  }

  private formatValue(value: any): string {
    if (typeof value === 'string') {
      if (value.includes(':') || value.includes('#') || value.includes('{') || value.includes('}')) {
        return `"${value.replace(/"/g, '\\"')}"`;
      }
      return value;
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    return String(value);
  }

  public validate(): AutomationValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const missingEntities: string[] = [];
    const conflicts: string[] = [];

    if (!this.config.id) {
      errors.push('自动化 ID 不能为空');
    }

    if (!this.config.alias) {
      errors.push('自动化名称不能为空');
    }

    if (this.config.trigger.length === 0) {
      errors.push('至少需要一个触发器');
    }

    for (let i = 0; i < this.config.trigger.length; i++) {
      const trigger = this.config.trigger[i];
      if (!VALID_TRIGGER_PLATFORMS.includes(trigger.platform)) {
        errors.push(`触发器 ${i + 1}: 不支持的触发器类型 '${trigger.platform}'`);
      }

      if (trigger.platform === 'state' && !trigger.entity_id) {
        errors.push(`触发器 ${i + 1}: state 触发器需要 entity_id`);
      }

      if (trigger.platform === 'time' && !trigger.at) {
        errors.push(`触发器 ${i + 1}: time 触发器需要 at`);
      }

      if (trigger.platform === 'sun' && !trigger.event) {
        errors.push(`触发器 ${i + 1}: sun 触发器需要 event`);
      }

      if (trigger.platform === 'event' && !trigger.event_type) {
        errors.push(`触发器 ${i + 1}: event 触发器需要 event_type`);
      }

      if (trigger.platform === 'zone' && (!trigger.entity_id || !trigger.zone)) {
        errors.push(`触发器 ${i + 1}: zone 触发器需要 entity_id 和 zone`);
      }

      if (trigger.platform === 'numeric_state' && !trigger.entity_id) {
        errors.push(`触发器 ${i + 1}: numeric_state 触发器需要 entity_id`);
      }

      if (
        trigger.entity_id &&
        this.availableDevices.length > 0 &&
        !this.deviceExists(trigger.entity_id)
      ) {
        missingEntities.push(trigger.entity_id);
      }
    }

    for (let i = 0; i < this.config.condition.length; i++) {
      const condition = this.config.condition[i];
      if (!VALID_CONDITION_TYPES.includes(condition.condition)) {
        errors.push(`条件 ${i + 1}: 不支持的条件类型 '${condition.condition}'`);
      }

      if (condition.entity_id && !this.deviceExists(condition.entity_id)) {
        missingEntities.push(condition.entity_id);
      }
    }

    if (this.config.action.length === 0) {
      warnings.push('没有配置任何动作');
    }

    const serviceEntities = this.extractEntityIdsFromActions();
    for (const entityId of serviceEntities) {
      if (this.availableDevices.length > 0 && !this.deviceExists(entityId)) {
        missingEntities.push(entityId);
      }
    }

    if (this.config.trigger.length > 1 && this.config.mode === 'single') {
      warnings.push('多个触发器配合 single 模式可能导致部分触发被忽略');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      missingEntities: [...new Set(missingEntities)],
      conflicts,
    };
  }

  private deviceExists(entityId: string): boolean {
    return this.availableDevices.some((d) => d.entityId === entityId);
  }

  private extractEntityIdsFromActions(): string[] {
    const entityIds: string[] = [];

    for (const action of this.config.action) {
      if (action.target?.entity_id) {
        if (Array.isArray(action.target.entity_id)) {
          entityIds.push(...action.target.entity_id);
        } else {
          entityIds.push(action.target.entity_id);
        }
      }
      if (action.entity_id) {
        if (Array.isArray(action.entity_id)) {
          entityIds.push(...action.entity_id);
        } else {
          entityIds.push(action.entity_id);
        }
      }
      if (action.choose) {
        for (const choice of action.choose) {
          if (choice.sequence) {
            for (const seqAction of choice.sequence) {
              if (seqAction.target?.entity_id) {
                if (Array.isArray(seqAction.target.entity_id)) {
                  entityIds.push(...seqAction.target.entity_id);
                } else {
                  entityIds.push(seqAction.target.entity_id);
                }
              }
            }
          }
        }
      }
    }

    return entityIds;
  }

  public static fromConfig(config: HAAutomationConfig): HAAutomationBuilder {
    const builder = new HAAutomationBuilder(config.id, config.alias);
    builder.config = { ...config };
    return builder;
  }

  public static fromYaml(yaml: string): HAAutomationBuilder {
    const config = HAAutomationBuilder.parseYaml(yaml);
    return HAAutomationBuilder.fromConfig(config);
  }

  private static parseYaml(yaml: string): HAAutomationConfig {
    const lines = yaml.split('\n').filter((l) => l.trim() !== '' && !l.trim().startsWith('#'));
    const result: any = {};
    const stack: any[] = [{ obj: result, indent: -1 }];

    for (const line of lines) {
      const indent = line.search(/\S/);
      const content = line.trim();

      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].obj;

      if (content.startsWith('- ')) {
        const itemContent = content.slice(2);
        if (!Array.isArray(parent[stack[stack.length - 1].currentKey || ''])) {
          const key = stack[stack.length - 1].currentKey || '';
          parent[key] = [];
        }
        const arr = parent[stack[stack.length - 1].currentKey || ''];

        if (itemContent.includes(':')) {
          const obj: any = {};
          arr.push(obj);
          stack.push({ obj, indent, currentKey: '' });
          const [key, ...valueParts] = itemContent.split(':');
          const value = valueParts.join(':').trim();
          if (value) {
            obj[key.trim()] = HAAutomationBuilder.parseValue(value);
          } else {
            stack[stack.length - 1].currentKey = key.trim();
          }
        } else {
          arr.push(HAAutomationBuilder.parseValue(itemContent));
        }
      } else {
        const [key, ...valueParts] = content.split(':');
        const value = valueParts.join(':').trim();

        if (value === '' || value === '[]') {
          parent[key.trim()] = [];
          stack.push({ obj: parent[key.trim()], indent, currentKey: '' });
        } else {
          parent[key.trim()] = HAAutomationBuilder.parseValue(value);
        }
      }
    }

    return result as HAAutomationConfig;
  }

  private static parseValue(value: string): any {
    if (value === 'true') return true;
    if (value === 'false') return false;
    if (value === 'null' || value === '') return null;

    const num = Number(value);
    if (!isNaN(num) && value !== '') return num;

    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith("'") && value.endsWith("'")) {
      return value.slice(1, -1);
    }

    return value;
  }

  public async validateWithHA(apiUrl: string, token: string): Promise<AutomationValidationResult> {
    const baseResult = this.validate();

    try {
      const response = await fetch(`${apiUrl}/api/config`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        baseResult.warnings.push(`无法连接到 Home Assistant: ${response.statusText}`);
        return baseResult;
      }
    } catch (error) {
      baseResult.warnings.push(`无法连接到 Home Assistant: ${(error as Error).message}`);
    }

    return baseResult;
  }
}

export default HAAutomationBuilder;
