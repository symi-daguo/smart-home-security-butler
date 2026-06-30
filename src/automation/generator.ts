import { EventEmitter } from 'events';
import {
  AutomationPlatform,
  AutomationType,
  RequirementAnalysis,
  DeviceInfo,
  AutomationGenerationResult,
  AutomationValidationResult,
  AutomationSuggestion,
  Alert,
  DetectionCategory,
  SeverityLevel,
  EntityState,
  DataSourceType,
} from '../types';
import { HAAutomationBuilder } from './ha-automation-builder';
import { KNXSceneBuilder, KNXWorkflowBuilder } from './knx-scene-builder';
import {
  sceneTemplates,
  getTemplatesByCategory,
  getTemplatesByPlatform,
  getTemplateById,
  getAllTemplates,
} from './templates';

export class AutomationGenerator extends EventEmitter {
  private devices: DeviceInfo[];
  private generationHistory: Array<{
    id: string;
    description: string;
    platform: AutomationPlatform;
    type: AutomationType;
    result: AutomationGenerationResult;
    createdAt: Date;
  }>;

  constructor() {
    super();
    this.devices = [];
    this.generationHistory = [];
  }

  public setDevices(devices: DeviceInfo[]): void {
    this.devices = [...devices];
  }

  public getDevices(): DeviceInfo[] {
    return [...this.devices];
  }

