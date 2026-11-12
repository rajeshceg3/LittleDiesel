const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("fs");
(async () => {
  const b = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
  });
  const out = process.env.OUT || "docs/guided-journey/edge";
  fs.mkdirSync(out, { recursive: true });
  let results = [];
  try {
    for (const [w, h] of JSON.parse(process.env.VIEWPORTS || JSON.stringify([
      [390, 844],
      [320, 568],
      [844, 390],
      [1320, 900],
    ]))) {
      const p = await b.newPage({
        viewport: { width: w, height: h },
        reducedMotion: "no-preference",
      });
      const utility = async selector => {
        if (!(await p.locator(selector).isVisible())) await p.locator('#info-open').click();
        await p.locator(selector).click();
      };
      let errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto("http://127.0.0.1:8795");
      const ev = () =>
        p.evaluate(async () => (await import("./main.js")).journeyEvidence());
      await p.locator("#next").click();
      await p.locator("#next").click();
      assert.equal((await ev()).moving, true);
      assert.equal(await p.locator("#play").isDisabled(), true);
      assert.equal(await p.locator("#back").isDisabled(), true);
      await utility("#reset");
      assert.equal((await ev()).lesson.phase, "orient");
      await utility("#play");
      for (let i = 0; i < 12; i++) {
        await p.waitForTimeout(75);
        assert.ok(Math.abs((await ev()).rodLength - 1.25) < 1e-8);
      }
      await utility("#play");
      const stop = await ev();
      await p.waitForTimeout(140);
      assert.equal((await ev()).pistonY, stop.pistonY);
      await utility("#parts-toggle");
      const before = (await ev()).lesson;
      let hitPiston = false;
      const box = await p.locator("#engine").boundingBox();
      const points = (await ev()).partPoints;
      for (let i = 0; i < points.length; i++) {
        await p.mouse.click(box.x + points[i].x, box.y + points[i].y);
        if ((await ev()).selectedPart === 0) hitPiston = true;
      }
      assert.ok(hitPiston, "piston can be tapped through cutaway");
      await p.locator("#part-select").selectOption("6");
      await p.keyboard.press("Tab");
      await p.keyboard.press("Tab");
      await utility("#reset-view");
      await p.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.5);
      await p.mouse.down();
      await p.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.65, {
        steps: 10,
      });
      await p.mouse.up();
      await utility("#zoom-in");
      await utility("#reset-view");
      assert.ok(
        Math.abs((await ev()).distance - (await ev()).fittedDistance) < 0.001,
      );
      await utility("#parts-toggle");
      assert.deepEqual((await ev()).lesson, before);
      await p.locator("#next").click();
      assert.equal((await ev()).previewing, false);
      await p.evaluate(
        () =>
          (document.querySelector("#workshop").requestFullscreen = undefined),
      );
      await utility("#fullscreen");
      assert.equal(
        await p
          .locator("#workshop")
          .evaluate((e) => e.classList.contains("fullscreen-fallback")),
        true,
      );
      await p.screenshot({ path: `${out}/fallback-${w}.png` });
      await p.keyboard.press("Escape");
      assert.equal(
        await p
          .locator("#workshop")
          .evaluate((e) => e.classList.contains("fullscreen-fallback")),
        false,
      );
      await p.setViewportSize({ width: h, height: w });
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.deepEqual(errors, []);
      results.push({
        w,
        h,
        resetWhileMoving: true,
        pausedPose: true,
        rodContinuity: true,
        hitPiston: true,
        orbitZoomReset: true,
        fallbackEscape: true,
        resize: true,
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
