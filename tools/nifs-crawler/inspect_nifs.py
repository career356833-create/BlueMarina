#!/usr/bin/env python3
"""
NIFS Crawler Inspection Tool

Analyzes the structure of https://nifs.go.kr fish list without heavy crawling.
"""
import asyncio
import hashlib
import json
import logging
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import httpx
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright

# Setup path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from config import (
    NIFS_FISH_LIST_URL,
    LIST_DIR,
    DETAIL_DIR,
    NETWORK_DIR,
    SCREENSHOT_DIR,
    RESPONSE_DIR,
    LOGS_DIR,
    HEADLESS,
    MAX_LIST_PAGES_TO_CHECK,
    MAX_DETAIL_SAMPLES,
    USER_AGENT,
)
from browser import navigate_and_wait, take_screenshot, get_html_content
from network_capture import NetworkCapture
from html_capture import save_html, parse_html, extract_scripts, extract_forms, extract_metadata

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(LOGS_DIR / "inspection.log"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


class NIFSInspector:
    """Main inspector for NIFS site structure."""

    def __init__(self):
        self.report = {
            "timestamp": datetime.now().isoformat(),
            "target_url": NIFS_FISH_LIST_URL,
            "status": "pending",
            "list_page": {},
            "pagination": {},
            "detail_pages": {},
            "network": {},
            "errors": [],
        }

    async def inspect_list_page(self) -> None:
        """Inspect the main fish list page."""
        logger.info("=" * 60)
        logger.info("STEP 1: Inspecting List Page")
        logger.info("=" * 60)

        # First, try HTTP request
        logger.info("Attempting HTTP request...")
        http_html = await self._fetch_http(NIFS_FISH_LIST_URL)

        if http_html:
            http_path = LIST_DIR / "list-http-response.html"
            http_hash = save_html(http_html, http_path)
            logger.info(f"HTTP response saved (hash: {http_hash[:8]}...)")

        # Now use Playwright for comparison
        logger.info("Launching browser for Playwright rendering...")
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=HEADLESS)
            page = await browser.new_page(user_agent=USER_AGENT)

            # Setup network capture
            network = NetworkCapture()
            await network.setup_listeners(page)

            # Navigate
            try:
                await navigate_and_wait(page, NIFS_FISH_LIST_URL)

                # Get rendered HTML
                rendered_html = await get_html_content(page)
                rendered_path = LIST_DIR / "list-rendered.html"
                rendered_hash = save_html(rendered_html, rendered_path)
                logger.info(f"Rendered HTML saved (hash: {rendered_hash[:8]}...)")

                # Take screenshot
                screenshot_path = SCREENSHOT_DIR / "list-full.png"
                await take_screenshot(page, screenshot_path)

                # Save network log
                network.save_network_log(NETWORK_DIR / "network-log.json")
                network.save_responses(RESPONSE_DIR)

                # Analyze rendered HTML
                await self._analyze_list_html(rendered_html, page)

                # Compare HTTP vs Playwright
                if http_html:
                    self._compare_http_vs_rendered(http_html, rendered_html)

            except Exception as e:
                logger.error(f"Error during list page inspection: {e}")
                self.report["errors"].append(str(e))
            finally:
                await browser.close()

    async def _fetch_http(self, url: str) -> Optional[str]:
        """Fetch page via HTTP."""
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.get(
                    url,
                    headers={"User-Agent": USER_AGENT},
                )
                response.raise_for_status()
                return response.text
        except Exception as e:
            logger.warning(f"HTTP fetch failed: {e}")
            return None

    async def _analyze_list_html(self, html: str, page) -> None:
        """Analyze list page HTML structure."""
        logger.info("Analyzing list HTML structure...")
        soup = parse_html(html)

        analysis = {
            "title": soup.title.string if soup.title else None,
            "scripts": extract_scripts(soup),
            "forms": extract_forms(soup),
            "page_info": {},
            "list_items": {},
        }

        # Extract pagination info
        pagination = await self._extract_pagination_info(page, soup)
        analysis["pagination"] = pagination
        self.report["pagination"] = pagination

        # Extract list item selectors
        list_items_info = await self._extract_list_items_info(page, soup)
        analysis["list_items"] = list_items_info
        self.report["list_page"]["list_items"] = list_items_info

        # Save analysis
        analysis_path = LIST_DIR / "list-analysis.json"
        analysis_path.write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info(f"List analysis saved to {analysis_path}")

    async def _extract_pagination_info(self, page, soup) -> Dict:
        """Extract pagination information."""
        logger.info("Extracting pagination info...")

        pagination_info = {
            "detected_method": None,
            "page_param_name": None,
            "current_page": None,
            "total_pages": None,
            "items_per_page": None,
        }

        # Look for pagination elements
        try:
            # Method 1: Check for page parameter in URL
            url = page.url
            if "page" in url.lower():
                pagination_info["detected_method"] = "query_string"
                pagination_info["page_param_name"] = "page"

            # Method 2: Look for pagination div/nav
            pagination_div = soup.find("div", class_=lambda x: x and "page" in x.lower())
            if pagination_div:
                pagination_info["detected_method"] = "html_navigation"
                logger.info(f"Found pagination element: {pagination_div.name}")

            # Count list items on current page
            list_items = soup.find_all("div", class_=lambda x: x and "fish" in x.lower())
            if not list_items:
                list_items = soup.find_all("tr", class_=lambda x: x and "list" in (x or "").lower())
            if not list_items:
                list_items = soup.find_all("li", class_=lambda x: x and "item" in (x or "").lower())

            if list_items:
                pagination_info["items_per_page"] = len(list_items)
                logger.info(f"Found {len(list_items)} list items on page")

        except Exception as e:
            logger.warning(f"Error extracting pagination: {e}")

        return pagination_info

    async def _extract_list_items_info(self, page, soup) -> Dict:
        """Extract list items information."""
        logger.info("Extracting list items...")

        items_info = {
            "sample_items": [],
            "selectors": {
                "item_container": None,
                "fish_name": None,
                "detail_link": None,
                "thumbnail": None,
            },
        }

        # Find list container - try common patterns
        list_container = (
            soup.find("tbody") or
            soup.find("div", class_=lambda x: x and "list" in (x or "").lower()) or
            soup.find("div", class_=lambda x: x and "grid" in (x or "").lower())
        )

        if list_container:
            # Find all items (try different selectors)
            items = (
                list_container.find_all("tr") or
                list_container.find_all("div", class_=lambda x: x and "item" in (x or "").lower()) or
                list_container.find_all("li")
            )

            logger.info(f"Found {len(items)} potential list items")

            # Extract first few items
            for idx, item in enumerate(items[:MAX_DETAIL_SAMPLES]):
                try:
                    item_data = {
                        "index": idx,
                        "fish_name": None,
                        "detail_url": None,
                        "thumbnail_url": None,
                    }

                    # Extract fish name
                    name_elem = item.find("a") or item.find("span")
                    if name_elem:
                        item_data["fish_name"] = name_elem.get_text(strip=True)

                    # Extract link
                    link = item.find("a")
                    if link and link.get("href"):
                        item_data["detail_url"] = link.get("href")

                    # Extract thumbnail
                    img = item.find("img")
                    if img and img.get("src"):
                        item_data["thumbnail_url"] = img.get("src")

                    items_info["sample_items"].append(item_data)
                except Exception as e:
                    logger.warning(f"Error extracting item {idx}: {e}")

        return items_info

    def _compare_http_vs_rendered(self, http_html: str, rendered_html: str) -> None:
        """Compare HTTP response vs Playwright rendering."""
        logger.info("Comparing HTTP vs Playwright rendering...")

        http_size = len(http_html.encode("utf-8"))
        rendered_size = len(rendered_html.encode("utf-8"))

        http_soup = parse_html(http_html)
        rendered_soup = parse_html(rendered_html)

        http_items = len(http_soup.find_all("tr")) + len(http_soup.find_all("li"))
        rendered_items = len(rendered_soup.find_all("tr")) + len(rendered_soup.find_all("li"))

        comparison = {
            "http_size_bytes": http_size,
            "rendered_size_bytes": rendered_size,
            "http_detected_items": http_items,
            "rendered_detected_items": rendered_items,
            "size_difference_percent": round((rendered_size - http_size) / http_size * 100, 2) if http_size > 0 else 0,
            "items_loaded_dynamically": rendered_items > http_items,
        }

        logger.info(f"Comparison: {comparison}")
        self.report["list_page"]["http_vs_rendered"] = comparison

    async def inspect_detail_pages(self) -> None:
        """Inspect detail pages (limited sample)."""
        logger.info("=" * 60)
        logger.info("STEP 2: Inspecting Detail Pages")
        logger.info("=" * 60)

        # First get list to extract detail URLs
        list_html = (LIST_DIR / "list-rendered.html").read_text(encoding="utf-8")
        soup = parse_html(list_html)

        # Extract detail URLs from list
        detail_urls = []
        for link in soup.find_all("a"):
            href = link.get("href")
            if href and ("fish" in href.lower() or "detail" in href.lower() or "view" in href.lower()):
                if href.startswith("http"):
                    detail_urls.append(href)
                elif href.startswith("/"):
                    detail_urls.append(f"{NIFS_FISH_LIST_URL.split('/portal')[0]}{href}")

        logger.info(f"Found {len(detail_urls)} potential detail URLs")

        # Inspect first few
        for idx, url in enumerate(detail_urls[:MAX_DETAIL_SAMPLES]):
            await self._inspect_single_detail(url, idx)

    async def _inspect_single_detail(self, url: str, idx: int) -> None:
        """Inspect a single detail page."""
        logger.info(f"Inspecting detail page {idx}: {url}")

        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=HEADLESS)
                page = await browser.new_page(user_agent=USER_AGENT)

                network = NetworkCapture()
                await network.setup_listeners(page)

                await navigate_and_wait(page, url)

                # Get HTML
                html = await get_html_content(page)

                # Extract source ID from URL
                source_id = url.split("=")[-1] if "=" in url else f"detail_{idx}"

                # Save details
                detail_path = DETAIL_DIR / f"detail_{idx}_{source_id}"
                detail_path.mkdir(parents=True, exist_ok=True)

                save_html(html, detail_path / "rendered.html")
                await take_screenshot(page, detail_path / "screenshot.png")
                network.save_network_log(detail_path / "network-log.json")
                network.save_responses(detail_path / "network_responses")

                # Analyze
                await self._analyze_detail_page(html, detail_path, source_id)

                await browser.close()

                logger.info(f"Detail page {idx} inspection complete")
        except Exception as e:
            logger.error(f"Error inspecting detail page {idx}: {e}")
            self.report["errors"].append(f"Detail page {idx}: {str(e)}")

    async def _analyze_detail_page(self, html: str, path: Path, source_id: str) -> None:
        """Analyze detail page structure."""
        soup = parse_html(html)

        analysis = {
            "source_id": source_id,
            "fields": {},
            "images": [],
            "forms": extract_forms(soup),
        }

        # Extract all text fields
        for tag in soup.find_all(["p", "div", "span", "td"]):
            text = tag.get_text(strip=True)
            if text and len(text) > 10:
                key = tag.name
                if key not in analysis["fields"]:
                    analysis["fields"][key] = []
                analysis["fields"][key].append(text[:200])

        # Extract images
        for img in soup.find_all("img"):
            img_data = {
                "src": img.get("src"),
                "alt": img.get("alt"),
                "title": img.get("title"),
            }
            analysis["images"].append(img_data)

        # Save analysis
        (path / "analysis.json").write_text(json.dumps(analysis, indent=2, ensure_ascii=False), encoding="utf-8")
        logger.info(f"Detail analysis saved: {source_id}")

    def generate_report(self) -> None:
        """Generate inspection report."""
        logger.info("=" * 60)
        logger.info("Generating Inspection Report")
        logger.info("=" * 60)

        self.report["status"] = "completed"

        report_path = LIST_DIR / "inspection-report.json"
        report_path.write_text(json.dumps(self.report, indent=2, ensure_ascii=False), encoding="utf-8")

        logger.info(f"Report saved to {report_path}")
        logger.info(f"Inspection complete!")
        logger.info(json.dumps(self.report, indent=2, ensure_ascii=False))

    async def run_all(self) -> None:
        """Run complete inspection."""
        try:
            await self.inspect_list_page()
            await self.inspect_detail_pages()
            self.generate_report()
        except Exception as e:
            logger.error(f"Inspection failed: {e}")
            self.report["status"] = "failed"
            self.report["errors"].append(str(e))


async def main():
    """Main entry point."""
    logger.info("NIFS Crawler Inspection Started")
    logger.info(f"Target: {NIFS_FISH_LIST_URL}")

    inspector = NIFSInspector()
    await inspector.run_all()


if __name__ == "__main__":
    asyncio.run(main())