  public analyzeRequirement(description: string): RequirementAnalysis {
    const lowerDesc = description.toLowerCase();

    let automationType: AutomationType = 'scene';
    let platform: AutomationPlatform = 'homeassistant';

    if (lowerDesc.includes('knx')) {
      platform = 'knx-gateway';
    } else if (lowerDesc.includes('home assistant') || lowerDesc.includes('ha')) {
      platform = 'homeassistant';
    }

    if (
      lowerDesc.includes('安全') ||
      lowerDesc.includes('安防') ||
      lowerDesc.includes('布防') ||
      lowerDesc.includes('撤防') ||
      lowerDesc.includes('入侵') ||
      lowerDesc.includes('报警') ||
      lowerDesc.includes('门锁')
    ) {
      automationType = 'security';
    } else if (
      lowerDesc.includes('节能') ||
      lowerDesc.includes('省电') ||
      lowerDesc.includes('温度') ||
      lowerDesc.includes('空调') ||
      lowerDesc.includes('关灯') ||
      lowerDesc.includes('无人')
    ) {
      automationType = 'energy';
    } else if (
      lowerDesc.includes('通知') ||
      lowerDesc.includes('提醒') ||
      lowerDesc.includes('告警') ||
      lowerDesc.includes('报警')
    ) {
      automationType = 'notification';
    } else {
      automationType = 'scene';
    }

    const devices: string[] = [];
    const triggers: any[] = [];
    const conditions: any[] = [];
    const actions: any[] = [];
    const parameters: Record<string, any> = {};

    if (lowerDesc.includes('离家') || lowerDesc.includes('出门')) {
      devices.push('light', 'lock', 'alarm_control_panel');
      triggers.push({
        platform: 'state',
        entity_id: 'input_boolean.away_mode',
        from: 'off',
        to: 'on',
      });
      actions.push({ type: 'turn_off', target: 'lights' });
      actions.push({ type: 'lock', target: 'doors' });
      actions.push({ type: 'arm', target: 'alarm' });
    }

    if (lowerDesc.includes('回家') || lowerDesc.includes('到家')) {
      devices.push('light', 'climate', 'alarm_control_panel');
      triggers.push({
        platform: 'state',
        entity_id: 'input_boolean.away_mode',
        from: 'on',
        to: 'off',
      });
      actions.push({ type: 'turn_on', target: 'lights' });
      actions.push({ type: 'disarm', target: 'alarm' });
    }

    if (lowerDesc.includes('睡觉') || lowerDesc.includes('睡眠') || lowerDesc.includes('晚安')) {
      devices.push('light', 'lock');
      triggers.push({
        platform: 'time',
        at: '22:30:00',
      });
      actions.push({ type: 'turn_off', target: 'lights' });
      actions.push({ type: 'lock', target: 'doors' });
      parameters.nightLight = true;
    }

    if (lowerDesc.includes('早安') || lowerDesc.includes('起床') || lowerDesc.includes('早上')) {
      devices.push('light', 'cover');
      triggers.push({
        platform: 'time',
        at: '07:00:00',
      });
      actions.push({ type: 'turn_on', target: 'lights' });
      actions.push({ type: 'open', target: 'covers' });
      parameters.weekdaysOnly = true;
    }

    if (lowerDesc.includes('电影') || lowerDesc.includes('观影')) {
      devices.push('light');
      triggers.push({
        platform: 'state',
        entity_id: 'input_boolean.movie_mode',
        from: 'off',
        to: 'on',
      });
      actions.push({ type: 'dim', target: 'lights' });
      parameters.brightness = 15;
    }

    if (lowerDesc.includes('无人关灯') || (lowerDesc.includes('无人') && lowerDesc.includes('灯'))) {
      devices.push('light');
      triggers.push({
        platform: 'state',
        entity_id: 'group.family',
        from: 'home',
        to: 'not_home',
      });
      actions.push({ type: 'turn_off', target: 'lights' });
      parameters.delayMinutes = 5;
    }

    const timeMatch = description.match(/(晚上|早上|上午|下午|凌晨)?\s*(\d{1,2})[点时](\d{1,2})?(分)?/);
    if (timeMatch && !triggers.some(t => t.platform === 'time')) {
      let hour = parseInt(timeMatch[2], 10);
      const minute = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
      const period = timeMatch[1];

      if ((period === '晚上' || period === '下午') && hour < 12) {
        hour += 12;
      }
      if (period === '凌晨' && hour === 12) {
        hour = 0;
      }

      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
      triggers.push({
        platform: 'time',
        at: timeStr,
      });
    }

    const doorKeywords = ['门', '前门', '后门', '车库门', '门锁', '开门', '门开'];
    const windowKeywords = ['窗', '窗户', '开窗'];
    const motionKeywords = ['运动', '移动', '有人', '人体感应', 'motion'];

    if (doorKeywords.some(kw => lowerDesc.includes(kw))) {
      devices.push('binary_sensor', 'lock');
      if (!triggers.some(t => t.platform === 'state' && t.entity_id?.includes('door'))) {
        triggers.push({
          platform: 'state',
          entity_id: 'binary_sensor.front_door',
          from: 'off',
          to: 'on',
        });
      }
    }

    if (windowKeywords.some(kw => lowerDesc.includes(kw))) {
      devices.push('binary_sensor');
      if (!triggers.some(t => t.platform === 'state' && t.entity_id?.includes('window'))) {
        triggers.push({
          platform: 'state',
          entity_id: 'binary_sensor.window',
          from: 'off',
          to: 'on',
        });
      }
    }

    if (motionKeywords.some(kw => lowerDesc.includes(kw))) {
      devices.push('binary_sensor');
      triggers.push({
        platform: 'state',
        entity_id: 'binary_sensor.motion',
        from: 'off',
        to: 'on',
      });
    }

    if (
      lowerDesc.includes('通知') ||
      lowerDesc.includes('提醒') ||
      lowerDesc.includes('告警') ||
      lowerDesc.includes('报警') ||
      lowerDesc.includes('发消息') ||
      lowerDesc.includes('发送')
    ) {
      actions.push({
        type: 'notify',
        target: 'mobile_app',
        message: description,
      });
    }

    if (lowerDesc.includes('开灯') || (lowerDesc.includes('打开') && lowerDesc.includes('灯'))) {
      devices.push('light');
      actions.push({ type: 'turn_on', target: 'lights' });
    }

    if (lowerDesc.includes('关灯') || (lowerDesc.includes('关闭') && lowerDesc.includes('灯'))) {
      devices.push('light');
      actions.push({ type: 'turn_off', target: 'lights' });
    }

    if (lowerDesc.includes('开空调') || (lowerDesc.includes('打开') && lowerDesc.includes('空调'))) {
      devices.push('climate');
      actions.push({ type: 'turn_on', target: 'climate' });
    }

    if (lowerDesc.includes('关空调') || (lowerDesc.includes('关闭') && lowerDesc.includes('空调'))) {
      devices.push('climate');
      actions.push({ type: 'turn_off', target: 'climate' });
    }

    if (lowerDesc.includes('锁门') || lowerDesc.includes('锁上')) {
      devices.push('lock');
      actions.push({ type: 'lock', target: 'doors' });
    }

    if (lowerDesc.includes('开门') || lowerDesc.includes('解锁')) {
      devices.push('lock');
      actions.push({ type: 'unlock', target: 'doors' });
    }

    const afterMatch = lowerDesc.match(/(\d+)\s*(分钟|小时|秒|分|时)后/);
    if (afterMatch) {
      const value = parseInt(afterMatch[1], 10);
      const unit = afterMatch[2];
      let delaySeconds = value;
      if (unit.includes('分')) delaySeconds = value * 60;
      if (unit.includes('时') || unit.includes('小时')) delaySeconds = value * 3600;
      parameters.delaySeconds = delaySeconds;

      if (actions.length > 0) {
        const lastAction = actions[actions.length - 1];
        lastAction.delay = { seconds: delaySeconds };
      }
    }

    let confidence = 0.3;
    if (devices.length > 0) confidence += 0.15;
    if (triggers.length > 0) confidence += 0.2;
    if (actions.length > 0) confidence += 0.2;
    if (conditions.length > 0) confidence += 0.1;

    confidence = Math.min(confidence, 0.95);

    const entities = this.extractEntityIds(description);

    const analysis: RequirementAnalysis = {
      rawDescription: description,
      automationType,
      platform,
      devices,
      triggers,
      conditions,
      actions,
      confidence,
      entities,
      parameters,
    };

    this.emit('requirement_analyzed', analysis);
    return analysis;
  }

