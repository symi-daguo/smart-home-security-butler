import { OpenRouterClient } from './openrouter-client';
import { toolDefinitions, executeTool, ToolHandlerContext } from './tools';
import {
  AgentConfig,
  AgentMemory,
  AgentStatus,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
} from '../types';
import { SQLiteStorage } from '../storage/sqlite-storage';

const DEFAULT_SYSTEM_PROMPT = `你是专业的智能家居 AI 安全管家，深度集成 Home Assistant、KNX、Node-RED、Matter 等智能家居系统。

你的核心职责：
1. 安全监控 - 实时检测家庭安全隐患，如离家时设备异常开启、能耗异常、门禁异常等
2. 设备管理 - 查询设备状态、统计设备数量、按房间/类型分类管理
3. 场景自动化 - 帮用户设计和优化自动化场景，如离家模式、回家模式、睡眠模式等
4. 安全建议 - 基于数据分析提供安全改进建议
5. 问题解答 - 回答关于智能家居系统的各类问题

工作原则：
- 优先使用工具查询实时数据，不要凭空猜测
- 准确理解用户意图，对于模糊问题先确认再回答
- 回答要专业、简洁、有针对性
- 涉及安全问题要谨慎，不确定的直接说明
- 用中文回复，语气友好但专业

对于用户的问题，请按以下思路处理：
1. 先理解用户真正想问什么
2. 如果需要数据支持，调用对应工具获取
3. 基于真实数据给出准确回答
4. 必要时提供建议或解决方案

记住：你是一个有真实数据支撑的智能管家，不是聊天机器人。回答要基于实际接入的设备和系统状态。`;

const DEFAULT_MAX_SHORT_TERM_MESSAGES = 30;
const DEFAULT_MAX_CONTEXT_TOKENS = 4000;

export class AIAgent {
  private config: AgentConfig;
  private client: OpenRouterClient;
  private memory: AgentMemory;
  private toolContext: ToolHandlerContext | null;
  private initialized: boolean;
  private messageCount: number;
  private storage: SQLiteStorage | null;
  private sessionId: string;

  constructor(config: AgentConfig, storage?: SQLiteStorage, sessionId: string = 'default') {
    this.config = config;
    this.client = new OpenRouterClient(config.openrouter);
    this.memory = {
      shortTerm: [],
      longTerm: [],
      systemContext: [],
      maxShortTermMessages: config.memory?.maxShortTermMessages || DEFAULT_MAX_SHORT_TERM_MESSAGES,
      maxContextTokens: config.memory?.maxContextTokens || DEFAULT_MAX_CONTEXT_TOKENS,
    };
    this.toolContext = null;
    this.initialized = false;
    this.messageCount = 0;
    this.storage = storage || null;
    this.sessionId = sessionId;
  }

