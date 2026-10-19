/** Real-browser journey and accessibility checks. npm run test:browser */
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
const port = 18788;
let server;
let browser;
let tests = 0;
const root = path.resolve(new URL("..", import.meta.url).pathname);
const base = process.env.UIHALL_URL || `http://127.0.0.1:${port}/`;
async function check(name, fn) {
  await fn();
  tests++;
  console.log("ok " + name);
}
try {
  if (!process.env.UIHALL_URL) {
    server = spawn(
      process.execPath,
      [path.join(root, "tools/serve.mjs"), String(port)],
      { stdio: "ignore" },
    );
    for (let i = 0; i < 50; i++) {
      try {
        if ((await fetch(base)).ok) break;
      } catch {}
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const errors = [];
  const missing = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) missing.push(r.url() + " " + r.status());
  });
  await page.goto(base);
  await page.locator(".card").first().waitFor();
  await page.waitForTimeout(600);
  await check("archive loads every record, media and live totals", async () => {
    assert.match(await page.locator("#resultCount").textContent(), /766/);
    await page.waitForFunction(
      () => document.querySelectorAll(".card").length === 766,
    );
    assert.equal(await page.locator(".card").count(), 766);
    assert.equal(
      await page.locator(".hero__stat-n").first().textContent(),
      "766",
    );
    assert.equal(
      await page
        .locator(".hero img")
        .evaluateAll((images) =>
          images.every((i) => i.complete && i.naturalWidth > 0),
        ),
      true,
    );
  });
  await check(
    "shortlist survives refresh and exports selected evidence",
    async () => {
      await page.locator(".save-reference").first().click();
      assert.equal(await page.locator("#boardCount").textContent(), "1");
      await page.reload();
      await page.locator(".card").first().waitFor();
      await page.locator("#boardOpen").click();
      assert.equal(await page.locator(".board-item").count(), 1);
      await page.locator("#briefGoal").fill("An accessible reference archive");
      await page.locator("#copyBrief").click();
      const text = await page.evaluate(() => navigator.clipboard.readText());
      assert.ok(text.includes("An accessible reference archive"));
      assert.ok(text.includes("VID-0377"));
      await page.locator("#boardClose").click();
    },
  );
  await check(
    "search changes results; impossible query has an empty state",
    async () => {
      await page.locator("#q").fill("zzzyxyunmatched");
      await page.waitForTimeout(400);
      assert.equal(await page.locator(".card").count(), 0);
      assert.equal(await page.locator("#emptyState").isVisible(), true);
      await page.locator("#qClear").click();
      await page.locator(".card").first().waitFor();
    },
  );
  await check(
    "kind filters preserve user selection on the gallery route",
    async () => {
      await page.locator("#fKind [data-kind=image]").click();
      await page.waitForTimeout(500);
      assert.equal(
        await page
          .locator(".card")
          .evaluateAll((cards) =>
            cards.every((c) => c.dataset.kind === "image"),
          ),
        true,
      );
      assert.match(await page.locator("#resultCount").textContent(), /433/);
      await page.locator("#fKind [data-kind=all]").click();
    },
  );
  await check("quick category navigation filters actual results", async () => {
    await page.locator("[data-discover=website]").click();
    assert.ok((await page.locator(".card").count()) > 0);
    assert.equal(
      await page
        .locator(".card")
        .evaluateAll((cards) =>
          cards.every((c) => c.dataset.category === "website"),
        ),
      true,
    );
    await page.locator('[data-discover=""]').click();
  });
  await check(
    "asset viewer traps focus, steps and restores launcher focus",
    async () => {
      const launcher = page.locator(".card__media").first();
      await launcher.click();
      assert.equal(
        await page.locator("#lightbox").evaluate((d) => d.open),
        true,
      );
      await page.keyboard.press("Tab");
      assert.equal(
        await page.evaluate(() =>
          document.getElementById("lightbox").contains(document.activeElement),
        ),
        true,
      );
      await page.locator("#lbNext").click();
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator("#lightbox").evaluate((d) => d.open),
        false,
      );
      assert.equal(
        await launcher.evaluate((e) => e === document.activeElement),
        true,
      );
    },
  );
  await check(
    "motion route contains only playable clips and a controllable player",
    async () => {
      await page.locator(".nav [data-nav=motion]").click();
      await page.locator(".motion-stage").waitFor();
      await page.waitForFunction(
        () => document.querySelectorAll(".card").length === 273,
      );
      assert.equal(await page.locator(".card").count(), 273);
      const video = page.locator(".motion-stage video");
      assert.equal(await video.evaluate((v) => v.paused), true);
      await video.evaluate(async (v) => {
        v.load();
        await v.play();
      });
      await page.waitForTimeout(300);
      assert.equal(await video.evaluate((v) => v.paused), false);
      await page.locator(".motion-stage__tabs button").nth(1).click();
      assert.equal(await video.evaluate((v) => v.paused), true);
      await page.locator(".motion-speed select").selectOption("0.5");
      assert.equal(await video.evaluate((v) => v.playbackRate), 0.5);
    },
  );
  await check(
    "agent page exposes real integration and case-study evidence",
    async () => {
      await page.locator(".nav [data-nav=agents]").click();
      assert.equal(await page.locator(".agent-flow article").count(), 3);
      assert.match(
        await page.locator(".agent-install pre").textContent(),
        /stormy-mcp\/server.js/,
      );
      assert.equal(await page.locator("#hero").isVisible(), false);
    },
  );
  await check(
    "all secondary routes render and have no serious accessibility violations",
    async () => {
      for (const route of [
        "gallery",
        "sets",
        "palettes",
        "typography",
        "patterns",
        "about",
        "agents",
        "motion",
      ]) {
        await page.goto(base + "#/" + route);
        await page.waitForTimeout(450);
        if (route === "typography")
          await page
            .locator(".typepage, .typegrid, .type-hero, .typeface")
            .first()
            .waitFor({ timeout: 3000 })
            .catch(() => {});
        if (route === "gallery")
          await page.waitForFunction(
            () => document.querySelectorAll(".card").length === 766,
          );
        if (route === "motion")
          await page.waitForFunction(
            () => document.querySelectorAll(".card").length === 273,
          );
        await page.evaluate(() =>
          Promise.all(
            document.getAnimations().map((a) => a.finished.catch(() => {})),
          ),
        );
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
          .analyze();
        const bad = results.violations.filter((v) =>
          ["critical", "serious"].includes(v.impact),
        );
        assert.deepEqual(
          bad.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })),
          [],
          route,
        );
      }
    },
  );
  await check("light/dark theme switching persists", async () => {
    await page.locator("#themeToggle").click();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.reload();
    await page.locator(".card").first().waitFor();
    assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
    await page.locator("#themeToggle").click();
  });
  await check(
    "360px mobile navigation, filters and layouts work without overflow",
    async () => {
      await page.setViewportSize({ width: 360, height: 800 });
      await page.goto(base);
      await page.locator(".card").first().waitFor();
      await page.waitForTimeout(400);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.locator("#filterToggle").click();
      await page.locator("#q").fill("wallet");
      await page.waitForTimeout(400);
      assert.ok((await page.locator(".card").count()) > 0);
      await page.keyboard.press("Escape");
      assert.equal(
        await page.locator("#filterToggle").getAttribute("aria-expanded"),
        "false",
      );
      await page.locator(".mobile-nav [data-nav=agents]").click();
      assert.equal(await page.locator(".agent-flow article").count(), 3);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
    },
  );
  await check("reduced motion suppresses entrances and autoplay", async () => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(base);
    await page.locator(".card").first().waitFor();
    assert.equal(
      await page
        .locator(".hero__copy")
        .evaluate((e) => getComputedStyle(e).animationName),
      "none",
    );
    await page.locator(".card__media").first().click();
    assert.equal(
      await page.locator("#lbMedia video").evaluate((v) => v.autoplay),
      false,
    );
    await page.keyboard.press("Escape");
  });
  assert.deepEqual(errors, [], "browser errors");
  assert.deepEqual(missing, [], "failed assets");
  const out = process.env.UIHALL_SHOTS;
  if (out) {
    fs.mkdirSync(out, { recursive: true });
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(base);
    await page.locator(".card").first().waitFor();
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(out, "desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, "mobile.png") });
    await page.goto(base + "#/motion");
    await page.locator(".motion-stage").waitFor();
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, "motion.png") });
  }
  console.log(
    `${tests} browser journeys passed; no page errors or failed assets.`,
  );
} finally {
  await browser?.close();
  server?.kill();
}
