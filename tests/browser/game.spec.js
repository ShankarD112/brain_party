import { test, expect } from "@playwright/test";

async function begin(page, mode = "easy") {
  await page.goto("/?test");
  await page.locator(`[data-mode="${mode}"]`).click();
  await page.locator("#start-game").click();
  await expect(page.locator("#loading")).toBeHidden({ timeout: 60000 });
  await page.locator("#skip-intro").click();
  await expect(page.locator("#tutorial-dialog")).toBeVisible();
  await page.locator("#tutorial-skip").click();
}

test("lazy loading, tutorial, keyboard, genuine dragging, save/resume, shuffle, and pause", async ({
  page,
}) => {
  const errors = [],
    requests = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (r.url().includes("/data/")) requests.push(r.url());
  });
  await page.goto("/?test");
  await expect(page.locator("#start-game")).toBeVisible();
  expect(requests).toEqual([]);
  await page.locator("#start-game").click();
  await expect(page.locator("#loading")).toBeHidden({ timeout: 60000 });
  await page.locator("#skip-intro").click();
  await expect(page.locator("#tutorial-dialog")).toBeVisible();
  for (let i = 0; i < 4; i++) await page.locator("#tutorial-next").click();
  await expect(page.locator("#docked-count")).toHaveText(
    "1 / 15 regions in the brain",
  );
  expect(requests.every((u) => u.includes("/easy."))).toBe(true);
  await page.locator("#gravity").uncheck();
  await page.locator("#region-search").fill("Medulla");
  await page.locator("#search-results button").click();
  await page.locator("#region-search").blur();
  const before = await page.evaluate(() => [
    ...window.__TEST__.puzzle.group(window.__TEST__.selected).offset,
  ]);
  await page.keyboard.down("e");
  await page.waitForTimeout(400);
  await page.keyboard.up("e");
  expect(
    await page.evaluate(
      () => window.__TEST__.puzzle.group(window.__TEST__.selected).offset,
    ),
  ).not.toEqual(before);
  const candidates = await page.evaluate(() => {
    const t = window.__TEST__,
      m = t.meshes.get(t.selected),
      a = m.geometry.attributes.position,
      idx = m.geometry.index,
      result = [];
    for (
      let i = 0;
      i < idx.count;
      i += Math.max(3, Math.floor(idx.count / 300 / 3) * 3)
    ) {
      const v = m.position.clone().set(0, 0, 0);
      for (let k = 0; k < 3; k++) {
        const j = idx.getX(i + k);
        v.x += a.getX(j) / 3;
        v.y += a.getY(j) / 3;
        v.z += a.getZ(j) / 3;
      }
      v.add(m.position).project(t.camera);
      const x = ((v.x + 1) * innerWidth) / 2,
        y = ((1 - v.y) * innerHeight) / 2;
      if (x > 360 && x < innerWidth - 70 && y > 260 && y < innerHeight - 180)
        result.push({ x, y });
    }
    return result;
  });
  let point;
  for (const c of candidates.slice(0, 60)) {
    await page.mouse.move(c.x, c.y);
    await page.waitForTimeout(110);
    if (
      (await page.locator("#tooltip").isVisible()) &&
      (await page.locator("#tooltip").textContent()) === "Medulla"
    ) {
      point = c;
      break;
    }
  }
  expect(point).toBeTruthy();
  const preDrag = await page.evaluate(() => [
    ...window.__TEST__.puzzle.group(window.__TEST__.selected).offset,
  ]);
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await page.mouse.move(point.x + 50, point.y + 20, { steps: 8 });
  await page.mouse.up();
  const afterDrag = await page.evaluate(() => [
    ...window.__TEST__.puzzle.group(window.__TEST__.selected).offset,
  ]);
  expect(afterDrag).not.toEqual(preDrag);
  await page.locator("#menu").click();
  await expect(page.locator("#save-status")).toHaveText(
    "Saved on this browser",
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("brain-party-session-v1")),
  );
  await page.reload();
  await expect(page.locator("#continue-game")).toBeVisible();
  await page.locator("#continue-game").click();
  await expect(page.locator("#loading")).toBeHidden({ timeout: 60000 });
  await expect(page.locator("#tutorial-dialog")).not.toBeVisible();
  expect(
    await page.evaluate(
      () => window.__TEST__.puzzle.group(window.__TEST__.selected).offset,
    ),
  ).toEqual(afterDrag);
  expect(
    await page.evaluate(() => window.__TEST__.elapsed),
  ).toBeGreaterThanOrEqual(saved.elapsed);
  await page.locator("#shuffle").click();
  await page.locator("#pause").click();
  const time = await page.locator("#timer").textContent();
  await page.waitForTimeout(1100);
  await expect(page.locator("#timer")).toHaveText(time);
  await page.locator("#resume").click();
  await page.screenshot({
    path: "test-results/browser-game.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

for (const [mode, count] of [
  ["easy", 15],
  ["medium", 324],
  ["hard", 671],
])
  test(`${mode}: load real atlas and complete through the snapping handler`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await begin(page, mode);
    await expect(page.locator("#docked-count")).toContainText(
      "/ " + count + " regions",
    );
    await page.evaluate(() => {
      const t = window.__TEST__;
      while (!t.puzzle.complete) {
        const edge = t.puzzle.data.edges.find(
          ([a, b]) => t.puzzle.group(a).anchored !== t.puzzle.group(b).anchored,
        );
        const id = t.puzzle.group(edge[0]).anchored ? edge[1] : edge[0];
        t.select(id);
        t.puzzle.move(id, [0.02, 0, 0]);
        t.updatePositions();
        t.attemptSnap();
      }
    });
    await expect(page.locator("#complete-dialog")).toBeVisible();
    await expect(page.locator("#progress")).toHaveText("100%");
    expect(
      await page.evaluate(() => localStorage.getItem("brain-party-session-v1")),
    ).toBeNull();
    await page.locator("#inspect-complete").click();
    await page.screenshot({ path: `test-results/${mode}-complete.png` });
    expect(errors).toEqual([]);
  });

test("a failed atlas request has a working retry", async ({ page }) => {
  let failed = false;
  await page.route("**/data/easy.bin.gz", (route) => {
    if (!failed) {
      failed = true;
      return route.fulfill({ status: 503, body: "unavailable" });
    }
    return route.continue();
  });
  await page.goto("/?test");
  await page.locator("#start-game").click();
  await expect(page.locator("#retry-load")).toBeVisible();
  await page.locator("#retry-load").click();
  await expect(page.locator("#loading")).toBeHidden({ timeout: 60000 });
  await expect(page.locator("#docked-count")).toContainText("/ 15 regions");
});

test("touch viewport keeps menu, region controls, and lifting usable", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await begin(page);
  await page.locator("#panel-toggle").click();
  await page.locator("#next").click();
  await expect(page.locator("#lift-up")).toBeEnabled();
  await page.locator("#gravity").uncheck();
  const before = await page.evaluate(
    () => window.__TEST__.puzzle.group(window.__TEST__.selected).offset[1],
  );
  const box = await page.locator("#lift-up").boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await page.mouse.up();
  expect(
    await page.evaluate(
      () => window.__TEST__.puzzle.group(window.__TEST__.selected).offset[1],
    ),
  ).toBeGreaterThan(before);
  await page.screenshot({ path: "test-results/mobile-controls.png" });
  await context.close();
});
