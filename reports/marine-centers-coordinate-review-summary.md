# Blue Marina 시험장·교육장 좌표 수동 검수 작업표 요약

## 생성 결과

- 생성 CSV: eports/marine-centers-coordinate-review.csv
- 기준 입력: eports/marine-centers-geocoding-preview.csv
- 원본 대조: src/data/marine-centers.ts
- 주소 그룹 수: 79
- 연결 시설 수: 127
- 원본 시설 수: 127
- 중복 centerId 수: 0
- 누락 centerId 수: 0
- 원본에 없는 extra centerId 수: 0

## 검수 상태

- PENDING: 77개 주소 그룹
- MANUAL_REVIEW_REQUIRED: 2개 주소 그룹
- 좌표 후보(candidateLat/candidateLng): 아직 입력하지 않음
- 동일 주소 시설: 하나의 주소 그룹에서 하나의 좌표 후보를 공유하도록 구성

## 수동 검수 필수 그룹

- 전라북도 김제시 만경읍 만경리 100: jeonbuk-gimje-practical-test / GIMJE_JIBUN_ADDRESS_MANUAL_REVIEW
- 전라북도 김제시 만경읍 만경리 750: jeonbuk-gimje-safety-education / GIMJE_JIBUN_ADDRESS_MANUAL_REVIEW|OFFICIAL_URL_MISSING_1_ITEMS

## officialUrl 누락

- officialUrl 누락 시설 수: 19
- officialUrl 누락 표시가 포함된 주소 그룹 수: 17
- 주소 그룹 전체의 officialUrl이 비어 있는 그룹 수: 8

- 경기도 가평군 청평면 호반로 162: gyeonggi-gapyeong-safety-education / OFFICIAL_URL_MISSING_1_ITEMS
- 경기도 시흥시 거북섬5길 16: gyeonggi-siheung-practical-test|exemption-education-94 / OFFICIAL_URL_MISSING_1_ITEMS
- 경기도 시흥시 거북섬5길 16 거북섬프라자 201호: gyeonggi-siheung-safety-education / OFFICIAL_URL_MISSING_1_ITEMS
- 경기도 안산시 단원구 선감동 대부황금로 7: exemption-education-95 / OFFICIAL_URL_MISSING_1_ITEMS
- 경남 창원시 진해구 천자로 160: gyeongnam-changwon-safety-education / OFFICIAL_URL_MISSING_1_ITEMS
- 경상남도 거제시 남부면 남부해안로 1035: gyeongnam-yacht-geoje-practical-test|gyeongnam-yacht-geoje-safety-education|exemption-education-98 / OFFICIAL_URL_MISSING_1_ITEMS
- 경상남도 창원시 마산합포구 진동면 광암회단지길 42: gyeongnam-changwon-practical-test|gyeongnam-masan-safety-education / OFFICIAL_URL_MISSING_1_ITEMS
- 경상북도 영덕군 강구면 강영로 33: practical-test-44|safety-education-75|gyeongbuk-yeongdeok-exemption-education / OFFICIAL_URL_MISSING_2_ITEMS
- 경상북도 포항시 남구 희망대로 810: gyeongbuk-pohang-safety-education / OFFICIAL_URL_MISSING_1_ITEMS
- 부산광역시 수영구 민락수변로 239번길 18: busan-suyeong-practical-test|busan-suyeong-safety-education|exemption-education-113 / OFFICIAL_URL_MISSING_1_ITEMS
- 부산광역시 영도구 태종로 727: busan-yacht-yeongdo-practical-test|busan-yacht-yeongdo-safety-education|exemption-education-114 / OFFICIAL_URL_MISSING_1_ITEMS
- 서울특별시 마포구 마포나루길 256: practical-test-48|safety-education-79|seoul-mapo-exemption-education / OFFICIAL_URL_MISSING_2_ITEMS
- 서울특별시 서초구 올림픽대로 2085-18: seoul-seocho-banpo-practical-test|seoul-seocho-banpo-safety-education|exemption-education-116 / OFFICIAL_URL_MISSING_1_ITEMS
- 울산광역시 남구 여천동 187-24: ulsan-namgu-safety-education / OFFICIAL_URL_MISSING_1_ITEMS
- 전라남도 여수시 웅천로 189, 웅천부영1차상가 202호: exemption-education-120 / OFFICIAL_URL_MISSING_1_ITEMS
- 전라북도 김제시 만경읍 만경리 750: jeonbuk-gimje-safety-education / GIMJE_JIBUN_ADDRESS_MANUAL_REVIEW|OFFICIAL_URL_MISSING_1_ITEMS
- 충청남도 태안군 남면 곰섬로 314: chungnam-taean-practical-test|chungnam-taean-safety-education|exemption-education-125 / OFFICIAL_URL_MISSING_1_ITEMS

## 시설 유형 포함 그룹 수

- exemption-education: 35
- practical-test: 30
- safety-education: 31
- written-test: 30

## 검증 결과

- 주소 그룹 79개: PASS
- 시설 127개 전부 연결: PASS
- 중복 centerId 0개: PASS
- 누락 centerId 0개: PASS
- 김제 2개 지번주소 MANUAL_REVIEW_REQUIRED 처리: PASS

## 다음 작업

1. erificationStatus=PENDING 그룹부터 공식 주소 기반 좌표 후보를 입력합니다.
2. 김제 지번주소 2개 그룹은 공식 위치를 수동 확인한 뒤 좌표를 입력합니다.
3. 좌표 입력 후 coordinateSource, sourceEvidenceUrl, erifiedBy, erifiedAt, erificationNote를 함께 채웁니다.
4. 검수 완료 행은 erificationStatus=VERIFIED로 변경합니다.
