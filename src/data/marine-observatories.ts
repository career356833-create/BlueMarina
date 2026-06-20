export type MarineObservatoryData =
  | "tide"
  | "high-low-tide"
  | "water-temperature"
  | "wave-height"
  | "current"
  | "sunrise-sunset"
  | "wind"
  | "precipitation"
  | "marine-forecast";

export type MarineObservatory = {
  id: string;
  name: string;
  type: "tide" | "ocean-buoy" | "weather-buoy" | "forecast-zone" | "sunrise-sunset";
  region: string;
  lat: number;
  lng: number;
  supportedData: MarineObservatoryData[];
  source: "KHOA" | "KMA" | "manual";
  sourceId: string;
  note: string;
};

export const marineObservatories: MarineObservatory[] = [
  {
    id: "busan-preview",
    name: "부산 해양정보 샘플 관측소",
    type: "tide",
    region: "부산",
    lat: 35.096,
    lng: 129.035,
    supportedData: ["tide", "high-low-tide", "water-temperature", "wave-height", "sunrise-sunset", "wind", "marine-forecast"],
    source: "KHOA",
    sourceId: "PREVIEW-BUSAN",
    note: "실제 API 연결 전 화면 검증용 샘플입니다. 공식 관측소 코드와 좌표는 추후 검증 후 교체합니다."
  },
  {
    id: "pohang-preview",
    name: "포항 해양정보 샘플 관측소",
    type: "ocean-buoy",
    region: "포항",
    lat: 36.032,
    lng: 129.365,
    supportedData: ["water-temperature", "wave-height", "wind", "marine-forecast", "sunrise-sunset"],
    source: "KHOA",
    sourceId: "PREVIEW-POHANG",
    note: "실제 API 연결 전 화면 검증용 샘플입니다. 파고와 수온 제공 여부는 공식 자료 확인이 필요합니다."
  },
  {
    id: "incheon-preview",
    name: "인천 해양정보 샘플 관측소",
    type: "tide",
    region: "인천",
    lat: 37.456,
    lng: 126.592,
    supportedData: ["tide", "high-low-tide", "current", "sunrise-sunset", "wind", "marine-forecast"],
    source: "KHOA",
    sourceId: "PREVIEW-INCHEON",
    note: "실제 API 연결 전 화면 검증용 샘플입니다. 조류 데이터는 공식 API 확인 후 반영합니다."
  },
  {
    id: "yeosu-preview",
    name: "여수 해양정보 샘플 관측소",
    type: "forecast-zone",
    region: "여수",
    lat: 34.74,
    lng: 127.736,
    supportedData: ["tide", "high-low-tide", "wave-height", "wind", "precipitation", "marine-forecast"],
    source: "KMA",
    sourceId: "PREVIEW-YEOSU",
    note: "실제 API 연결 전 화면 검증용 샘플입니다. 기상청 예보구역 매핑은 추후 확정합니다."
  },
  {
    id: "jeju-preview",
    name: "제주 해양정보 샘플 관측소",
    type: "weather-buoy",
    region: "제주",
    lat: 33.514,
    lng: 126.529,
    supportedData: ["water-temperature", "wave-height", "wind", "precipitation", "marine-forecast", "sunrise-sunset"],
    source: "KMA",
    sourceId: "PREVIEW-JEJU",
    note: "실제 API 연결 전 화면 검증용 샘플입니다. 기상·해양 관측 데이터 출처는 실제 연동 단계에서 확정합니다."
  }
];
