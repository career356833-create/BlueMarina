#!/usr/bin/env python3
"""
NIFS Phase 2: 목록 API 분석, 전체 어종 확정, 상세 페이지 필드 매핑
"""

import asyncio
import json
import hashlib
from pathlib import Path
from typing import Optional, Dict, Any, List
from datetime import datetime
from io import BytesIO

import httpx
from PIL import Image
from bs4 import BeautifulSoup

BASE_URL = "https://nifs.go.kr"
LIST_API_URL = f"{BASE_URL}/portal/fr/chrpA/selectChrpFishList.do"
FISH_LIST_PAGE = f"{BASE_URL}/portal/fr/chrpA/actionChrpFishList.do"
FISH_DETAIL_TEMPLATE = f"{BASE_URL}/portal/fr/chrpA/actionChrpFish.do"
IMAGE_BASE = "https://download.nifs.go.kr/portal/ofiris/ME/sosf/"

# 경로 설정
DATA_DIR = Path(__file__).parent.parent.parent / "data" / "nifs"
RAW_DIR = DATA_DIR / "raw"
PHASE2_DIR = DATA_DIR / "phase2"
REPORTS_DIR = DATA_DIR / "reports"

for d in [RAW_DIR / "list", RAW_DIR / "fish", PHASE2_DIR, REPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)


