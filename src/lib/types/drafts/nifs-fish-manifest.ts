export type NifsManifestCrawlStatus = "success" | "partial" | "failed";

export type NifsManifestSourceCheckedAtSource = "metadata_collectedAt" | "filesystem_mtime";

export type NifsStagingManifest = {
  sourceProvider: "NIFS";
  sourceId: string;
  sourceUrl: string;
  fetchedAt: string;
  sourceCheckedAt: string;
  sourceCheckedAtSource?: NifsManifestSourceCheckedAtSource;
  contentHash: string;
  parserVersion: string;
  crawlStatus: NifsManifestCrawlStatus;
  rawHtmlPath?: string;
  rawPayloadPath?: string;
  imageUrls: string[];
  rawMediaPaths?: string[];
  title?: string;
  koreanName?: string;
  scientificName?: string;
  byteSize?: number;
  mimeType?: string;
  sourceMissingAt?: string;
  lastSeenAt?: string;
};

export type NifsManifestBuildError = {
  sourceCandidate: string;
  path: string;
  errorCode: string;
  message: string;
  recoverable: boolean;
};
