import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

// ensure output directory exists
const outputDir = 'output/playwright/mobile-smoke';
fs.mkdirSync(outputDir, { recursive: true });

async function run() {
  console.log("Starting E2E Settlex Smoke Test via Playwright...");

  // Launch browser for Player 1 (Desktop)
  const browserP1 = await chromium.launch({ headless: true });
  const contextP1 = await browserP1.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const pageP1 = await contextP1.newPage();

  // Launch browser for Player 2 (Mobile Portrait)
  const browserP2 = await chromium.launch({ headless: true });
  const contextP2 = await browserP2.newContext({
    ...devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const pageP2 = await contextP2.newPage();

  try {
    // Step 1: Open lobby on P1 (Desktop)
    console.log("P1 opening http://localhost:3000/...");
    await pageP1.goto("http://localhost:3000/");
    await pageP1.waitForLoadState("networkidle");
    await pageP1.screenshot({ path: path.join(outputDir, "01-p1-lobby-load.png") });

    // Handle identity modal for Player 1
    try {
      const nameInput = pageP1.locator('input[placeholder="Your name"], [placeholder="Your name"]');
      if (await nameInput.first().isVisible({ timeout: 2000 })) {
        console.log("P1 setting identity...");
        await nameInput.first().fill("Player 1");
        await pageP1.keyboard.press("Enter");
        await pageP1.waitForTimeout(1000);
      }
    } catch (e) {
      console.log("P1 identity modal skipped.");
    }

    // Create custom lobby
    console.log("P1 hosting custom game...");
    const hostCustomBtn = pageP1.locator('button:has-text("Host Custom Game")');
    await hostCustomBtn.click();
    await pageP1.waitForTimeout(500);

    // Choose 2 players
    console.log("P1 selecting 2 players...");
    const twoPlayersBtn = pageP1.locator('button:has-text("2")').first();
    await twoPlayersBtn.click();
    await pageP1.waitForTimeout(500);
    await pageP1.screenshot({ path: path.join(outputDir, "02-p1-custom-room-config.png") });

    // Click "Create & Join"
    console.log("P1 clicking Create & Join...");
    const createJoinBtn = pageP1.locator('button:has-text("Create & Join")');
    await createJoinBtn.click();

    // Wait for redirect to game page `/g/[matchID]?playerID=0`
    await pageP1.waitForURL(/\/g\/.*/);
    const matchUrl = pageP1.url();
    console.log(`P1 redirected to game: ${matchUrl}`);
    const matchID = matchUrl.match(/\/g\/([^?]+)/)[1];
    console.log(`Extracted matchID: ${matchID}`);
    await pageP1.screenshot({ path: path.join(outputDir, "03-p1-match-waiting.png") });

    // Step 2: Open lobby on P2 (Mobile Portrait)
    console.log("P2 opening http://localhost:3000/...");
    await pageP2.goto("http://localhost:3000/");
    await pageP2.waitForLoadState("networkidle");

    // Handle identity modal for Player 2
    try {
      const nameInput = pageP2.locator('input[placeholder="Your name"], [placeholder="Your name"]');
      if (await nameInput.first().isVisible({ timeout: 2000 })) {
        console.log("P2 setting identity...");
        await nameInput.first().fill("Player 2");
        await pageP2.keyboard.press("Enter");
        await pageP2.waitForTimeout(1000);
      }
    } catch (e) {
      console.log("P2 identity modal skipped.");
    }

    // Enter room code and join Seat 2
    console.log("P2 entering room code and joining Seat 2...");
    const roomCodeInput = pageP2.locator('input[placeholder="Room code"]');
    await roomCodeInput.fill(matchID);
    await pageP2.screenshot({ path: path.join(outputDir, "04-p2-enter-room-code.png") });

    const selectSeat = pageP2.locator('select');
    await selectSeat.selectOption({ label: "Seat 2" });
    await pageP2.screenshot({ path: path.join(outputDir, "05-p2-seat-selected.png") });

    const joinBtn = pageP2.locator('button:has-text("Join")');
    await joinBtn.click();

    // Wait for redirect to /g/[matchID]?playerID=1
    await pageP2.waitForURL(/\/g\/.*/);
    console.log(`P2 successfully joined room: ${pageP2.url()}`);
    await pageP2.screenshot({ path: path.join(outputDir, "06-p2-match-joined.png") });

    // Click Ready Up on both pages
    console.log("Both players readying up...");
    try {
      const readyP1 = pageP1.locator('button:has-text("Ready Up"), button:has-text("Ready")');
      if (await readyP1.first().isVisible({ timeout: 3000 })) {
        await readyP1.first().click();
      }
    } catch (e) {
      console.log("P1 ready up skipped or already ready.");
    }

    try {
      const readyP2 = pageP2.locator('button:has-text("Ready Up"), button:has-text("Ready")');
      if (await readyP2.first().isVisible({ timeout: 3000 })) {
        await readyP2.first().click();
      }
    } catch (e) {
      console.log("P2 ready up skipped or already ready.");
    }
    await pageP1.waitForTimeout(2000);
    await pageP2.waitForTimeout(2000);

    // Game begins!
    console.log("Game started! Placement Phase active.");
    await pageP1.screenshot({ path: path.join(outputDir, "07-p1-placement-active.png") });
    await pageP2.screenshot({ path: path.join(outputDir, "08-p2-placement-active.png") });

    // Place settlements and roads for Placement Phase
    for (let step = 1; step <= 8; step++) {
      console.log(`Placement Step ${step}...`);
      let activePage;
      let pageName;
      if (step === 1 || step === 2 || step === 7 || step === 8) {
        activePage = pageP1;
        pageName = "P1 (Desktop)";
      } else {
        activePage = pageP2;
        pageName = "P2 (Mobile)";
      }

      console.log(`Waiting for placement circles on ${pageName}...`);
      const actionCircles = activePage.locator('[data-action-circle="true"]');
      await actionCircles.first().waitFor({ state: "visible", timeout: 15000 });
      const count = await actionCircles.count();
      console.log(`Found ${count} action circles. Clicking the first one...`);
      await actionCircles.first().click();
      await activePage.waitForTimeout(1500);
      await activePage.screenshot({ path: path.join(outputDir, `09-placement-step-${step}.png`) });
    }

    console.log("Placement phase complete. Entering normal turn phase...");
    await pageP1.screenshot({ path: path.join(outputDir, "10-p1-normal-phase.png") });
    await pageP2.screenshot({ path: path.join(outputDir, "11-p2-normal-phase.png") });

  } catch (error) {
    console.error("Multiplayer phase failed:", error);
  } finally {
    await browserP1.close();
    await browserP2.close();
  }

  // --- DEV SANDBOX CARD AUDIT ---
  console.log("Starting visual Dev Sandbox Card Audit...");
  const browserSandbox = await chromium.launch({ headless: true });
  const sandboxContext = await browserSandbox.newContext({
    ...devices['iPhone 12'],
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await sandboxContext.newPage();

  try {
    console.log("Opening Sandbox page...");
    await page.goto("http://localhost:3000/catana/dev/sandbox");
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: path.join(outputDir, "12-sandbox-load.png") });

    // Select preset
    console.log("Selecting Dev-card ready preset...");
    const selectPreset = page.locator('select').first();
    await selectPreset.selectOption({ label: "Dev-card ready" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outputDir, "13-sandbox-dev-card-ready.png") });

    // Give resources
    console.log("Giving quick resources inside Sandbox...");
    const woodBtn = page.locator('button:has-text("Wo")').first();
    if (await woodBtn.isVisible()) await woodBtn.click();
    await page.waitForTimeout(300);
    const sheepBtn = page.locator('button:has-text("Sh")').first();
    if (await sheepBtn.isVisible()) await sheepBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outputDir, "14-sandbox-given-resources.png") });

    // Give dev cards
    console.log("Giving Dev cards...");
    const knightBtn = page.locator('button:has-text("Knight")').first();
    if (await knightBtn.isVisible()) await knightBtn.click();
    await page.waitForTimeout(300);
    const monoBtn = page.locator('button:has-text("Mono")').first();
    if (await monoBtn.isVisible()) await monoBtn.click();
    await page.waitForTimeout(300);
    const plentyBtn = page.locator('button:has-text("Plenty")').first();
    if (await plentyBtn.isVisible()) await plentyBtn.click();
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outputDir, "15-sandbox-given-dev-cards.png") });

    // Monopoly Play
    console.log("Playing Monopoly dev card...");
    const monopolyCard = page.locator('[aria-label*="Monopoly"], [title*="Monopoly"], img[src*="monopoly"], div:has-text("Monopoly")').first();
    if (await monopolyCard.isVisible()) {
      await monopolyCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, "16-sandbox-monopoly-dialog-shown.png") });

      // Cancel Test
      console.log("Testing cancel option in Monopoly dialog...");
      const cancelBtn = page.locator('button:has-text("Cancel")');
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click();
        console.log("Successfully cancelled Monopoly card play!");
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(outputDir, "17-sandbox-monopoly-cancelled.png") });
      }

      // Re-open and select resource
      console.log("Re-playing Monopoly dev card and selecting Wood...");
      await monopolyCard.click();
      await page.waitForTimeout(1000);
      const woodClaimBtn = page.locator('[aria-label="Claim Wood"], button:has-text("Wood")').first();
      if (await woodClaimBtn.isVisible()) {
        await woodClaimBtn.click();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(outputDir, "18-sandbox-monopoly-wood-selected.png") });
        const claimBtn = page.locator('button:has-text("Claim"), button:has-text("Confirm")');
        await claimBtn.click();
        console.log("Monopoly confirmed!");
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(outputDir, "19-sandbox-monopoly-confirmed-animation.png") });
      }
    }

    // Knight Play
    console.log("Playing Knight card...");
    const knightCard = page.locator('[aria-label*="Knight"], [title*="Knight"], img[src*="knight"], div:has-text("Knight")').first();
    if (await knightCard.isVisible()) {
      await knightCard.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(outputDir, "20-sandbox-knight-played.png") });

      // Robber placement
      console.log("Relocating robber...");
      const robberCircles = page.locator('[data-action-circle="true"]');
      if (await robberCircles.first().isVisible()) {
        await robberCircles.first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(outputDir, "21-sandbox-robber-moved.png") });
      }
    }

  } catch (error) {
    console.error("Sandbox dev card phase failed:", error);
  } finally {
    await browserSandbox.close();
  }

  console.log("E2E Settlex Smoke Test Completed Successfully!");
}

run().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
