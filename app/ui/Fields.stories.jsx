import React from "react";
import { expect, fn, userEvent, within } from "@storybook/test";
import { Input } from "./Input";
import { Select } from "./Select";
import { SwatchPicker } from "./SwatchPicker";
import { Button } from "./Button";
import {
  DEFAULT_PLAYER_COLOR_ID,
  PLAYER_COLOR_PICKER_OPTIONS,
} from "../_features/theme/playerColors";

function PlayerColourPicker() {
  const [color, setColor] = React.useState(DEFAULT_PLAYER_COLOR_ID);

  return (
    <SwatchPicker
      options={PLAYER_COLOR_PICKER_OPTIONS}
      value={color}
      onChange={setColor}
    />
  );
}

const meta = {
  title: "Components/Fields and selectors",
  component: Input,
  args: { placeholder: "Player name" },
};

export default meta;

export const TextInput = {
  render: () => (
    <div className="grid max-w-xl gap-ui-3 sm:grid-cols-2">
      <Input aria-label="Empty player name" placeholder="Player name" />
      <Input aria-label="Populated player name" defaultValue="Bot fan" />
    </div>
  ),
};

export const DisabledFields = {
  render: () => (
    <div className="grid max-w-xl gap-ui-3 sm:grid-cols-2">
      <Input aria-label="Disabled player name" defaultValue="Waiting for a seat" disabled />
      <Select aria-label="Disabled match type" defaultValue="duel" disabled>
        <option value="duel">Public duel</option>
      </Select>
    </div>
  ),
};

export const SelectField = {
  render: () => (
    <div className="max-w-sm">
      <Select aria-label="Match type" defaultValue="public-duel">
        <option value="public-duel">Public duel</option>
        <option value="friend-challenge">Friend challenge</option>
        <option value="bot-game">Play vs Bot</option>
      </Select>
    </div>
  ),
};

export const PlayerColour = {
  render: () => <PlayerColourPicker />,
};

export const ClarityControls = {
  render: () => (
    <div className="settlehex-ui-pane mx-auto max-w-md space-y-ui-4 p-ui-6">
      <h1 className="settlehex-ui-heading">Choose your identity</h1>
      <label className="block space-y-ui-2">
        <span className="settlehex-ui-label">Player name</span>
        <Input placeholder="Tab here to inspect focus" />
      </label>
      <label className="block space-y-ui-2">
        <span className="settlehex-ui-label">Email address</span>
        <Input type="email" defaultValue="player@" aria-invalid="true" aria-describedby="clarity-error" />
      </label>
      <p id="clarity-error" className="type-body-small text-ink-danger">Enter a complete email address.</p>
      <Select aria-label="Match type" defaultValue="duel">
        <option value="duel">Public duel</option>
        <option value="friend">Friend challenge</option>
      </Select>
      <Input aria-label="Disabled name" defaultValue="Waiting for a seat" disabled />
      <Button className="w-full" variant="secondary">
        <span aria-hidden="true">✦</span>Continue with provider
      </Button>
      <div className="flex flex-wrap gap-ui-3">
        <Button>Save identity</Button>
        <Button disabled sheen>Saving…</Button>
      </div>
    </div>
  ),
};

const chooseSwatch = fn();
function SwatchContractFixture() {
  const [value, setValue] = React.useState("blue");
  return <><SwatchPicker value={value} onChange={(next) => { chooseSwatch(next); setValue(next); }}
    options={[{ id: "blue", swatch: "bg-blue-500" }, { id: "red", swatch: "bg-red-500" }, { id: "green", swatch: "bg-green-500", disabled: true }]} />
    <SwatchPicker disabled value="purple" onChange={chooseSwatch} options={[{id:"purple",swatch:"bg-purple-500"}]} />
  </>;
}
export const SharedSwatchInteraction = {
  render: () => <SwatchContractFixture />,
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement);
    const user = userEvent.setup();
    chooseSwatch.mockClear();
    const disabled = screen.getByRole("button", { name: "Choose green player color" });
    await expect(disabled).toBeDisabled();
    const disabledGroup = screen.getByRole("button", {name:"Choose purple player color"});
    await expect(disabledGroup).toBeDisabled();
    await user.click(disabledGroup);
    await user.click(disabled);
    await expect(chooseSwatch).not.toHaveBeenCalled();
    const red = screen.getByRole("button", { name: "Choose red player color" });
    red.focus();
    await user.keyboard(" ");
    await expect(red).toHaveAttribute("aria-pressed", "true");
    await expect(chooseSwatch).toHaveBeenCalledTimes(1);
    const blue = screen.getByRole("button", { name: "Choose blue player color" });
    blue.focus();
    await user.keyboard("{Enter}");
    await expect(blue).toHaveAttribute("aria-pressed", "true");
    await expect(red).toHaveAttribute("aria-pressed", "false");
    await expect(chooseSwatch).toHaveBeenCalledTimes(2);
    canvasElement.dataset.motionContract = "passed";
  },
};
