import { normalizeCoordinates } from "@/lib/geo/coordinates";
import type {
  GeocodingStoragePolicy,
  NormalizedGeocodingResult,
  ProviderGeocodingCandidate,
  RuntimeGeocodingBatchGroup,
  RuntimeGeocodingError,
  RuntimeGeocodingRequest
} from "@/lib/geocoding/types";

export type AddressValidationResult =
  | {
      ok: true;
      address: string;
      dedupeKey: string;
    }
  | {
      ok: false;
      error: RuntimeGeocodingError;
    };

const ADDRESS_TOKEN_PATTERN = /(시|군|구|읍|면|동|리|로|길|해양경찰|시험장|교육장)/;
const COORDINATE_PAIR_PATTERN = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;

export const RUNTIME_GEOCODING_STORAGE_POLICY: GeocodingStoragePolicy = {
  permanentStorageAllowed: false,
  allowJsonWrite: false,
  allowDatabaseWrite: false,
  allowLocalStorage: false,
  allowIndexedDb: false,
  shortMemoryCachePolicy: "unclear",
  note:
    "Kakao, Naver, VWorld geocoding results are treated as runtime-only values until a provider-specific storage policy is formally approved."
};

function uniqueValues(values: Array<string | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => value?.trim())
        .filter((value): value is string => Boolean(value && value.length > 0))
    )
  );
}

export function createRuntimeGeocodingError(
  code: RuntimeGeocodingError["code"],
  message: string,
  fallbackOfficialUrls: string[] = []
): RuntimeGeocodingError {
  return {
    code,
    message,
    fallbackOfficialUrls: uniqueValues(fallbackOfficialUrls)
  };
}

export function validateRuntimeGeocodingAddress(
  address: string | null | undefined,
  fallbackOfficialUrls: string[] = []
): AddressValidationResult {
  const trimmed = address?.trim();

  if (!trimmed) {
    return {
      ok: false,
      error: createRuntimeGeocodingError("MISSING_ADDRESS", "주소가 비어 있어 좌표를 조회할 수 없습니다.", fallbackOfficialUrls)
    };
  }

  if (trimmed.length < 5 || trimmed.length > 200 || COORDINATE_PAIR_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: createRuntimeGeocodingError("INVALID_ADDRESS", "주소 형식이 올바르지 않습니다.", fallbackOfficialUrls)
    };
  }

  if (!ADDRESS_TOKEN_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: createRuntimeGeocodingError(
        "INVALID_ADDRESS",
        "공식 주소로 보기 어려워 수동 확인이 필요합니다.",
        fallbackOfficialUrls
      )
    };
  }

  return {
    ok: true,
    address: trimmed,
    dedupeKey: trimmed.replace(/\s+/g, " ").toLowerCase()
  };
}

export function normalizeProviderGeocodingCandidate(
  candidate: ProviderGeocodingCandidate,
  fallbackOfficialUrls: string[] = []
):
  | {
      ok: true;
      result: NormalizedGeocodingResult;
    }
  | {
      ok: false;
      error: RuntimeGeocodingError;
    } {
  const coordinateResult = normalizeCoordinates(candidate.coordinates);

  if (!coordinateResult.ok) {
    return {
      ok: false,
      error: createRuntimeGeocodingError(
        "INVALID_COORDINATE",
        `공급자 좌표가 유효하지 않습니다: ${coordinateResult.error}`,
        fallbackOfficialUrls
      )
    };
  }

  const addressResult = validateRuntimeGeocodingAddress(candidate.normalizedAddress ?? candidate.address, fallbackOfficialUrls);

  if (!addressResult.ok) {
    return addressResult;
  }

  return {
    ok: true,
    result: {
      provider: candidate.provider,
      address: candidate.address.trim(),
      normalizedAddress: addressResult.address,
      coordinates: coordinateResult.coordinates,
      coordinateSystem: "WGS84",
      precision: candidate.precision ?? "unknown",
      evidenceUrl: candidate.evidenceUrl,
      storagePolicy: RUNTIME_GEOCODING_STORAGE_POLICY
    }
  };
}

export function groupRuntimeGeocodingRequests(requests: RuntimeGeocodingRequest[]): RuntimeGeocodingBatchGroup[] {
  const groups = new Map<string, RuntimeGeocodingBatchGroup>();

  for (const request of requests) {
    const validation = validateRuntimeGeocodingAddress(request.address, request.officialUrls);

    if (!validation.ok) {
      continue;
    }

    const existing = groups.get(validation.dedupeKey);
    const nextCenterIds = uniqueValues(request.centerIds);
    const nextOfficialUrls = uniqueValues(request.officialUrls ?? []);
    const nextSourceUrls = uniqueValues(request.sourceUrls ?? []);

    if (!existing) {
      groups.set(validation.dedupeKey, {
        dedupeKey: validation.dedupeKey,
        address: validation.address,
        centerIds: nextCenterIds,
        officialUrls: nextOfficialUrls,
        sourceUrls: nextSourceUrls
      });
      continue;
    }

    existing.centerIds = uniqueValues([...existing.centerIds, ...nextCenterIds]);
    existing.officialUrls = uniqueValues([...existing.officialUrls, ...nextOfficialUrls]);
    existing.sourceUrls = uniqueValues([...existing.sourceUrls, ...nextSourceUrls]);
  }

  return Array.from(groups.values());
}

