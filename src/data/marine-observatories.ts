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
  note: string;
};

const commonNote = "1차 화면 검증용 관측소 데이터입니다. 실제 API 지점 코드와 좌표는 공식 자료 확인 후 보정합니다.";

export const marineObservatories: MarineObservatory[] = [
  {
    id: "incheon",
    name: "인천 해양정보 관측소",
    type: "combined",
    region: "인천",
    lat: 37.456,
    lng: 126.592,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
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
    note: commonNote
  },
  {
    id: "yeongheungdo",
    name: "영흥도 해양정보 관측소",
    type: "weather",
    region: "인천",
    lat: 37.26,
    lng: 126.482,
    supportedData: ["wave", "wind", "waterTemperature", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "pyeongtaek",
    name: "평택 해양정보 관측소",
    type: "combined",
    region: "경기",
    lat: 36.966,
    lng: 126.845,
    supportedData: ["tide", "wave", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "daesan",
    name: "대산 해양정보 관측소",
    type: "combined",
    region: "충남",
    lat: 37.006,
    lng: 126.352,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "anheung",
    name: "안흥 해양정보 관측소",
    type: "weather",
    region: "충남",
    lat: 36.674,
    lng: 126.134,
    supportedData: ["wave", "wind", "waterTemperature", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "boryeong",
    name: "보령 해양정보 관측소",
    type: "combined",
    region: "충남",
    lat: 36.327,
    lng: 126.513,
    supportedData: ["tide", "wave", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "gunsan",
    name: "군산 해양정보 관측소",
    type: "combined",
    region: "전북",
    lat: 35.967,
    lng: 126.563,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "janghang",
    name: "장항 해양정보 관측소",
    type: "tide",
    region: "충남",
    lat: 36.006,
    lng: 126.688,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "buan",
    name: "부안 해양정보 관측소",
    type: "weather",
    region: "전북",
    lat: 35.731,
    lng: 126.529,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "gyeokpo",
    name: "격포 해양정보 관측소",
    type: "combined",
    region: "전북",
    lat: 35.623,
    lng: 126.469,
    supportedData: ["tide", "wave", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "mokpo",
    name: "목포 해양정보 관측소",
    type: "combined",
    region: "전남",
    lat: 34.782,
    lng: 126.381,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "heuksando",
    name: "흑산도 해양정보 관측소",
    type: "weather",
    region: "전남",
    lat: 34.683,
    lng: 125.424,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "wando",
    name: "완도 해양정보 관측소",
    type: "combined",
    region: "전남",
    lat: 34.315,
    lng: 126.759,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "jindo",
    name: "진도 해양정보 관측소",
    type: "tide",
    region: "전남",
    lat: 34.471,
    lng: 126.323,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "goheung",
    name: "고흥 해양정보 관측소",
    type: "weather",
    region: "전남",
    lat: 34.607,
    lng: 127.284,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "yeosu",
    name: "여수 해양정보 관측소",
    type: "combined",
    region: "전남",
    lat: 34.74,
    lng: 127.736,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "gwangyang",
    name: "광양 해양정보 관측소",
    type: "tide",
    region: "전남",
    lat: 34.901,
    lng: 127.695,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "namhae",
    name: "남해 해양정보 관측소",
    type: "weather",
    region: "경남",
    lat: 34.837,
    lng: 127.893,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "sacheon",
    name: "사천 해양정보 관측소",
    type: "combined",
    region: "경남",
    lat: 34.928,
    lng: 128.071,
    supportedData: ["tide", "wave", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "tongyeong",
    name: "통영 해양정보 관측소",
    type: "combined",
    region: "경남",
    lat: 34.842,
    lng: 128.434,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "geoje",
    name: "거제 해양정보 관측소",
    type: "combined",
    region: "경남",
    lat: 34.881,
    lng: 128.621,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "masan",
    name: "마산 해양정보 관측소",
    type: "tide",
    region: "경남",
    lat: 35.197,
    lng: 128.576,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "jinhae",
    name: "진해 해양정보 관측소",
    type: "tide",
    region: "경남",
    lat: 35.148,
    lng: 128.657,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "busan",
    name: "부산 해양정보 관측소",
    type: "combined",
    region: "부산",
    lat: 35.096,
    lng: 129.035,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "gijang",
    name: "기장 해양정보 관측소",
    type: "weather",
    region: "부산",
    lat: 35.244,
    lng: 129.223,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "ulsan",
    name: "울산 해양정보 관측소",
    type: "combined",
    region: "울산",
    lat: 35.501,
    lng: 129.383,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "pohang",
    name: "포항 해양정보 관측소",
    type: "combined",
    region: "경북",
    lat: 36.032,
    lng: 129.365,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "uljin",
    name: "울진 해양정보 관측소",
    type: "weather",
    region: "경북",
    lat: 36.993,
    lng: 129.4,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "ulleungdo",
    name: "울릉도 해양정보 관측소",
    type: "combined",
    region: "경북",
    lat: 37.484,
    lng: 130.905,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "dokdo",
    name: "독도 해양정보 관측소",
    type: "weather",
    region: "경북",
    lat: 37.242,
    lng: 131.864,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "gangneung",
    name: "강릉 해양정보 관측소",
    type: "weather",
    region: "강원",
    lat: 37.774,
    lng: 128.949,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "jumunjin",
    name: "주문진 해양정보 관측소",
    type: "weather",
    region: "강원",
    lat: 37.889,
    lng: 128.833,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "donghae",
    name: "동해 해양정보 관측소",
    type: "combined",
    region: "강원",
    lat: 37.495,
    lng: 129.124,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "mukho",
    name: "묵호 해양정보 관측소",
    type: "tide",
    region: "강원",
    lat: 37.549,
    lng: 129.116,
    supportedData: ["tide", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "samcheok",
    name: "삼척 해양정보 관측소",
    type: "weather",
    region: "강원",
    lat: 37.449,
    lng: 129.165,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "sokcho",
    name: "속초 해양정보 관측소",
    type: "combined",
    region: "강원",
    lat: 38.207,
    lng: 128.591,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "jeju",
    name: "제주 해양정보 관측소",
    type: "combined",
    region: "제주",
    lat: 33.514,
    lng: 126.529,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "seogwipo",
    name: "서귀포 해양정보 관측소",
    type: "combined",
    region: "제주",
    lat: 33.24,
    lng: 126.561,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  },
  {
    id: "seongsan",
    name: "성산포 해양정보 관측소",
    type: "weather",
    region: "제주",
    lat: 33.475,
    lng: 126.928,
    supportedData: ["wave", "waterTemperature", "wind", "sunrise"],
    source: "KMA",
    note: commonNote
  },
  {
    id: "chujado",
    name: "추자도 해양정보 관측소",
    type: "combined",
    region: "제주",
    lat: 33.958,
    lng: 126.302,
    supportedData: ["tide", "wave", "waterTemperature", "wind", "sunrise"],
    source: "KHOA",
    note: commonNote
  }
];
