import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiProvider } from "@/lib/ai";
import type { ContentType, UnifiedGenerationResult } from "@/types/content";

const contentTypes: ContentType[] = ["notice", "newsletter", "homepage", "blog", "instagram"];

const schema = z.object({
  uploadedImages: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        path: z.string().optional()
      })
    )
    .default([]),
  keywords: z.array(z.string()).default([]),
  activityName: z.string().min(1),
  className: z.string().default(""),
  ageGroup: z.string().default(""),
  activityDate: z.string().default(""),
  tone: z.enum(["warm", "professional", "simple", "promotion"]),
  analyzePhotos: z.boolean().default(false),
  institution: z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["daycare", "kindergarten"]),
      logoUrl: z.string().optional(),
      address: z.string(),
      phone: z.string()
    })
    .optional()
});

export async function POST(request: Request) {
  const json = await request.json();
  const input = schema.parse(json);
  const provider = getAiProvider();

  const entries = await Promise.all(
    contentTypes.map(async (type) => {
      const content = await provider.generate({
        type,
        keywords: input.keywords,
        images: input.analyzePhotos ? input.uploadedImages : [],
        memo: "",
        institution: input.institution,
        activityName: input.activityName,
        className: input.className,
        ageGroup: input.ageGroup,
        activityDate: input.activityDate,
        tone: input.tone,
        analyzePhotos: input.analyzePhotos
      });

      return [type, content] as const;
    })
  );

  return NextResponse.json({ results: Object.fromEntries(entries) as UnifiedGenerationResult });
}
