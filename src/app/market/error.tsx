"use client";

import { PublicReadError } from "@/components/platform/PublicReadError";

export default function ReadError({ reset }: { reset: () => void }) {
  return <PublicReadError href="/market" label="마켓" retry={reset} />;
}
