"""Playwright browser management."""
import logging
from pathlib import Path
from typing import Optional

from playwright.async_api import async_playwright, Browser, Page

logger = logging.getLogger(__name__)


class BrowserManager:
    """Manages Playwright browser instance."""

    def __init__(self, headless: bool = True):
        self.headless = headless
        self.browser: Optional[Browser] = None
        self.playwright = None

    async def __aenter__(self):
        """Context manager entry."""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=self.headless)
        logger.info("Browser launched")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit."""
        if self.browser:
            await self.browser.close()
            logger.info("Browser closed")
        if self.playwright:
            await self.playwright.stop()
            logger.info("Playwright stopped")

    async def new_page(self):
        """Create a new page with network tracking."""
        if not self.browser:
            raise RuntimeError("Browser not initialized")
        return await self.browser.new_page()


async def navigate_and_wait(
    page: Page,
    url: str,
    wait_network_idle_ms: int = 5000,
) -> None:
    """Navigate to URL and wait for network idle."""
    logger.info(f"Navigating to {url}")
    await page.goto(url, wait_until="networkidle", timeout=30000)
    logger.info(f"Navigation complete for {url}")


async def take_screenshot(page: Page, path: Path) -> None:
    """Take full page screenshot."""
    path.parent.mkdir(parents=True, exist_ok=True)
    await page.screenshot(path=str(path), full_page=True)
    logger.info(f"Screenshot saved to {path}")


async def get_html_content(page: Page) -> str:
    """Get rendered HTML content."""
    return await page.content()
