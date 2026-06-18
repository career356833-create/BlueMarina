export type CategoryNode = {
  id: string;
  name: string;
  children?: CategoryNode[];
  tags?: string[];
};

export const categoryTree: CategoryNode[] = [
  {
    id: "law",
    name: "법규",
    children: [
      {
        id: "law-license",
        name: "면허·등록",
        tags: ["조종면허", "면허취소", "등록", "검사"]
      },
      {
        id: "law-navigation-rule",
        name: "운항규칙",
        tags: ["항법", "속력제한", "금지구역", "운항질서"]
      },
      {
        id: "law-safety-duty",
        name: "안전의무",
        tags: ["구명조끼", "승선정원", "음주운항", "안전장비"]
      }
    ]
  },
  {
    id: "navigation-weather",
    name: "항해·기상",
    children: [
      {
        id: "navigation-basic",
        name: "항해기초",
        tags: ["방위", "침로", "변침", "거리"]
      },
      {
        id: "navigation-chart",
        name: "해도·표지",
        tags: ["해도", "등대", "부표", "항로표지"]
      },
      {
        id: "weather-sea",
        name: "기상·해상상태",
        tags: ["바람", "파도", "안개", "기압", "해류"]
      }
    ]
  },
  {
    id: "boat-operation",
    name: "선박운용",
    children: [
      {
        id: "operation-precheck",
        name: "출항 전 점검",
        tags: ["연료점검", "선체점검", "장비점검", "승객안내"]
      },
      {
        id: "operation-maneuver",
        name: "조종·접안",
        tags: ["접안", "이안", "선회", "후진", "정박"]
      },
      {
        id: "operation-common",
        name: "운항상식",
        tags: ["견시", "안전거리", "추월", "횡단상태"]
      }
    ]
  },
  {
    id: "engine",
    name: "기관",
    children: [
      {
        id: "engine-basic",
        name: "기관기초",
        tags: ["엔진", "냉각", "윤활", "배터리"]
      },
      {
        id: "engine-fuel-electric",
        name: "연료·전기",
        tags: ["연료", "전기계통", "점화", "충전"]
      },
      {
        id: "engine-trouble",
        name: "고장대응",
        tags: ["시동불량", "과열", "프로펠러", "응급조치"]
      }
    ]
  },
  {
    id: "safety-firstaid",
    name: "안전·응급처치",
    children: [
      {
        id: "safety-equipment",
        name: "안전장비",
        tags: ["구명조끼", "소화기", "신호장비", "통신장비"]
      },
      {
        id: "safety-accident",
        name: "사고대응",
        tags: ["전복", "충돌", "침수", "구조요청"]
      },
      {
        id: "firstaid-basic",
        name: "응급처치",
        tags: ["심폐소생술", "저체온증", "익수", "출혈"]
      }
    ]
  }
];

// TODO: NotebookLM 최종 매핑표가 확정되면 각 문항의 category, subCategory, detailCategory, tags 값과 연결한다.
