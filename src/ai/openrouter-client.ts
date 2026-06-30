import axios, { AxiosInstance, AxiosError } from 'axios';
import {
  OpenRouterConfig,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  TokenUsage,
} from '../types';

export class OpenRouterClient {
  private config: OpenRouterConfig;
  private axios: AxiosInstance;
  private totalUsage: TokenUsage;
  private requestCount: number;

  constructor(config: OpenRouterConfig) {
    this.config = {
      maxRetries: 3,
      initialRetryDelay: 1000,
      timeout: 60000,
      baseUrl: 'https://openrouter.ai/api/v1',
      ...config,
    };
    this.axios = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        ...(this.config.siteUrl ? { 'HTTP-Referer': this.config.siteUrl } : {}),
        ...(this.config.appTitle ? { 'X-Title': this.config.appTitle } : {}),
      },
    });
    this.totalUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
    this.requestCount = 0;
  }

  public async createChatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
  ): Promise<ChatCompletionResponse> {
    const body: Record<string, any> = {
      model: this.config.baseModel,
      messages,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
      ...(options.tools ? { tools: options.tools } : {}),
      ...(options.stream ? { stream: true } : {}),
    };

    return this.executeWithRetry(body, this.config.baseModel);
  }

  private async executeWithRetry(
    body: Record<string, any>,
    model: string,
    attempt: number = 0,
  ): Promise<ChatCompletionResponse> {
    const maxRetries = this.config.maxRetries || 3;
    const initialDelay = this.config.initialRetryDelay || 1000;

    try {
      const response = await this.axios.post('/chat/completions', {
        ...body,
        model,
      });

      this.requestCount++;
      const data = response.data as ChatCompletionResponse;

      if (data.usage) {
        this.totalUsage.promptTokens += data.usage.prompt_tokens;
        this.totalUsage.completionTokens += data.usage.completion_tokens;
        this.totalUsage.totalTokens += data.usage.total_tokens;
      }

      console.debug(
        `[OpenRouter] Request ${this.requestCount}: model=${data.model}, ` +
        `prompt_tokens=${data.usage?.prompt_tokens || 0}, ` +
        `completion_tokens=${data.usage?.completion_tokens || 0}`,
      );

      return data;
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const isRetryable = !status || status >= 500 || status === 429;

      if (isRetryable && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(
          `[OpenRouter] Request failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
          `retrying in ${delay}ms. Status: ${status}, Error: ${axiosError.message}`,
        );
        await this.sleep(delay);
        return this.executeWithRetry(body, model, attempt + 1);
      }

      if (
        this.config.fallbackModel &&
        model === this.config.baseModel &&
        status !== 401 &&
        status !== 403
      ) {
        console.warn(
          `[OpenRouter] Primary model "${model}" failed, falling back to "${this.config.fallbackModel}". ` +
          `Error: ${axiosError.message}`,
        );
        return this.executeWithRetry(body, this.config.fallbackModel, 0);
      }

      console.error(
        `[OpenRouter] Request failed after ${attempt + 1} attempts. ` +
        `Model: ${model}, Status: ${status}, Error: ${axiosError.message}`,
      );
      throw error;
    }
  }

  public async createChatCompletionStream(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {},
    onChunk?: (chunk: string, fullContent: string) => void,
  ): Promise<ChatCompletionResponse> {
    const body: Record<string, any> = {
      model: this.config.baseModel,
      messages,
      stream: true,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      ...(options.maxTokens !== undefined ? { max_tokens: options.maxTokens } : {}),
      ...(options.tools ? { tools: options.tools } : {}),
    };

    return this.executeStreamWithRetry(body, this.config.baseModel, onChunk);
  }

  private async executeStreamWithRetry(
    body: Record<string, any>,
    model: string,
    onChunk?: (chunk: string, fullContent: string) => void,
    attempt: number = 0,
  ): Promise<ChatCompletionResponse> {
    const maxRetries = this.config.maxRetries || 3;
    const initialDelay = this.config.initialRetryDelay || 1000;

    try {
      const response = await this.axios.post(
        '/chat/completions',
        { ...body, model },
        { responseType: 'stream' },
      );

      this.requestCount++;
      let fullContent = '';
      let finishReason = '';
      let responseId = '';
      let responseModel = model;
      let promptTokens = 0;
      let completionTokens = 0;

      return new Promise((resolve, reject) => {
        const stream = response.data;

        stream.on('data', (data: Buffer) => {
          const lines = data.toString('utf-8').split('\n').filter((line) => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') {
                continue;
              }
              try {
                const parsed = JSON.parse(jsonStr);
                if (parsed.id) responseId = parsed.id;
                if (parsed.model) responseModel = parsed.model;
                if (parsed.choices && parsed.choices.length > 0) {
                  const choice = parsed.choices[0];
                  if (choice.finish_reason) {
                    finishReason = choice.finish_reason;
                  }
                  const delta = choice.delta;
                  if (delta?.content) {
                    fullContent += delta.content;
                    if (onChunk) {
                      onChunk(delta.content, fullContent);
                    }
                  }
                }
                if (parsed.usage) {
                  promptTokens = parsed.usage.prompt_tokens || 0;
                  completionTokens = parsed.usage.completion_tokens || 0;
                }
              } catch {
                // ignore parse errors for individual chunks
              }
            }
          }
        });

        stream.on('end', () => {
          this.totalUsage.promptTokens += promptTokens;
          this.totalUsage.completionTokens += completionTokens;
          this.totalUsage.totalTokens += promptTokens + completionTokens;

          console.debug(
            `[OpenRouter] Stream request ${this.requestCount}: model=${responseModel}, ` +
            `prompt_tokens=${promptTokens}, completion_tokens=${completionTokens}`,
          );

          resolve({
            id: responseId,
            model: responseModel,
            choices: [
              {
                index: 0,
                message: {
                  role: 'assistant',
                  content: fullContent,
                },
                finish_reason: finishReason,
              },
            ],
            usage: {
              prompt_tokens: promptTokens,
              completion_tokens: completionTokens,
              total_tokens: promptTokens + completionTokens,
            },
          });
        });

        stream.on('error', (err: Error) => {
          reject(err);
        });
      });
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const isRetryable = !status || status >= 500 || status === 429;

      if (isRetryable && attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.warn(
          `[OpenRouter] Stream request failed (attempt ${attempt + 1}/${maxRetries + 1}), ` +
          `retrying in ${delay}ms. Status: ${status}, Error: ${axiosError.message}`,
        );
        await this.sleep(delay);
        return this.executeStreamWithRetry(body, model, onChunk, attempt + 1);
      }

      if (
        this.config.fallbackModel &&
        model === this.config.baseModel &&
        status !== 401 &&
        status !== 403
      ) {
        console.warn(
          `[OpenRouter] Primary model "${model}" failed for stream, falling back to "${this.config.fallbackModel}". ` +
          `Error: ${axiosError.message}`,
        );
        return this.executeStreamWithRetry(body, this.config.fallbackModel, onChunk, 0);
      }

      console.error(
        `[OpenRouter] Stream request failed after ${attempt + 1} attempts. ` +
        `Model: ${model}, Status: ${status}, Error: ${axiosError.message}`,
      );
      throw error;
    }
  }

  public getTotalUsage(): TokenUsage {
    return { ...this.totalUsage };
  }

  public getRequestCount(): number {
    return this.requestCount;
  }

  public resetUsage(): void {
    this.totalUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
    this.requestCount = 0;
  }

  public getBaseModel(): string {
    return this.config.baseModel;
  }

  public getFallbackModel(): string | undefined {
    return this.config.fallbackModel;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
