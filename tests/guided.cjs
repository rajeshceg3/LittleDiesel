const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
(async () => {
  const b = await chromium.launch({
    executablePath: process.env.CHROME || "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const base = process.env.BASE_URL || "http://127.0.0.1:8795",
    out = process.env.OUT || "docs/guided-journey/local";
  fs.mkdirSync(out, { recursive: true });
  const results = [];
  try {
    for (const [w, h] of JSON.parse(
      process.env.VIEWPORTS || "[[390,844],[1320,900]]",
    )) {
      const p = await b.newPage({
        viewport: { width: w, height: h },
        reducedMotion: process.env.MOTION || "reduce",
      });
      let errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(base);
      await p.waitForFunction(() =>
        document.querySelector("#step-title").textContent.includes("diesel"),
      );
      const evidence = () =>
        p.evaluate(async () => {
          const m = await import("./main.js");
          return m.journeyEvidence();
        });
      const init = await evidence();
      assert.equal(init.playing, false);
      await p.screenshot({ path: `${out}/intro-${w}.png`, fullPage: true });
      await p.locator("#next").click();
      assert.equal(await p.locator("#answers button").count(), 3);
      await p.screenshot({ path: `${out}/question-${w}.png`, fullPage: true });
      await p.locator("#answers button").first().click();
      assert.ok((await p.locator("#feedback").textContent()).length > 30);
      await p.locator("#parts-toggle").click();
      const state = (await evidence()).lesson;
      const options = await p.locator("#part-select option").count();
      assert.equal(options, 9);
      for (let i = 0; i < options; i++) {
        await p.locator("#part-select").selectOption(String(i));
        await p.waitForTimeout(30);
        const a = await p.evaluate(() => ({
          line: document.querySelector("#part-line").getAttribute("d"),
          dot: [
            document.querySelector("#part-anchor").getAttribute("cx"),
            document.querySelector("#part-anchor").getAttribute("cy"),
          ].map(Number),
          stage: document
            .querySelector("#model-stage")
            .getBoundingClientRect()
            .toJSON(),
        }));
        assert.ok(a.line && !a.line.includes("NaN"));
        assert.ok(
          a.dot[0] > 0 &&
            a.dot[0] < a.stage.width &&
            a.dot[1] > 0 &&
            a.dot[1] < a.stage.height,
          JSON.stringify(a),
        );
      }
      await p.locator("#part-select").selectOption("3");
      await p.screenshot({ path: `${out}/part-${w}.png`, fullPage: true });
      const d = (await evidence()).distance;
      await p.locator("#zoom-in").click();
      await p.waitForTimeout(400);
      assert.ok((await evidence()).distance < d * 0.99);
      await p.locator("#parts-toggle").click();
      assert.deepEqual((await evidence()).lesson, state);
      for (let i = 0; i < 4; i++) {
        if (i > 0) {
          assert.equal(await p.locator("#answers button").count(), 3);
          await p
            .locator("#answers button")
            .nth(i % 3)
            .click();
        }
        await p.locator("#next").click();
        await p.waitForFunction(() => document.body.dataset.phase === "held");
        await p.screenshot({
          path: `${out}/stroke-${i}-${w}.png`,
          fullPage: true,
        });
        await p.locator("#next").click();
      }
      assert.equal(await p.locator("#answers button").count(), 3);
      await p.locator("#answers button").first().click();
      await p.locator("#next").click();
      assert.ok(
        (await p.locator("#step-title").textContent()).includes(
          "turning crank",
        ),
      );
      await p.locator("#play").click();
      assert.equal((await evidence()).playing, true);
      await p.locator("#play").click();
      assert.equal((await evidence()).playing, false);
      const paused = await evidence();
      await p.waitForTimeout(150);
      assert.equal((await evidence()).pistonY, paused.pistonY);
      await p.locator("#next").click();
      assert.equal((await evidence()).previewing, false);
      await p.locator("#reset").click();
      assert.equal((await evidence()).lesson.phase, "orient");
      await p.locator("#fullscreen").click();
      await p.waitForTimeout(400);
      assert.equal(
        await p.evaluate(
          () =>
            !!document.fullscreenElement ||
            document
              .querySelector("#workshop")
              .classList.contains("fullscreen-fallback"),
        ),
        true,
      );
      await p.screenshot({
        path: `${out}/fullscreen-${w}.png`,
        fullPage: true,
      });
      await p.locator("#fullscreen").click();
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      results.push({
        width: w,
        questionLoop: true,
        parts9: true,
        allConnectors: true,
        zoomAdjustable: true,
        resume: true,
        fourStrokes: true,
        transfer: true,
        playPause: true,
        reset: true,
        fullscreen: true,
        errors,
      });
      await p.close();
    }
    fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
    console.log(results);
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
