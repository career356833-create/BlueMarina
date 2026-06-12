export type UserRole = "owner" | "teacher" | "admin";

export type ContentType =
  | "notice"
  | "newsletter"
  | "homepage"
  | "blog"
  | "instagram";

export type Institution = {
  id: string;
  name: string;
  type: "daycare" | "kindergarten";
  logoUrl?: string;
  address: string;
  phone: string;
};

export type UploadedImage = {
  id: string;
  name: string;
  url: string;
  path?: string;
};

export type Tone = "warm" | "professional" | "simple" | "promotion";

export type UploadStatus = "pending" | "completed" | "failed";

export type InstagramImageSelectionMode = "auto_first_3" | "manual" | "ai_recommended";

export type GenerationInput = {
  type: ContentType;
  keywords: string[];
  memo?: string;
  images: UploadedImage[];
  institution?: Institution;
  activityName?: string;
  className?: string;
  ageGroup?: string;
  activityDate?: string;
  tone?: Tone;
  analyzePhotos?: boolean;
};

export type GeneratedContent = {
  title: string;
  body: string;
  sections: {
    label: string;
    value: string;
  }[];
  hashtags?: string[];
};

export type ContentHistoryItem = {
  id: string;
  type: ContentType;
  keywords: string[];
  content: GeneratedContent;
  imageUrls: string[];
  createdAt: string;
};

export type UnifiedGenerationInput = {
  uploadedImages: UploadedImage[];
  keywords: string[];
  activityName: string;
  className: string;
  ageGroup: string;
  activityDate: string;
  tone: Tone;
  analyzePhotos: boolean;
  institution?: Institution;
};

export type UnifiedGenerationResult = Record<ContentType, GeneratedContent>;

export type UnifiedGenerationRecord = UnifiedGenerationInput & {
  id: string;
  results: UnifiedGenerationResult;
  noticeText: string;
  newsletterText: string;
  homepageText: string;
  blogText: string;
  instagramText: string;
  uploadStatusHomepage: UploadStatus;
  uploadStatusBlog: UploadStatus;
  uploadStatusInstagram: UploadStatus;
  instagramSelectedImages: UploadedImage[];
  instagramImageSelectionMode: InstagramImageSelectionMode;
  regenerateCount: number;
  createdAt: string;
  updatedAt: string;
};
