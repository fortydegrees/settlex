import { useState } from "react";
import { BellAlertIcon, PlusIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { fn } from "@storybook/test";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { Tooltip, TooltipProvider } from "./Tooltip";
import { HomeGameModeDock } from "../catana/home/HomeTitleChrome";
import { SystemAccountMenu } from "../catana/home/SystemAccountMenu";
import { AccountEntryModal } from "../catana/lobby/AccountEntryModal";

const meta = {
  title: "Components/Actions/Button",
  component: Button,
  args: { children: "Find a table", onClick: fn() },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "accent", "utility", "ghost", "subtle", "danger"],
    },
    size: { control: "select", options: ["sm", "md", "lg", "xl"] },
  },
};

export default meta;

export const Playground = { args: { variant: "primary", size: "md" } };

function ButtonFamilyPreview() {
  const [accountOpen, setAccountOpen] = useState(false);
  return (
    <main className="mx-auto max-w-5xl space-y-ui-6 p-ui-5 text-ink-primary sm:p-ui-8">
      <header>
        <p className="settlex-ui-label">SettleHex · Clarity</p>
        <h1 className="mt-ui-2 type-page">One family, distinct roles</h1>
        <p className="mt-ui-2 type-body-small text-ink-secondary">Production controls, shared material. Shape follows role—not size.</p>
      </header>
      <section className="space-y-ui-4">
        <h2 className="settlex-ui-heading">Floating utilities · pill / circle</h2>
        <div className="flex items-center gap-ui-4">
          <SystemAccountMenu identity={{}} accountStatus="guest" hasIdentity={false} onOpenSignIn={() => setAccountOpen(true)} />
          <IconButton variant="utility" aria-label="Settings example"><Cog6ToothIcon /></IconButton>
          <Button variant="utility" size="sm" disabled>Unavailable</Button>
        </div>
        <p className="settlex-ui-label">Open Sign in to inspect the real account-entry modal.</p>
      </section>
      <section className="settlex-ui-pane space-y-ui-4 p-ui-5">
        <h2 className="settlex-ui-heading">Form and product actions · 14px</h2>
        <div className="flex flex-wrap gap-ui-3">
          <Button size="lg">Sign in</Button>
          <Button variant="accent" size="lg">Play vs Bot</Button>
          <Button variant="secondary" size="lg">Copy invite</Button>
        </div>
        <div className="flex flex-wrap gap-ui-3">
          <Button variant="ghost">Cancel</Button>
          <Button variant="subtle">More options</Button>
          <Button variant="danger">Leave table</Button>
          <Button disabled>Working...</Button>
        </div>
      </section>
      <section className="space-y-ui-4">
        <h2 className="settlex-ui-heading">Play dock · 14px, with 8px icon tiles</h2>
        <p className="settlex-ui-label">The approved layout and stronger depth, using the same shared material palette.</p>
        <div className="relative h-64 md:h-24">
          <HomeGameModeDock isBusy={false} activeActionId={null} onSelectMode={fn()} />
        </div>
      </section>
      <AccountEntryModal open={accountOpen} mode="auth-first" onClose={() => setAccountOpen(false)} onContinueAsGuest={() => setAccountOpen(false)} onEmailSignIn={fn()} onEmailSignUp={fn()} />
    </main>
  );
}

export const ButtonFamily = {
  parameters: { layout: "fullscreen" },
  render: () => <ButtonFamilyPreview />,
};

export const ContentAlignment = {
  render: () => (
    <div className="grid w-72 gap-ui-3">
      <Button><PlusIcon className="h-5 w-5" /><span>Default centered</span></Button>
      <Button variant="secondary" className="justify-start"><PlusIcon className="h-5 w-5" /><span>Start aligned</span></Button>
      <Button variant="secondary" className="justify-end"><PlusIcon className="h-5 w-5" /><span>End aligned</span></Button>
      <Button variant="secondary" className="justify-between"><PlusIcon className="h-5 w-5" /><span>Space between</span></Button>
    </div>
  ),
};

export const ProductionVariants = {
  render: () => (
    <div className="flex flex-wrap gap-ui-3">
      {["primary", "secondary", "accent", "utility", "ghost", "subtle", "danger"].map((variant) => (
        <Button key={variant} variant={variant}>{variant}</Button>
      ))}
    </div>
  ),
};

export const DisabledAndSheen = {
  render: () => (
    <div className="flex flex-wrap gap-ui-3">
      <Button disabled>Pending</Button>
      <Button variant="accent" sheen>Play online</Button>
    </div>
  ),
};

export const IconButtons = {
  render: () => (
    <TooltipProvider>
      <div className="flex gap-ui-3">
        <Tooltip label="Enable match alerts">
          <IconButton aria-label="Enable match alerts"><BellAlertIcon /></IconButton>
        </Tooltip>
        <IconButton aria-label="Add player" variant="secondary"><PlusIcon /></IconButton>
      </div>
    </TooltipProvider>
  ),
};
