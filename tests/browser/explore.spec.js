import {test,expect} from '@playwright/test';

test('Just explore preserves a saved puzzle and navigates parent acronyms and descendants',async({page})=>{
 test.setTimeout(180000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?test');
 await page.locator('[data-mode=easy]').click();await page.locator('#start-game').click();await expect(page.locator('#loading')).toBeHidden({timeout:60000});
 await page.locator('#tutorial-skip').click();await page.locator('#menu').click();
 const save=await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('brain-party-session-v1'));delete s.savedAt;return s;});
 await page.locator('#just-explore').click();await page.locator('#start-game').click();await expect(page.locator('#loading')).toBeHidden({timeout:60000});
 await expect(page.locator('body')).toHaveClass(/is-exploring/);await expect(page.locator('#intro-banner')).toBeHidden();await expect(page.locator('#tutorial-dialog')).toBeHidden();await expect(page.locator('#complete-dialog')).toBeHidden();
 expect(await page.evaluate(()=>window.__TEST__.puzzle.complete)).toBe(true);expect(await page.evaluate(()=>[...window.__TEST__.puzzle.groups.values()][0].offset)).toEqual([0,0,0]);expect(await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('brain-party-session-v1'));delete s.savedAt;return s;})).toEqual(save);
 await page.locator('#region-search').fill('TH');await page.locator('#search-results button').filter({hasText:/^TH · Thalamus$/}).click();
 await expect(page.locator('#region-name')).toHaveText('TH · Thalamus');
 expect(await page.evaluate(()=>window.__TEST__.highlights.size)).toBeGreaterThan(1);
 await page.locator('#isolate-region').check();
 expect(await page.evaluate(()=>[...window.__TEST__.meshes].filter(([,m])=>m.visible).length)).toBe(await page.evaluate(()=>window.__TEST__.highlights.size));
 await expect(page.locator('#hierarchy-tree button[aria-pressed=true]')).toHaveText('TH · Thalamus');
 await page.screenshot({path:'test-results/explore-hierarchy.png'});
 await page.locator('#menu').click();await page.locator('#continue-game').click();await expect(page.locator('#loading')).toBeHidden({timeout:60000});
 expect(await page.evaluate(()=>window.__TEST__.exploring)).toBe(false);await expect(page.locator('#docked-count')).toContainText('/ 15');expect(errors).toEqual([]);
});

test('slice marker coordinates follow the crosshair, pin, and survive plane changes',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/?test');await page.locator('[data-mode=easy]').click();await page.locator('#start-game').click();
 await expect(page.locator('#loading')).toBeHidden({timeout:60000});await page.locator('#tutorial-skip').click();
 const rect=await page.locator('#slice-canvas').boundingBox();await page.mouse.move(rect.x+rect.width*.4,rect.y+rect.height*.45);
 await expect(page.locator('#marker-coordinates')).toHaveText(/ML \d+\.\d{2} · DV \d+\.\d{2} · AP \d+\.\d{2}/);
 await page.mouse.click(rect.x+rect.width*.4,rect.y+rect.height*.45);const pinned=await page.evaluate(()=>window.__TEST__.slices.markerPoint);
 await page.mouse.move(rect.x+rect.width*.7,rect.y+rect.height*.7);expect(await page.evaluate(()=>window.__TEST__.slices.markerPoint)).toEqual(pinned);
 await page.locator('#slice-axis').selectOption('0');expect(await page.evaluate(()=>window.__TEST__.slices.markerPoint)).toEqual(pinned);
 await page.locator('#slice-plane').check();expect(await page.evaluate(()=>window.__TEST__.slices.marker.visible)).toBe(true);
 await page.locator('#marker-unpin').click();await page.locator('#slice-canvas').scrollIntoViewIfNeeded();const latest=await page.locator('#slice-canvas').boundingBox();await page.mouse.move(latest.x+latest.width*.7,latest.y+latest.height*.7);expect(await page.evaluate(()=>window.__TEST__.slices.markerPoint)).not.toEqual(pinned);
 const camera=await page.locator('.camera-views').boundingBox();expect(camera.x).toBeGreaterThan(1000);
 await page.screenshot({path:'test-results/slice-marker.png'});
});
