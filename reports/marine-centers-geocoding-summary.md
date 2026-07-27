# Marine Centers Geocoding Preview Summary

## Scope

- Source data: src/data/marine-centers.ts
- Total centers: 127
- Address groups: 79
- Centers included in CSV: 127
- Duplicate address groups: 27
- Auto geocoding candidate groups: 77
- Manual review groups: 2
- Centers without officialUrl: 19
- Address groups containing officialUrl-missing centers: 17

## Type Counts

- 필기시험장 (written-test): 31
- 실기시험장 (practical-test): 30
- 수상안전교육장 (safety-education): 31
- 면제교육기관 (exemption-education): 35

## Manual Review Groups

- 전라북도 김제시 만경읍 만경리 100: jeonbuk-gimje-practical-test (GIMJE_JIBUN_ADDRESS_MANUAL_REVIEW)
- 전라북도 김제시 만경읍 만경리 750: jeonbuk-gimje-safety-education (GIMJE_JIBUN_ADDRESS_MANUAL_REVIEW|OFFICIAL_URL_MISSING_1_ITEMS)

## Official URL Missing Centers

- practical-test-44 / 경북(영덕) / 경북요트(영덕) / practical-test / 경상북도 영덕군 강구면 강영로 33
- practical-test-48 / 서울(마포) / 서울요트(마포) / practical-test / 서울특별시 마포구 마포나루길 256
- gyeonggi-gapyeong-safety-education / 경기(가평) / safety-education / 경기도 가평군 청평면 호반로 162
- gyeonggi-siheung-safety-education / 경기(시흥) / safety-education / 경기도 시흥시 거북섬5길 16 거북섬프라자 201호
- gyeongnam-masan-safety-education / 경남(마산) / safety-education / 경상남도 창원시 마산합포구 진동면 광암회단지길 42
- gyeongnam-changwon-safety-education / 경남(창원) / safety-education / 경남 창원시 진해구 천자로 160
- safety-education-75 / 경북(영덕) / 경북요트(영덕) / safety-education / 경상북도 영덕군 강구면 강영로 33
- gyeongbuk-pohang-safety-education / 경북(포항) / safety-education / 경상북도 포항시 남구 희망대로 810
- safety-education-79 / 서울(마포) / 서울요트(마포) / safety-education / 서울특별시 마포구 마포나루길 256
- ulsan-namgu-safety-education / 울산(남구) / safety-education / 울산광역시 남구 여천동 187-24
- jeonbuk-gimje-safety-education / 전북(김제) / safety-education / 전라북도 김제시 만경읍 만경리 750
- exemption-education-94 / 경기(시흥) / 경기요트(시흥) / exemption-education / 경기도 시흥시 거북섬5길 16
- exemption-education-95 / 경기(안산) / 경기요트(안산) / exemption-education / 경기도 안산시 단원구 선감동 대부황금로 7
- exemption-education-98 / 경남(거제남부) / 경남요트(거제) / exemption-education / 경상남도 거제시 남부면 남부해안로 1035
- exemption-education-113 / 부산(수영) / 부산요트(수영) / exemption-education / 부산광역시 수영구 민락수변로 239번길 18
- exemption-education-114 / 부산(영도) / 부산요트(영도) / exemption-education / 부산광역시 영도구 태종로 727
- exemption-education-116 / 서울서초(반포) / 서울요트(서초) / exemption-education / 서울특별시 서초구 올림픽대로 2085-18
- exemption-education-120 / 전남(여수) / 전남요트(여수) / exemption-education / 전라남도 여수시 웅천로 189, 웅천부영1차상가 202호
- exemption-education-125 / 충남(태안) / 충남요트(태안) / exemption-education / 충청남도 태안군 남면 곰섬로 314

## Duplicate Address Group Examples

- 강원도 삼척시 근덕면 덕산해변길 104: gangwon-yacht-samcheok-practical-test|gangwon-yacht-samcheok-safety-education|gangwon-samcheok-exemption-education
- 강원도 춘천시 고산배터길 27-6: gangwon-chuncheon-practical-test|gangwon-chuncheon-safety-education
- 경기도 가평군 호반로 162: gyeonggi-gapyeong-special-written-test|gyeonggi-gapyeong-practical-test
- 경기도 시흥시 거북섬5길 16: gyeonggi-siheung-practical-test|exemption-education-94
- 경기도 여주시 강변북로 163: gyeonggi-yeoju-special-written-test|gyeonggi-yeoju-practical-test|gyeonggi-yeoju-safety-education
- 경상남도 거제시 남부면 남부해안로 1035: gyeongnam-yacht-geoje-practical-test|gyeongnam-yacht-geoje-safety-education|exemption-education-98
- 경상남도 사천시 해안관광로 339: gyeongnam-sacheon-practical-test|gyeongnam-sacheon-safety-education
- 경상남도 창원시 마산합포구 진동면 광암회단지길 42: gyeongnam-changwon-practical-test|gyeongnam-masan-safety-education
- 경상남도 통영시 도남로 269-28: gyeongnam-yacht-tongyeong-practical-test|gyeongnam-yacht-tongyeong-safety-education|gyeongnam-yacht-tongyeong-exemption-education
- 경상남도 통영시 평인일주로 478: gyeongnam-tongyeong-practical-test|gyeongnam-tongyeong-safety-education
- 경상남도 합천군 봉산면 서부로 4270-8: gyeongnam-hapcheon-special-written-test|gyeongnam-hapcheon-practical-test|gyeongnam-hapcheon-safety-education|gyeongnam-hapcheon-exemption-education
- 경상북도 안동시 석주로 514: gyeongbuk-andong-pc-written-test|gyeongbuk-andong-special-written-test|gyeongbuk-andong-practical-test|gyeongbuk-andong-safety-education|gyeongbuk-andong-exemption-education
- 경상북도 영덕군 강구면 강영로 33: practical-test-44|safety-education-75|gyeongbuk-yeongdeok-exemption-education
- 부산광역시 수영구 민락수변로 239번길 18: busan-suyeong-practical-test|busan-suyeong-safety-education|exemption-education-113
- 부산광역시 영도구 태종로 727: busan-yacht-yeongdo-practical-test|busan-yacht-yeongdo-safety-education|exemption-education-114
- 서울특별시 마포구 마포나루길 256: practical-test-48|safety-education-79|seoul-mapo-exemption-education
- 서울특별시 서초구 올림픽대로 2085-18: seoul-seocho-banpo-practical-test|seoul-seocho-banpo-safety-education|exemption-education-116
- 서울특별시 영등포구 당산동 100-2: seoul-yanghwa-practical-test|seoul-yanghwa-safety-education
- 전남 목포시 해양대학로 91, 목포해양대학교 미래융복합관 D1 5층: jeonnam-yacht-mokpo-practical-test|jeonnam-yacht-mokpo-safety-education|jeonnam-mokpo-exemption-education
- 전라남도 나주시 다도면 나주호로 558-314: jeonnam-naju-practical-test|jeonnam-naju-safety-education|jeonnam-naju-exemption-education

## Notes

- Coordinates were not generated.
- External APIs were not called.
- src/data/marine-centers.ts was not modified.
- Same-address facilities with multiple types were grouped into a single preview row for future coordinate enrichment.
