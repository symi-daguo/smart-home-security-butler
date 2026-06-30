import axios, { AxiosInstance } from 'axios';
import { NotifierBase } from './notifier-base';
import { NotifierConfig, NotificationMessage, NotificationLog, SeverityLevel } from '../types';

export interface TelegramNotifierConfig {
  botToken: string;
  chatId: string;
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
  disableNotification?: boolean;
  disableWebPagePreview?: boolean;
  rateLimitPerSecond?: number;
}

interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  url?: string;
}

interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

export class TelegramNotifier extends NotifierBase {
  private telegramConfig: TelegramNotifierConfig;
  private axiosInstance: AxiosInstance | null;
  private lastRequestTime: number;
  private minRequestInterval: number;

  constructor(config: NotifierConfig) {
    super(config);
    this.telegramConfig = (config.config as TelegramNotifierConfig) || {
      botToken: '',
      chatId: '',
    };
    this.axiosInstance = null;
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000 / (this.telegramConfig.rateLimitPerSecond || 30);
  }

  public getType(): string {
    return 'telegram';
  }

  public validateConfig(config: Record<string, any>): string[] {
    const errors: string[] = [];

    if (!config.botToken || typeof config.botToken !== 'string') {
      errors.push('botToken is required');
    }

    if (!config.chatId || typeof config.chatId !== 'string') {
      errors.push('chatId is required');
    }

    if (config.botToken && !/^\d+:[A-Za-z0-9_-]+$/.test(config.botToken)) {
      errors.push('botToken format appears invalid');
    }

    if (
      config.parseMode &&
      !['Markdown', 'MarkdownV2', 'HTML'].includes(config.parseMode)
    ) {
      errors.push('parseMode must be Markdown, MarkdownV2, or HTML');
    }

    return errors;
  }

  public async initialize(): Promise<void> {
    if (!this.telegramConfig.botToken) {
      throw new Error('Telegram bot token is not configured');
    }

    this.axiosInstance = axios.create({
      baseURL: `https://api.telegram.org/bot${this.telegramConfig.botToken}/`,
      timeout: 10000,
    });

    this.initialized = true;
  }

  public async cleanup(): Promise<void> {
    this.axiosInstance = null;
    this.initialized = false;
  }

  public async testConnection(): Promise<boolean> {
    try {
      await this.ensureInitialized();
      const response = await this.apiRequest('getMe');
      return response && response.ok;
    } catch {
      return false;
    }
  }

  protected async sendMessage(message: NotificationMessage): Promise<boolean> {
    await this.ensureInitialized();

    const parseMode = this.telegramConfig.parseMode || 'HTML';
    const text = this.buildMessageText(message, parseMode);
    const replyMarkup = this.buildInlineKeyboard(message.buttons);

    const payload: Record<string, any> = {
      chat_id: this.telegramConfig.chatId,
      text,
      parse_mode: parseMode,
      disable_notification: this.telegramConfig.disableNotification || false,
      disable_web_page_preview: this.telegramConfig.disableWebPagePreview !== false,
    };

    if (replyMarkup) {
      payload.reply_markup = JSON.stringify(replyMarkup);
    }

    const response = await this.apiRequest('sendMessage', payload);
    return response && response.ok;
  }

  public async test(): Promise<{
    success: boolean;
    latencyMs: number;
    botInfo?: {
      id: number;
      firstName: string;
      username: string;
    };
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      await this.ensureInitialized();
      const response = await this.apiRequest('getMe');
      const latencyMs = Date.now() - startTime;

      if (response && response.ok) {
        return {
          success: true,
          latencyMs,
          botInfo: {
            id: response.result.id,
            firstName: response.result.first_name,
            username: response.result.username,
          },
        };
      } else {
        return {
          success: false,
          latencyMs,
          error: response?.description || 'Unknown error',
        };
      }
    } catch (error) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  public async sendWithButtons(
    message: NotificationMessage,
    buttons: Array<{ text: string; callbackData: string }>,
  ): Promise<boolean> {
    const messageWithButtons: NotificationMessage = {
      ...message,
      buttons: buttons.map((b) => ({
        text: b.text,
        action: b.callbackData,
      })),
    };
    return this.sendMessage(messageWithButtons);
  }

  public async sendPhoto(
    chatId: string,
    photoUrl: string,
    caption?: string,
  ): Promise<boolean> {
    await this.ensureInitialized();

    const payload: Record<string, any> = {
      chat_id: chatId,
      photo: photoUrl,
    };

    if (caption) {
      payload.caption = caption;
      payload.parse_mode = this.telegramConfig.parseMode || 'HTML';
    }

    const response = await this.apiRequest('sendPhoto', payload);
    return response && response.ok;
  }

