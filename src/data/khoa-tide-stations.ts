export type KhoaTideStationSnapshot = {
  stationId: string;
  name: string;
  region: string;
  latitude: number;
  longitude: number;
};

// Source-backed snapshot from the KHOA high/low tide forecast response, audited 2026-09-06.
export const khoaTideStationSnapshots: KhoaTideStationSnapshot[] = [
  { stationId: "DT_0001", name: "인천", region: "인천", latitude: 37.45194, longitude: 126.59222 },
  { stationId: "DT_0043", name: "영흥도", region: "인천", latitude: 37.23861, longitude: 126.42861 },
  { stationId: "DT_0002", name: "평택", region: "경기", latitude: 36.96694, longitude: 126.82277 },
  { stationId: "DT_0017", name: "대산", region: "충남", latitude: 37.0075, longitude: 126.35277 },
  { stationId: "DT_0067", name: "안흥", region: "충남", latitude: 36.67463, longitude: 126.12955 },
  { stationId: "DT_0025", name: "보령", region: "충남", latitude: 36.40638, longitude: 126.48611 },
  { stationId: "DT_0024", name: "장항", region: "충남", latitude: 36.00694, longitude: 126.6875 },
  { stationId: "DT_0018", name: "군산", region: "전북", latitude: 35.97555, longitude: 126.56305 },
  { stationId: "DT_0007", name: "목포", region: "전남", latitude: 34.77972, longitude: 126.37555 },
  { stationId: "DT_0035", name: "흑산도", region: "전남", latitude: 34.68416, longitude: 125.43555 },
  { stationId: "DT_0027", name: "완도", region: "전남", latitude: 34.31555, longitude: 126.75972 },
  { stationId: "DT_0028", name: "진도", region: "전남", latitude: 34.37777, longitude: 126.30861 },
  { stationId: "DT_0016", name: "여수", region: "전남", latitude: 34.74722, longitude: 127.76555 },
  { stationId: "DT_0049", name: "광양", region: "전남", latitude: 34.90367, longitude: 127.75483 },
  { stationId: "DT_0014", name: "통영", region: "경남", latitude: 34.82777, longitude: 128.43472 },
  { stationId: "DT_0029", name: "거제도", region: "경남", latitude: 34.80138, longitude: 128.69916 },
  { stationId: "DT_0062", name: "마산", region: "경남", latitude: 35.1975, longitude: 128.57638 },
  { stationId: "DT_0005", name: "부산", region: "부산", latitude: 35.09638, longitude: 129.03527 },
  { stationId: "DT_0020", name: "울산", region: "울산", latitude: 35.50194, longitude: 129.38722 },
  { stationId: "DT_0091", name: "포항", region: "경북", latitude: 36.05177, longitude: 129.37627 },
  { stationId: "DT_0013", name: "울릉도", region: "경북", latitude: 37.49138, longitude: 130.91361 },
  { stationId: "DT_0006", name: "묵호", region: "강원", latitude: 37.55027, longitude: 129.11638 },
  { stationId: "DT_0012", name: "속초", region: "강원", latitude: 38.20722, longitude: 128.59416 },
  { stationId: "DT_0004", name: "제주", region: "제주", latitude: 33.5275, longitude: 126.54305 },
  { stationId: "DT_0010", name: "서귀포", region: "제주", latitude: 33.24, longitude: 126.56166 },
  { stationId: "DT_0022", name: "성산포", region: "제주", latitude: 33.47472, longitude: 126.92777 },
  { stationId: "DT_0021", name: "추자도", region: "제주", latitude: 33.96194, longitude: 126.30027 },
];
