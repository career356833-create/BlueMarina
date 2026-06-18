import { AppFrame } from "@/components/boat/AppFrame";
import { ProgressClient } from "./progress-client";

type ProgressPageProps = {
  searchParams?: Promise<{ license?: string }>;
};

export default async function ProgressPage({ searchParams }: ProgressPageProps) {
  const params = await searchParams;

  return (
    <AppFrame>
      <ProgressClient license={params?.license} />
    </AppFrame>
  );
}
