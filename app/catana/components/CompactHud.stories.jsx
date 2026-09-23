import React from "react";
import { buildTopology, createEmptyState, ResourceType } from "@settlex/game-core";
import { expect, fn, userEvent, within } from "@storybook/test";
import { CATANA_TABLE_BACKGROUND } from "../theme/backgrounds";
import { MobilePlayerCockpit } from "./MobilePlayerCockpit";
import { OpponentPlayerBox } from "./OpponentPlayerBox";
import { DockCard } from "./ActionsDock/DockCard";
import { CardIcon } from "./PlayerActionContainer";

const R = ResourceType;
const denseResources = [
  R.WOOD, R.WOOD, R.WOOD, R.WOOD,
  R.BRICK, R.BRICK, R.BRICK,
  R.SHEEP, R.SHEEP,
  R.WHEAT, R.WHEAT, R.WHEAT,
  R.ORE, R.ORE,
];

function gameFixture({ resources = [], devCards = [], boughtCards = [], stage = "postRoll" } = {}) {
  const core = createEmptyState(["0", "1"]);
  core.phase = "normal";
  core.playerStateById["0"].resources = [...resources];
  core.playerStateById["0"].devCards = [...devCards];
  core.playerStateById["0"].devCardsBoughtThisTurn = [...boughtCards];
  const coreTopology = buildTopology([]);
  const player = {
    ...core.playerStateById["0"],
    id: "0", name: "HarbourFox", emoji: "🦊", color: "blue",
  };
  return {
    player,
    bgioProps: {
      G: { core, coreTopology, devCardPlay: null },
      ctx: { currentPlayer: "0", activePlayers: { "0": stage } },
      playerID: "0",
      moves: { buyDevCard: fn(), playDevCardStart: fn(), rollDice: fn(), endTurn: fn() },
    },
  };
}

const meta = {
  title: "Composed Surfaces/Gameplay/Compact HUD",
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "catanaMobile" } },
};
export default meta;

function MobileFixture(args) {
  return (
    <div className="min-h-screen" style={{ background: CATANA_TABLE_BACKGROUND }}>
      <MobilePlayerCockpit
        {...args}
        setPlayerAction={fn()}
        setBuildPickup={fn()}
        onTradeClick={fn()}
        onDevCardPurchaseStart={fn()}
        onMobileMetaPanelOpen={fn()}
        themeId="classic"
        isActive={args.isActive ?? true}
      />
    </div>
  );
}

export const DenseResources = {
  args: { ...gameFixture({ resources: denseResources }), canEnd: true, canRoll: false },
  render: (args) => <MobileFixture {...args} />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    expect(screen.getByRole("button", { name: "Hold to end turn" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Trade Wood" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open game log" })).toBeVisible();
  },
};

export const EmptyHandPreRoll = {
  args: { ...gameFixture({ stage: "preRoll" }), canRoll: true, canEnd: false },
  render: (args) => <MobileFixture {...args} />,
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    args.bgioProps.moves.rollDice.mockClear();
    expect(screen.queryByRole("button", { name: /Development cards:/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Roll dice" }));
    expect(args.bgioProps.moves.rollDice).toHaveBeenCalledOnce();
  },
};

export const PlayableAndSleepingCards = {
  args: {
    ...gameFixture({ devCards: ["knight", "knight", "victoryPoint", "yearOfPlenty"], boughtCards: ["knight"] }),
    canEnd: true,
  },
  render: (args) => <MobileFixture {...args} />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(screen.getByRole("button", { name: "Development cards: 4" }));
    expect(screen.getByRole("dialog", { name: "Development cards" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Knight x2" })).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByRole("button", { name: "Victory Point" })).toHaveAttribute("aria-disabled", "true");
  },
};

export const WaitingReadOnly = {
  args: {
    ...gameFixture({ resources: [R.WOOD, R.BRICK], stage: "postRoll" }),
    canEnd: true, canRoll: false, readOnly: true, isActive: false,
    activePlayerName: "MountainBuilderWithoutSpaces",
    gameStatus: { title: "MountainBuilderWithoutSpaces is choosing a resource" },
  },
  render: (args) => <MobileFixture {...args} />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    expect(screen.queryByRole("button", { name: "Hold to end turn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Trade Wood" })).not.toBeInTheDocument();
  },
};

export const LongOpponentNameAndHiddenResources = {
  parameters: { viewport: { defaultViewport: "catanaDesktop" } },
  render: () => {
    const { player, bgioProps } = gameFixture({ resources: denseResources });
    return (
      <div className="min-h-screen p-ui-12" style={{ background: CATANA_TABLE_BACKGROUND }}>
        <OpponentPlayerBox
          player={{ ...player, id: "1", name: "MountainBuilderWithoutSpaces", resources: denseResources }}
          core={bgioProps.G.core}
          coreTopology={bgioProps.G.coreTopology}
          isActive
          statusType="thinking"
        />
      </div>
    );
  },
};

export const OverLimitOpponentAtRest = {
  parameters: { viewport: { defaultViewport: "catanaDesktop" } },
  render: () => {
    const { player, bgioProps } = gameFixture({ resources: denseResources });
    return (
      <div className="min-h-screen p-ui-12" style={{ background: CATANA_TABLE_BACKGROUND }}>
        <OpponentPlayerBox
          player={{ ...player, id: "1", name: "HarbourFox", resources: denseResources }}
          core={bgioProps.G.core}
          coreTopology={bgioProps.G.coreTopology}
          isActive={false}
        />
      </div>
    );
  },
};

export const NamedDockAction = {
  args: { onAction: fn() },
  render: (args) => (
    <div className="min-h-screen p-ui-12" style={{ background: CATANA_TABLE_BACKGROUND }}>
      <DockCard action={{ name: "road", img: "/svgs/icon_road.svg", count: 3, enabled: true, action: args.onAction }} />
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onAction.mockClear();
    const road = screen.getByRole("button", { name: "Road" });
    road.focus();
    await userEvent.keyboard("{Enter}");
    expect(args.onAction).toHaveBeenCalledOnce();
  },
};

export const DesktopQuickTradeKeyboard = {
  args: { onTrade: fn() },
  render: (args) => (
    <div className="min-h-screen p-ui-12" style={{ background: CATANA_TABLE_BACKGROUND }}>
      <CardIcon resourceCount={4} resource="Wood" player="0" onResourceClick={args.onTrade} themeId="classic" />
      <CardIcon resourceCount={1} resource="Ore" player="0" themeId="classic" />
    </div>
  ),
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onTrade.mockClear();
    const trade = screen.getByRole("button", { name: "Trade Wood" });
    expect(screen.queryByRole("button", { name: "Trade Ore" })).not.toBeInTheDocument();
    trade.focus();
    await userEvent.keyboard("{Enter}");
    expect(args.onTrade).toHaveBeenCalledOnce();
    expect(args.onTrade).toHaveBeenCalledWith("Wood");
  },
};
