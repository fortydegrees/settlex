export const DEBUG_takeCardsFromBank = {
  move: (context, playerID, cards) => {
    const { G } = context;
    const bank = G.core?.bank?.resources ?? [];
    const playerState = G.core?.playerStateById?.[playerID];
    if (!playerState) {
      return;
    }
    const playerHand = playerState.resources;
    const cardLog = [];
    for (const card of cards) {
      const cardIndex = bank.indexOf(card);

      if (cardIndex !== -1) {
        bank.splice(cardIndex, 1);
        playerHand.push(card);
        cardLog.push(card);
      }
    }
    context.log.setMetadata({
      message: `player ${playerID} received ${cardLog}`,
    });
  }
};

export const DEBUG_takeDevCards = {
  move: (context, playerID, cards) => {
    const { G, log } = context;
    const devDeck = G.core?.devDeck ?? [];
    const playerState = G.core?.playerStateById?.[playerID];
    if (!playerState) {
      return;
    }

    const grantedCards = [];
    for (const card of cards ?? []) {
      const cardIndex = devDeck.indexOf(card);
      if (cardIndex === -1) {
        continue;
      }

      devDeck.splice(cardIndex, 1);
      playerState.devCards.push(card);
      grantedCards.push(card);
    }

    log?.setMetadata?.({
      message: `player ${playerID} received dev cards ${grantedCards.join(",")}`,
    });
  }
};

export const DEBUG_captureScenarioState = {
  client: false,
  move: (context) => {
    const snapshot = JSON.parse(JSON.stringify(context.G ?? {}));
    delete snapshot.debugScenarioState;
    context.G.debugScenarioState = snapshot;
  }
};

export const DEBUG_clearCapturedScenarioState = {
  client: false,
  move: (context) => {
    context.G.debugScenarioState = null;
  }
};

export const DEBUG_loadState = {
  move: (context, newState) => {
    if (newState && newState.G) {
      return newState.G;
    }
  }
};

export const DEBUG_setScenario = {
  move: (context, scenarioId) => {
    console.log("DEBUG_setScenario execution started", scenarioId);
    const { G, playerID } = context;
    if (!G.core || !G.core.playerStateById[playerID]) {
      console.error("DEBUG_setScenario: Missing core or playerState", playerID);
      return;
    }

    const player = G.core.playerStateById[playerID];

    switch (scenarioId) {
      case "rich":
        player.resources = [
          "Wood",
          "Wood",
          "Wood",
          "Wood",
          "Brick",
          "Brick",
          "Brick",
          "Brick",
          "Sheep",
          "Sheep",
          "Sheep",
          "Sheep",
          "Wheat",
          "Wheat",
          "Wheat",
          "Wheat",
          "Ore",
          "Ore",
          "Ore",
          "Ore"
        ];
        break;
      case "devCardReady":
        player.resources = [
          "Sheep",
          "Wheat",
          "Ore",
          "Sheep",
          "Wheat",
          "Ore",
          "Sheep",
          "Wheat",
          "Ore"
        ];
        break;
      case "midGame":
        player.resources = [];
        ["Wood", "Brick", "Sheep", "Wheat", "Ore"].forEach((resource) => {
          for (let i = 0; i < 5; i++) player.resources.push(resource);
        });
        break;
      default:
        console.log("Unknown scenario", scenarioId);
    }
  }
};

export const DEBUG_MOVES = {
  DEBUG_takeCardsFromBank,
  DEBUG_takeDevCards,
  DEBUG_captureScenarioState,
  DEBUG_clearCapturedScenarioState,
  DEBUG_loadState,
  DEBUG_setScenario
};
