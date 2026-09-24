const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file) => fs.existsSync(path.join(root, file));

test("ships robots and sitemap conventions with an environment-only public URL strategy", () => {
  assert.equal(exists("src/app/robots.ts"), true);
  assert.equal(exists("src/app/sitemap.ts"), true);
  const siteUrl = read("src/lib/release/site-url.ts");
  assert.match(siteUrl, /NEXT_PUBLIC_SITE_URL/);
  assert.match(siteUrl, /LOCAL_HOSTS/);
  assert.doesNotMatch(siteUrl, /localhost:3000/);
  const sitemap = read("src/app/sitemap.ts");
  assert.match(sitemap, /fishingSpots/);
  assert.match(sitemap, /if \(!base\) return \[\]/);
  assert.doesNotMatch(sitemap, /charters\/\$\{/);
  assert.doesNotMatch(sitemap, /market\/\$\{/);
});

test("keeps operational and private surfaces out of indexing", () => {
  const robots = read("src/app/robots.ts");
  for (const route of ["/api/", "/account/", "/charters/admin/", "/market/admin/", "/charters/onboarding", "/market/new", "/community/new"]) assert.match(robots, new RegExp(route.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const file of ["src/app/account/layout.tsx", "src/app/charters/admin/layout.tsx", "src/app/market/admin/layout.tsx", "src/app/charters/onboarding/page.tsx", "src/app/market/new/page.tsx", "src/app/community/new/page.tsx", "src/app/reservations/page.tsx", "src/app/not-found.tsx"]) {
    assert.match(read(file), /index: false, follow: false/);
  }
});

test("declares safe headers while preserving geolocation and avoids private service-worker caching", () => {
  const config = read("next.config.ts");
  for (const header of ["X-Content-Type-Options", "Referrer-Policy", "Permissions-Policy", "X-Frame-Options", "X-Robots-Tag", "Cache-Control"]) assert.match(config, new RegExp(header));
  assert.match(config, /camera=\(\), microphone=\(\), payment=\(\), usb=\(\)/);
  assert.doesNotMatch(config, /geolocation=\(\)/);
  const worker = read("public/sw.js");
  assert.match(worker, /isPrivatePath/);
  assert.match(worker, /if \(isPrivatePath\(url\.pathname\)\) return/);
  assert.match(worker, /url\.pathname\.startsWith\("\/api\/"\)/);
});

test("uses consistent metadata without fabricating empty dynamic service details", () => {
  const rootLayout = read("src/app/layout.tsx");
  for (const field of ["metadataBase", "openGraph", "twitter", "manifest", "icons"]) assert.match(rootLayout, new RegExp(field));
  assert.match(read("src/app/fishing-spots/[id]/page.tsx"), /spot\.name/);
  for (const file of ["src/app/charters/[id]/page.tsx", "src/app/market/[id]/page.tsx", "src/app/community/[id]/page.tsx"]) assert.match(read(file), /index: false, follow: false/);
});
