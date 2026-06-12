import type { AiProvider } from "@/lib/ai/types";
import type { GeneratedContent, GenerationInput } from "@/types/content";

const toneLabels = {
  warm: "따뜻한 감성형",
  professional: "전문형",
  simple: "간단형",
  promotion: "홍보형"
};

function context(input: GenerationInput) {
  const keywordText = input.keywords.join(", ") || input.activityName || "오늘의 활동";
  const place = input.institution?.name ?? "우리 기관";
  const classText = input.className ? `${input.className} 친구들` : "아이들";
  const ageText = input.ageGroup ? `${input.ageGroup}` : "유아";
  const dateText = input.activityDate ? new Date(input.activityDate).toLocaleDateString("ko-KR") : "오늘";
  const toneText = input.tone ? toneLabels[input.tone] : "따뜻한 감성형";
  const photoText = input.analyzePhotos ? `첨부 사진 ${input.images.length}장의 분위기도 자연스럽게 반영했습니다.` : "";

  return { keywordText, place, classText, ageText, dateText, toneText, photoText };
}

export const mockProvider: AiProvider = {
  async generate(input: GenerationInput): Promise<GeneratedContent> {
    const { keywordText, place, classText, ageText, dateText, toneText, photoText } = context(input);
    const activity = input.activityName || keywordText;

    if (input.type === "newsletter") {
      return {
        title: `${activity} 가정통신문`,
        body: `${place}에서 ${dateText} ${activity} 활동을 진행합니다. ${ageText} 아이들이 안전하고 즐겁게 참여할 수 있도록 아래 내용을 확인해 주세요.`,
        sections: [
          { label: "행사안내", value: `${classText}은 ${activity}를 통해 호기심을 키우고 친구들과 함께하는 경험을 넓힐 예정입니다.` },
          { label: "준비물", value: "편한 복장, 개인 물병, 필요 시 여벌 옷을 보내주세요." },
          { label: "주의사항", value: "아이의 컨디션이나 특이사항은 등원 시 담임교사에게 알려주시면 활동 운영에 반영하겠습니다." }
        ]
      };
    }

    if (input.type === "homepage") {
      return {
        title: `${activity} 활동 이야기`,
        body: `${dateText}, ${place}의 ${classText}은 ${activity} 활동에 참여했습니다. ${photoText}`,
        sections: [
          { label: "제목", value: `${activity}로 채운 즐거운 하루` },
          { label: "본문", value: `${toneText} 문체로 작성했습니다. 아이들은 활동 과정에서 스스로 탐색하고 표현하며 친구들과 자연스럽게 소통했습니다.` }
        ]
      };
    }

    if (input.type === "blog") {
      return {
        title: `${place} ${activity} 활동 후기`,
        body: `${place}은 놀이 중심 교육을 통해 아이들의 자율성과 사회성을 함께 키웁니다. ${activity} 활동은 ${ageText} 아이들이 직접 경험하고 표현하는 의미 있는 시간이었습니다.`,
        sections: [
          { label: "SEO 제목", value: `${activity} 어린이집 활동 추천 | ${place}` },
          { label: "도입", value: `${activity}는 아이들의 몰입과 성장을 잘 보여주는 활동입니다.` },
          { label: "본문", value: `${classText}은 ${keywordText}를 중심으로 관찰하고 이야기 나누며 배움을 넓혔습니다.` },
          { label: "마무리", value: `${place}은 매일의 놀이가 의미 있는 기록이 되도록 세심하게 살피고 있습니다.` }
        ]
      };
    }

    if (input.type === "instagram") {
      const hashtags = ["키즈오토", "어린이집", "유치원", ...input.keywords.map((keyword) => keyword.replace(/\s/g, ""))];
      return {
        title: `${activity} 한 컷 기록`,
        body: `${dateText} ${classText}의 ${activity} 시간. 작은 웃음과 반짝이는 표정이 모여 특별한 하루가 되었습니다.`,
        sections: [
          { label: "짧은 소개문", value: `${activity} 속에서 아이들의 자신감과 즐거움이 자랐습니다.` }
        ],
        hashtags
      };
    }

    return {
      title: `${activity} 알림장`,
      body: `${dateText} ${classText}은 ${activity} 활동에 즐겁게 참여했습니다.${photoText ? ` ${photoText}` : ""}`,
      sections: [
        { label: "오늘의 활동", value: `${keywordText}를 중심으로 몸과 마음을 활짝 열고 다양한 경험을 쌓았습니다.` },
        { label: "아이들의 반응", value: "처음에는 조심스러워하던 아이들도 곧 친구들과 웃으며 적극적으로 참여했습니다." },
        { label: "가정 연계 문장", value: "가정에서도 오늘 활동에 대해 아이와 짧게 이야기 나누며 경험을 이어가 주세요." }
      ]
    };
  }
};