  private buildMessageText(message: NotificationMessage, parseMode: string): string {
    const severity = message.severity;
    const severityLabel = this.getSeverityLabel(severity);
    const lines: string[] = [];

    if (parseMode === 'HTML') {
      const icon = this.getSeverityIconText(severity);
      lines.push(`<b>${icon} [${severityLabel}] ${this.escapeHtml(message.title)}</b>`);
      lines.push('');
      lines.push(this.escapeHtml(message.message));
      lines.push('');

      if (message.alertId) {
        lines.push(`<i>告警ID: ${this.escapeHtml(message.alertId)}</i>`);
      }

      lines.push(`<i>时间: ${this.escapeHtml(new Date().toLocaleString('zh-CN'))}</i>`);
    } else if (parseMode === 'Markdown' || parseMode === 'MarkdownV2') {
      const icon = this.getSeverityIconText(severity);
      const escapeFn = parseMode === 'MarkdownV2'
        ? (t: string) => this.escapeMarkdownV2(t)
        : (t: string) => this.escapeMarkdown(t);

      lines.push(`*${icon} [${severityLabel}] ${escapeFn(message.title)}*`);
      lines.push('');
      lines.push(escapeFn(message.message));
      lines.push('');

      if (message.alertId) {
        lines.push(`_告警ID: ${escapeFn(message.alertId)}_`);
      }

      lines.push(`_时间: ${escapeFn(new Date().toLocaleString('zh-CN'))}_`);
    } else {
      const icon = this.getSeverityIconText(severity);
      lines.push(`${icon} [${severityLabel}] ${message.title}`);
      lines.push('');
      lines.push(message.message);
      lines.push('');

      if (message.alertId) {
        lines.push(`告警ID: ${message.alertId}`);
      }

      lines.push(`时间: ${new Date().toLocaleString('zh-CN')}`);
    }

    return lines.join('\n');
  }

  private buildInlineKeyboard(
    buttons?: NotificationMessage['buttons'],
  ): InlineKeyboardMarkup | null {
    if (!buttons || buttons.length === 0) {
      return null;
    }

    const keyboard: InlineKeyboardButton[][] = [];
    let currentRow: InlineKeyboardButton[] = [];

    for (const button of buttons) {
      const tgButton: InlineKeyboardButton = {
        text: button.text,
        callback_data: button.action,
      };

      if (button.data && button.data.url) {
        tgButton.url = button.data.url as string;
        delete tgButton.callback_data;
      }

      currentRow.push(tgButton);

      if (currentRow.length >= 2) {
        keyboard.push(currentRow);
        currentRow = [];
      }
    }

    if (currentRow.length > 0) {
      keyboard.push(currentRow);
    }

    return { inline_keyboard: keyboard };
  }

  private getSeverityIconText(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.Critical:
        return '[紧急]';
      case SeverityLevel.High:
        return '[高危]';
      case SeverityLevel.Medium:
        return '[中危]';
      case SeverityLevel.Low:
        return '[低危]';
      case SeverityLevel.Info:
        return '[信息]';
      default:
        return '[未知]';
    }
  }

  private escapeMarkdownV2(text: string): string {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
  }

  public escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  public formatMessage(message: NotificationMessage): string {
    return this.buildMessageText(message, this.telegramConfig.parseMode || 'HTML');
  }

  private async apiRequest(method: string, data?: Record<string, any>): Promise<any> {
    if (!this.axiosInstance) {
      throw new Error('Telegram notifier not initialized');
    }

    await this.rateLimitWait();

    try {
      const response = await this.axiosInstance.post(method, data);
      this.lastRequestTime = Date.now();
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        const description = error.response.data?.description || error.message;
        throw new Error(`Telegram API error: ${description}`);
      }
      throw error;
    }
  }

  private async rateLimitWait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;

    if (elapsed < this.minRequestInterval) {
      await this.sleep(this.minRequestInterval - elapsed);
    }
  }

  public getBotToken(): string {
    return this.telegramConfig.botToken;
  }

  public getChatId(): string {
    return this.telegramConfig.chatId;
  }

  public setBotToken(token: string): void {
    this.telegramConfig.botToken = token;
    this.config.config = { ...this.telegramConfig };
    if (this.axiosInstance) {
      this.axiosInstance.defaults.baseURL = `https://api.telegram.org/bot${token}/`;
    }
  }

  public setChatId(chatId: string): void {
    this.telegramConfig.chatId = chatId;
    this.config.config = { ...this.telegramConfig };
  }

  public getParseMode(): string {
    return this.telegramConfig.parseMode || 'HTML';
  }

  protected getApiUrl(method: string): string {
    return `https://api.telegram.org/bot${this.telegramConfig.botToken}/${method}`;
  }

  public override updateConfig(config: Partial<NotifierConfig>): void {
    super.updateConfig(config);
    if (config.config) {
      this.telegramConfig = { ...this.telegramConfig, ...config.config } as TelegramNotifierConfig;
      this.minRequestInterval = 1000 / (this.telegramConfig.rateLimitPerSecond || 30);
      if (this.axiosInstance && this.telegramConfig.botToken) {
        this.axiosInstance.defaults.baseURL = `https://api.telegram.org/bot${this.telegramConfig.botToken}/`;
      }
    }
  }
}
