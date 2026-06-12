import { NextResponse } from "next/server";
import { z } from "zod";
import { getAiProvider } from "@/lib/ai";

const schema = z.object({
  type: z.enum(["notice", "newsletter", "homepage", "blog", "instagram"]),
  keywords: z.array(z.string()).default([]),
  memo: z.string().optional(),
  images: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        url: z.string(),
        path: z.string().optional()
      })
    )
    .default([]),
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
  const content = await getAiProvider().generate(input);

  return NextResponse.json({ content });
}
