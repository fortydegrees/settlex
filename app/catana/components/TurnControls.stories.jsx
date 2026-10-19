import React from "react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { TurnControlCluster } from "./TurnControlCluster";
import { MiniDiceFace } from "./MiniDiceFace";

const meta = {
  title: "Composed Surfaces/Gameplay/Turn Controls",
  args: { onRoll: fn(), onEndTurn: fn() },
  render: args => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-ui-4 p-ui-4">
      <TurnControlCluster
        {...args}
        rollContent={<><MiniDiceFace value={3} aria-hidden="true" /><MiniDiceFace value={5} aria-hidden="true" /></>}
      />
      <output data-testid="control-result">Waiting for control assertions</output>
    </div>
  ),
};
export default meta;

export const Roll = {
  args: { mode: "roll", statusText: "Roll dice" },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onRoll.mockClear();
    args.onEndTurn.mockClear();
    const roll = screen.getByRole("button", { name: "Roll dice" });
    const end = screen.getByRole("button", { name: "End turn unavailable" });
    expect(roll).toBeEnabled();
    expect(end).toBeDisabled();
    await userEvent.click(end);
    expect(args.onEndTurn).not.toHaveBeenCalled();
    await userEvent.click(roll);
    expect(args.onRoll).toHaveBeenCalledOnce();
    roll.focus();
    await userEvent.keyboard("{Enter}");
    expect(args.onRoll).toHaveBeenCalledTimes(2);
    screen.getByTestId("control-result").textContent = "All control assertions passed";
  },
};

export const EndTurn = {
  args: { mode: "endTurn", statusText: "Your turn" },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onRoll.mockClear();
    args.onEndTurn.mockClear();
    const dice = screen.getByRole("button", { name: "Dice result" });
    const end = screen.getByRole("button", { name: "End turn" });
    expect(dice).toBeDisabled();
    expect(end).toBeEnabled();
    await userEvent.click(dice);
    expect(args.onRoll).not.toHaveBeenCalled();
    await userEvent.click(end);
    expect(args.onEndTurn).toHaveBeenCalledOnce();
    end.focus();
    await userEvent.keyboard(" ");
    expect(args.onEndTurn).toHaveBeenCalledTimes(2);
    screen.getByTestId("control-result").textContent = "All control assertions passed";
  },
};

export const Inactive = {
  args: { mode: "inactive", statusText: "Waiting for another player" },
  play: async ({ canvasElement, args }) => {
    const screen = within(canvasElement);
    args.onRoll.mockClear();
    args.onEndTurn.mockClear();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toBeDisabled();
      await userEvent.click(button);
    }
    expect(args.onRoll).not.toHaveBeenCalled();
    expect(args.onEndTurn).not.toHaveBeenCalled();
    screen.getByTestId("control-result").textContent = "All control assertions passed";
  },
};

export const DiceFaces = {
  render: () => (
    <div className="flex min-h-screen flex-wrap items-center justify-center gap-ui-4 p-ui-4">
      {[1, 2, 3, 4, 5, 6].map(value => <MiniDiceFace key={value} value={value} />)}
      <MiniDiceFace value={6} aria-hidden="true" />
      <MiniDiceFace value={0} />
      <output data-testid="control-result">Waiting for control assertions</output>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement);
    expect(screen.getAllByRole("img")).toHaveLength(6);
    for (const value of [1, 2, 3, 4, 5, 6]) {
      expect(screen.getByRole("img", { name: `Die ${value}` }).querySelectorAll("circle")).toHaveLength(value);
    }
    expect(screen.queryByRole("img", { name: "Die 0" })).not.toBeInTheDocument();
    screen.getByTestId("control-result").textContent = "All control assertions passed";
  },
};
