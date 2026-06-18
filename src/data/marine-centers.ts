export type MarineCenterType = "written-test" | "practical-test" | "safety-education" | "exemption-education";

export type MarineCenter = {
  id: string;
  name: string;
  type: MarineCenterType;
  region: string;
  city?: string;
  address: string;
  phone?: string;
  availableLicenses?: ("general" | "yacht")[];
  lat?: number;
  lng?: number;
  officialUrl?: string;
  sourceUrl?: string;
  sourceCheckedAt?: string;
  note?: string;
  status?: "active" | "unknown" | "closed";
};

export const marineCenterTypeLabels: Record<MarineCenterType, string> = {
  "written-test": "필기시험장",
  "practical-test": "실기시험장",
  "safety-education": "수상안전교육장",
  "exemption-education": "면제교육장"
};

export const marineCenters: MarineCenter[] = [
  {
    id: "sample-written-test",
    name: "필기시험장 샘플",
    type: "written-test",
    region: "샘플지역",
    city: "데이터 준비중",
    address: "공식 자료 확인 후 주소가 반영됩니다.",
    phone: "데이터 준비중",
    availableLicenses: ["general", "yacht"],
    note: "실제 기관명이 아닌 구조 확인용 샘플입니다.",
    status: "unknown"
  },
  {
    id: "sample-practical-test",
    name: "실기시험장 샘플",
    type: "practical-test",
    region: "샘플지역",
    city: "데이터 준비중",
    address: "공식 자료 확인 후 주소가 반영됩니다.",
    phone: "데이터 준비중",
    availableLicenses: ["general", "yacht"],
    note: "실제 기관명이 아닌 구조 확인용 샘플입니다.",
    status: "unknown"
  },
  {
    id: "sample-safety-education",
    name: "수상안전교육장 샘플",
    type: "safety-education",
    region: "샘플지역",
    city: "데이터 준비중",
    address: "공식 자료 확인 후 주소가 반영됩니다.",
    phone: "데이터 준비중",
    availableLicenses: ["general", "yacht"],
    note: "실제 기관명이 아닌 구조 확인용 샘플입니다.",
    status: "unknown"
  },
  {
    id: "sample-exemption-education",
    name: "면제교육장 샘플",
    type: "exemption-education",
    region: "샘플지역",
    city: "데이터 준비중",
    address: "공식 자료 확인 후 주소가 반영됩니다.",
    phone: "데이터 준비중",
    availableLicenses: ["general", "yacht"],
    note: "실제 기관명이 아닌 구조 확인용 샘플입니다.",
    status: "unknown"
  }
];
