import { AppFrame } from "@/components/boat/AppFrame";
import { AnalysisClient } from "./analysis-client";

type AnalysisPageProps = {
  searchParams?: Promise<{ license?: string }>;
};

export default async function AnalysisPage({ searchParams }: AnalysisPageProps) {
  const params = await searchParams;

  return (
    <AppFrame>
      <AnalysisClient license={params?.license} />
    </AppFrame>
  );
}