  private extractEntityIds(description: string): string[] {
    const entityPattern = /[a-z_]+\.[a-z0-9_]+/g;
    const matches = description.match(entityPattern);
    return matches ? [...new Set(matches)] : [];
  }

  public discoverDevices(): DeviceInfo[] {
    return [...this.devices];
  }

  public getDeviceByDomain(domain: string): DeviceInfo[] {
    return this.devices.filter((d) => d.domain === domain);
  }

  public generateAutomation(
    requirements: RequirementAnalysis | string,
    platform: AutomationPlatform = 'homeassistant',
  ): AutomationGenerationResult {
    let analysis: RequirementAnalysis;

    if (typeof requirements === 'string') {
      analysis = this.analyzeRequirement(requirements);
    } else {
      analysis = requirements;
    }

    const matchedTemplates = this.findMatchingTemplates(analysis);

    if (matchedTemplates.length > 0) {
      const bestTemplate = matchedTemplates[0];
      const params = this.buildTemplateParams(analysis, bestTemplate.parameters);
      const result = bestTemplate.generate(params, this.devices);

      this.recordHistory(analysis.rawDescription, analysis.platform, analysis.automationType, result);

      this.emit('automation_generated', result);
      return result;
    }

    return this.generateFromScratch(analysis, platform);
  }

