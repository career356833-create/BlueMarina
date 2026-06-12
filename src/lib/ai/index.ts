import { mockProvider } from "@/lib/ai/mock-provider";
import { openAiProvider } from "@/lib/ai/openai-provider";
import type { AiProvider } from "@/lib/ai/types";

export function getAiProvider(): AiProvider {
  if (process.env.AI_PROVIDER === "openai" && process.env.OPENAI_API_KEY) {
    return openAiProvider;
  }

  return mockProvider;
}
