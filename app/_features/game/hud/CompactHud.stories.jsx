import React from "react";
import { Button } from "../../../ui/Button";
import { buildTopology, createEmptyState, ResourceType } from "@settlehex/game-core";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { SETTLEHEX_TABLE_BACKGROUND } from "../../theme/backgrounds";
import { MobileMetaDrawer } from "../feed/MobileMetaDrawer";
import { GameLogPanel } from "../feed/GameLogPanel";
import { ChatPanel } from "../feed/ChatPanel";
import { MobilePlayerCockpit } from "./MobilePlayerCockpit";
import { OpponentPlayerBox } from "./OpponentPlayerBox";
import { DockCard } from "./ActionsDock/DockCard";
import { CardIcon } from "../cards/CardIcon";
import useWindowSize from "../../../../lib/client/useWindowSize";

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
  parameters: { layout: "fullscreen", viewport: { defaultViewport: "settlehexMobile" } },
};
export default meta;

function MobileFixture(args) {
  return (
    <div className="min-h-screen" style={{ background: SETTLEHEX_TABLE_BACKGROUND }}>
      <MobilePlayerCockpit
        {...args}
        setPlayerAction={fn()}
        setBuildPickup={fn()}
        onTradeClick={fn()}
        onDevCardPurchaseStart={fn()}
        onMobileMetaPanelOpen={args.onMobileMetaPanelOpen ?? fn()}
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
    canvasElement.dataset.hudAssertions = "running";
    expect(await screen.findByRole("button", { name: "Hold to end turn" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Trade Wood" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Open game log" })).toBeVisible();
    canvasElement.dataset.hudAssertions = "passed";
  },
};

export const EmptyHandPreRoll = {
  args: { ...gameFixture({ stage: "preRoll" }), canRoll: true, canEnd: false },
  render: (args) => <MobileFixture {...args} />,
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    canvasElement.dataset.hudAssertions = "running";
    args.bgioProps.moves.rollDice.mockClear();
    const roll = await screen.findByRole("button", { name: "Roll dice" });
    expect(screen.queryByRole("button", { name: /Development cards:/ })).not.toBeInTheDocument();
    await userEvent.click(roll);
    expect(args.bgioProps.moves.rollDice).toHaveBeenCalledOnce();
    canvasElement.dataset.hudAssertions = "passed";
  },
};

