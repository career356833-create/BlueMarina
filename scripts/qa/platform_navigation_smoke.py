"""Run anonymous navigation checks against a supplied origin using Python Playwright."""
import argparse
import asyncio
from urllib.parse import parse_qs, unquote, urlsplit

from playwright.async_api import async_playwright


async def verify(context, origin):
    page = await context.new_page()
    page.set_default_timeout(25000)

    async def follow(selector):
        link = page.locator(selector).first
        href = await link.get_attribute("href")
        target = urlsplit(href)
        await link.click()
        await page.wait_for_url(
            lambda url: unquote(urlsplit(url).path) == unquote(target.path)
            and parse_qs(urlsplit(url).query) == parse_qs(target.query)
        )
        assert not await page.get_by_text("Application error:", exact=False).count()
        return href

    def link(path):
        return f'a[href="{path}"]:visible'

    try:
        await page.goto(origin, wait_until="commit")
        await follow(link("/today-sea"))
        await follow(link("/sea"))
        await follow(link("/"))

        await follow(link("/charters"))
        await follow(link("/reservations"))
        await follow(link("/"))

        await page.goto(origin + "/theory?license=yacht", wait_until="commit")
        await follow('a[href^="/theory/"][href$="license=yacht"]:visible')
        await follow(link("/theory?license=yacht"))
        await follow(link("/study?license=yacht"))

        for service in ("market", "community"):
            await page.goto(origin + "/" + service, wait_until="commit")
            dest = await follow('a[href^="/account/login?returnTo="]:visible')
            assert parse_qs(urlsplit(dest).query)["returnTo"] == [f"/{service}/new"]
            await page.reload(wait_until="domcontentloaded")
            await follow(link("/"))

        await page.goto(origin + "/fishing-spots", wait_until="commit")
        spot = await follow('a[href^="/fishing-spots/boat-"]:visible')
        condition = await follow('a[href^="/fishing-spots/conditions?"][href*="speciesId="]:visible')
        params = parse_qs(urlsplit(condition).query)
        assert params["spotId"] == [spot.rsplit("/", 1)[1]] and params["speciesId"][0]
        destination = await follow('a[href^="/sea/navigation?"][href*="sourceId="]:visible')
        nav = parse_qs(urlsplit(destination).query)
        assert nav["sourceId"] == params["spotId"] and nav["lat"] and nav["lng"] and nav["name"]
        await follow(link(spot))
        await follow(link("/"))
    finally:
        await page.close()


async def main(origin):
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(channel="chrome")
        try:
            context = await browser.new_context(viewport={"width": 390, "height": 844})
            await verify(context, origin.rstrip("/"))
        finally:
            await browser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("origin", help="Accessible Preview or local test origin")
    asyncio.run(main(parser.parse_args().origin))
