import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

// Ensure output directory exists
const outputDir = 'output/playwright/mobile-smoke';
fs.mkdirSync(outputDir, { recursive: true });

async function run() {
  console.log("Starting Mobile Timer View visual audit...");

  // Launch browsers
  const browserP1 = await chromium.launch({ headless: true });
  const contextP1 = await browserP1.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const pageP1 = await contextP1.newPage();

  const browserP2 = await chromium.launch({ headless: true });
  const contextP2 = await browserP2.newContext({
    ...devices['iPhone SE'], // 375x667
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });
  const pageP2 = await contextP2.newPage();

  try {
    // ── 1. PLAY A FRIEND FLOW & VIEWPORT INITIALIZATION ──
    console.log("P1 opening homepage...");
    await pageP1.goto("http://localhost:3000/");
    await pageP1.waitForLoadState("networkidle");

    // Handle Player 1 identity
    try {
      const nameInput = pageP1.locator('input[placeholder="Your name"], [placeholder="Your name"]');
      if (await nameInput.first().isVisible({ timeout: 2000 })) {
        console.log("P1 setting guest identity...");
        await nameInput.first().fill("Player 1 Desktop");
        await pageP1.keyboard.press("Enter");
        await pageP1.waitForTimeout(1000);
      }
    } catch (e) {
      console.log("P1 identity modal not prompt or skipped.");
    }

    // Click "Play a Friend"
    console.log("P1 clicking Play a Friend...");
    const playFriendBtn = pageP1.locator('button:has-text("Play a Friend")');
    await playFriendBtn.click();
    await pageP1.waitForTimeout(2000);

    // If P1 didn't have identity yet, the click opens Identity Modal.
    try {
      const nameInput = pageP1.locator('input[placeholder="Your name"], [placeholder="Your name"]');
      if (await nameInput.first().isVisible({ timeout: 2000 })) {
        console.log("P1 setting guest identity after clicking Play a Friend...");
        await nameInput.first().fill("Player 1 Desktop");
        // Click the submit button inside the modal or press Enter
        const confirmBtn = pageP1.locator('button:has-text("Confirm"), button:has-text("Save"), button[type="submit"]');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        } else {
          await pageP1.keyboard.press("Enter");
        }
        await pageP1.waitForTimeout(2000);
      }
    } catch (e) {
      console.log("P1 identity after Play a Friend click handled.");
    }

    // Now wait for Friend Challenge Modal
    console.log("Waiting for Friend Challenge Modal...");
    const challengeModal = pageP1.locator('div:has-text("Waiting for friend to join")').first();
    await challengeModal.waitFor({ state: "visible", timeout: 10000 });

    // Take screenshot of the modal to '02-friend-challenge-modal.png'
    await pageP1.screenshot({ path: path.join(outputDir, "02-friend-challenge-modal.png") });
    console.log("Screenshot 02-friend-challenge-modal.png saved.");

    // Extract challenge URL
    const inviteInput = pageP1.locator('input[readonly]');
    await inviteInput.waitFor({ state: "visible", timeout: 5000 });
    const inviteUrl = await inviteInput.inputValue();
    console.log(`Extracted invite URL: ${inviteUrl}`);

    // Open invite link on P2 (iPhone SE: 375x667)
    console.log(`P2 opening invite URL on emulated iPhone SE...`);
    await pageP2.goto(inviteUrl);
    await pageP2.waitForLoadState("networkidle");
    await pageP2.waitForTimeout(1000);

    // Set guest identity to "Player 2 Mobile"
    console.log("P2 setting guest identity...");
    const nameInputP2 = pageP2.locator('input[placeholder="Your name"], [placeholder="Your name"]');
    await nameInputP2.first().fill("Player 2 Mobile");
    const confirmBtnP2 = pageP2.locator('button:has-text("Confirm"), button:has-text("Save"), button[type="submit"]');
    if (await confirmBtnP2.isVisible()) {
      await confirmBtnP2.click();
    } else {
      await pageP2.keyboard.press("Enter");
    }
    await pageP2.waitForTimeout(2000);

    // Wait for redirect to game page
    await pageP1.waitForURL(/\/g\/.*/, { timeout: 10000 });
    await pageP2.waitForURL(/\/g\/.*/, { timeout: 10000 });
    console.log("Both players redirected to the game page!");

    // Ready Up on both pages
    console.log("Both players readying up...");
    const readyP1 = pageP1.locator('button:has-text("Ready Up"), button:has-text("Ready")');
    if (await readyP1.first().isVisible({ timeout: 5000 })) {
      await readyP1.first().click();
    }
    const readyP2 = pageP2.locator('button:has-text("Ready Up"), button:has-text("Ready")');
    if (await readyP2.first().isVisible({ timeout: 5000 })) {
      await readyP2.first().click();
    }

    await pageP1.waitForTimeout(3000);
    await pageP2.waitForTimeout(3000);

    // Take screenshots of both windows once game starts
    await pageP1.screenshot({ path: path.join(outputDir, "p1-started.png") });
    await pageP2.screenshot({ path: path.join(outputDir, "p2-started.png") });
    console.log("Match started! Saved p1-started.png & p2-started.png.");


    // ── 2. PLAY THE PLACEMENT SNAKE-DRAFT PHASE & AUDIT MOBILE LAYOUT ──
    for (let step = 1; step <= 8; step++) {
      console.log(`Placement Step ${step}...`);
      let activePage = (step === 1 || step === 2 || step === 7 || step === 8) ? pageP1 : pageP2;
      let pageName = (step === 1 || step === 2 || step === 7 || step === 8) ? "P1 (Desktop)" : "P2 (Mobile)";

      console.log(`Waiting for placement action circles on ${pageName}...`);
      const actionCircles = activePage.locator('[data-action-circle="true"]');
      await actionCircles.first().waitFor({ state: "visible", timeout: 20000 });

      // Auditing mobile layout during Step 3 (Player 2's first placement)
      if (step === 3) {
        console.log("Auditing Player 2 Mobile placement layout...");
        // 1. Emulate iPhone SE (375x667)
        await pageP2.setViewportSize({ width: 375, height: 667 });
        await pageP2.waitForTimeout(1000);
        await pageP2.screenshot({ path: path.join(outputDir, "iphone-se-settlement-placement.png") });
        console.log("Saved iphone-se-settlement-placement.png.");

        // 2. Emulate iPhone XR/12 (390x844)
        await pageP2.setViewportSize({ width: 390, height: 844 });
        await pageP2.waitForTimeout(1000);
        await pageP2.screenshot({ path: path.join(outputDir, "iphone-xr-settlement-placement.png") });
        console.log("Saved iphone-xr-settlement-placement.png.");

        // Reset to SE for consistency, or keep it
        await pageP2.setViewportSize({ width: 375, height: 667 });
        await pageP2.waitForTimeout(1000);
      }

      console.log(`Clicking placement circle on ${pageName}...`);
      await actionCircles.first().click();
      await activePage.waitForTimeout(2000);
    }

    console.log("Placement snake-draft phase complete!");


    // ── 3. NORMAL TURN FLOW & MOBILE TIMER AUDIT ──
    console.log("Entering normal turn phase...");
    await pageP1.waitForTimeout(2000);
    await pageP2.waitForTimeout(2000);

    // P1 (Desktop) is player 1, P2 (Mobile) is player 2.
    // P1 goes first, so P2 is in Opponent Waiting State!
    console.log("Auditing Opponent Waiting State for Player 2 Mobile...");
    // 1. iPhone SE
    await pageP2.setViewportSize({ width: 375, height: 667 });
    await pageP2.waitForTimeout(1000);
    await pageP2.screenshot({ path: path.join(outputDir, "iphone-se-opponent-waiting.png") });
    console.log("Saved iphone-se-opponent-waiting.png.");

    // 2. iPhone XR
    await pageP2.setViewportSize({ width: 390, height: 844 });
    await pageP2.waitForTimeout(1000);
    await pageP2.screenshot({ path: path.join(outputDir, "iphone-xr-opponent-waiting.png") });
    console.log("Saved iphone-xr-opponent-waiting.png.");

    // Reset to SE
    await pageP2.setViewportSize({ width: 375, height: 667 });
    await pageP2.waitForTimeout(1000);

    // Make P1 (Desktop) roll dice and end turn
    console.log("P1 rolling dice...");
    const rollBtnP1 = pageP1.locator('button[aria-label="Roll dice"]');
    await rollBtnP1.waitFor({ state: "visible", timeout: 10000 });
    await rollBtnP1.click();
    await pageP1.waitForTimeout(3000);

    console.log("P1 ending turn...");
    const endTurnBtnP1 = pageP1.locator('button[aria-label="End turn"]');
    await endTurnBtnP1.waitFor({ state: "visible", timeout: 10000 });
    await endTurnBtnP1.click();
    await pageP1.waitForTimeout(2000);

    // Now it's P2's turn: Pre-roll State!
    console.log("Auditing Pre-roll State for Player 2 Mobile...");
    // 1. iPhone SE
    await pageP2.setViewportSize({ width: 375, height: 667 });
    await pageP2.waitForTimeout(1000);
    await pageP2.screenshot({ path: path.join(outputDir, "iphone-se-pre-roll.png") });
    console.log("Saved iphone-se-pre-roll.png.");

    // 2. iPhone XR
    await pageP2.setViewportSize({ width: 390, height: 844 });
    await pageP2.waitForTimeout(1000);
    await pageP2.screenshot({ path: path.join(outputDir, "iphone-xr-pre-roll.png") });
    console.log("Saved iphone-xr-pre-roll.png.");

    // Reset to SE
    await pageP2.setViewportSize({ width: 375, height: 667 });
    await pageP2.waitForTimeout(1000);

    // Make P2 (Mobile) roll dice
    console.log("P2 rolling dice...");
    const rollBtnP2 = pageP2.locator('[data-mobile-primary-turn-button="roll"]');
    await rollBtnP2.waitFor({ state: "visible", timeout: 10000 });
    await rollBtnP2.click();
    await pageP2.waitForTimeout(3000);

    // Now it's P2's turn: Post-roll State (can end turn)!
    console.log("Auditing Post-roll State for Player 2 Mobile...");
    // 1. iPhone SE
    await pageP2.setViewportSize({ width: 375, height: 667 });
    await pageP2.waitForTimeout(1000);
    await pageP2.screenshot({ path: path.join(outputDir, "iphone-se-post-roll.png") });
    console.log("Saved iphone-se-post-roll.png.");

    // 2. iPhone XR
    await pageP2.setViewportSize({ width: 390, height: 844 });
    await pageP2.waitForTimeout(1000);
    await pageP2.screenshot({ path: path.join(outputDir, "iphone-xr-post-roll.png") });
    console.log("Saved iphone-xr-post-roll.png.");

    // Reset to SE
    await pageP2.setViewportSize({ width: 375, height: 667 });
    await pageP2.waitForTimeout(1000);

    // ── Drawer Overlays ──
    // Open Log Drawer on P2 Mobile (SE Viewport)
    console.log("Opening Log Drawer on P2 Mobile SE...");
    const logTrigger = pageP2.locator('[aria-label="Open game log"]');
    await logTrigger.click();
    await pageP2.waitForTimeout(1500);
    await pageP2.screenshot({ path: path.join(outputDir, "iphone-se-log-open.png") });
    console.log("Saved iphone-se-log-open.png.");

    // Close Log / Open Chat Drawer on P2 Mobile (SE Viewport)
    console.log("Opening Chat Drawer on P2 Mobile SE...");
    const chatTrigger = pageP2.locator('[aria-label="Open chat"]');
    await chatTrigger.click();
    await pageP2.waitForTimeout(1500);
    await pageP2.screenshot({ path: path.join(outputDir, "iphone-se-chat-open.png") });
    console.log("Saved iphone-se-chat-open.png.");

    // Close Chat drawer (click chat trigger again to close, or click body)
    await chatTrigger.click();
    await pageP2.waitForTimeout(1000);

    // End P2's turn using the hold-to-confirm interaction
    console.log("P2 ending turn (holding)...");
    const endBtnP2 = pageP2.locator('[data-mobile-primary-turn-button="endTurn"]');
    const box = await endBtnP2.boundingBox();
    await pageP2.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await pageP2.mouse.down();
    await pageP2.waitForTimeout(1200); // 1.2s hold
    await pageP2.mouse.up();
    await pageP2.waitForTimeout(2000);
    console.log("P2 turn ended!");

  } catch (error) {
    console.error("Multiplayer phase failed:", error);
  } finally {
    await browserP1.close();
    await browserP2.close();
  }

  // ── 4. ROBBER MOVE STATE VIA DEV SANDBOX ──
  console.log("Auditing Robber Move State via Dev Sandbox...");
  const browserSandbox = await chromium.launch({ headless: true });
  const sandboxContext = await browserSandbox.newContext({
    ...devices['iPhone SE'],
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });
  const pageSandbox = await sandboxContext.newPage();

  try {
    console.log("P2 opening Dev Sandbox...");
    await pageSandbox.goto("http://localhost:3000/catana/dev/sandbox?viewportWall=1");
    await pageSandbox.waitForLoadState("networkidle");

    // Select preset: Robber move
    console.log("Selecting Robber move preset...");
    const selectPreset = pageSandbox.locator('select').first();
    await selectPreset.selectOption({ label: "Robber move" });
    await pageSandbox.waitForTimeout(2000);

    // Capture Robber Move state on iPhone SE
    await pageSandbox.setViewportSize({ width: 375, height: 667 });
    await pageSandbox.waitForTimeout(1000);
    await pageSandbox.screenshot({ path: path.join(outputDir, "iphone-se-robber-move.png") });
    console.log("Saved iphone-se-robber-move.png.");

    // Capture Robber Move state on iPhone XR
    await pageSandbox.setViewportSize({ width: 390, height: 844 });
    await pageSandbox.waitForTimeout(1000);
    await pageSandbox.screenshot({ path: path.join(outputDir, "iphone-xr-robber-move.png") });
    console.log("Saved iphone-xr-robber-move.png.");

  } catch (error) {
    console.error("Sandbox audit phase failed:", error);
  } finally {
    await browserSandbox.close();
  }

  console.log("Visual audit visual smoke test complete!");
}

run().catch((err) => {
  console.error("Audit failed:", err);
  process.exit(1);
});
