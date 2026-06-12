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

export type GenerationInput = {
  type: ContentType;
  keywords: string[];
  memo?: string;
  images: UploadedImage[];
  institution?: Institution;
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
