# Fishing Spot Coordinate Repair Review V1

검토일: 2026-09-17

판정: `NO_AUTHORITATIVE_REPAIR_AVAILABLE` (C)

## 범위와 적용 경계

기준 Git: `main`, HEAD/origin/main `37919f17603b39cb345840dd2c6184c9c6c9ff23`.
검토 대상은 boat-60, boat-128, boat-129, boat-321 네 건뿐이다. 나머지 1,401건은 이번 조사에서 재검토하지 않았다. 기존 lineage 감사와 전체 회귀 테스트를 유지한다.

이 문서의 지도/항법 정책은 **권고이며 적용되지 않았다**. `policyApplication=RECOMMENDATION_ONLY_NOT_APPLIED`, `runtimeEnforced=false`. 현재 앱의 지도 핀, 목적지 선택, navigation eligibility가 실제로 차단되었다는 뜻이 아니다.

좌표 수정, canonical/source artifact 수정, runtime/src 수정, DB/Supabase 작업, merge/delete, navigation eligibility mutation은 모두 0이다. staging, commit, push를 수행하지 않는다.

## 원본 재확인

[공공데이터포털 해양수산부 선상낚시포인트](https://www.data.go.kr/data/15148435/fileData.do)의 20231231 데이터셋을 확인했다. 포털은 329행을 표시한다. [공식 CSV 다운로드](https://www.data.go.kr/cmm/cmm/fileDownload.do?atchFileId=FILE_000000003243490&fileDetailSn=1&insertDataPrcus=N)를 별도 조사 작업 폴더로 다시 내려받아 기존 원본과 byte 단위로 비교했다. HTTP 200, 98,417 bytes, 파일명 `선상낚시포인트.csv`, SHA-256이 동일했다.

- 원본 경로: `work/fishing-spots-boat-raw.csv`
- 원본 SHA-256: `5AE7CFB4280214667583724B8C0531A7018B0ABDE47CB82C60F6C491B9DFA20D`
- canonical 경로: `src/data/fishing-spots.json`
- canonical SHA-256: `5707FB2E057A039B7F572ECE7E94A0936ED5B73F204613A3E3FCE9A45CDC74BA`

현재 좌표, `originalPoint`, 행 ID, 명칭, 원본 DMS 좌표를 대상 네 행에 대해서만 대조했다. 두 그룹 모두 원본 projected 좌표와 DMS 좌표가 각각 같다. 이는 변환 충돌이 아니라 **원본 단계의 서로 다른 지역 행 사이 좌표 재사용**이다. 복사 오류 등 구체적인 생산 원인과 원 좌표의 소유 행은 미확정이다.

EPSG:5179 복구 경로와 EPSG:4326 target, `src/lib/geo/projection.ts` 변환기는 이전 감사의 계보 정보를 그대로 인용한다. 수치 재현은 장소-좌표 대응의 확인과 다르며 포털 projected CRS 메타데이터 부재도 해소되지 않았다. 새 normalizer나 coordinate repair는 수행하지 않았다.

## 네 원본 행

공통 원 provenance는 `MOF_SHARED_BOAT_FISHING_POINT`, source name은 `해양수산부 공공데이터 선상낚시 포인트`, URL은 위 공공데이터포털이다. canonical의 기존 `sourceCheckedAt=2026-07-11`은 그대로 보존하고, 이번 재확인일은 별도 기록했다. JSON에는 네 current record 및 원본 행 전체가 포함된다.

| Spot / source row | 이름 | 원본 지역·도시·주소 | 현재 위도, 경도 |
| --- | --- | --- | --- |
| boat-60 / 60 | 두미도 - 청석골 | 경상남도 통영시 | 37.628583, 125.680389 |
| boat-128 / 128 | 연평도 - 구지둔턱 | 인천광역시 옹진군 | 37.628583, 125.680389 |
| boat-129 / 129 | 영종도·용유도 - 영종도북측수문북서측해상 | 인천광역시 중구 | 37.475917, 126.354778 |
| boat-321 / 321 | 돌산도 - 백포간출여주변해상 | 전라남도 여수시 | 37.475917, 126.354778 |

| Group | 원본 projected coordinate | 원본 DMS latitude / longitude |
| --- | --- | --- |
| A: 60 / 128 | `POINT (839433.704293541 1960348.81280377)` | `37-37-42.9N` / `125-40-49.4E` |
| B: 129 / 321 | `POINT (898739.4548031851 1942470.23046188)` | `37-28-33.3N` / `126-21-17.2E` |

## 장소 정체성 및 공식·권위 근거

### boat-60

원본 행 60은 두미도·청석골·경남 통영의 조합으로 명확히 식별된다. [두미도 - 한국민족문화대백과사전](https://encykorea.aks.ac.kr/Article/E0017002), 항목 `E0017002`는 두미도를 통영시 욕지면 두미리의 섬으로 설명한다. 이는 상위 장소의 지역 근거이며 청석골의 정확한 해상 위치 근거가 아니다.

이 항목의 북위 34°41′, 동경 128°13′는 섬 대표 위치이고 CRS도 명시되지 않았다. **대체 좌표로 채택하지 않았다.** 다른 지역의 동명 청석골, 두미도 전체 대표점, 인근 항구나 낚시 지점을 대신 사용하지 않는다. 현재 인천권 좌표는 남해 두미도라는 장소 설명과 큰 지역 차원에서 모순된다고 판단한다. 이 판단은 행정해역 경계의 측량 검증이 아니다.

- candidateCoordinate / coordinateDeltaMeters: `null` / `null`
- repairStatus: `NO_AUTHORITATIVE_REPLACEMENT`
- mapPolicy: `MAP_DISPLAY_BLOCKED` - 현재 좌표 핀 차단 권고. 좌표 없는 장소 설명은 보존 가능.
- navigationPolicy: `NAVIGATION_BLOCKED_PENDING_REVIEW`

### boat-128

원본 행 128은 연평도·구지둔턱·인천 옹진의 조합이다. [인천투어 연평도](https://itour.incheon.go.kr/ssst/ssst/detail.do?cotId=ITD21122410395910989), ID `ITD21122410395910989`는 옹진군 연평면의 대·소연평도 정체성을 보강한다. 구지둔턱의 명시 좌표는 없다. 구지도, 섬 대표점 또는 관광 안내 주소를 같은 지점으로 간주하지 않는다.

현재 값은 인천권이라는 넓은 지역 설명과 양립할 수 있지만 이는 정확한 낚시 위치의 확인이 아니다. boat-60 쪽이 어긋나 보인다는 이유만으로 boat-128을 `CURRENT_COORDINATE_CONFIRMED`로 올리지 않는다.

- candidateCoordinate / coordinateDeltaMeters: `null` / `null`
- repairStatus: `NO_AUTHORITATIVE_REPLACEMENT`
- mapPolicy: `MAP_DISPLAY_WITH_WARNING` - 좌표 검토 필요 경고와 함께만 표시 권고. 경고를 구현할 수 없는 화면에서는 핀 차단.
- navigationPolicy: `NAVIGATION_BLOCKED_PENDING_REVIEW`

### boat-129

원본 행 129는 영종도·용유도·북측수문 북서측해상·인천 중구의 조합이다. [인천투어 영종도](https://itour.incheon.go.kr/ssst/ssst/detail.do?cotId=ITD21122410481474663), ID `ITD21122410481474663`는 상위 섬 정체성을 보강한다. 정확한 수문 북서측 해상 좌표는 제공하지 않는다. 수문 그 자체와 북서측 해상을 혼동하지 않는다.

현재 공식 관광 페이지는 주소를 인천 영종구 운남동으로 표시한다. 2023년 원본의 중구 명칭과 시점을 구분해 기록하며 이번 검토에서 주소나 행정구역을 변경하지 않는다. 넓은 인천권 일치만으로 정확한 위치나 현행 행정해역 일치를 승인하지 않는다.

- candidateCoordinate / coordinateDeltaMeters: `null` / `null`
- repairStatus: `NO_AUTHORITATIVE_REPLACEMENT`
- mapPolicy: `MAP_DISPLAY_WITH_WARNING` - boat-128과 같은 경고 조건.
- navigationPolicy: `NAVIGATION_BLOCKED_PENDING_REVIEW`

### boat-321

원본 행 321은 돌산도·백포간출여주변해상·전남 여수의 조합이다. [여수시 돌산읍 백포 마을안내](https://www.yeosu.go.kr/dong/center/dolsan-eup/dolsan-eup_guide/baekpo)는 백포가 돌산읍에서 방죽포와 대율 사이에 있는 해안 마을임을 보강한다. 이 내용은 검색 색인에서 확인했으며 직접 페이지 열기는 실패했다. 간출여 주변해상의 명시 좌표는 확보하지 못했다.

백포 마을·방파제·해변·항구의 대표 좌표를 낚시 지점으로 옮기지 않는다. 현재 인천권 좌표는 돌산도 백포라는 상위 장소의 지역 설명과 크게 어긋난다고 판단한다.

- candidateCoordinate / coordinateDeltaMeters: `null` / `null`
- repairStatus: `NO_AUTHORITATIVE_REPLACEMENT`
- mapPolicy: `MAP_DISPLAY_BLOCKED` - 현재 좌표 핀 차단 권고. 좌표 없는 장소 설명은 보존 가능.
- navigationPolicy: `NAVIGATION_BLOCKED_PENDING_REVIEW`

## 조사 한계 및 배제 근거

- data.go.kr 원본 재다운로드는 원본 신선도 확인이다. 원본 DMS와 projected 표현 또는 이 파일의 재게시를 서로 다른 독립 source로 세지 않는다.
- 각 세부 지명과 `site:go.kr`, 상위 섬명, 국립해양조사원을 결합해 검색했다. 이번 검색 범위에서 exact identity·explicit coordinate·CRS·region 요건을 함께 충족하는 새 근거는 발견하지 못했다.
- [개방海](https://www.khoa.go.kr/oceanmap/main.do)의 공개 메인·JS에서 선상낚시 메뉴 `mid=48`을 확인했다. `POST /oceanmap/getMenuView.do`의 해당 메뉴 조회는 서비스 오류 HTML을 반환했다. 이 결과로 해당 서비스가 좌표를 보유하지 않는다고 단정하지 않는다.
- [낚시정보도 제작 보고서](https://www.codil.or.kr/filebank/original/RK/OTKCRK130224/OTKCRK130224.pdf)의 85페이지 추출 텍스트에서 청석골·구지둔턱·백포·북측수문 일치는 없었다. 연평도·돌산도는 계획 대상 지역 목록에 등장한다. 이미지 도면 전체 판독은 하지 않았으므로 이 결과는 미보유 증명이 아니다.
- [구지둔턱 재게시 페이지](https://qca.purpleo.kr/article/128)와 [영종도 지점 재게시 페이지](https://www.ocean-fishing.com/fishing-spots/1455)는 같은 해수부 원본을 명시한다. repair authority 및 독립 두 번째 source에서 제외했다.
- 블로그, 낚시카페, 지도 사용자 등록정보, Kakao/Naver/Google 일반 geocoding은 repair 근거로 채택하지 않았다. 이름만으로 좌표를 생성·추정·교환하지 않았다.

`NO_AUTHORITATIVE_REPAIR_AVAILABLE`은 **이번에 확인한 자료에서 적격 근거를 확보하지 못했다**는 판정이다. 세계 어디에도 권위 있는 좌표가 없다는 뜻이 아니다. 네 원본 행의 명칭·지역 정체성은 식별했지만 정확한 해상 위치는 독립 확인되지 않았다는 한계를 별도 필드로 유지한다.

## 그룹별 결정

| Group | 원인 | replacement / repair | 권고 |
| --- | --- | --- | --- |
| A: boat-60 / boat-128 | 원본 projected·DMS 좌표 재사용; 구체적 생산 오류와 원 좌표 소유 행 미확정 | 적격 근거 없음 / 두 건 모두 `NO_AUTHORITATIVE_REPLACEMENT` | 60 핀 차단, 128 경고 표시, 두 건 모두 항법 목적지 보류 |
| B: boat-129 / boat-321 | 원본 projected·DMS 좌표 재사용; 구체적 생산 오류와 원 좌표 소유 행 미확정 | 적격 근거 없음 / 두 건 모두 `NO_AUTHORITATIVE_REPLACEMENT` | 129 경고 표시, 321 핀 차단, 두 건 모두 항법 목적지 보류 |

원본 좌표 유지, 자동 merge/delete/좌표 교환 없음. 제공기관의 행별 정정 및 독립적인 정확한 위치 근거가 생길 때 재심사할 수 있으나 이번 작업에서 기관 문의 발송이나 다음 단계 실행은 하지 않는다.

## 승인 기준과 지도/항법 분리

대체 후보에는 공공·권위 source, 정확한 장소 정체성, 명시 좌표, 알려진 CRS/unit, URL·source record identifier, 지역 일치가 모두 필요하다. 하나의 적격 source만 있으면 `REPAIR_CANDIDATE_NEEDS_SECOND_SOURCE`, 독립 두 source가 확인되면 `REPAIR_APPROVED`가 가능하다. 상위 섬/마을 근거는 정확한 feature의 두 번째 좌표 근거가 아니다.

후보가 있으면 current/proposed 위경도, source/CRS, Haversine 거리(m)를 기록한다. 이번에는 후보가 0이므로 제안 좌표와 repair delta는 모두 `null`이다. DMS 수치 재현 오차는 별도 필드이며 repair 이동거리가 아니다.

지도 경고 표시는 항법 허용과 독립이다. 미해결 좌표는 `NAVIGATION_ALLOWED`로 승격할 수 없다. 승인 후보도 아직 canonical에 적용되지 않았다면 현재 좌표의 항법 사용을 허용하지 않는다. hold 해제는 정확한 현재 좌표 확인으로 충돌을 해소하거나, 별도 승인된 좌표 적용과 재검증을 거치는 후속 판단이다. 좌표 확인만으로 항로·수심·현장 출입 여부가 확인되는 것은 아니다.

표시 문구: `좌표 검토 필요 · 항법 목적지 사용 보류`.

## 결과와 산출물

- Repair: approved 0 / pending second source 0 / unresolved 4 / current confirmed 0.
- Map: allowed 0 / warning 2 / blocked 2.
- Navigation: allowed 0 / blocked pending review 4.
- `reports/fishing-spots/coordinate-repair-review-v1.json`
- `reports/fishing-spots/navigation-coordinate-hold-v1.json` (권고 대상 네 건만 포함)
- `tools/fishing-spots/review-coordinate-repairs.mjs`
- `tests/fishing-spots/coordinate-repair-review-v1.test.cjs`

## 재현 및 검증

기본 실행은 네 행의 고정 snapshot을 읽고 저장된 산출물과 byte 일치를 검증한다. 네 행 외에는 좌표 판단을 수행하지 않는다. source/canonical 파일 전체 해시는 변경 감지 목적이며 다른 1,401건의 재검토가 아니다. `--write`는 위 review/hold JSON 두 파일만 작성한다. apply 모드, 네트워크 요청, DB 연결, runtime 적용 기능은 없다.

```text
node tools/fishing-spots/review-coordinate-repairs.mjs --check
node --test tests/fishing-spots/coordinate-repair-review-v1.test.cjs
npm test
npm run typecheck
npm run lint
npm run build
git diff --check
```

대상 테스트는 범위 잠금, 현재 좌표 보존, source 없는 후보 거부, generic geocoding/CRS 불명 거부, exact identity/region 일치, 독립 두 source, map/navigation 분리, 미해결 및 미적용 후보의 항법 승격 방지, hold 목록, deterministic artifact, 원본 무변경, 원 좌표 소유자 추정 금지를 검증한다. 테스트 안의 `TEST_ONLY` source는 validator의 거부 조건을 확인하는 합성 fixture이며 실제 후보·공식 근거로 산출되지 않는다.

### 이번 실행 결과

| 검증 | 결과 |
| --- | --- |
| Targeted review tests | 12/12 PASS |
| 전체 `npm test` | 729/729 PASS, fail/skip/cancel 0 |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| 새 tool/tests 별도 ESLint | PASS (.cjs의 CommonJS import 형식만 파일 단위로 명시) |
| `npm run build` | PASS, 정적 페이지 49/49 생성 |
| `git diff --check` 및 신규 5개 파일 whitespace 검사 | PASS |
| 기존 추적 파일과 source bytes | 1,629개 해시 일치 |
| Git index / HEAD / origin/main | staged 0, 기준 hash 유지 |

기존 unrelated worktree 상태를 보존했다. 새 파일은 report, hold list, 이 문서, tool, tests 다섯 개이며 이전 V1 감사 산출물은 변경하지 않았다. commit/push 없이 이 review에서 종료한다.