  public async initialize(toolContext: ToolHandlerContext): Promise<void> {
    this.toolContext = toolContext;
    this.initialized = true;

    if (this.storage) {
      try {
        const savedMessages = await this.storage.getChatMessages(
          this.sessionId,
          this.memory.maxShortTermMessages,
        );
        if (savedMessages.length > 0) {
          this.memory.shortTerm = savedMessages as ChatMessage[];
          this.messageCount = savedMessages.length;
        }
      } catch (error) {
        console.error('[AI] Failed to load chat history:', error);
      }
    }
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public async sendMessage(
    userMessage: string,
    options?: {
      stream?: boolean;
      onChunk?: (chunk: string, fullContent: string) => void;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<string> {
    if (!this.initialized || !this.toolContext) {
      throw new Error('AI Agent not initialized. Call initialize() first.');
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
    };

    this.addShortTermMessage(userMsg);

    const messages = this.buildMessages();
    const completionOptions: ChatCompletionOptions = {
      tools: toolDefinitions,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    };

    let response: ChatCompletionResponse;

    if (options?.stream && options.onChunk) {
      response = await this.client.createChatCompletionStream(
        messages,
        completionOptions,
        options.onChunk,
      );
    } else {
      response = await this.client.createChatCompletion(messages, completionOptions);
    }

    const assistantMessage = response.choices[0].message;
    this.addShortTermMessage(assistantMessage);
    this.messageCount++;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      return await this.handleToolCalls(assistantMessage.tool_calls, options);
    }

    return assistantMessage.content || '';
  }

  private async handleToolCalls(
    toolCalls: Array<{ id: string; type: string; function: { name: string; arguments: string } }>,
    options?: {
      stream?: boolean;
      onChunk?: (chunk: string, fullContent: string) => void;
      temperature?: number;
      maxTokens?: number;
    },
  ): Promise<string> {
    if (!this.toolContext) {
      throw new Error('Tool context not available');
    }

    for (const toolCall of toolCalls) {
      try {
        const args = JSON.parse(toolCall.function.arguments || '{}');
        const result = await executeTool(toolCall.function.name, args, this.toolContext);

        const toolMessage: ChatMessage = {
          role: 'tool',
          content: result,
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
        };

        this.addShortTermMessage(toolMessage);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const toolMessage: ChatMessage = {
          role: 'tool',
          content: JSON.stringify({ error: errorMessage }),
          tool_call_id: toolCall.id,
          name: toolCall.function.name,
        };

        this.addShortTermMessage(toolMessage);
      }
    }

    const messages = this.buildMessages();
    const completionOptions: ChatCompletionOptions = {
      tools: toolDefinitions,
      temperature: options?.temperature,
      maxTokens: options?.maxTokens,
    };

    let response: ChatCompletionResponse;

    if (options?.stream && options.onChunk) {
      response = await this.client.createChatCompletionStream(
        messages,
        completionOptions,
        options.onChunk,
      );
    } else {
      response = await this.client.createChatCompletion(messages, completionOptions);
    }

    const assistantMessage = response.choices[0].message;
    this.addShortTermMessage(assistantMessage);
    this.messageCount++;

    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      return this.handleToolCalls(assistantMessage.tool_calls, options);
    }

    return assistantMessage.content || '';
  }

  private buildMessages(): ChatMessage[] {
    const messages: ChatMessage[] = [];

    const systemPrompt = this.config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    messages.push({
      role: 'system',
      content: systemPrompt,
    });

    if (this.memory.systemContext.length > 0) {
      const contextStr = this.memory.systemContext.join('\n');
      messages.push({
        role: 'system',
        content: `当前系统上下文:\n${contextStr}`,
      });
    }

    if (this.memory.longTerm.length > 0) {
      const longTermStr = this.memory.longTerm
        .map((item, index) => `${index + 1}. ${item}`)
        .join('\n');
      messages.push({
        role: 'system',
        content: `长期记忆（重要事件和用户偏好）:\n${longTermStr}`,
      });
    }

    for (const msg of this.memory.shortTerm) {
      messages.push(msg);
    }

    return messages;
  }

  private addShortTermMessage(message: ChatMessage): void {
    this.memory.shortTerm.push(message);

    const maxMessages = this.memory.maxShortTermMessages;
    if (this.memory.shortTerm.length > maxMessages) {
      const toRemove = this.memory.shortTerm.length - maxMessages;
      this.memory.shortTerm.splice(0, toRemove);
    }

    if (this.storage && message.role !== 'system') {
      this.storage.saveChatMessage(this.sessionId, message).catch((err) => {
        console.error('[AI] Failed to save chat message:', err);
      });
    }
  }

  public clearMemory(): void {
    this.memory.shortTerm = [];
    this.memory.systemContext = [];

    if (this.storage) {
      this.storage.clearChatMessages(this.sessionId).catch((err) => {
        console.error('[AI] Failed to clear chat messages:', err);
      });
    }
  }

  public clearLongTermMemory(): void {
    this.memory.longTerm = [];
  }

  public getMemory(): AgentMemory {
    return {
      ...this.memory,
      shortTerm: [...this.memory.shortTerm],
      longTerm: [...this.memory.longTerm],
      systemContext: [...this.memory.systemContext],
    };
  }

  public addSystemContext(context: string): void {
    this.memory.systemContext.push(context);
  }

  public clearSystemContext(): void {
    this.memory.systemContext = [];
  }

  public addLongTermMemory(memory: string): void {
    this.memory.longTerm.push(memory);
  }

  public getStatus(): AgentStatus {
    const usage = this.client.getTotalUsage();
    return {
      initialized: this.initialized,
      model: this.client.getBaseModel(),
      totalTokensUsed: usage.totalTokens,
      messageCount: this.messageCount,
      memory: {
        shortTermCount: this.memory.shortTerm.length,
        longTermCount: this.memory.longTerm.length,
        systemContextCount: this.memory.systemContext.length,
      },
    };
  }

  public getTokenUsage() {
    return this.client.getTotalUsage();
  }

  public getOpenRouterClient(): OpenRouterClient {
    return this.client;
  }
}
