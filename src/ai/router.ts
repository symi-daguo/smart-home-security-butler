import { SecurityButler } from '../index';
import { getKnxdHealthStatus } from '../knx/knxd-env';

interface LocalRouteResult {
  handled: true;
  reply: string;
  route: string;
}

export async function tryLocalChatRoute(
  message: string,
  butler: SecurityButler,
): Promise<LocalRouteResult | null> {
  const text = message.trim();
  if (!text) {
    return null;
  }

  if (/安全评分|安全分数|安全状况|安全得分/.test(text)) {
    const score = await butler.getSecurityScore();
    return {
      handled: true,
      route: 'security_score',
      reply: `当前家庭安全评分：**${score.overall}**（${score.grade}）。${
        score.weaknesses?.length
          ? `主要薄弱项：${score.weaknesses.slice(0, 2).join('、')}。`
          : '整体状态良好。'
      }`,
    };
  }

  if (/设备.{0,6}(状态|多少|数量)|有多少设备|在线设备/.test(text)) {
    const states = await butler.getEntityStates();
    const total = states.size;
    let online = 0;
    for (const state of states.values()) {
      const value = String(state.state || '').toLowerCase();
      if (value && !['unavailable', 'unknown', 'offline'].includes(value)) {
        online += 1;
      }
    }
    return {
      handled: true,
      route: 'device_status',
      reply: `当前共接入 **${total}** 个实体，其中约 **${online}** 个有有效状态反馈。可在「设备管理」查看详情。`,
    };
  }

  if (/列出场景|场景列表|有哪些场景|场景有/.test(text)) {
    const scenes = await butler.getScenes();
    if (!scenes.length) {
      return {
        handled: true,
        route: 'list_scenes',
        reply: '当前没有可用场景。您可以在「场景中心」查看或创建自动化模板。',
      };
    }
    const preview = scenes
      .slice(0, 8)
      .map((scene) => `- ${scene.name}${scene.type ? ` (${scene.type})` : ''}`)
      .join('\n');
    return {
      handled: true,
      route: 'list_scenes',
      reply: `当前可用场景（前 ${Math.min(scenes.length, 8)} 个）：\n${preview}${
        scenes.length > 8 ? `\n…共 ${scenes.length} 个场景` : ''
      }`,
    };
  }

  if (/knxd|knx.*(状态|健康)|3671/.test(text.toLowerCase())) {
    const health = await getKnxdHealthStatus();
    const healthy = health.portOpen && health.containerStatus !== 'stopped';
    return {
      handled: true,
      route: 'knxd_status',
      reply: `knxd 网关状态：**${healthy ? '正常' : '异常'}**。端口 ${health.host}:${health.port} ${
        health.portOpen ? '已开放' : '未开放'
      }，容器 ${health.containerName} 状态为 ${health.containerStatus || '未知'}。`,
    };
  }

  return null;
}
