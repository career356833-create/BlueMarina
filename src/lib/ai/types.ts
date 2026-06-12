import type { GeneratedContent, GenerationInput } from "@/types/content";

export interface AiProvider {
  generate(input: GenerationInput): Promise<GeneratedContent>;
}
