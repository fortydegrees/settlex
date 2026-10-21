import { useState } from "react";
import { fn, userEvent, within } from "@storybook/test";
import { EmojiPicker, IdentityModal } from "./IdentityModal";

const meta = {
  title: "Product Patterns/Account & Identity/Identity",
  component: IdentityModal,
  parameters: { layout: "fullscreen" },
};

export default meta;

export const SuggestedIdentity = {
  args: { onSubmit: fn(), onClose: fn() },
};

export const ExistingIdentity = {
  args: {
    initialName: "BoldTraderYM",
    initialEmoji: "😉",
    initialColor: "teal",
    onSubmit: fn(),
    onClose: fn(),
  },
};

export const EmptyName = {
  args: { ...ExistingIdentity.args },
  play: async ({ canvasElement }) => {
    const screen = within(canvasElement.ownerDocument.body);
    await userEvent.clear(await screen.findByLabelText("Player name"));
  },
};

export const LongUsername = {
  args: { ...ExistingIdentity.args, initialName: "TheLongestHarbourTraderName28" },
};

export const EmojiBrowser = {
  render: function Render() {
    const [value, setValue] = useState("😉");
    return <EmojiPicker value={value} onChange={setValue} colorGradient="from-teal-300 to-teal-600" />;
  },
};

export const Mobile = {
  ...ExistingIdentity,
  parameters: { viewport: { defaultViewport: "catanaMobile" } },
};
