import React from "react";
import { Button } from "../../../ui/Button";
import { LazyDialog } from "../../../ui/LazyDialog";
import { createEmptyState, ResourceType } from "@settlehex/game-core";
import { expect, fn, userEvent, waitFor, within } from "@storybook/test";
import { TradeDiscardModal } from "./TradeDiscardModal";

const R = ResourceType;

function makeFixture({ resources, bankResources = [], finite = false, specificPort = false }) {
  const core = createEmptyState(["0"]);
  core.playerStateById["0"].resources = resources;
  core.ruleset.bank.finite = finite;
  core.bank.resources = bankResources;
  const coreTopology = { portsByNodeId: specificPort ? { 1: R.WOOD } : {} };
  if (specificPort) core.buildingsByNodeId[1] = { ownerId: "0" };
  return { player: { id: "0", resources }, G: { core, coreTopology } };
}

const tradeFixture = makeFixture({
  resources: [R.WOOD, R.WOOD, R.ORE, R.ORE, R.ORE, R.ORE],
  bankResources: [R.BRICK, R.SHEEP, R.WHEAT],
  finite: true,
  specificPort: true,
});
const discardFixture = makeFixture({
  resources: [R.WOOD, R.WOOD, R.ORE, R.SHEEP, R.WHEAT, R.BRICK, R.BRICK, R.BRICK],
});
const plentyFixture = makeFixture({
  resources: [], bankResources: [R.WOOD, R.BRICK, R.BRICK], finite: true,
});
const monopolyFixture = makeFixture({ resources: [] });

const meta = {
  title: "Composed Surfaces/Gameplay/Trade And Resource Selection",
  component: TradeDiscardModal,
  parameters: { layout: "fullscreen" },
  args: { themeId: "classic", onConfirm: fn(), onCancel: fn() },
  argTypes: { G: { control: false }, player: { control: false } },
};
export default meta;

export const MaritimeTrade = {
  args: { mode: "trade", ...tradeFixture },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    args.onConfirm.mockClear();
    expect(screen.getByRole("button", { name: "Trade" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Increase give Wood" }));
    await waitFor(() => expect(screen.getByText("Give (2:1)")).toBeVisible());
    expect(screen.getByRole("button", { name: "Increase receive Wood" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Increase receive Brick" }));
    await userEvent.click(screen.getByRole("button", { name: "Trade" }));
    expect(args.onConfirm).toHaveBeenCalledWith({ give: [R.WOOD, R.WOOD], receive: [R.BRICK] });
  },
};

export const ForcedDiscard = {
  args: { mode: "discard", requiredDiscardCount: 2, ...discardFixture, onCancel: null },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    args.onConfirm.mockClear();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Increase give Wood" }));
    expect(screen.getByRole("button", { name: "Discard" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Increase give Ore" }));
    await userEvent.click(screen.getByRole("button", { name: "Discard" }));
    expect(args.onConfirm).toHaveBeenCalledWith([R.WOOD, R.ORE]);
  },
};

export const YearOfPlentyShortBank = {
  args: { mode: "dev-yop", ...plentyFixture, onCancel: null },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    args.onConfirm.mockClear();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Increase selection Ore" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Increase selection Wood" }));
    expect(screen.getByRole("button", { name: "Increase selection Wood" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Increase selection Brick" }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(args.onConfirm).toHaveBeenCalledWith([R.WOOD, R.BRICK]);
  },
};

export const Monopoly = {
  args: { mode: "dev-monopoly", ...monopolyFixture, onCancel: null },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    args.onConfirm.mockClear();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("button", { name: "Claim", exact: true })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Claim Sheep" }));
    await userEvent.click(screen.getByRole("button", { name: "Claim", exact: true }));
    expect(args.onConfirm).toHaveBeenCalledWith(R.SHEEP);
  },
};

export const CancelableDiscard = {
  args: { mode: "discard", requiredDiscardCount: 2, ...discardFixture },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement.ownerDocument.body);
    args.onCancel.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(args.onCancel).toHaveBeenCalledOnce();
  },
};

function TradeLifecycleFixture() {
  const [open, setOpen] = React.useState(false);
  return <><Button onClick={() => setOpen(true)}>Open trade</Button>
    <LazyDialog component={TradeDiscardModal} open={open} mode="trade" {...tradeFixture}
      themeId="classic" onConfirm={() => setOpen(false)} onCancel={() => setOpen(false)} />
  </>;
}
export const CloseAndReset = {
  render: () => <TradeLifecycleFixture />,
  play: async ({canvasElement}) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.click(screen.getByRole('button',{name:'Open trade'}));
    await screen.findByRole('dialog');
    await userEvent.click(screen.getByRole('button',{name:'Increase give Wood'}));
    await userEvent.click(screen.getByRole('button',{name:'Increase receive Brick'}));
    expect(screen.getByRole('button',{name:'Trade',exact:true})).toBeEnabled();
    const dialog = screen.getByRole('dialog');
    await userEvent.click(screen.getByRole('button',{name:'Cancel',exact:true}));
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) expect(dialog).toHaveAttribute('data-ending-style');
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button',{name:'Open trade'}));
    await screen.findByRole('dialog');
    expect(screen.getByRole('button',{name:'Trade',exact:true})).toBeDisabled();
    await userEvent.click(screen.getByRole('button',{name:'Cancel',exact:true}));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    canvasElement.dataset.motionContract = 'passed';
  },
};
