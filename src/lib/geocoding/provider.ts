import type {
  GeocodingProviderId,
  ProviderGeocodingCandidate,
  ProviderGeocodingInput,
  RuntimeGeocodingError
} from "@/lib/geocoding/types";
import { createRuntimeGeocodingError } from "@/lib/geocoding/normalize";

export type RuntimeGeocodingProvider = {
  id: GeocodingProviderId;
  displayName: string;
  requiredEnv: string[];
  geocode(input: ProviderGeocodingInput): Promise<ProviderGeocodingCandidate | null>;
};

export type RuntimeGeocodingProviderRegistry = Partial<Record<GeocodingProviderId, RuntimeGeocodingProvider>>;

export function getMissingProviderEnv(provider: RuntimeGeocodingProvider, env: NodeJS.ProcessEnv = process.env) {
  return provider.requiredEnv.filter((key) => !env[key]);
}

export function isProviderConfigured(provider: RuntimeGeocodingProvider, env: NodeJS.ProcessEnv = process.env) {
  return getMissingProviderEnv(provider, env).length === 0;
}

export function createProviderNotConfiguredError(
  providerId: GeocodingProviderId,
  missingEnv: string[],
  fallbackOfficialUrls: string[] = []
): RuntimeGeocodingError {
  return createRuntimeGeocodingError(
    "PROVIDER_NOT_CONFIGURED",
    `${providerId} 지오코딩 환경변수가 설정되지 않았습니다: ${missingEnv.join(", ")}`,
    fallbackOfficialUrls
  );
}

export function resolveRuntimeGeocodingProvider(
  registry: RuntimeGeocodingProviderRegistry,
  preferredProvider: GeocodingProviderId
) {
  return registry[preferredProvider] ?? null;
}

export const RUNTIME_GEOCODING_PROVIDER_ENV = {
  kakao: ["KAKAO_REST_API_KEY"],
  naver: ["NAVER_GEOCODING_CLIENT_ID", "NAVER_GEOCODING_CLIENT_SECRET"],
  vworld: ["VWORLD_API_KEY"]
} satisfies Record<GeocodingProviderId, string[]>;

