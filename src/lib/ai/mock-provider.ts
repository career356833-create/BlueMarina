import type { AiProvider } from "@/lib/ai/types";
import type { GeneratedContent, GenerationInput } from "@/types/content";

const tone = "따뜻하고 전문적인 어린이집 교사 말투";

export const mockProvider: AiProvider = {
  async generate(input: GenerationInput): Promise<GeneratedContent> {
    const keywordText = input.keywords.join(", ") || "오늘의 활동";
    const place = input.institution?.name ?? "우리 기관";
    const photoNote =
      input.images.length > 0
        ? `첨부된 사진 ${input.images.length}장을 참고해 현장감 있게 구성했습니다.`
        : "사진이 없을 때도 바로 사용할 수 있는 문장으로 구성했습니다.";

    if (input.type === "newsletter") {
      return {
        title: `${keywordText} 안내문`,
        body: `${place}에서 ${keywordText} 관련 일정을 안내드립니다. 가정에서도 아이들이 편안하게 참여할 수 있도록 아래 내용을 확인해 주세요.`,
        sections: [
          { label: "행사안내", value: `${keywordText} 활동을 통해 아이들이 또래와 협력하고 즐겁게 경험을 넓힐 예정입니다.` },
          { label: "준비물", value: "편한 복장, 개인 물병, 필요 시 여벌 옷을 보내주세요." },
          { label: "주의사항", value: "아이의 컨디션을 아침 등원 시 담임교사에게 알려주시면 활동 운영에 반영하겠습니다." }
        ]
      };
    }

    if (input.type === "homepage") {
      return {
        title: `${place} ${keywordText} 활동 이야기`,
        body: `${photoNote} 아이들은 ${keywordText} 시간을 보내며 직접 보고, 만지고, 표현하는 즐거움을 경험했습니다.`,
        sections: [
          { label: "제목", value: `${keywordText}로 반짝인 하루` },
          { label: "본문", value: `${tone}로 오늘의 장면을 전합니다. 아이들은 호기심 가득한 표정으로 활동에 참여했고, 서로의 생각을 나누며 성장하는 모습을 보여주었습니다.` }
        ]
      };
    }

    if (input.type === "blog") {
      return {
        title: `${keywordText}로 만나는 ${place}의 교육 철학`,
        body: `${place}은 놀이 중심 활동을 통해 아이들의 자율성과 사회성을 함께 키웁니다. ${keywordText} 활동은 관찰, 표현, 협력의 기회를 자연스럽게 담아낸 하루였습니다.`,
        sections: [
          { label: "SEO 제목", value: `${keywordText} 어린이집 활동 추천 | ${place}` },
          { label: "도입", value: `${keywordText}는 아이들의 몰입과 성장을 잘 보여주는 대표 활동입니다.` },
          { label: "본문", value: "사진 속 장면처럼 아이들은 활동 과정에서 스스로 선택하고 친구들과 이야기를 나누며 배움의 폭을 넓혔습니다." },
          { label: "마무리", value: `${place}은 매일의 놀이가 의미 있는 배움이 되도록 세심하게 기록합니다.` }
        ]
      };
    }

    if (input.type === "instagram") {
      const hashtags = ["키즈오토", "어린이집", "유치원", ...input.keywords.map((keyword) => keyword.replace(/\s/g, ""))];
      return {
        title: `${keywordText} 한 컷 기록`,
        body: `오늘은 ${keywordText}로 웃음이 가득한 하루를 보냈어요. 작은 손길과 반짝이는 표정이 모여 특별한 배움이 되었습니다.`,
        sections: [
          { label: "짧은 소개문", value: `${keywordText} 속에서 아이들의 자신감이 자랐습니다.` }
        ],
        hashtags
      };
    }

    return {
      title: `${keywordText} 알림장`,
      body: `${photoNote} 오늘 아이들은 ${keywordText} 활동에 즐겁게 참여했습니다.`,
      sections: [
        { label: "오늘의 활동", value: `${keywordText} 활동을 하며 몸과 마음을 활짝 열고 다양한 경험을 쌓았습니다.` },
        { label: "아이들의 반응", value: "처음에는 조심스러워하던 아이들도 곧 친구들과 웃으며 적극적으로 참여했습니다." },
        { label: "가정 연계 문장", value: "가정에서도 오늘 활동에 대해 아이와 짧게 이야기 나누며 경험을 이어가 주세요." }
      ]
    };
  }
};