  private findMatchingTemplates(analysis: RequirementAnalysis) {
    const categoryTemplates = getTemplatesByCategory(analysis.automationType);
    const platformTemplates = categoryTemplates.filter((t) =>
      t.platform.includes(analysis.platform),
    );

    const scoredTemplates = platformTemplates.map((template) => {
      let score = 0;

      const lowerDesc = analysis.rawDescription.toLowerCase();
      const lowerName = template.name.toLowerCase();
      const lowerDesc2 = template.description.toLowerCase();

      if (lowerDesc.includes(lowerName) || lowerName.includes(lowerDesc.slice(0, 4))) {
        score += 0.4;
      }

      for (const keyword of ['模式', '场景', '自动', '布防', '撤防', '关灯', '开灯', '早安', '晚安', '电影']) {
        if (lowerDesc.includes(keyword) && lowerDesc2.includes(keyword)) {
          score += 0.1;
        }
      }

      const availableDomains = new Set(this.devices.map((d) => d.domain));
      const requiredDomains = template.requiredDevices;
      const matchedDomains = requiredDomains.filter((d) => availableDomains.has(d));
      if (requiredDomains.length > 0) {
        score += (matchedDomains.length / requiredDomains.length) * 0.3;
      } else {
        score += 0.3;
      }

      return { template, score };
    });

    scoredTemplates.sort((a, b) => b.score - a.score);

    return scoredTemplates.filter((t) => t.score > 0.2).map((t) => t.template);
  }

  private buildTemplateParams(
    analysis: RequirementAnalysis,
    paramDefs: any[],
  ): Record<string, any> {
    const params: Record<string, any> = {};

    for (const paramDef of paramDefs) {
      if (analysis.parameters[paramDef.name] !== undefined) {
        params[paramDef.name] = analysis.parameters[paramDef.name];
      } else if (paramDef.default !== undefined) {
        params[paramDef.name] = paramDef.default;
      }
    }

    return params;
  }

  private generateFromScratch(
    analysis: RequirementAnalysis,
    platform: AutomationPlatform,
  ): AutomationGenerationResult {
    const warnings: string[] = [];
    const errors: string[] = [];

    if (platform === 'homeassistant') {
      const builder = new HAAutomationBuilder();
      builder.setAlias(`自定义自动化 - ${analysis.automationType}`);
      builder.setDescription(analysis.rawDescription);
      builder.setAvailableDevices(this.devices);

      for (const trigger of analysis.triggers) {
        if (trigger.platform === 'time' && trigger.at) {
          builder.addTimeTrigger(trigger.at, trigger.id);
        } else if (trigger.platform === 'state') {
          builder.addStateTrigger(trigger.entity_id, {
            from: trigger.from,
            to: trigger.to,
            id: trigger.id,
          });
        } else {
          builder.addTrigger(trigger);
        }
      }

      for (const condition of analysis.conditions) {
        builder.addCondition(condition);
      }

      for (const action of analysis.actions) {
        if (action.type === 'turn_on' || action.type === 'turn_off') {
          const domain = action.target === 'lights' ? 'light' :
                         action.target === 'climate' ? 'climate' :
                         action.target === 'covers' ? 'cover' : 'homeassistant';
          const service = `${domain}.${action.type === 'turn_on' ? 'turn_on' : 'turn_off'}`;
          builder.addServiceAction(service, {
            target: { entity_id: action.entity_id || 'all' },
          });
        } else if (action.type === 'notify') {
          builder.addServiceAction('notify.notify', {
            data: {
              message: action.message || '自动化触发',
              title: '智能家居安全管家',
            },
          });
        } else if (action.type === 'lock' || action.type === 'unlock') {
          const service = `lock.${action.type}`;
          builder.addServiceAction(service, {
            target: { entity_id: action.entity_id || 'all' },
          });
        } else if (action.type === 'arm' || action.type === 'disarm') {
          const service = `alarm_control_panel.alarm_${action.type === 'arm' ? 'arm_away' : 'disarm'}`;
          builder.addServiceAction(service, {
            target: { entity_id: action.entity_id || 'all' },
          });
        } else if (action.delay) {
          builder.addDelayAction(action.delay.seconds || 60);
        } else if (action.service) {
          builder.addServiceAction(action.service, {
            target: action.target,
            data: action.data,
          });
        }
      }

      const config = builder.build();
      const validation = builder.validate();

      return {
        success: validation.valid,
        config,
        format: 'yaml',
        platform,
        validation,
        warnings: [...warnings, ...validation.warnings],
        errors: [...errors, ...validation.errors],
      };
    } else {
      const builder = new KNXWorkflowBuilder();
      builder.setName(`自定义工作流 - ${analysis.automationType}`);
      builder.setDescription(analysis.rawDescription);
      builder.setAvailableDevices(this.devices);

      const config = builder.build();
      const validation = builder.validate();

      return {
        success: validation.valid,
        config,
        format: 'json',
        platform,
        validation,
        warnings: [...warnings, ...validation.warnings],
        errors: [...errors, ...validation.errors],
      };
    }
  }

