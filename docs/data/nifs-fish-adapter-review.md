# FishSpecies → FishItem Adapter Review

이 문서는 NIFS canonical `FishSpecies`를 기존 `/fish` 레거시 `FishItem` 화면에 연결하기 위한 안전한 어댑터 초안이다.

## 1. 결론

- **어댑터 가능 여부**: 가능
- **기존 `/fish` 유지 가능 여부**: 가능
- **즉시 마이그레이션 여부**: 불가
- **권장 방식**: `FishSpecies -> FishItem` 변환 어댑터 + legacy view 유지

핵심은 기존 `/fish` 화면을 당장 canonical 구조로 갈아엎지 않고, **표시용 모델만 내려주는 방식**으로 연결하는 것이다.

## 2. FishItem 구조

`src/data/fish-data.ts`의 `FishItem`은 다음 필드를 사용한다.

- `id`
- `name`
- `category`
- `season`
- `habitat`
- `shortDescription`
- `description`
- `fishingTips`
- `caution`
- `relatedFish`

이 구조는 현재 `/fish` 페이지의 카드 검색/필터/상세 펼침에 직접 맞춰져 있다.

## 3. FishSpecies 구조

`src/lib/types/drafts/nifs-fish-contract.ts`의 `FishSpecies`는 canonical source 모델이다.

주요 필드:

- `id`
- `slug`
- `koreanName`
- `commonName`
- `englishName`
- `scientificName`
- `taxonomy`
- `morphology`
- `habitat`
- `distribution`
- `ecology`
- `spawning`
- `feeding`
- `size`
- `season`
- `fishingMethods`
- `foodNutrition`
- `aliases`
- `officialSourceIds`
- `factReviewStatus`
- `publishStatus`
- `version`

## 4. 직접 매핑 필드

아래는 거의 그대로 옮길 수 있는 필드다.

- `FishSpecies.id` → `FishItem.id`
- `FishSpecies.koreanName` → `FishItem.name`
- `FishSpecies.season` → `FishItem.season`
- `FishSpecies.habitat` → `FishItem.habitat`

보조적으로:

- `scientificName`는 `description`에 표기 가능
- `commonName` / `englishName`는 `name` 보강용 fallback 가능

## 5. 변환 필드

아래는 조합/서술/정규화가 필요하다.

- `taxonomy`
  - `description`에서 학명/과 정보 섹션으로 표현 가능
- `morphology`
  - `description` 또는 `shortDescription`에 반영
- `distribution`
  - `description`에 반영
- `ecology`
  - `shortDescription` 후보 또는 `description` 본문
- `spawning`
  - `description`에 반영
- `feeding`
  - `description`에 반영
- `size`
  - `description`에 반영
- `fishingMethods`
  - `fishingTips`에 조합 가능
- `foodNutrition`
  - `description`에 반영
- `aliases`
  - legacy `FishItem.relatedFish`는 “관련 어종 표시명”이므로 직접 동일시하지 않고 별도 관계 입력이 필요

## 6. 손실 필드

FishSpecies를 FishItem으로 내릴 때, 현재 레거시 화면에 직접 보존되지 않는 정보는 다음과 같다.

- `taxonomy`
- `officialSourceIds`
- `factReviewStatus`
- `publishStatus`
- `version`
- `aliases`의 원문 목록
- 원본 source version / change history

이 정보는 레거시 목록 카드가 아니라, 향후 `/fish/[slug]` 상세나 검수/관리 화면에 남기는 편이 맞다.

## 7. 부족 필드

현재 canonical `FishSpecies`에는 FishItem이 요구하는 레거시 표현 슬롯이 없다.

- `shortDescription`
- `description`
- `fishingTips`
- `caution`
- `relatedFish`
- `category`

### 해석

- `category`는 `FishSpecies` 핵심 모델의 속성이 아니라 **소스 분류/표시 분류**이다.
- 따라서 category는 FishSpecies에서 추정하지 않고, **호출 측에서 주입**하거나 별도 분류 레이어로 전달해야 안전하다.
- `caution`은 현재 canonical 계약에 없으므로, 별도 주의사항 원문이 없으면 빈 문자열로 두는 것이 맞다.

## 8. 레거시 FishItem의 한계

1. 카테고리가 뷰/탐색 중심으로 섞여 있다.
2. canonical source의 출처/버전/검수 상태를 담지 못한다.
3. 관련 어종이 이름 기반으로만 보이기 쉬워서 ID 추적이 어렵다.
4. `caution`이나 `shortDescription`이 원문 사실과 1:1 대응되지 않는다.
5. `/fish` 화면은 목록 UI라서 사실 검수/게시/버전 관리를 맡기기 어렵다.

## 9. `/fish` 목록 유지 전략

- 지금 `/fish`는 그대로 둔다.
- canonical `FishSpecies`는 새 데이터/DB의 진실 소스로 둔다.
- legacy 화면은 어댑터를 통해 필요한 표시값만 받아 쓴다.
- 기존 `fish-data.ts`는 당분간 레거시 소스이자 fallback으로 유지한다.

## 10. 어댑터 동작 규칙

권장 어댑터 규칙:

1. `publishStatus === "published"`가 아니면 기본적으로 제외
2. `factReviewStatus === "approved"`가 아니면 기본적으로 제외
3. `category`는 호출자가 명시
4. `relatedFish`는 species ID 배열 + label resolver 방식으로 변환
5. 필요한 표시 문구가 부족하면 `null` 반환
6. 사실을 만들지 않는다

## 11. /fish/[slug] 역할 분리

- `/fish`:
  - 목록, 검색, 카테고리 필터, 카드 탐색
  - 레거시 FishItem 중심
- `/fish/[slug]`:
  - canonical `FishSpecies` 상세
  - 출처, 버전, 검수 상태, 관련 source id, AI 콘텐츠 등을 보여주는 곳

즉, 목록은 가볍게, 상세는 정확하게 가는 구조가 맞다.

## 12. Supabase 마이그레이션 전에 확정할 핵심 3개

1. `FishSpecies`의 canonical slug 규칙
2. `FishItem.category`를 어떤 분류 체계로 공급할지
3. `relatedFish`를 ID 기반 그래프로 어떻게 저장할지

## 13. 추천 결론

- 지금은 어댑터만 둔다.
- `/fish`는 유지한다.
- canonical 전환은 상세 페이지와 DB 계약이 먼저 안정된 뒤 진행한다.
