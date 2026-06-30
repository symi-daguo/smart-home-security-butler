import { ToolDefinition } from '../types';

export interface ToolHandlerContext {
  getDeviceStatus: (entityId?: string) => Promise<any>;
  getAlerts: (filters?: { status?: string; severity?: string; limit?: number }) => Promise<any>;
  acknowledgeAlert: (alertId: string) => Promise<boolean>;
  closeAlert: (alertId: string, resolution: string) => Promise<boolean>;
  controlDevice: (entityId: string, action: string, params?: Record<string, any>) => Promise<any>;
  runSecurityCheck: () => Promise<any>;
  getSecurityScore: () => Promise<any>;
  generateAutomation: (description: string, platform?: string) => Promise<any>;
  getTrends: (timeRange?: string) => Promise<any>;
  generateReport: (period?: string, format?: string) => Promise<any>;
}

export const toolDefinitions: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'get_device_status',
      description: '查询智能家居设备的当前状态。可以查询单个设备或所有设备的状态。',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: '设备实体ID，例如 "light.living_room" 或 "sensor.temperature"。如果不传，则返回所有设备状态。',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_alerts',
      description: '查询安全告警列表。支持按状态、严重程度筛选，并可限制返回数量。',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: '告警状态: new, active, acknowledged, resolved, closed',
            enum: ['new', 'active', 'acknowledged', 'resolved', 'closed'],
          },
          severity: {
            type: 'string',
            description: '告警严重程度: info, low, medium, high, critical',
            enum: ['info', 'low', 'medium', 'high', 'critical'],
          },
          limit: {
            type: 'number',
            description: '返回的最大告警数量，默认20条',
            default: 20,
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'acknowledge_alert',
      description: '确认一条告警，表示用户已知晓该告警。',
      parameters: {
        type: 'object',
        properties: {
          alert_id: {
            type: 'string',
            description: '告警ID',
          },
        },
        required: ['alert_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'close_alert',
      description: '关闭一条告警，标记为已解决。',
      parameters: {
        type: 'object',
        properties: {
          alert_id: {
            type: 'string',
            description: '告警ID',
          },
          resolution: {
            type: 'string',
            description: '解决说明，描述告警是如何解决的',
          },
        },
        required: ['alert_id', 'resolution'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'control_device',
      description: '控制智能家居设备，例如开关灯光、调节温度等。',
      parameters: {
        type: 'object',
        properties: {
          entity_id: {
            type: 'string',
            description: '设备实体ID，例如 "light.living_room"',
          },
          action: {
            type: 'string',
            description: '要执行的操作，例如 "turn_on", "turn_off", "set_temperature"',
          },
          params: {
            type: 'object',
            description: '操作参数，具体取决于设备类型和操作',
            additionalProperties: true,
          },
        },
        required: ['entity_id', 'action'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_security_check',
      description: '执行一次全面的安全检查，扫描所有检测规则，发现潜在的安全隐患。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_security_score',
      description: '获取当前家庭安全评分，包括总体评分和各维度评分。',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_automation',
      description: '根据描述生成智能家居自动化配置。支持 Home Assistant 和 KNX 网关平台。',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: '自动化的自然语言描述，例如 "当晚上10点且有人在家时，关闭客厅灯光"',
          },
          platform: {
            type: 'string',
            description: '自动化平台',
            enum: ['homeassistant', 'knx-gateway'],
            default: 'homeassistant',
          },
        },
        required: ['description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_trends',
      description: '获取安全趋势分析数据，包括告警趋势、设备状态趋势、能耗趋势等。',
      parameters: {
        type: 'object',
        properties: {
          time_range: {
            type: 'string',
            description: '统计时间范围',
            enum: ['day', 'week', 'month', 'year'],
            default: 'week',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description: '生成安全报告，包括安全评分、告警统计、设备健康、改进建议等。',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: '报告周期',
            enum: ['weekly', 'monthly'],
            default: 'weekly',
          },
          format: {
            type: 'string',
            description: '报告格式',
            enum: ['text', 'markdown'],
            default: 'markdown',
          },
        },
        required: [],
      },
    },
  },
];

export async function executeTool(
  name: string,
  args: Record<string, any>,
  context: ToolHandlerContext,
): Promise<string> {
  try {
    let result: any;

    switch (name) {
      case 'get_device_status':
        result = await context.getDeviceStatus(args.entity_id);
        break;

      case 'get_alerts':
        result = await context.getAlerts({
          status: args.status,
          severity: args.severity,
          limit: args.limit,
        });
        break;

      case 'acknowledge_alert':
        result = { success: await context.acknowledgeAlert(args.alert_id) };
        break;

      case 'close_alert':
        result = { success: await context.closeAlert(args.alert_id, args.resolution) };
        break;

      case 'control_device':
        result = await context.controlDevice(args.entity_id, args.action, args.params);
        break;

      case 'run_security_check':
        result = await context.runSecurityCheck();
        break;

      case 'get_security_score':
        result = await context.getSecurityScore();
        break;

      case 'generate_automation':
        result = await context.generateAutomation(args.description, args.platform);
        break;

      case 'get_trends':
        result = await context.getTrends(args.time_range);
        break;

      case 'generate_report':
        result = await context.generateReport(args.period, args.format);
        break;

      default:
        return JSON.stringify({ error: `Unknown tool: ${name}` });
    }

    return JSON.stringify(result, (key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      return value;
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ error: errorMessage });
  }
}
