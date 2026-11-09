"use client";

import { PublicReadError } from "@/components/platform/PublicReadError";

export default function ReadError({ reset }: { reset: () => void }) {
  return <PublicReadError href="/community" label="커뮤니티" retry={reset} />;
}
