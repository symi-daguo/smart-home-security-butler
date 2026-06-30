import {
  SceneTemplate,
  SceneTemplateParameter,
  DeviceInfo,
  AutomationGenerationResult,
  HAAutomationConfig,
  KnxWorkflowConfig,
  AutomationPlatform,
  AutomationType,
  AutomationValidationResult,
  AutomationTrigger,
} from '../types';

function generateId(): string {
  return `auto_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function findDevicesByDomain(devices: DeviceInfo[], domain: string): DeviceInfo[] {
  return devices.filter((d) => d.domain === domain);
}

function findDeviceByEntityId(devices: DeviceInfo[], entityId: string): DeviceInfo | undefined {
  return devices.find((d) => d.entityId === entityId);
}

function createValidationResult(
  valid: boolean,
  options?: {
    errors?: string[];
    warnings?: string[];
    missingEntities?: string[];
    conflicts?: string[];
  },
): AutomationValidationResult {
  return {
    valid,
    errors: options?.errors || [],
    warnings: options?.warnings || [],
    missingEntities: options?.missingEntities || [],
    conflicts: options?.conflicts || [],
  };
}

function buildHAAwayModeScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingEntities: string[] = [];

  const lights = findDevicesByDomain(devices, 'light');
  const locks = findDevicesByDomain(devices, 'lock');
  const alarmEntities = devices.filter(
    (d) => d.domain === 'alarm_control_panel' || d.entityId.includes('alarm'),
  );
  const climateEntities = findDevicesByDomain(devices, 'climate');
  const mediaPlayers = findDevicesByDomain(devices, 'media_player');
  const coverEntities = findDevicesByDomain(devices, 'cover');

  const actions: any[] = [];

  if (lights.length > 0) {
    actions.push({
      service: 'light.turn_off',
      target: {
        entity_id: lights.map((l) => l.entityId),
      },
    });
  } else {
    warnings.push('未找到灯光设备');
  }

  if (locks.length > 0) {
    actions.push({
      service: 'lock.lock',
      target: {
        entity_id: locks.map((l) => l.entityId),
      },
    });
  } else {
    warnings.push('未找到门锁设备');
  }

  if (alarmEntities.length > 0) {
    actions.push({
      service: 'alarm_control_panel.alarm_arm_away',
      target: {
        entity_id: alarmEntities.map((a) => a.entityId),
      },
    });
  } else {
    warnings.push('未找到安防面板设备');
  }

  if (climateEntities.length > 0 && params.turnOffClimate) {
    actions.push({
      service: 'climate.turn_off',
      target: {
        entity_id: climateEntities.map((c) => c.entityId),
      },
    });
  }

  if (mediaPlayers.length > 0 && params.turnOffMedia) {
    actions.push({
      service: 'media_player.turn_off',
      target: {
        entity_id: mediaPlayers.map((m) => m.entityId),
      },
    });
  }

  if (coverEntities.length > 0 && params.closeCovers) {
    actions.push({
      service: 'cover.close_cover',
      target: {
        entity_id: coverEntities.map((c) => c.entityId),
      },
    });
  }

  const trigger: AutomationTrigger[] = params.triggerEntity
    ? [
        {
          platform: 'state',
          entity_id: params.triggerEntity,
          from: 'home',
          to: 'not_home',
        },
      ]
    : [
        {
          platform: 'state',
          entity_id: 'input_boolean.away_mode',
          from: 'off',
          to: 'on',
        },
      ];

  const config: HAAutomationConfig = {
    id: generateId(),
    alias: '离家布防模式',
    description: '离家时自动关闭灯光、锁门、开启安防系统',
    trigger,
    condition: [],
    action: actions,
    mode: 'single',
  };

  return {
    success: errors.length === 0,
    config,
    format: 'yaml',
    platform: 'homeassistant',
    validation: createValidationResult(errors.length === 0, { errors, warnings, missingEntities }),
    warnings,
    errors,
  };
}

function buildHAHomeModeScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lights = findDevicesByDomain(devices, 'light');
  const locks = findDevicesByDomain(devices, 'lock');
  const alarmEntities = devices.filter(
    (d) => d.domain === 'alarm_control_panel' || d.entityId.includes('alarm'),
  );
  const climateEntities = findDevicesByDomain(devices, 'climate');

  const actions: any[] = [];

  if (lights.length > 0) {
    const entryLights = lights.filter(
      (l) =>
        l.entityId.includes('entry') ||
        l.entityId.includes('hall') ||
        l.entityId.includes('living'),
    );
    const targetLights = entryLights.length > 0 ? entryLights : lights.slice(0, 3);
    actions.push({
      service: 'light.turn_on',
      target: {
        entity_id: targetLights.map((l) => l.entityId),
      },
      data: {
        brightness_pct: params.brightness || 70,
      },
    });
  } else {
    warnings.push('未找到灯光设备');
  }

  if (locks.length > 0) {
    actions.push({
      service: 'lock.unlock',
      target: {
        entity_id: locks.map((l) => l.entityId),
      },
    });
  }

  if (alarmEntities.length > 0) {
    actions.push({
      service: 'alarm_control_panel.alarm_disarm',
      target: {
        entity_id: alarmEntities.map((a) => a.entityId),
      },
    });
  } else {
    warnings.push('未找到安防面板设备');
  }

  if (climateEntities.length > 0 && params.setTemperature) {
    actions.push({
      service: 'climate.set_temperature',
      target: {
        entity_id: climateEntities.slice(0, 1).map((c) => c.entityId),
      },
      data: {
        temperature: params.temperature || 24,
      },
    });
  }

  const trigger: AutomationTrigger[] = params.triggerEntity
    ? [
        {
          platform: 'state',
          entity_id: params.triggerEntity,
          from: 'not_home',
          to: 'home',
        },
      ]
    : [
        {
          platform: 'state',
          entity_id: 'input_boolean.away_mode',
          from: 'on',
          to: 'off',
        },
      ];

  const config: HAAutomationConfig = {
    id: generateId(),
    alias: '回家模式',
    description: '回家时自动开灯、开空调、撤防',
    trigger,
    condition: [],
    action: actions,
    mode: 'single',
  };

  return {
    success: errors.length === 0,
    config,
    format: 'yaml',
    platform: 'homeassistant',
    validation: createValidationResult(errors.length === 0, { errors, warnings }),
    warnings,
    errors,
  };
}

function buildHASleepModeScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lights = findDevicesByDomain(devices, 'light');
  const locks = findDevicesByDomain(devices, 'lock');
  const alarmEntities = devices.filter(
    (d) => d.domain === 'alarm_control_panel' || d.entityId.includes('alarm'),
  );
  const climateEntities = findDevicesByDomain(devices, 'climate');
  const coverEntities = findDevicesByDomain(devices, 'cover');

  const actions: any[] = [];

  if (lights.length > 0) {
    actions.push({
      service: 'light.turn_off',
      target: {
        entity_id: lights.filter((l) => !l.entityId.includes('night')).map((l) => l.entityId),
      },
    });

    const nightLights = lights.filter((l) => l.entityId.includes('night'));
    if (nightLights.length > 0 && params.nightLight) {
      actions.push({
        service: 'light.turn_on',
        target: {
          entity_id: nightLights.map((l) => l.entityId),
        },
        data: {
          brightness_pct: params.nightLightBrightness || 10,
        },
      });
    }
  } else {
    warnings.push('未找到灯光设备');
  }

  if (locks.length > 0) {
    actions.push({
      service: 'lock.lock',
      target: {
        entity_id: locks.map((l) => l.entityId),
      },
    });
  } else {
    warnings.push('未找到门锁设备');
  }

  if (alarmEntities.length > 0) {
    actions.push({
      service: 'alarm_control_panel.alarm_arm_night',
      target: {
        entity_id: alarmEntities.map((a) => a.entityId),
      },
    });
  }

  if (climateEntities.length > 0 && params.setTemperature) {
    actions.push({
      service: 'climate.set_temperature',
      target: {
        entity_id: climateEntities.slice(0, 1).map((c) => c.entityId),
      },
      data: {
        temperature: params.sleepTemperature || 22,
      },
    });
  }

  if (coverEntities.length > 0 && params.closeCovers) {
    actions.push({
      service: 'cover.close_cover',
      target: {
        entity_id: coverEntities.map((c) => c.entityId),
      },
    });
  }

  const trigger: AutomationTrigger[] = params.triggerTime
    ? [
        {
          platform: 'time',
          at: params.triggerTime,
        },
      ]
    : [
        {
          platform: 'time',
          at: '22:30:00',
        },
      ];

  const config: HAAutomationConfig = {
    id: generateId(),
    alias: '睡眠模式',
    description: '睡眠时自动关灯、锁门、调暗夜灯',
    trigger,
    condition: [],
    action: actions,
    mode: 'single',
  };

  return {
    success: errors.length === 0,
    config,
    format: 'yaml',
    platform: 'homeassistant',
    validation: createValidationResult(errors.length === 0, { errors, warnings }),
    warnings,
    errors,
  };
}

function buildHAIntrusionAlertScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lights = findDevicesByDomain(devices, 'light');
  const sirens = devices.filter(
    (d) => d.domain === 'siren' || d.entityId.includes('siren') || d.entityId.includes('alarm'),
  );
  const notifyServices = params.notifyService ? [params.notifyService] : ['notify.mobile_app'];

  const actions: any[] = [];

  if (lights.length > 0 && params.flashLights) {
    actions.push({
      service: 'light.turn_on',
      target: {
        entity_id: lights.map((l) => l.entityId),
      },
      data: {
        flash: 'long',
        color_name: 'red',
      },
    });
  }

  if (sirens.length > 0) {
    actions.push({
      service: 'siren.turn_on',
      target: {
        entity_id: sirens.map((s) => s.entityId),
      },
      data: {
        duration: params.sirenDuration || 60,
      },
    });
  } else {
    warnings.push('未找到警笛设备');
  }

  for (const notifyService of notifyServices) {
    actions.push({
      service: notifyService,
      data: {
        title: '入侵告警',
        message: '检测到入侵，请立即查看！',
        data: {
          push: {
            sound: {
              name: 'default',
              critical: 1,
              volume: 1.0,
            },
          },
        },
      },
    });
  }

  const trigger: AutomationTrigger[] = params.triggerEntity
    ? [
        {
          platform: 'state',
          entity_id: params.triggerEntity,
          from: 'off',
          to: 'on',
        },
      ]
    : [
        {
          platform: 'state',
          entity_id: 'binary_sensor.motion_sensor',
          from: 'off',
          to: 'on',
        },
      ];

  const condition: any[] = [
    {
      condition: 'state',
      entity_id: 'alarm_control_panel.home_alarm',
      state: 'armed_away',
    },
  ];

  const config: HAAutomationConfig = {
    id: generateId(),
    alias: '入侵告警联动',
    description: '检测到入侵时所有灯闪烁、推送告警',
    trigger,
    condition,
    action: actions,
    mode: 'single',
  };

  return {
    success: errors.length === 0,
    config,
    format: 'yaml',
    platform: 'homeassistant',
    validation: createValidationResult(errors.length === 0, { errors, warnings }),
    warnings,
    errors,
  };
}

function buildHANoOneHomeLightOffScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lights = findDevicesByDomain(devices, 'light');

  const actions: any[] = [];

  if (lights.length > 0) {
    actions.push({
      delay: params.delayMinutes ? `${params.delayMinutes * 60}` : '300',
    });
    actions.push({
      service: 'light.turn_off',
      target: {
        entity_id: lights.map((l) => l.entityId),
      },
    });
  } else {
    errors.push('未找到灯光设备');
  }

  const trigger: AutomationTrigger[] = params.presenceEntity
    ? [
        {
          platform: 'state',
          entity_id: params.presenceEntity,
          from: 'home',
          to: 'not_home',
        },
      ]
    : [
        {
          platform: 'state',
          entity_id: 'group.family',
          from: 'home',
          to: 'not_home',
        },
      ];

  const config: HAAutomationConfig = {
    id: generateId(),
    alias: '无人关灯',
    description: '检测到无人时自动关灯',
    trigger,
    condition: [],
    action: actions,
    mode: 'single',
  };

  return {
    success: errors.length === 0,
    config,
    format: 'yaml',
    platform: 'homeassistant',
    validation: createValidationResult(errors.length === 0, { errors, warnings }),
    warnings,
    errors,
  };
}

function buildHATemperatureAutoAdjustScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const climateEntities = findDevicesByDomain(devices, 'climate');
  const weatherEntities = devices.filter(
    (d) => d.domain === 'weather' || d.entityId.includes('temperature_outdoor'),
  );

  if (climateEntities.length === 0) {
    errors.push('未找到空调设备');
  }

  if (weatherEntities.length === 0) {
    warnings.push('未找到室外温度传感器，将使用固定温度');
  }

  const actions: any[] = [
    {
      service: 'climate.set_temperature',
      target: {
        entity_id: climateEntities.slice(0, 1).map((c) => c.entityId),
      },
      data_template: {
        temperature:
          "{% set outdoor_temp = states('sensor.outdoor_temperature') | float(25) %}" +
          "{% if outdoor_temp > 30 %}24{% elif outdoor_temp > 25 %}25{% elif outdoor_temp > 20 %}26{% else %}28{% endif %}",
      },
    },
  ];

  const trigger: AutomationTrigger[] = params.triggerTime
    ? [
        {
          platform: 'time',
          at: params.triggerTime,
        },
      ]
    : [
        {
          platform: 'time',
          at: '08:00:00',
        },
        {
          platform: 'time',
          at: '18:00:00',
        },
      ];

  const config: HAAutomationConfig = {
    id: generateId(),
    alias: '温度自动调节',
    description: '根据室外温度自动调节空调温度',
    trigger,
    condition: [],
    action: actions,
    mode: 'single',
  };

  return {
    success: errors.length === 0,
    config,
    format: 'yaml',
    platform: 'homeassistant',
    validation: createValidationResult(errors.length === 0, { errors, warnings }),
    warnings,
    errors,
  };
}

function buildHAGoodMorningScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lights = findDevicesByDomain(devices, 'light');
  const coverEntities = findDevicesByDomain(devices, 'cover');
  const mediaPlayers = findDevicesByDomain(devices, 'media_player');

  const actions: any[] = [];

  if (lights.length > 0) {
    const bedroomLights = lights.filter(
      (l) => l.entityId.includes('bedroom') || l.entityId.includes('master'),
    );
    const targetLights = bedroomLights.length > 0 ? bedroomLights : lights.slice(0, 2);
    actions.push({
      service: 'light.turn_on',
      target: {
        entity_id: targetLights.map((l) => l.entityId),
      },
      data: {
        brightness_step_pct: 10,
        transition: params.fadeInMinutes ? params.fadeInMinutes * 60 : 300,
      },
    });
  } else {
    warnings.push('未找到灯光设备');
  }

  if (coverEntities.length > 0 && params.openCurtains) {
    const bedroomCovers = coverEntities.filter(
      (c) => c.entityId.includes('bedroom') || c.entityId.includes('master'),
    );
    const targetCovers = bedroomCovers.length > 0 ? bedroomCovers : coverEntities;
    actions.push({
      delay: params.curtainDelay ? `${params.curtainDelay * 60}` : '120',
    });
    actions.push({
      service: 'cover.open_cover',
      target: {
        entity_id: targetCovers.map((c) => c.entityId),
      },
    });
  }

  if (mediaPlayers.length > 0 && params.playMusic) {
    actions.push({
      delay: params.musicDelay ? `${params.musicDelay * 60}` : '300',
    });
    actions.push({
      service: 'media_player.play_media',
      target: {
        entity_id: mediaPlayers.slice(0, 1).map((m) => m.entityId),
      },
      data: {
        media_content_type: 'music',
        media_content_id: params.musicPlaylist || 'local:Morning Playlist',
      },
    });
  }

  const trigger: AutomationTrigger[] = params.wakeTime
    ? [
        {
          platform: 'time',
          at: params.wakeTime,
        },
      ]
    : [
        {
          platform: 'time',
          at: '07:00:00',
        },
      ];

  const condition: any[] = [
    {
      condition: 'time',
      weekday: ['mon', 'tue', 'wed', 'thu', 'fri'],
    },
  ];

  const config: HAAutomationConfig = {
    id: generateId(),
    alias: '早安场景',
    description: '渐进开灯、开窗帘、播放音乐',
    trigger,
    condition: params.weekdaysOnly ? condition : [],
    action: actions,
    mode: 'single',
  };

  return {
    success: errors.length === 0,
    config,
    format: 'yaml',
    platform: 'homeassistant',
    validation: createValidationResult(errors.length === 0, { errors, warnings }),
    warnings,
    errors,
  };
}

function buildHAGoodNightScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lights = findDevicesByDomain(devices, 'light');
  const locks = findDevicesByDomain(devices, 'lock');
  const alarmEntities = devices.filter(
    (d) => d.domain === 'alarm_control_panel' || d.entityId.includes('alarm'),
  );
  const coverEntities = findDevicesByDomain(devices, 'cover');

  const actions: any[] = [];

  if (lights.length > 0) {
    actions.push({
      service: 'light.turn_off',
      target: {
        entity_id: lights.map((l) => l.entityId),
      },
    });
  }

  if (locks.length > 0) {
    actions.push({
      service: 'lock.lock',
      target: {
        entity_id: locks.map((l) => l.entityId),
      },
    });
  } else {
    warnings.push('未找到门锁设备');
  }

  if (alarmEntities.length > 0) {
    actions.push({
      service: 'alarm_control_panel.alarm_arm_night',
      target: {
        entity_id: alarmEntities.map((a) => a.entityId),
      },
    });
  }

  if (coverEntities.length > 0 && params.closeCurtains) {
    actions.push({
      service: 'cover.close_cover',
      target: {
        entity_id: coverEntities.map((c) => c.entityId),
      },
    });
  }

  const trigger: AutomationTrigger[] = params.bedTime
    ? [
        {
          platform: 'time',
          at: params.bedTime,
        },
      ]
    : [
        {
          platform: 'time',
          at: '23:00:00',
        },
      ];

  const config: HAAutomationConfig = {
    id: generateId(),
    alias: '晚安场景',
    description: '关灯、锁门、开启安防',
    trigger,
    condition: [],
    action: actions,
    mode: 'single',
  };

  return {
    success: errors.length === 0,
    config,
    format: 'yaml',
    platform: 'homeassistant',
    validation: createValidationResult(errors.length === 0, { errors, warnings }),
    warnings,
    errors,
  };
}

function buildHAMovieModeScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lights = findDevicesByDomain(devices, 'light');
  const coverEntities = findDevicesByDomain(devices, 'cover');
  const mediaPlayers = findDevicesByDomain(devices, 'media_player');

  const actions: any[] = [];

  if (lights.length > 0) {
    const livingLights = lights.filter(
      (l) => l.entityId.includes('living') || l.entityId.includes('tv'),
    );
    const targetLights = livingLights.length > 0 ? livingLights : lights;

    actions.push({
      service: 'light.turn_on',
      target: {
        entity_id: targetLights.map((l) => l.entityId),
      },
      data: {
        brightness_pct: params.brightness || 15,
        color_temp: 3000,
      },
    });

    const mainLights = lights.filter(
      (l) => l.entityId.includes('main') || l.entityId.includes('ceiling'),
    );
    if (mainLights.length > 0) {
      actions.push({
        service: 'light.turn_off',
        target: {
          entity_id: mainLights.map((l) => l.entityId),
        },
      });
    }
  } else {
    warnings.push('未找到灯光设备');
  }

  if (coverEntities.length > 0 && params.closeCurtains) {
    const livingCovers = coverEntities.filter(
      (c) => c.entityId.includes('living') || c.entityId.includes('tv'),
    );
    const targetCovers = livingCovers.length > 0 ? livingCovers : coverEntities;
    actions.push({
      service: 'cover.close_cover',
      target: {
        entity_id: targetCovers.map((c) => c.entityId),
      },
    });
  }

  if (mediaPlayers.length > 0 && params.turnOnTv) {
    const tvPlayers = mediaPlayers.filter(
      (m) => m.entityId.includes('tv') || m.entityId.includes('living'),
    );
    const targetPlayers = tvPlayers.length > 0 ? tvPlayers : mediaPlayers.slice(0, 1);
    actions.push({
      service: 'media_player.turn_on',
      target: {
        entity_id: targetPlayers.map((m) => m.entityId),
      },
    });
  }

  const trigger: AutomationTrigger[] = params.triggerScene
    ? [
        {
          platform: 'event',
          event_type: 'call_service',
          event_data: {
            domain: 'scene',
            service: 'turn_on',
            service_data: {
              entity_id: params.triggerScene,
            },
          },
        },
      ]
    : [
        {
          platform: 'state',
          entity_id: 'input_boolean.movie_mode',
          from: 'off',
          to: 'on',
        },
      ];

  const config: HAAutomationConfig = {
    id: generateId(),
    alias: '电影模式',
    description: '调暗灯光、关闭主灯',
    trigger,
    condition: [],
    action: actions,
    mode: 'single',
  };

  return {
    success: errors.length === 0,
    config,
    format: 'yaml',
    platform: 'homeassistant',
    validation: createValidationResult(errors.length === 0, { errors, warnings }),
    warnings,
    errors,
  };
}

function buildKNXAwayModeScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lights = findDevicesByDomain(devices, 'light');
  const climateEntities = findDevicesByDomain(devices, 'climate');

  const nodes: any[] = [];
  const edges: any[] = [];
  let nodeIndex = 0;

  const startNode = {
    id: 'start',
    type: 'manual' as any,
    name: '触发',
    config: {},
    position: { x: 50, y: 200 },
  };
  nodes.push(startNode);

  let lastNodeId = 'start';

  if (lights.length > 0) {
    const lightNode = {
      id: `node_${nodeIndex++}`,
      type: 'device_control' as any,
      name: '关闭所有灯光',
      config: {
        devices: lights.map((l) => ({
          deviceId: l.entityId,
          function: 'switch',
          value: false,
        })),
      },
      position: { x: 200 + nodeIndex * 150, y: 200 },
    };
    nodes.push(lightNode);
    edges.push({
      id: `edge_${edges.length}`,
      source: lastNodeId,
      target: lightNode.id,
    });
    lastNodeId = lightNode.id;
  } else {
    warnings.push('未找到灯光设备');
  }

  if (climateEntities.length > 0 && params.turnOffClimate) {
    const climateNode = {
      id: `node_${nodeIndex++}`,
      type: 'device_control' as any,
      name: '关闭空调',
      config: {
        devices: climateEntities.map((c) => ({
          deviceId: c.entityId,
          function: 'switch',
          value: false,
        })),
      },
      position: { x: 200 + nodeIndex * 150, y: 200 },
    };
    nodes.push(climateNode);
    edges.push({
      id: `edge_${edges.length}`,
      source: lastNodeId,
      target: climateNode.id,
    });
    lastNodeId = climateNode.id;
  }

  const config: KnxWorkflowConfig = {
    id: generateId(),
    name: '离家布防模式',
    description: '离家时自动关闭灯光、空调',
    trigger: {
      type: 'manual',
      config: {},
    },
    nodes,
    edges,
  };

  return {
    success: errors.length === 0,
    config,
    format: 'json',
    platform: 'knx-gateway',
    validation: createValidationResult(errors.length === 0, { errors, warnings }),
    warnings,
    errors,
  };
}

function buildKNXGoodMorningScene(
  params: Record<string, any>,
  devices: DeviceInfo[],
): AutomationGenerationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const lights = findDevicesByDomain(devices, 'light');
  const coverEntities = findDevicesByDomain(devices, 'cover');

  const nodes: any[] = [];
  const edges: any[] = [];
  let nodeIndex = 0;

  const startNode = {
    id: 'start',
    type: 'manual' as any,
    name: '触发',
    config: {},
    position: { x: 50, y: 200 },
  };
  nodes.push(startNode);

  let lastNodeId = 'start';

  if (lights.length > 0) {
    const lightNode = {
      id: `node_${nodeIndex++}`,
      type: 'device_control' as any,
      name: '开启灯光',
      config: {
        devices: lights.slice(0, 3).map((l) => ({
          deviceId: l.entityId,
          function: 'dimming',
          value: params.brightness || 70,
        })),
      },
      position: { x: 200 + nodeIndex * 150, y: 200 },
    };
    nodes.push(lightNode);
    edges.push({
      id: `edge_${edges.length}`,
      source: lastNodeId,
      target: lightNode.id,
    });
    lastNodeId = lightNode.id;
  } else {
    warnings.push('未找到灯光设备');
  }

  if (coverEntities.length > 0 && params.openCurtains) {
    const coverNode = {
      id: `node_${nodeIndex++}`,
      type: 'device_control' as any,
      name: '打开窗帘',
      config: {
        devices: coverEntities.map((c) => ({
          deviceId: c.entityId,
          function: 'position',
          value: 100,
        })),
      },
      position: { x: 200 + nodeIndex * 150, y: 200 },
    };
    nodes.push(coverNode);
    edges.push({
      id: `edge_${edges.length}`,
      source: lastNodeId,
      target: coverNode.id,
    });
    lastNodeId = coverNode.id;
  }

  const config: KnxWorkflowConfig = {
    id: generateId(),
    name: '早安场景',
    description: '开灯、开窗帘',
    trigger: {
      type: 'cron',
      config: {
        expression: params.wakeTimeCron || '0 7 * * *',
      },
    },
    nodes,
    edges,
  };

  return {
    success: errors.length === 0,
    config,
    format: 'json',
    platform: 'knx-gateway',
    validation: createValidationResult(errors.length === 0, { errors, warnings }),
    warnings,
    errors,
  };
}

const sceneTemplates: SceneTemplate[] = [
  {
    id: 'ha_away_mode',
    name: '离家布防模式',
    description: '离家时自动关闭所有灯光、锁门、开启安防系统',
    category: 'security',
    platform: ['homeassistant'],
    requiredDevices: ['light', 'lock', 'alarm_control_panel'],
    parameters: [
      {
        name: 'triggerEntity',
        type: 'entity',
        label: '触发实体',
        description: '触发离家模式的实体（如 person 或 input_boolean）',
        required: false,
        default: 'input_boolean.away_mode',
      },
      {
        name: 'turnOffClimate',
        type: 'boolean',
        label: '关闭空调',
        description: '离家时是否关闭空调',
        required: false,
        default: true,
      },
      {
        name: 'turnOffMedia',
        type: 'boolean',
        label: '关闭媒体',
        description: '离家时是否关闭媒体设备',
        required: false,
        default: true,
      },
      {
        name: 'closeCovers',
        type: 'boolean',
        label: '关闭窗帘',
        description: '离家时是否关闭窗帘',
        required: false,
        default: false,
      },
    ],
    generate: buildHAAwayModeScene,
  },
  {
    id: 'ha_home_mode',
    name: '回家模式',
    description: '回家时自动开灯、开空调、撤防',
    category: 'security',
    platform: ['homeassistant'],
    requiredDevices: ['light', 'alarm_control_panel'],
    parameters: [
      {
        name: 'triggerEntity',
        type: 'entity',
        label: '触发实体',
        description: '触发回家模式的实体',
        required: false,
        default: 'input_boolean.away_mode',
      },
      {
        name: 'brightness',
        type: 'number',
        label: '灯光亮度',
        description: '回家时灯光亮度百分比',
        required: false,
        default: 70,
      },
      {
        name: 'setTemperature',
        type: 'boolean',
        label: '设置温度',
        description: '是否设置空调温度',
        required: false,
        default: true,
      },
      {
        name: 'temperature',
        type: 'number',
        label: '空调温度',
        description: '回家时的空调温度',
        required: false,
        default: 24,
      },
    ],
    generate: buildHAHomeModeScene,
  },
  {
    id: 'ha_sleep_mode',
    name: '睡眠模式',
    description: '睡眠时自动关灯、锁门、调暗夜灯',
    category: 'security',
    platform: ['homeassistant'],
    requiredDevices: ['light', 'lock'],
    parameters: [
      {
        name: 'triggerTime',
        type: 'time',
        label: '触发时间',
        description: '睡眠模式触发时间',
        required: false,
        default: '22:30:00',
      },
      {
        name: 'nightLight',
        type: 'boolean',
        label: '开启夜灯',
        description: '是否开启夜灯',
        required: false,
        default: true,
      },
      {
        name: 'nightLightBrightness',
        type: 'number',
        label: '夜灯亮度',
        description: '夜灯亮度百分比',
        required: false,
        default: 10,
      },
      {
        name: 'setTemperature',
        type: 'boolean',
        label: '设置温度',
        description: '是否设置睡眠温度',
        required: false,
        default: false,
      },
      {
        name: 'sleepTemperature',
        type: 'number',
        label: '睡眠温度',
        description: '睡眠时的空调温度',
        required: false,
        default: 22,
      },
      {
        name: 'closeCovers',
        type: 'boolean',
        label: '关闭窗帘',
        description: '睡眠时是否关闭窗帘',
        required: false,
        default: true,
      },
    ],
    generate: buildHASleepModeScene,
  },
  {
    id: 'ha_intrusion_alert',
    name: '入侵告警联动',
    description: '检测到入侵时所有灯闪烁、推送告警',
    category: 'security',
    platform: ['homeassistant'],
    requiredDevices: ['light', 'binary_sensor'],
    parameters: [
      {
        name: 'triggerEntity',
        type: 'entity',
        label: '触发传感器',
        description: '触发入侵告警的传感器实体',
        required: false,
        default: 'binary_sensor.motion_sensor',
      },
      {
        name: 'flashLights',
        type: 'boolean',
        label: '灯光闪烁',
        description: '入侵时是否闪烁灯光',
        required: false,
        default: true,
      },
      {
        name: 'sirenDuration',
        type: 'number',
        label: '警笛时长',
        description: '警笛鸣响时长（秒）',
        required: false,
        default: 60,
      },
      {
        name: 'notifyService',
        type: 'string',
        label: '通知服务',
        description: '用于发送通知的服务',
        required: false,
        default: 'notify.mobile_app',
      },
    ],
    generate: buildHAIntrusionAlertScene,
  },
  {
    id: 'ha_no_one_light_off',
    name: '无人关灯',
    description: '检测到无人时自动关灯',
    category: 'energy',
    platform: ['homeassistant'],
    requiredDevices: ['light'],
    parameters: [
      {
        name: 'presenceEntity',
        type: 'entity',
        label: '存在传感器',
        description: '用于检测是否有人的实体',
        required: false,
        default: 'group.family',
      },
      {
        name: 'delayMinutes',
        type: 'number',
        label: '延迟时间',
        description: '检测到无人后延迟关灯的时间（分钟）',
        required: false,
        default: 5,
      },
    ],
    generate: buildHANoOneHomeLightOffScene,
  },
  {
    id: 'ha_temperature_auto_adjust',
    name: '温度自动调节',
    description: '根据室外温度自动调节空调温度',
    category: 'energy',
    platform: ['homeassistant'],
    requiredDevices: ['climate'],
    parameters: [
      {
        name: 'triggerTime',
        type: 'time',
        label: '触发时间',
        description: '温度调节的触发时间',
        required: false,
        default: '08:00:00',
      },
    ],
    generate: buildHATemperatureAutoAdjustScene,
  },
  {
    id: 'ha_good_morning',
    name: '早安场景',
    description: '渐进开灯、开窗帘、播放音乐',
    category: 'scene',
    platform: ['homeassistant'],
    requiredDevices: ['light'],
    parameters: [
      {
        name: 'wakeTime',
        type: 'time',
        label: '唤醒时间',
        description: '早安场景触发时间',
        required: false,
        default: '07:00:00',
      },
      {
        name: 'fadeInMinutes',
        type: 'number',
        label: '渐亮时长',
        description: '灯光渐亮时长（分钟）',
        required: false,
        default: 5,
      },
      {
        name: 'openCurtains',
        type: 'boolean',
        label: '打开窗帘',
        description: '是否打开窗帘',
        required: false,
        default: true,
      },
      {
        name: 'curtainDelay',
        type: 'number',
        label: '窗帘延迟',
        description: '开灯后多久打开窗帘（分钟）',
        required: false,
        default: 2,
      },
      {
        name: 'playMusic',
        type: 'boolean',
        label: '播放音乐',
        description: '是否播放音乐',
        required: false,
        default: false,
      },
      {
        name: 'musicDelay',
        type: 'number',
        label: '音乐延迟',
        description: '开灯后多久播放音乐（分钟）',
        required: false,
        default: 5,
      },
      {
        name: 'musicPlaylist',
        type: 'string',
        label: '音乐列表',
        description: '播放列表名称',
        required: false,
        default: 'Morning Playlist',
      },
      {
        name: 'weekdaysOnly',
        type: 'boolean',
        label: '仅工作日',
        description: '是否仅在工作日执行',
        required: false,
        default: true,
      },
    ],
    generate: buildHAGoodMorningScene,
  },
  {
    id: 'ha_good_night',
    name: '晚安场景',
    description: '关灯、锁门、开启安防',
    category: 'scene',
    platform: ['homeassistant'],
    requiredDevices: ['light', 'lock'],
    parameters: [
      {
        name: 'bedTime',
        type: 'time',
        label: '睡觉时间',
        description: '晚安场景触发时间',
        required: false,
        default: '23:00:00',
      },
      {
        name: 'closeCurtains',
        type: 'boolean',
        label: '关闭窗帘',
        description: '是否关闭窗帘',
        required: false,
        default: true,
      },
    ],
    generate: buildHAGoodNightScene,
  },
  {
    id: 'ha_movie_mode',
    name: '电影模式',
    description: '调暗灯光、关闭主灯',
    category: 'scene',
    platform: ['homeassistant'],
    requiredDevices: ['light'],
    parameters: [
      {
        name: 'brightness',
        type: 'number',
        label: '氛围灯亮度',
        description: '电影模式下氛围灯亮度百分比',
        required: false,
        default: 15,
      },
      {
        name: 'closeCurtains',
        type: 'boolean',
        label: '关闭窗帘',
        description: '是否关闭窗帘',
        required: false,
        default: true,
      },
      {
        name: 'turnOnTv',
        type: 'boolean',
        label: '打开电视',
        description: '是否打开电视',
        required: false,
        default: false,
      },
    ],
    generate: buildHAMovieModeScene,
  },
  {
    id: 'knx_away_mode',
    name: '离家模式 (KNX)',
    description: '离家时关闭灯光和空调',
    category: 'security',
    platform: ['knx-gateway'],
    requiredDevices: ['light'],
    parameters: [
      {
        name: 'turnOffClimate',
        type: 'boolean',
        label: '关闭空调',
        description: '离家时是否关闭空调',
        required: false,
        default: true,
      },
    ],
    generate: buildKNXAwayModeScene,
  },
  {
    id: 'knx_good_morning',
    name: '早安场景 (KNX)',
    description: '开灯、开窗帘',
    category: 'scene',
    platform: ['knx-gateway'],
    requiredDevices: ['light'],
    parameters: [
      {
        name: 'brightness',
        type: 'number',
        label: '灯光亮度',
        description: '灯光亮度百分比',
        required: false,
        default: 70,
      },
      {
        name: 'openCurtains',
        type: 'boolean',
        label: '打开窗帘',
        description: '是否打开窗帘',
        required: false,
        default: true,
      },
      {
        name: 'wakeTimeCron',
        type: 'string',
        label: '定时 Cron',
        description: '定时触发的 cron 表达式',
        required: false,
        default: '0 7 * * *',
      },
    ],
    generate: buildKNXGoodMorningScene,
  },
];

export function getTemplatesByCategory(category: AutomationType): SceneTemplate[] {
  return sceneTemplates.filter((t) => t.category === category);
}

export function getTemplatesByPlatform(platform: AutomationPlatform): SceneTemplate[] {
  return sceneTemplates.filter((t) => t.platform.includes(platform));
}

export function getTemplateById(id: string): SceneTemplate | undefined {
  return sceneTemplates.find((t) => t.id === id);
}

export function getAllTemplates(): SceneTemplate[] {
  return [...sceneTemplates];
}

export { sceneTemplates };
export default sceneTemplates;