  public validateAutomation(
    config: any,
    platform: AutomationPlatform,
  ): AutomationValidationResult {
    if (platform === 'homeassistant') {
      const builder = HAAutomationBuilder.fromConfig(config);
      builder.setAvailableDevices(this.devices);
      return builder.validate();
    } else {
      if (config.nodes && config.edges) {
        const builder = KNXWorkflowBuilder.fromConfig(config);
        builder.setAvailableDevices(this.devices);
        return builder.validate();
      } else {
        const builder = KNXSceneBuilder.fromConfig(config);
        builder.setAvailableDevices(this.devices);
        return builder.validate();
      }
    }
  }

  public async applyAutomation(
    config: any,
    platform: AutomationPlatform,
    options?: {
      apiUrl?: string;
      token?: string;
      verifyOnly?: boolean;
    },
  ): Promise<{
    success: boolean;
    applied: boolean;
    platformEntityId?: string;
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];

    const validation = this.validateAutomation(config, platform);
    if (!validation.valid) {
      return {
        success: false,
        applied: false,
        warnings: [...warnings, ...validation.warnings],
        errors: [...errors, ...validation.errors],
      };
    }

    if (options?.verifyOnly) {
      return {
        success: true,
        applied: false,
        warnings: [...warnings, ...validation.warnings],
        errors,
      };
    }

    if (!options?.apiUrl) {
      errors.push('缺少 API URL，无法应用自动化');
      return {
        success: false,
        applied: false,
        warnings,
        errors,
      };
    }

