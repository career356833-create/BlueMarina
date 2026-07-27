export type MarineObservatoryData = "tide" | "wave" | "waterTemperature" | "wind" | "sunrise";

export type MarineObservatory = {
  id: string;
  name: string;
  type: "tide" | "weather" | "combined";
  region: string;
  lat: number;
  lng: number;
  supportedData: MarineObservatoryData[];
  source: "KHOA" | "KMA" | "manual";
  sourceId?: string;
  needsVerification?: boolean;
  verificationNote?: string;
  note: string;
};

const verifiedNote = "KHOA 조위관측소 코드 1차 매칭 완료. 실제 API 연결 전 공식 문서로 최종 재검증이 필요합니다.";
const pendingNote = "위치와 표시명은 해양정보센터 UI 검증용입니다. 실제 API 코드 매칭은 추가 검증 후 확정합니다.";

function verified(sourceId: string): Pick<MarineObservatory, "sourceId" | "needsVerification" | "verificationNote" | "note"> {
  return {
    sourceId,
    needsVerification: false,
    verificationNote: verifiedNote,
    note: verifiedNote
  };
}

function pending(reason: string): Pick<MarineObservatory, "needsVerification" | "verificationNote" | "note"> {
  return {
    needsVerification: true,
    verificationNote: `TODO: ${reason}`,
    note: pendingNote
  };
}

