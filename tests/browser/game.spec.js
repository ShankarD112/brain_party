import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("console", msg => { if (msg.type() === "error") console.error("Browser:", msg.text()); });
  page.on("requestfailed", request => console.error("Request failed:", request.url(), request.failure()?.errorText));
  page.on("pageerror", error => console.error("Page error:", error.message));
});

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
    "0 / 15 regions joined",
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
  // End the drift/lift check before picking a moving anatomical surface.
  await page.locator('#gravity').check();
  await page.evaluate(() => {
    const t=window.__TEST__,g=t.puzzle.group(t.selected);
    t.physics.move(t.selected,[g.offset[0],t.physics.floorOffset(g),g.offset[2]]);
    t.updatePositions();
  });
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
      if (x > 360 && x < innerWidth - 340 && y > 260 && y < innerHeight - 180)
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
  ).toEqual(expect.arrayContaining([expect.any(Number)]));
  const resumed=await page.evaluate(()=>window.__TEST__.puzzle.group(window.__TEST__.selected).offset);
  expect(resumed[0]).toBeCloseTo(afterDrag[0],4);expect(resumed[2]).toBeCloseTo(afterDrag[2],4);
  expect(resumed[1]).toBeGreaterThanOrEqual(afterDrag[1]);expect(resumed[1]-afterDrag[1]).toBeLessThan(1);
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
          ([a, b]) => t.puzzle.group(a) !== t.puzzle.group(b),
        );
        const id = edge[0], target=t.puzzle.group(edge[1]).offset;
        t.select(id);
        t.puzzle.move(id, [target[0]+0.02,target[1],target[2]]);
        t.updatePositions();
        t.attemptSnap();
      }
    });
    await expect(page.locator("#complete-dialog")).toBeVisible({timeout:15000});
    await expect(page.locator("#progress")).toHaveText("100%");
    expect(
      await page.evaluate(() => localStorage.getItem("brain-party-session-v1")),
    ).toBeNull();
    await page.locator("#inspect-complete").click();
    expect(await page.evaluate(()=>!!window.__TEST__.party.props)).toBe(true);
    const old=await page.evaluate(()=>[...window.__TEST__.puzzle.group(window.__TEST__.selected).offset]);
    await page.keyboard.down('ArrowLeft');await page.waitForTimeout(250);await page.keyboard.up('ArrowLeft');
    expect(await page.evaluate(()=>window.__TEST__.puzzle.group(window.__TEST__.selected).offset)).not.toEqual(old);
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

test('free clusters, bounded movement, linked slices, and cross-view highlighting',async({page})=>{
  await begin(page);
  const info=await page.evaluate(()=>{
    const t=window.__TEST__,[a,b]=t.puzzle.data.edges[0],target=t.puzzle.group(b).offset;
    t.select(a);t.puzzle.move(a,[target[0]+.01,target[1],target[2]]);t.updatePositions();t.attemptSnap();
    return {a,b,size:t.puzzle.group(a).members.size,name:t.meshes.get(a).userData.piece.name};
  });
  expect(info.size).toBeGreaterThan(1);
  await expect(page.locator('#slice-caption')).toContainText('joined regions');
  await expect(page.locator('#region-name')).toHaveText(info.name);
  await expect.poll(()=>page.evaluate(()=>window.__TEST__.slices.hitPaths.length)).toBeGreaterThan(0);
  const focus=await page.evaluate(({a,b})=>{
    const t=window.__TEST__;
    return {selected:t.meshes.get(a).material.emissiveIntensity,other:t.meshes.get(b).material.opacity,anchored:t.puzzle.group(a).anchored};
  },info);
  expect(focus.selected).toBeGreaterThan(.5);expect(focus.other).toBeLessThan(.3);expect(focus.anchored).toBe(false);
  const first=await page.evaluate(()=>document.getElementById('slice-canvas').toDataURL());
  await page.locator('#slice-axis').selectOption('0');
  await expect.poll(()=>page.evaluate(()=>document.getElementById('slice-canvas').toDataURL()),{timeout:15000}).not.toBe(first);
  await page.locator('#slice-plane').check();
  expect(await page.evaluate(()=>window.__TEST__.slices.plane.visible)).toBe(true);
  const bounded=await page.evaluate(id=>{
    const t=window.__TEST__;t.physics.move(id,[10000,10000,-10000]);t.updatePositions();
    const g=t.puzzle.group(id),b=t.physics.groupBounds(g);
    return {maxX:b.max[0],minZ:b.min[2],half:t.physics.arenaHalf,members:[...g.members],offset:[...g.offset]};
  },info.a);
  expect(bounded.maxX).toBeLessThanOrEqual(bounded.half+.00001);expect(bounded.minZ).toBeGreaterThanOrEqual(-bounded.half-.00001);
  await page.locator('#shuffle').click();
  expect(await page.evaluate(id=>[...window.__TEST__.puzzle.group(id).members],info.a)).toEqual(bounded.members);
  // Pause physics while verifying the view-selection interaction.
  const hit=await page.evaluate(id=>{
    const t=window.__TEST__;t.physics.gravity=false;t.select(id);t.slices.draw();
    const view=t.slices,c=view.canvas,r=c.getBoundingClientRect();
    for(let y=0;y<c.height;y+=3)for(let x=0;x<c.width;x+=3){
      const target=[...view.hitPaths].reverse().find(h=>view.ctx.isPointInPath(h.path,x,y,'evenodd'));
      if(target && target.id===id)return{x:r.left+x/c.width*r.width,y:r.top+y/c.height*r.height,id};
    }
    return null;
  },info.b);
  expect(hit).not.toBeNull();
  await page.mouse.click(hit.x,hit.y);
  expect(await page.evaluate(()=>window.__TEST__.selected)).toBe(info.b);
  await page.screenshot({path:'test-results/linked-slices.png'});
});