    try {
      if (platform === 'homeassistant') {
        const result = await this.applyToHomeAssistant(config, options.apiUrl, options.token);
        return {
          success: true,
          applied: true,
          platformEntityId: result.entityId,
          warnings: [...warnings, ...validation.warnings],
          errors,
        };
      } else {
        const result = await this.applyToKnxGateway(config, options.apiUrl, options.token);
        return {
          success: true,
          applied: true,
          platformEntityId: result.entityId,
          warnings: [...warnings, ...validation.warnings],
          errors,
        };
      }
    } catch (error) {
      errors.push(`应用自动化失败: ${(error as Error).message}`);
      return {
        success: false,
        applied: false,
        warnings,
        errors,
      };
    }
  }

  private async applyToHomeAssistant(
    config: any,
    apiUrl: string,
    token?: string,
  ): Promise<{ entityId: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${apiUrl}/api/config/automation/config/${config.id}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Home Assistant API error: ${response.statusText}`);
    }

    return { entityId: `automation.${config.id}` };
  }

  private async applyToKnxGateway(
    config: any,
    apiUrl: string,
    token?: string,
  ): Promise<{ entityId: string }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const endpoint = config.nodes ? '/api/workflows' : '/api/scenes';
    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`KNX Gateway API error: ${response.statusText}`);
    }

    return { entityId: config.id };
  }

  public suggestImprovements(alerts: Alert[]): AutomationSuggestion[] {
    const suggestions: AutomationSuggestion[] = [];

    const alertCategories = new Set(alerts.map((a) => a.category));
    const alertSeverities = alerts.map((a) => a.severity);
    const maxSeverity = alertSeverities.length > 0 ? Math.max(...alertSeverities) : 0;

    if (alertCategories.has(DetectionCategory.AwayMode)) {
      const awayAlerts = alerts.filter((a) => a.category === DetectionCategory.AwayMode);

      suggestions.push({
        id: `sugg_${Date.now()}_away`,
        title: '创建离家布防自动化',
        description: '基于检测到的离家模式异常，建议创建自动化在离家时自动布防',
        type: 'security',
        platform: 'homeassistant',
        templateId: 'ha_away_mode',
        confidence: 0.85,
        riskLevel: 'low',
        relatedAlerts: awayAlerts.map((a) => a.id),
        estimatedImpact: 0.8,
      });
    }

    if (alertCategories.has(DetectionCategory.DoorAccess)) {
      const doorAlerts = alerts.filter((a) => a.category === DetectionCategory.DoorAccess);

      suggestions.push({
        id: `sugg_${Date.now()}_door`,
        title: '创建门锁状态通知',
        description: '基于检测到的门禁异常，建议创建自动化在门未锁时发送通知',
        type: 'notification',
        platform: 'homeassistant',
        templateId: 'ha_away_mode',
        confidence: 0.75,
        riskLevel: 'low',
        relatedAlerts: doorAlerts.map((a) => a.id),
        estimatedImpact: 0.6,
      });
    }

    if (alertCategories.has(DetectionCategory.EnergyAnomaly)) {
      const energyAlerts = alerts.filter((a) => a.category === DetectionCategory.EnergyAnomaly);

      suggestions.push({
        id: `sugg_${Date.now()}_energy`,
        title: '创建节能自动化',
        description: '基于检测到的能源异常，建议创建自动化在无人时关闭设备',
        type: 'energy',
        platform: 'homeassistant',
        templateId: 'ha_no_one_light_off',
        confidence: 0.7,
        riskLevel: 'low',
        relatedAlerts: energyAlerts.map((a) => a.id),
        estimatedImpact: 0.65,
      });
    }

    if (maxSeverity >= SeverityLevel.High) {
      suggestions.push({
        id: `sugg_${Date.now()}_intrusion`,
        title: '创建入侵告警联动',
        description: '基于高优先级安全告警，建议创建入侵告警联动自动化',
        type: 'security',
        platform: 'homeassistant',
        templateId: 'ha_intrusion_alert',
        confidence: 0.9,
        riskLevel: 'medium',
        relatedAlerts: alerts.filter((a) => a.severity >= SeverityLevel.High).map((a) => a.id),
        estimatedImpact: 0.9,
      });
    }

    suggestions.sort((a, b) => b.confidence * b.estimatedImpact - a.confidence * a.estimatedImpact);

    this.emit('suggestions_generated', suggestions);
    return suggestions;
  }

  public getTemplates(category?: AutomationType, platform?: AutomationPlatform) {
    let templates = getAllTemplates();

    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    if (platform) {
      templates = templates.filter((t) => t.platform.includes(platform));
    }

    return templates;
  }

  public getTemplate(templateId: string) {
    return getTemplateById(templateId);
  }

  public generateFromTemplate(
    templateId: string,
    params: Record<string, any>,
  ): AutomationGenerationResult | null {
    const template = getTemplateById(templateId);
    if (!template) {
      return null;
    }

    const result = template.generate(params, this.devices);
    const platform = template.platform[0];

    this.recordHistory(template.name, platform, template.category, result);

    this.emit('automation_generated', result);
    return result;
  }

  private recordHistory(
    description: string,
    platform: AutomationPlatform,
    type: AutomationType,
    result: AutomationGenerationResult,
  ): void {
    this.generationHistory.push({
      id: `hist_${Date.now()}`,
      description,
      platform,
      type,
      result,
      createdAt: new Date(),
    });

    if (this.generationHistory.length > 100) {
      this.generationHistory.shift();
    }
  }

  public getGenerationHistory() {
    return [...this.generationHistory];
  }

  public static fromEntityStates(states: EntityState[]): AutomationGenerator {
    const generator = new AutomationGenerator();
    const devices: DeviceInfo[] = states.map((state) => {
      const domain = state.entityId.split('.')[0];
      return {
        entityId: state.entityId,
        name: state.attributes.friendly_name || state.entityId,
        domain,
        state: state.state,
        attributes: state.attributes,
        area: state.attributes.area_name,
        source: state.source,
      };
    });
    generator.setDevices(devices);
    return generator;
  }
}

export default AutomationGenerator;