export const marineObservatories: MarineObservatory[] = [
  {
    id: "incheon",
    name: "인천 조위관측소",
    type: "combined",
    region: "인천",
    lat: 37.456,
    lng: 126.592,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0001")
  },
  {
    id: "ganghwa",
    name: "강화 해양정보 관측소",
    type: "tide",
    region: "인천",
    lat: 37.746,
    lng: 126.485,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    ...pending("강화 표시명이 KHOA 조위관측소 목록의 강화대교 코드와 동일한지 확인 필요")
  },
  {
    id: "yeongheungdo",
    name: "영흥도 조위관측소",
    type: "combined",
    region: "인천",
    lat: 37.26,
    lng: 126.482,
    supportedData: ["tide", "wave", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0043")
  },
  {
    id: "pyeongtaek",
    name: "평택 조위관측소",
    type: "combined",
    region: "경기",
    lat: 36.966,
    lng: 126.845,
    supportedData: ["tide", "wave", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0002")
  },
  {
    id: "daesan",
    name: "대산 조위관측소",
    type: "combined",
    region: "충남",
    lat: 37.006,
    lng: 126.352,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0017")
  },
  {
    id: "anheung",
    name: "안흥 조위관측소",
    type: "combined",
    region: "충남",
    lat: 36.674,
    lng: 126.134,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0067")
  },
  {
    id: "boryeong",
    name: "보령 조위관측소",
    type: "combined",
    region: "충남",
    lat: 36.327,
    lng: 126.513,
    supportedData: ["tide", "wave", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0025")
  },
  {
    id: "janghang",
    name: "장항 조위관측소",
    type: "tide",
    region: "충남",
    lat: 36.006,
    lng: 126.688,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0024")
  },
  {
    id: "gunsan",
    name: "군산 조위관측소",
    type: "combined",
    region: "전북",
    lat: 35.967,
    lng: 126.563,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0018")
  },
  {
    id: "buan",
    name: "부안 해양정보 관측소",
    type: "weather",
    region: "전북",
    lat: 35.731,
    lng: 126.529,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "manual",
    ...pending("부안과 직접 일치하는 KHOA 조위관측소 코드 확인 필요")
  },
  {
    id: "gyeokpo",
    name: "격포 해양정보 관측소",
    type: "combined",
    region: "전북",
    lat: 35.623,
    lng: 126.469,
    supportedData: ["tide", "wave", "wind", "sunrise"],
    source: "manual",
    ...pending("격포와 직접 일치하는 KHOA 조위관측소 코드 확인 필요")
  },
  {
    id: "mokpo",
    name: "목포 조위관측소",
    type: "combined",
    region: "전남",
    lat: 34.782,
    lng: 126.381,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0007")
  },
  {
    id: "heuksando",
    name: "흑산도 조위관측소",
    type: "combined",
    region: "전남",
    lat: 34.683,
    lng: 125.424,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0035")
  },
  {
    id: "wando",
    name: "완도 조위관측소",
    type: "combined",
    region: "전남",
    lat: 34.315,
    lng: 126.759,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0027")
  },
  {
    id: "jindo",
    name: "진도 조위관측소",
    type: "tide",
    region: "전남",
    lat: 34.471,
    lng: 126.323,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0028")
  },
  {
    id: "goheung",
    name: "고흥 해양정보 관측소",
    type: "weather",
    region: "전남",
    lat: 34.607,
    lng: 127.284,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "manual",
    ...pending("고흥발포 등 인근 KHOA 코드와 매칭 여부 확인 필요")
  },
  {
    id: "yeosu",
    name: "여수 조위관측소",
    type: "combined",
    region: "전남",
    lat: 34.74,
    lng: 127.736,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0016")
  },
  {
    id: "gwangyang",
    name: "광양 조위관측소",
    type: "tide",
    region: "전남",
    lat: 34.901,
    lng: 127.695,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0049")
  },
  {
    id: "namhae",
    name: "남해 해양정보 관측소",
    type: "weather",
    region: "경남",
    lat: 34.837,
    lng: 127.893,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "manual",
    ...pending("남해와 직접 일치하는 KHOA 조위관측소 코드 확인 필요")
  },
  {
    id: "sacheon",
    name: "사천 해양정보 관측소",
    type: "combined",
    region: "경남",
    lat: 34.928,
    lng: 128.071,
    supportedData: ["tide", "wave", "wind", "sunrise"],
    source: "manual",
    ...pending("사천과 삼천포 계열 KHOA 코드 매칭 여부 확인 필요")
  },
  {
    id: "tongyeong",
    name: "통영 조위관측소",
    type: "combined",
    region: "경남",
    lat: 34.842,
    lng: 128.434,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0014")
  },
  {
    id: "geoje",
    name: "거제 조위관측소",
    type: "combined",
    region: "경남",
    lat: 34.881,
    lng: 128.621,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0029")
  },
  {
    id: "masan",
    name: "마산 조위관측소",
    type: "tide",
    region: "경남",
    lat: 35.197,
    lng: 128.576,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0062")
  },
  {
    id: "jinhae",
    name: "진해 해양정보 관측소",
    type: "tide",
    region: "경남",
    lat: 35.148,
    lng: 128.657,
    supportedData: ["tide", "wind", "sunrise"],
    source: "manual",
    ...pending("진해와 직접 일치하는 KHOA 조위관측소 코드 확인 필요")
  },
  {
    id: "busan",
    name: "부산 조위관측소",
    type: "combined",
    region: "부산",
    lat: 35.096,
    lng: 129.035,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0005")
  },
  {
    id: "gijang",
    name: "기장 해양정보 관측소",
    type: "weather",
    region: "부산",
    lat: 35.244,
    lng: 129.223,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "manual",
    ...pending("기장과 직접 일치하는 KHOA 조위관측소 코드 확인 필요")
  },
  {
    id: "ulsan",
    name: "울산 조위관측소",
    type: "combined",
    region: "울산",
    lat: 35.501,
    lng: 129.383,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0020")
  },
  {
    id: "pohang",
    name: "포항 조위관측소",
    type: "combined",
    region: "경북",
    lat: 36.032,
    lng: 129.365,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0091")
  },
  {
    id: "uljin",
    name: "울진 해양정보 관측소",
    type: "weather",
    region: "경북",
    lat: 36.993,
    lng: 129.4,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "manual",
    ...pending("울진과 직접 일치하는 KHOA 조위관측소 코드 확인 필요")
  },
  {
    id: "ulleungdo",
    name: "울릉도 조위관측소",
    type: "combined",
    region: "경북",
    lat: 37.484,
    lng: 130.905,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0013")
  },
  {
    id: "dokdo",
    name: "독도 해양정보 관측소",
    type: "weather",
    region: "경북",
    lat: 37.242,
    lng: 131.864,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "manual",
    ...pending("독도와 직접 일치하는 KHOA 조위관측소 코드 확인 필요")
  },
  {
    id: "gangneung",
    name: "강릉 해양정보 관측소",
    type: "weather",
    region: "강원",
    lat: 37.774,
    lng: 128.949,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "manual",
    ...pending("강릉과 직접 일치하는 KHOA 조위관측소 코드 확인 필요")
  },
  {
    id: "jumunjin",
    name: "주문진 해양정보 관측소",
    type: "weather",
    region: "강원",
    lat: 37.889,
    lng: 128.833,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "manual",
    ...pending("주문진과 직접 일치하는 KHOA 조위관측소 코드 확인 필요")
  },
  {
    id: "donghae",
    name: "동해 해양정보 관측소",
    type: "combined",
    region: "강원",
    lat: 37.495,
    lng: 129.124,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "manual",
    ...pending("동해 표시명이 KHOA 동해항 코드와 동일한지 확인 필요")
  },
  {
    id: "mukho",
    name: "묵호 조위관측소",
    type: "tide",
    region: "강원",
    lat: 37.549,
    lng: 129.116,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0006")
  },
  {
    id: "samcheok",
    name: "삼척 해양정보 관측소",
    type: "weather",
    region: "강원",
    lat: 37.449,
    lng: 129.165,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "manual",
    ...pending("삼척과 직접 일치하는 KHOA 조위관측소 코드 확인 필요")
  },
  {
    id: "sokcho",
    name: "속초 조위관측소",
    type: "combined",
    region: "강원",
    lat: 38.207,
    lng: 128.591,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0012")
  },
  {
    id: "jeju",
    name: "제주 조위관측소",
    type: "combined",
    region: "제주",
    lat: 33.514,
    lng: 126.529,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0004")
  },
  {
    id: "seogwipo",
    name: "서귀포 조위관측소",
    type: "combined",
    region: "제주",
    lat: 33.24,
    lng: 126.561,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0010")
  },
  {
    id: "seongsan",
    name: "성산포 조위관측소",
    type: "combined",
    region: "제주",
    lat: 33.475,
    lng: 126.928,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0022")
  },
  {
    id: "chujado",
    name: "추자도 조위관측소",
    type: "combined",
    region: "제주",
    lat: 33.958,
    lng: 126.302,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    ...verified("DT_0021")
  }
];
