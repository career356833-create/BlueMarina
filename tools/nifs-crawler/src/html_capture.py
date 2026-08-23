"""HTML capture and parsing utilities."""
import hashlib
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)


def save_html(html_content: str, path: Path) -> str:
    """Save HTML content and return SHA-256 hash."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(html_content, encoding="utf-8")
    logger.info(f"HTML saved to {path}")

    content_bytes = html_content.encode("utf-8")
    return hashlib.sha256(content_bytes).hexdigest()


async def get_html_via_http(url: str, headers: Optional[Dict] = None) -> Optional[str]:
    """Fetch HTML via HTTP request."""
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(url, headers=headers or {})
            response.raise_for_status()
            return response.text
    except Exception as e:
        logger.error(f"Failed to fetch {url} via HTTP: {e}")
        return None


def parse_html(html_content: str) -> BeautifulSoup:
    """Parse HTML with BeautifulSoup."""
    return BeautifulSoup(html_content, "lxml")


def extract_scripts(soup: BeautifulSoup) -> List[Dict]:
    """Extract script tag information."""
    scripts = []
    for script in soup.find_all("script"):
        script_info = {
            "type": script.get("type", "text/javascript"),
            "src": script.get("src"),
            "inline": bool(script.string),
            "length": len(script.string) if script.string else 0,
        }
        scripts.append(script_info)
    return scripts


def extract_forms(soup: BeautifulSoup) -> List[Dict]:
    """Extract form information."""
    forms = []
    for form in soup.find_all("form"):
        form_info = {
            "id": form.get("id"),
            "name": form.get("name"),
            "method": form.get("method", "get").upper(),
            "action": form.get("action"),
            "inputs": [],
        }

        for input_tag in form.find_all("input"):
            input_info = {
                "name": input_tag.get("name"),
                "type": input_tag.get("type", "text"),
                "value": input_tag.get("value"),
                "hidden": input_tag.get("type") == "hidden",
            }
            form_info["inputs"].append(input_info)

        forms.append(form_info)
    return forms


def extract_metadata(soup: BeautifulSoup) -> Dict:
    """Extract page metadata."""
    return {
        "title": soup.title.string if soup.title else None,
        "url": soup.find("meta", property="og:url") and soup.find("meta", property="og:url").get("content"),
        "description": soup.find("meta", attrs={"name": "description"}) and soup.find("meta", attrs={"name": "description"}).get("content"),
    }


def save_html_analysis(analysis: Dict, path: Path) -> None:
    """Save HTML analysis as JSON."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(analysis, f, indent=2, ensure_ascii=False)
    logger.info(f"HTML analysis saved to {path}")