export const PlayableAndSleepingCards = {
  args: {
    ...gameFixture({ devCards: ["knight", "knight", "victoryPoint", "yearOfPlenty"], boughtCards: ["knight"] }),
    canEnd: true,
  },
  render: (args) => <MobileFixture {...args} />,
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(screen.getByRole("button", { name: "Development cards: 4" }));
    expect(screen.getByRole("dialog", { name: "Development cards" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Knight x2" })).toHaveAttribute("aria-disabled", "false");
    expect(screen.getByRole("button", { name: "Victory Point" })).toHaveAttribute("aria-disabled", "true");
    args.bgioProps.moves.playDevCardStart.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Knight x2" }));
    expect(args.bgioProps.moves.playDevCardStart).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog", { name: "Development cards" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Development cards: 4" })).toHaveFocus();
    canvasElement.dataset.motionContract = 'passed';
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
    canvasElement.dataset.hudAssertions = "running";
    await screen.findByRole("button", { name: "Open game log" });
    expect(screen.queryByRole("button", { name: "Hold to end turn" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Trade Wood" })).not.toBeInTheDocument();
    canvasElement.dataset.hudAssertions = "passed";
  },
};

export const LongOpponentNameAndHiddenResources = {
  parameters: { viewport: { defaultViewport: "settlehexDesktop" } },
  render: () => {
    const { player, bgioProps } = gameFixture({ resources: denseResources });
    return (
      <div className="min-h-screen p-ui-12" style={{ background: SETTLEHEX_TABLE_BACKGROUND }}>
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
  parameters: { viewport: { defaultViewport: "settlehexDesktop" } },
  render: () => {
    const { player, bgioProps } = gameFixture({ resources: denseResources });
    return (
      <div className="min-h-screen p-ui-12" style={{ background: SETTLEHEX_TABLE_BACKGROUND }}>
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
    <div className="min-h-screen p-ui-12" style={{ background: SETTLEHEX_TABLE_BACKGROUND }}>
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
    <div className="min-h-screen p-ui-12" style={{ background: SETTLEHEX_TABLE_BACKGROUND }}>
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

function SharedFeedFixture() {
  const [activePanel, setActivePanel] = React.useState(null);
  const fixture = gameFixture({ resources: [R.WOOD, R.BRICK] });
  const players = { "0": fixture.player };
  const panels = [
    {id:"log",label:"Game Log",renderMobile:() => <GameLogPanel entries={[{id:"roll",type:"roll",actorId:"0",data:{dice:[3,4]}}]} playerMap={players} themeId="classic" rootClassName="h-full" headerClassName="sr-only" />},
    {id:"chat",label:"Chat",renderMobile:() => <ChatPanel playerID={null} playerMap={players} chatMessages={[]} themeId="classic" rootClassName="h-full" headerClassName="sr-only" />},
  ];
  return <>
    <MobileFixture {...fixture} canEnd activeMobileMetaPanel={activePanel}
      onMobileMetaPanelOpen={setActivePanel} />
    <MobileMetaDrawer panels={panels} activePanel={activePanel} onActivePanelChange={setActivePanel} />
  </>;
}
export const SharedFeedControls = {
  render: () => <SharedFeedFixture />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    const user = userEvent.setup();
    const log = screen.getByRole("button", {name:"Open game log"});
    const chat = screen.getByRole("button", {name:"Open chat"});
    await user.click(log);
    await expect(log).toHaveAttribute("aria-pressed", "true");
    const chatTab = await screen.findByRole("tab", {name:"Chat",exact:true});
    await user.click(chatTab);
    await expect(chat).toHaveAttribute("aria-pressed", "true");
    await expect(log).toHaveAttribute("aria-pressed", "false");
    await user.keyboard("{Escape}");
    await expect(chat).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => expect(screen.queryByRole("tab", {name:"Chat",exact:true})).not.toBeInTheDocument());
    await expect(screen.getByRole("button", {name:"Hold to end turn"})).toBeVisible();
    log.focus();
    await user.keyboard(" ");
    await expect(log).toHaveAttribute("aria-pressed", "true");
    canvasElement.dataset.motionContract = "passed";
  },
};

function InventoryRemovalFixture() {
  const [cards, setCards] = React.useState(['knight']);
  return <>
    <div className="p-ui-4"><Button onClick={() => setCards([])}>Remove last card</Button><Button onClick={() => setCards(['knight'])}>Restore card</Button></div>
    <MobileFixture {...gameFixture({ devCards: cards })} showTurnControls readOnly />
  </>;
}
export const LastCardRemoval = {
  render: () => <InventoryRemovalFixture />,
  play: async ({canvasElement}) => {
    delete canvasElement.dataset.motionContract;
    const screen = within(canvasElement);
    await userEvent.click(screen.getByRole('button',{name:'Development cards: 1'}));
    await screen.findByRole('dialog',{name:'Development cards'});
    await new Promise(resolve => setTimeout(resolve,350));
    const cockpit = canvasElement.querySelector('[data-mobile-player-cockpit]');
    const before = cockpit.getBoundingClientRect().height;
    await userEvent.click(screen.getByRole('button',{name:'Remove last card'}));
    expect(screen.queryByRole('dialog',{name:'Development cards'})).not.toBeInTheDocument();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) expect(cockpit.getBoundingClientRect().height).toBeGreaterThan(before - 20);
    await waitFor(() => expect(cockpit.getBoundingClientRect().height).toBeLessThan(before - 30));
    canvasElement.dataset.motionContract = 'passed';
  },
};


// Exercise the production owner at the actual space available in each HUD,
// including double-digit counts and unavailable recorded card identities.
function RevealedOpponentResourceFixtures() {
  const { width: viewportWidth } = useWindowSize();
  return (
    <div className="flex flex-col items-start gap-ui-12 py-ui-8">
      {[343, 358, 448, 704].map((width) => (
        <div key={width} style={{ width, maxWidth: "100%" }} data-resource-fixture>
          <OpponentPlayerBox
            player={{ id: `opponent-${width}`, name: "AssassinsN", emoji: "🤠", color: "red",
              resources: [...Array(12).fill(R.WOOD), ...denseResources, "unknown"],
              devCards: ["knight", "yearOfPlenty", "monopoly", "roadBuilding", "unknown"] }}
            revealHand themeId="classic" compact={width < 600 || viewportWidth < 1024}
          />
        </div>
      ))}
    </div>
  );
}

export const RevealedOpponentResources = {
  render: () => <RevealedOpponentResourceFixtures />,
  play: async ({ canvasElement }) => {
    for (const fixture of canvasElement.querySelectorAll('[data-resource-fixture]')) {
      const hand = within(fixture).getByLabelText('AssassinsN hand');
      const rail = within(hand).getByLabelText('Resource cards');
      const counters = Array.from(rail.children);
      expect(counters).toHaveLength(5);
      expect(within(rail).getByLabelText('16 Wood')).toBeInTheDocument();
      expect(within(hand).queryByRole('button', {name: /Trade/})).not.toBeInTheDocument();
      const bounds = fixture.getBoundingClientRect();
      for (const counter of counters) {
        expect(counter.getBoundingClientRect().left).toBeGreaterThanOrEqual(bounds.left);
        expect(counter.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right);
      }
      expect(within(hand).getByLabelText('Additional hand cards')).toHaveAttribute('tabindex', '0');
    }
    canvasElement.dataset.resourceLayout = 'passed';
  },
};