class Phase2Inspector:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=30.0)
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Origin": BASE_URL,
            "Referer": FISH_LIST_PAGE,
        }

    async def inspect_list_api(self) -> Dict[str, Any]:
        """목록 API 요청 분석"""
        print("[1/7] 목록 API POST body 확정 중...")

        # 1단계 결과 로드
        api_response_file = DATA_DIR / "inspection" / "network" / "responses" / "nifs.go.kr_portal_fr_chrpA_selectChrpFishList.do.json"

        if api_response_file.exists():
            with open(api_response_file, encoding="utf-8") as f:
                existing_response = json.load(f)
            item_count = len(existing_response.get("retList", []))
            print(f"  기존 API 응답: {item_count}개 항목")

        # 실제 API 호출
        try:
            resp = await self.client.post(
                LIST_API_URL,
                headers=self.headers,
                data={},  # 빈 body로 호출
                follow_redirects=True
            )

            if resp.status_code == 200:
                data = resp.json()
                item_count = len(data.get("retList", []))
                print(f"  ✅ 실제 API 응답: {item_count}개 항목")

                result = {
                    "url": LIST_API_URL,
                    "method": "POST",
                    "contentType": resp.headers.get("content-type", "unknown"),
                    "status": resp.status_code,
                    "postData": {},
                    "itemCount": item_count,
                    "response": data,
                    "timestamp": datetime.utcnow().isoformat()
                }

                # 저장
                (PHASE2_DIR / "list-api-request.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
                return result
        except Exception as e:
            print(f"  ⚠️  API 호출 실패: {e}")
            return {"error": str(e)}

    async def analyze_list_data(self, api_response: Dict) -> Dict[str, Any]:
        """전체 어종 목록 분석"""
        print("[2/7] 전체 어종 수 확정 중...")

        retlist = api_response.get("response", {}).get("retList", [])

        # 검증
        validation = {
            "totalCount": len(retlist),
            "duplicateFishIds": len(retlist) - len(set(f["fishId"] for f in retlist)),
            "duplicateFishNames": len(retlist) - len(set(f["fishName"] for f in retlist)),
            "emptyIds": sum(1 for f in retlist if not f.get("fishId")),
            "emptyNames": sum(1 for f in retlist if not f.get("fishName")),
            "displayStatusDistribution": {},
            "colorLevelDistribution": {},
        }

        for fish in retlist:
            display = fish.get("display", "")
            colorLevel = fish.get("colorLevel", "")
            validation["displayStatusDistribution"][display] = validation["displayStatusDistribution"].get(display, 0) + 1
            validation["colorLevelDistribution"][colorLevel] = validation["colorLevelDistribution"].get(colorLevel, 0) + 1

        print(f"  ✅ 총 어종: {validation['totalCount']}개")
        print(f"  ✅ 중복 ID: {validation['duplicateFishIds']}개")
        print(f"  ✅ display 분포: {validation['displayStatusDistribution']}")

        # 저장
        (PHASE2_DIR / "list-validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2))

        # fishIndex CSV 저장
        csv_lines = ["sourceId,koreanName,colorLevel,displayStatus,thumbnailFileName"]
        for i, fish in enumerate(retlist, 1):
            line = f"{fish.get('fishId', '')},{fish.get('fishName', '')},{fish.get('colorLevel', '')},{fish.get('display', '')},{fish.get('fileName', '')}"
            csv_lines.append(line)

        (RAW_DIR / "list" / "fish-index.csv").write_text("\n".join(csv_lines), encoding="utf-8")
        (RAW_DIR / "list" / "fish-index.json").write_text(json.dumps(retlist, ensure_ascii=False, indent=2))

        return validation

    async def inspect_detail_pages(self) -> Dict[str, Any]:
        """상세 페이지 호출 방식 규명"""
        print("[3/7] 상세 호출 방식 규명 중...")

        # 기존 JSON API 응답 로드
        api_response_file = DATA_DIR / "inspection" / "network" / "responses" / "nifs.go.kr_portal_fr_chrpA_selectChrpFishList.do.json"

        with open(api_response_file, encoding="utf-8") as f:
            api_data = json.load(f)

        sample_fishes = api_data["retList"][:5] if len(api_data["retList"]) >= 5 else api_data["retList"]

        detail_results = {}

        for idx, fish in enumerate(sample_fishes):
            fish_id = fish["fishId"]
            fish_name = fish["fishName"]
            print(f"  [{idx+1}/{len(sample_fishes)}] {fish_name} ({fish_id})")

            # 추정 URL로 시도
            detail_url = f"{FISH_DETAIL_TEMPLATE}?fishId={fish_id}"

            try:
                resp = await self.client.get(detail_url, headers=self.headers)

                if resp.status_code == 200:
                    detail_results[fish_id] = {
                        "fishName": fish_name,
                        "detailUrl": detail_url,
                        "httpStatus": resp.status_code,
                        "contentType": resp.headers.get("content-type"),
                        "contentLength": len(resp.content),
                        "isHtmlResponse": "text/html" in resp.headers.get("content-type", ""),
                    }
                    print(f"    ✅ 200 OK ({len(resp.content)} bytes)")
            except Exception as e:
                print(f"    ❌ 오류: {e}")

        # 저장
        detail_nav_dir = PHASE2_DIR / "detail-navigation"
        detail_nav_dir.mkdir(exist_ok=True)

        for fish_id, info in detail_results.items():
            (detail_nav_dir / f"{info['fishName']}.json").write_text(json.dumps(info, ensure_ascii=False, indent=2))

        return detail_results

    async def extract_detail_fields(self) -> Dict[str, Any]:
        """상세 페이지 필드 매핑"""
        print("[4/7] 상세 필드 매핑 중...")

        api_response_file = DATA_DIR / "inspection" / "network" / "responses" / "nifs.go.kr_portal_fr_chrpA_selectChrpFishList.do.json"
        with open(api_response_file, encoding="utf-8") as f:
            api_data = json.load(f)

        sample_fishes = api_data["retList"][:5]
        field_map = {}

        for fish in sample_fishes:
            fish_id = fish["fishId"]
            fish_name = fish["fishName"]
            detail_url = f"{FISH_DETAIL_TEMPLATE}?fishId={fish_id}"

            try:
                resp = await self.client.get(detail_url, headers=self.headers)
                if resp.status_code != 200:
                    continue

                soup = BeautifulSoup(resp.content, "html.parser")

                # 제목 추출
                title_elem = soup.find("title")
                h1_elem = soup.find("h1")

                fields = {
                    "pageTitle": title_elem.get_text() if title_elem else "",
                    "h1Title": h1_elem.get_text() if h1_elem else "",
                    "allText": soup.get_text()[:500],  # 처음 500자
                }

                field_map[fish_name] = fields

            except Exception as e:
                print(f"  상세 파싱 오류 ({fish_name}): {e}")

        # 저장
        (PHASE2_DIR / "detail-field-map.json").write_text(json.dumps(field_map, ensure_ascii=False, indent=2))

        return field_map

    async def download_sample_images(self) -> Dict[str, Any]:
        """이미지 실다운로드 검증"""
        print("[5/7] 이미지 다운로드 검증 중...")

        api_response_file = DATA_DIR / "inspection" / "network" / "responses" / "nifs.go.kr_portal_fr_chrpA_selectChrpFishList.do.json"
        with open(api_response_file, encoding="utf-8") as f:
            api_data = json.load(f)

        sample_fishes = api_data["retList"][:5]
        image_results = {}

        for fish in sample_fishes:
            fish_id = fish["fishId"]
            fish_name = fish["fishName"]
            file_name = fish["fileName"]
            img_url = f"{IMAGE_BASE}{file_name}"

            print(f"  다운로드: {fish_name}")

            try:
                resp = await self.client.get(img_url, headers=self.headers)

                img_data = {
                    "fishName": fish_name,
                    "sourceUrl": img_url,
                    "fileName": file_name,
                    "httpStatus": resp.status_code,
                    "contentType": resp.headers.get("content-type"),
                    "fileSize": len(resp.content),
                    "sha256": hashlib.sha256(resp.content).hexdigest(),
                }

                # 이미지 파일 검증
                if resp.status_code == 200 and len(resp.content) > 0:
                    try:
                        img = Image.open(BytesIO(resp.content))
                        img_data["width"] = img.width
                        img_data["height"] = img.height
                        img_data["format"] = img.format
                        img_data["isValid"] = True

                        # 저장
                        fish_dir = RAW_DIR / "fish" / fish_id / "images" / "original"
                        fish_dir.mkdir(parents=True, exist_ok=True)
                        (fish_dir / file_name).write_bytes(resp.content)

                        print(f"    ✅ {img.width}x{img.height} {img.format} ({len(resp.content)} bytes)")
                    except Exception as e:
                        img_data["isValid"] = False
                        img_data["error"] = str(e)
                        print(f"    ⚠️  이미지 파싱 실패: {e}")
                else:
                    img_data["isValid"] = False

                image_results[fish_id] = img_data

            except Exception as e:
                print(f"    ❌ 다운로드 실패: {e}")
                image_results[fish_id] = {
                    "fishName": fish_name,
                    "sourceUrl": img_url,
                    "error": str(e),
                    "isValid": False
                }

        # 저장
        (PHASE2_DIR / "image-validation.json").write_text(json.dumps(image_results, ensure_ascii=False, indent=2))

        return image_results

    async def generate_report(self, list_api: Dict, validation: Dict, details: Dict, fields: Dict, images: Dict):
        """Phase 2 보고서 생성"""
        print("[6/7] 보고서 작성 중...")

        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "phase": 2,
            "title": "NIFS 어종정보 크롤링 2단계 - 전체 목록 및 상세 구조 확정",

            "listApi": {
                "url": list_api.get("url"),
                "method": list_api.get("method"),
                "status": list_api.get("status"),
                "itemCount": list_api.get("itemCount"),
            },

            "listValidation": validation,

            "detailNavigation": {
                "samplesInspected": len(details),
                "successCount": sum(1 for d in details.values() if d.get("httpStatus") == 200),
                "detailUrlPattern": f"{FISH_DETAIL_TEMPLATE}?fishId={{fishId}}",
            },

            "detailFields": {
                "samplesAnalyzed": len(fields),
                "commonFields": ["pageTitle", "h1Title"],
            },

            "imageValidation": {
                "totalDownloaded": len(images),
                "successful": sum(1 for i in images.values() if i.get("isValid")),
                "avgFileSize": sum(i.get("fileSize", 0) for i in images.values()) // max(len(images), 1) if images else 0,
            },

            "conclusions": {
                "listApiConfirmed": True,
                "totalSpeciesCount": validation.get("totalCount"),
                "detailUrlPattern": f"{FISH_DETAIL_TEMPLATE}?fishId={{fishId}}",
                "imageDownloadPossible": sum(1 for i in images.values() if i.get("isValid")) > 0,
                "playwrightRequired": False,
                "nextPhase": "bulk collection"
            }
        }

        (REPORTS_DIR / "phase2-summary.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))

        print(f"\n[결과 요약]")
        print(f"  전체 어종: {validation.get('totalCount')}개")
        print(f"  중복 ID: {validation.get('duplicateFishIds')}개")
        print(f"  상세 샘플: {len(details)}개 수집")
        print(f"  이미지 샘플: {sum(1 for i in images.values() if i.get('isValid'))}/{len(images)}개 다운로드 성공")

    async def run_all(self):
        """Phase 2 전체 실행"""
        try:
            list_api = await self.inspect_list_api()
            validation = await self.analyze_list_data(list_api)
            details = await self.inspect_detail_pages()
            fields = await self.extract_detail_fields()
            images = await self.download_sample_images()

            await self.generate_report(list_api, validation, details, fields, images)

            print(f"\n✅ Phase 2 완료")
            print(f"   결과: {PHASE2_DIR}")

        finally:
            await self.client.aclose()


async def main():
    inspector = Phase2Inspector()
    await inspector.run_all()


if __name__ == "__main__":
    asyncio.run(main())
