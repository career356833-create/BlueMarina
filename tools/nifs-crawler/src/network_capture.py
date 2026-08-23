"""Network request capture and analysis."""
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from playwright.async_api import Page, Request, Response

logger = logging.getLogger(__name__)


class NetworkCapture:
    """Captures and logs network requests."""

    def __init__(self):
        self.requests: List[Dict[str, Any]] = []
        self.responses: Dict[str, bytes] = {}

    async def setup_listeners(self, page: Page) -> None:
        """Setup request/response listeners."""
        page.on("request", self._on_request)
        page.on("response", self._on_response)
        logger.info("Network listeners setup")

    def _on_request(self, request: Request) -> None:
        """Handle request event."""
        request_data = {
            "method": request.method,
            "url": request.url,
            "resourceType": request.resource_type,
            "headers": dict(request.headers),
            "postData": request.post_data,
        }
        self.requests.append(request_data)

    async def _on_response(self, response: Response) -> None:
        """Handle response event."""
        try:
            # Store response metadata
            request = response.request

            content_type = response.headers.get("content-type", "").lower()

            # Save certain response bodies for inspection
            if (
                "json" in content_type or
                "html" in content_type or
                "text" in content_type
            ) and response.status == 200:
                try:
                    body = await response.body()
                    if len(body) < 5_000_000:  # Only save < 5MB
                        self.responses[response.url] = body
                except Exception as e:
                    logger.warning(f"Could not capture response body: {e}")
        except Exception as e:
            logger.error(f"Error in response handler: {e}")

    def save_network_log(self, path: Path) -> None:
        """Save network log as JSON."""
        path.parent.mkdir(parents=True, exist_ok=True)

        log_data = []
        for req in self.requests:
            log_entry = {
                "method": req["method"],
                "url": req["url"],
                "resourceType": req["resourceType"],
                "status": "unknown",  # Will be filled from responses
                "hasResponse": req["url"] in self.responses,
            }
            log_data.append(log_entry)

        with open(path, "w", encoding="utf-8") as f:
            json.dump(log_data, f, indent=2, ensure_ascii=False)
        logger.info(f"Network log saved to {path}")

    def save_responses(self, base_dir: Path) -> None:
        """Save captured responses to files."""
        base_dir.mkdir(parents=True, exist_ok=True)

        for url, body in self.responses.items():
            # Generate safe filename from URL
            safe_name = url.replace("https://", "").replace("http://", "").replace("/", "_")
            if len(safe_name) > 200:
                safe_name = safe_name[:200]

            # Determine extension
            if b"<?xml" in body[:50]:
                ext = ".xml"
            elif b"{" in body[:50] or b"[" in body[:50]:
                ext = ".json"
            elif b"<!DOCTYPE" in body[:100] or b"<html" in body[:100]:
                ext = ".html"
            else:
                ext = ".txt"

            path = base_dir / f"{safe_name}{ext}"
            try:
                path.write_bytes(body)
                logger.info(f"Response saved: {path}")
            except Exception as e:
                logger.error(f"Failed to save response {url}: {e}")

    def get_request_summary(self) -> Dict[str, int]:
        """Get summary of captured requests by type."""
        summary = {}
        for req in self.requests:
            rt = req["resourceType"]
            summary[rt] = summary.get(rt, 0) + 1
        return summary
