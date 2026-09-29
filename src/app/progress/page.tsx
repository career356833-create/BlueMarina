import { LearningFrame } from "@/components/platform/PageFamilies";
import { ProgressClient } from "./progress-client";

type ProgressPageProps = {
  searchParams?: Promise<{ license?: string }>;
};

export default async function ProgressPage({ searchParams }: ProgressPageProps) {
  const params = await searchParams;

  return (
    <LearningFrame>
      <ProgressClient license={params?.license} />
    </LearningFrame>
  );
}
