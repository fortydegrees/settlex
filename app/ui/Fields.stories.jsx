import React from "react";
import { Input } from "./Input";
import { Select } from "./Select";
import { SwatchPicker } from "./SwatchPicker";
import { Button } from "./Button";
import {
  DEFAULT_PLAYER_COLOR_ID,
  PLAYER_COLOR_PICKER_OPTIONS,
} from "../catana/theme/playerColors";

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
    <div className="grid max-w-xl gap-3 sm:grid-cols-2">
      <Input aria-label="Empty player name" placeholder="Player name" />
      <Input aria-label="Populated player name" defaultValue="Puffer fan" />
    </div>
  ),
};

export const DisabledFields = {
  render: () => (
    <div className="grid max-w-xl gap-3 sm:grid-cols-2">
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
        <option value="bot-game">Play Puffer</option>
      </Select>
    </div>
  ),
};

export const PlayerColour = {
  render: () => <PlayerColourPicker />,
};

export const ClarityControls = {
  render: () => (
    <div className="settlex-ui-pane mx-auto max-w-md space-y-4 p-6">
      <h1 className="settlex-ui-heading">Choose your identity</h1>
      <label className="block space-y-2">
        <span className="settlex-ui-label">Player name</span>
        <Input placeholder="Tab here to inspect focus" />
      </label>
      <label className="block space-y-2">
        <span className="settlex-ui-label">Email address</span>
        <Input type="email" defaultValue="player@" aria-invalid="true" aria-describedby="clarity-error" />
      </label>
      <p id="clarity-error" className="text-sm text-rose-700">Enter a complete email address.</p>
      <Select aria-label="Match type" defaultValue="duel">
        <option value="duel">Public duel</option>
        <option value="friend">Friend challenge</option>
      </Select>
      <Input aria-label="Disabled name" defaultValue="Waiting for a seat" disabled />
      <Button className="w-full" variant="secondary">
        <span aria-hidden="true">✦</span>Continue with provider
      </Button>
      <div className="flex flex-wrap gap-3">
        <Button>Save identity</Button>
        <Button disabled sheen>Saving…</Button>
      </div>
    </div>
  ),
};
