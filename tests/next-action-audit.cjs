const { chromium } = require(process.env.PLAYWRIGHT_PATH || "playwright"),
  http = require("http"),
  fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, ".."),
  out = process.env.EVIDENCE_DIR || "/downloads/diesel-focused";
fs.mkdirSync(out, { recursive: true });
const server = http
  .createServer((q, r) => {
    try {
      const f = path.join(
        root,
        q.url.split("?")[0] === "/" ? "index.html" : q.url.split("?")[0],
      );
      r.setHeader(
        "Content-Type",
        f.endsWith(".js")
          ? "text/javascript"
          : f.endsWith(".css")
            ? "text/css"
            : "text/html",
      );
      r.end(fs.readFileSync(f));
    } catch {
      r.statusCode = 404;
      r.end();
    }
  })
  .listen(0, "127.0.0.1");
(async () => {
  await new Promise((r) =>
    server.listening ? r() : server.on("listening", r),
  );
  const b = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox"],
  });
  try {
    for (const [w, h] of JSON.parse(
      process.env.VIEWPORTS || "[[320,700],[390,844],[844,390],[1320,900]]",
    )) {
      const p = await b.newPage({
        viewport: { width: w, height: h },
        reducedMotion: "reduce",
      });
      p.setDefaultTimeout(10000);
      const errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.goto(
        process.env.TARGET_URL || `http://127.0.0.1:${server.address().port}`,
        { waitUntil: "domcontentloaded", timeout: 25000 },
      );
      await p.locator('[data-mode="2"]').click();
      const audit = async () => {
        for (const e of await p.locator("button").all()) {
          if (
            !(await e.evaluate((el) =>
              el.checkVisibility({
                checkOpacity: true,
                checkVisibilityCSS: true,
              }),
            ))
          )
            continue;
          await e.scrollIntoViewIfNeeded();
          const m = await e.evaluate((el) => {
            const r = el.getBoundingClientRect();
            return {
              text: el.textContent,
              height: r.height,
              hit: el.contains(
                document.elementFromPoint(
                  r.x + r.width / 2,
                  r.y + r.height / 2,
                ),
              ),
              top: r.top,
              bottom: r.bottom,
            };
          });
          assert.ok(
            m.height >= 44 && m.hit,
            JSON.stringify({ width: w, ...m }),
          );
        }
        assert.equal(
          await p.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
      };
      const visible = () =>
        p
          .locator("button")
          .evaluateAll((bs) =>
            bs
              .filter((b) =>
                b.checkVisibility({
                  checkVisibilityCSS: true,
                  checkOpacity: true,
                }),
              )
              .map((b) => b.textContent),
          );
      await audit();
      assert.equal((await visible()).length, 3);
      await p.screenshot({ path: `${out}/${w}-intro.png` });
      await p.locator("#journey-more").click();
      assert.ok(await p.locator("#more-restart").isHidden());
      for (let i = 0; i < 9; i++) {
        await p.keyboard.press("Tab");
        assert.ok(
          await p.evaluate(
            () => document.activeElement.closest("#more-dialog") !== null,
          ),
        );
      }
      await p.keyboard.press("Escape");
      await p.waitForFunction(
        () => !document.querySelector("#more-dialog").open,
      );
      assert.equal(
        await p.evaluate(() => document.activeElement.id),
        "journey-more",
      );
      await p
        .getByRole("button", { name: "Start learning", exact: true })
        .click();
      await audit();
      assert.equal((await visible()).length, 6);
      await p.screenshot({ path: `${out}/${w}-predict.png` });
      for (let i = 0; i < 4; i++) {
        if (i === 0) {
          await p
            .getByRole("button", {
              name: "Fuel and air already mixed",
              exact: true,
            })
            .click();
          await audit();
          assert.equal((await visible()).length, 3);
        } else
          await p
            .getByRole("button", {
              name: "Show me this move first",
              exact: true,
            })
            .click();
        await p.locator("#next").press("Enter");
        await p.waitForFunction(() => !document.querySelector("#next").hidden);
        await audit();
        assert.equal((await visible()).length, 3);
        if (i === 0) await p.screenshot({ path: `${out}/${w}-held.png` });
        await p.locator("#next").press("Enter");
      }
      await p
        .getByRole("button", {
          name: "Think aloud, then see the takeaway",
          exact: true,
        })
        .click();
      await p
        .getByRole("button", {
          name: "Compare with the explanation",
          exact: true,
        })
        .click();
      assert.equal(await p.locator("[data-explanation]").count(), 1);
      assert.equal(
        await p
          .locator("#reasoning")
          .evaluate((e) => e.lastElementChild.textContent),
        "Explore engine",
      );
      await audit();
      await p.screenshot({ path: `${out}/${w}-finish.png` });
      await p.locator("#journey-more").click();
      const sizes = await p
        .locator("#more-dialog button")
        .evaluateAll((bs) =>
          bs
            .filter((b) => !b.hidden)
            .map((b) => b.getBoundingClientRect().height),
        );
      assert.ok(sizes.every((h) => h >= 44));
      await p.locator("#more-explore").scrollIntoViewIfNeeded();
      await p.screenshot({ path: `${out}/${w}-menu.png` });
      await p.keyboard.press("Escape");
      await p
        .getByRole("button", { name: "Explore engine", exact: true })
        .click();
      await p.waitForFunction(
        () => !document.body.classList.contains("learning-mode"),
      );
      await p.locator('[data-mode="2"]').click();
      await p.locator("#journey-more").click();
      await p.locator("#more-run").click();
      assert.deepEqual((await visible()).sort(), ["Back", "More", "Step it"]);
      await p.locator("#journey-more").click();
      assert.ok(await p.locator("#more-run").isHidden());
      await p.locator("#more-explore").click();
      await p.locator('[data-mode="2"]').click();
      await p
        .getByRole("button", { name: "Start learning", exact: true })
        .click();
      await p
        .getByRole("button", { name: "Show me this move first", exact: true })
        .click();
      await p.locator("#next").press("Enter");
      await p.locator("#journey-back").click();
      assert.ok(!(await p.locator('[data-mode="2"]').isHidden()));
      assert.deepEqual(errors, []);
      console.log(w, "focused journey/menu/counts PASS");
      await p.close();
    }
  } finally {
    await b.close();
    server.close();
  }
})().catch((e) => {
  console.error(e);
  server.close();
  process.exitCode = 1;
});