test('minimal home, animated previews, theme persistence, menu resume and difficulty switching',async({page})=>{
 test.setTimeout(180000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/?test');
 await expect(page.locator('#home-screen h1')).toHaveText('BRAIN PART(S)Y');
 await expect(page.locator('#start-game')).toHaveText('Start');
 await expect(page.locator('#continue-game')).toBeHidden();
 await page.locator('#theme').selectOption('midnight');
 await expect(page.locator('body')).toHaveAttribute('data-theme','midnight');
 await page.reload();await expect(page.locator('#theme')).toHaveValue('midnight');
 await page.locator('#theme').selectOption('sand');
 await page.locator('#start-game').click();
 await expect(page.locator('#loading')).toBeHidden({timeout:60000});
 await page.locator('#tutorial-skip').click();
 const seed=await page.evaluate(()=>window.__TEST__.physics.seed);
 for(let i=0;i<3;i++){
  await page.locator('#menu').click();await expect(page.locator('#continue-game')).toBeVisible();
  await page.locator('#continue-game').click();
  await expect(page.locator('#home-screen')).toBeHidden();await expect(page.locator('#paused')).toBeHidden();
  expect(await page.evaluate(()=>window.__TEST__.physics.seed)).toBe(seed);
  const before=await page.evaluate(()=>window.__TEST__.puzzle.group(window.__TEST__.selected).offset[1]);
  await page.keyboard.down('e');await page.waitForTimeout(300);await page.keyboard.up('e');
  expect(await page.evaluate(()=>window.__TEST__.puzzle.group(window.__TEST__.selected).offset[1])).toBeGreaterThan(before);
 }
 await page.locator('#menu').click();
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.locator('[data-mode=medium]').hover();
 // Motion preference is sampled at boot; a reload enables animated posters.
 await page.reload();await page.locator('[data-mode=medium]').hover();
 await expect(page.locator('#difficulty-preview')).toHaveAttribute('src',/sand-medium.gif$/);
 await page.locator('[data-mode=medium]').click();
 await page.locator('#start-game').click();
 await expect(page.locator('#restart-dialog')).toBeVisible();
 await page.locator('#restart-cancel').click();await expect(page.locator('#continue-game')).toBeVisible();
 await page.locator('#start-game').click();await page.locator('#restart-confirm').click();
 await expect(page.locator('#loading')).toBeHidden({timeout:60000});await page.locator('#skip-intro').click();
 await expect(page.locator('#docked-count')).toContainText('/ 324');
 await page.locator('#menu').click();await page.locator('#continue-game').click();
 await expect(page.locator('#docked-count')).toContainText('/ 324');
 await page.locator('#menu').click();await page.screenshot({path:'test-results/minimal-home.png'});
 expect(errors).toEqual([]);
});

test('search preserves multiple high-contrast highlights in 2D and 3D',async({page})=>{
 await begin(page);
 for(const name of ['Medulla','Thalamus']){
  await page.locator('#region-search').fill(name);
  await page.locator('#search-results button').filter({hasText:new RegExp('^'+name+'$')}).click();
 }
 const result=await page.evaluate(()=>{
  const t=window.__TEST__,ids=[...t.highlights];t.slices.draw();
  return {ids,highlighted:ids.map(id=>({opacity:t.meshes.get(id).material.opacity,depthTest:t.meshes.get(id).material.depthTest})),other:[...t.meshes].filter(([id])=>!ids.includes(id)).map(([,m])=>m.material.opacity),linked:ids.every(id=>t.slices.highlights.has(id))};
 });
 expect(result.ids).toHaveLength(2);expect(result.linked).toBe(true);
 expect(result.highlighted.every(m=>m.opacity===1&&!m.depthTest)).toBe(true);
 expect(result.other.every(o=>o<.05)).toBe(true);
 await expect(page.locator('#highlighted-regions button')).toHaveCount(2);
 await page.screenshot({path:'test-results/multiple-highlights.png'});
 await page.locator('#clear-highlights').click();
 expect(await page.evaluate(()=>window.__TEST__.highlights.size)).toBe(0);
});
