import { encode } from "gpt-tokenizer";

// MiniMax publishes no open tokenizer. This uses GPT-4's cl100k_base encoding
// as the closest widely-available approximation. Expect ±10% drift vs. the
// server-reported `prompt_tokens` / `completion_tokens`. Server-reported counts
// in streaming responses should be preferred whenever available.
export class TokenCounter {
  estimateTokens(text: string): number {
    if (!text || text.length === 0) {
      return 0;
    }
    try {
      return encode(text).length;
    } catch {
      return Math.ceil(text.length / 4);
    }
  }
}
