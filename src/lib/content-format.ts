import type { ContentType, GeneratedContent } from "@/types/content";

const blockedPhrases = [
  "사진은 첨부용으로만 사용하고 입력 정보 중심으로 작성했습니다.",
  "첨부용으로만 사용하고 입력 정보 중심으로 작성했습니다.",
  "사진 내용도 AI 분석하기",
  "SEO 제목",
  "오늘의 활동",
  "아이들의 반응",
  "가정 연계 문장",
  "행사안내",
  "준비물",
  "주의사항",
  "도입",
  "본문",
  "마무리",
  "짧은 소개문",
  "제목"
];

function cleanLine(line: string) {
  let next = line.trim();
  for (const phrase of blockedPhrases) {
    next = next.replaceAll(phrase, "");
  }
  return next.replace(/^[:：\-\s]+/, "").trim();
}

export function sanitizeGeneratedText(text: string) {
  return text
    .split("\n")
    .map(cleanLine)
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function formatGeneratedContent(type: ContentType, content: GeneratedContent) {
  const sectionValues = content.sections.map((section) => section.value).filter(Boolean);
  const hashtags = content.hashtags?.map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");

  const textByType: Record<ContentType, string> = {
    notice: [content.title, content.body, ...sectionValues].join("\n\n"),
    newsletter: [content.title, "안녕하세요, 보호자님.", content.body, ...sectionValues].join("\n\n"),
    homepage: [content.title, content.body, ...sectionValues].join("\n\n"),
    blog: [content.title, content.body, ...sectionValues].join("\n\n"),
    instagram: [content.body, ...sectionValues, hashtags].filter(Boolean).join("\n\n")
  };

  return sanitizeGeneratedText(textByType[type]);
}
