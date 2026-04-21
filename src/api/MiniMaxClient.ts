import * as vscode from "vscode";
import OpenAI from "openai";
import type {
  ChatCompletionChunk,
  ChatCompletionCreateParamsStreaming,
  ChatCompletionMessageParam,
} from "openai/resources/chat/completions/completions";
import { MiniMaxMessage, MiniMaxToolDefinition } from "./types";
import { DEFAULT_MAX_TOKENS, DEFAULT_TEMPERATURE, MINIMAX_BASE_URL } from "../utils/constants";

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  tools?: MiniMaxToolDefinition[];
  toolChoice?: "auto" | "required";
  reasoningSplit?: boolean;
}

interface MiniMaxExtraBody {
  reasoning_split?: boolean;
}

interface MiniMaxChatCompletionParams extends ChatCompletionCreateParamsStreaming {
  tools?: MiniMaxToolDefinition[];
  tool_choice?: "auto" | "required";
  extra_body?: MiniMaxExtraBody;
}

export class MiniMaxError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = "MiniMaxError";
  }
}

export class MiniMaxClient {
  private readonly baseUrl = MINIMAX_BASE_URL;

  async *streamChat(
    model: string,
    messages: MiniMaxMessage[],
    options?: ChatOptions,
    cancellationToken?: vscode.CancellationToken,
  ): AsyncGenerator<ChatCompletionChunk> {
    const apiKey = options?.apiKey?.trim();
    if (!apiKey) {
      throw new MiniMaxError("API key is required", "NO_API_KEY", 401);
    }

    const abortController = new AbortController();
    let cancellationDisposable: vscode.Disposable | undefined;
    try {
      cancellationDisposable = cancellationToken?.onCancellationRequested(() =>
        abortController.abort(),
      );

      const client = new OpenAI({
        apiKey,
        baseURL: this.baseUrl,
      });

      const params: MiniMaxChatCompletionParams = {
        model,
        stream: true,
        messages: this.toOpenAiMessages(messages),
        temperature: options?.temperature ?? DEFAULT_TEMPERATURE,
        max_tokens: options?.maxTokens ?? DEFAULT_MAX_TOKENS,
        extra_body: { reasoning_split: options?.reasoningSplit ?? true },
      };
      if (options?.tools && options.tools.length > 0) {
        params.tools = options.tools;
      }
      if (options?.toolChoice) {
        params.tool_choice = options.toolChoice;
      }

      const stream = (await client.chat.completions.create(params, {
        signal: abortController.signal,
      })) as AsyncIterable<ChatCompletionChunk>;

      for await (const chunk of stream) {
        if (cancellationToken?.isCancellationRequested) {
          return;
        }
        yield chunk;
      }
    } catch (error) {
      throw this.toMiniMaxError(error);
    } finally {
      cancellationDisposable?.dispose();
    }
  }

  private toOpenAiMessages(messages: MiniMaxMessage[]): ChatCompletionMessageParam[] {
    return messages.map((message) => {
      if (message.role === "assistant") {
        return {
          role: "assistant",
          content: message.content,
          tool_calls: message.tool_calls,
          reasoning_details: message.reasoning_details,
        } as unknown as ChatCompletionMessageParam;
      }

      if (message.role === "tool") {
        return {
          role: "tool",
          tool_call_id: message.tool_call_id,
          content: message.content,
        } as unknown as ChatCompletionMessageParam;
      }

      return {
        role: message.role,
        content: message.content,
      } as ChatCompletionMessageParam;
    });
  }

  private toMiniMaxError(error: unknown): MiniMaxError {
    if (error instanceof MiniMaxError) {
      return error;
    }

    if (error instanceof OpenAI.APIError) {
      const statusCode = error.status ?? 0;
      const code = statusCode === 401 ? "AUTHENTICATION_ERROR" : "API_ERROR";
      return new MiniMaxError(error.message, code, statusCode);
    }

    if (error instanceof Error && error.name === "AbortError") {
      return new MiniMaxError("Request timeout", "TIMEOUT");
    }

    if (error instanceof Error) {
      return new MiniMaxError(error.message, "NETWORK_ERROR");
    }

    return new MiniMaxError(String(error), "UNKNOWN_ERROR");
  }
}
