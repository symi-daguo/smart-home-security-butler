export interface PendingWriteAction {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  summary: string;
  createdAt: number;
}

const TTL_MS = 10 * 60 * 1000;

class PendingActionStore {
  private actions = new Map<string, PendingWriteAction>();

  public create(action: Omit<PendingWriteAction, 'id' | 'createdAt'>): PendingWriteAction {
    this.cleanup();
    const id = `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: PendingWriteAction = {
      id,
      createdAt: Date.now(),
      ...action,
    };
    this.actions.set(id, record);
    return record;
  }

  public get(id: string): PendingWriteAction | null {
    this.cleanup();
    return this.actions.get(id) || null;
  }

  public consume(id: string): PendingWriteAction | null {
    const action = this.get(id);
    if (!action) {
      return null;
    }
    this.actions.delete(id);
    return action;
  }

  public cleanup(): void {
    const now = Date.now();
    for (const [id, action] of this.actions.entries()) {
      if (now - action.createdAt > TTL_MS) {
        this.actions.delete(id);
      }
    }
  }
}

export const pendingActionStore = new PendingActionStore();

export const WRITE_TOOLS = new Set([
  'control_device',
  'activate_scene',
  'acknowledge_alert',
  'close_alert',
]);

export function isWriteTool(toolName: string): boolean {
  return WRITE_TOOLS.has(toolName);
}

export function summarizeWriteAction(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'control_device':
      return `控制设备 ${args.entity_id} → ${args.action}`;
    case 'activate_scene':
      return `执行场景 ${args.scene_id || args.scene_name}`;
    case 'acknowledge_alert':
      return `确认告警 ${args.alert_id}`;
    case 'close_alert':
      return `关闭告警 ${args.alert_id}`;
    default:
      return `执行写操作 ${toolName}`;
  }
}
