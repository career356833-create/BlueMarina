import { LearningFrame } from "@/components/platform/PageFamilies";
import { AnalysisClient } from "./analysis-client";

type AnalysisPageProps = {
  searchParams?: Promise<{ license?: string }>;
};

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  const params = await searchParams;

  return (
    <LearningFrame>
      <AnalysisClient license={params?.license} />
    </LearningFrame>
  );
}
