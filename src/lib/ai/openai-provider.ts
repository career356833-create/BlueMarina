import OpenAI from "openai";
import type { AiProvider } from "@/lib/ai/types";
import type { GeneratedContent } from "@/types/content";

export const openAiProvider: AiProvider = {
  async generate(input) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

    const response = await client.chat.completions.create({
      model,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You write Korean childcare SaaS content. Return only JSON with title, body, sections[{label,value}], and optional hashtags[]. Keep labels useful for internal structure, but never place labels or system notes inside body/value text."
        },
        {
          role: "user",
          content: JSON.stringify({
            contentType: input.type,
            keywords: input.keywords,
            memo: input.memo,
            institution: input.institution,
            activityName: input.activityName,
            className: input.className,
            ageGroup: input.ageGroup,
            activityDate: input.activityDate,
            tone: input.tone,
            analyzePhotos: input.analyzePhotos,
            imageCount: input.images.length,
            imageUrls: input.images.map((image) => image.url)
          })
        }
      ]
    });

    const raw = response.choices[0]?.message.content ?? "{}";
    return JSON.parse(raw) as GeneratedContent;
  }
};
