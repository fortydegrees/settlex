"use client";

import Link from "next/link";
import React, { useState } from "react";
import { AlertDialog } from "../../../ui/AlertDialog";
import { Banner } from "../../../ui/Banner";
import { Button } from "../../../ui/Button";
import { Dialog } from "../../../ui/Dialog";
import { IconButton } from "../../../ui/IconButton";
import { Input } from "../../../ui/Input";
import { MetaDisclosure } from "../../../ui/MetaDisclosure";
import { Panel } from "../../../ui/Panel";
import { Select } from "../../../ui/Select";
import { Tooltip, TooltipProvider } from "../../../ui/Tooltip";

const SECTION_LINKS = [
  { href: "#overview", label: "Overview" },
  { href: "#buttons", label: "Button Recipes" },
  { href: "#forms", label: "Forms + Filters" },
  { href: "#feedback", label: "Feedback" },
  { href: "#metadata", label: "Metadata" },
  { href: "#surfaces", label: "Shared Surfaces" },
  { href: "#overlays", label: "Overlay Preview" },
];

const THEME_OPTIONS = [
  { value: "classic", label: "Classic Coast" },
  { value: "dusk", label: "Dusk Harbor" },
  { value: "tourney", label: "Tournament Clean" },
];

const MOTION_OPTIONS = [
  { value: "standard", label: "Standard Motion" },
  { value: "reduced", label: "Reduced Motion" },
  { value: "expressive", label: "Expressive Motion" },
];

const SAMPLE_LOG = [
  {
    title: "Reconnect banner",
    body: "Shared banner recipe with fast slide/fade entry.",
  },
  {
    title: "Chat + game log rail",
    body: "Standard panels, inputs, and tabs can live beside the board.",
  },
  {
    title: "Matchmaking + room setup",
    body: "Shared buttons and fields stop the lobby from drifting.",
  },
];

const SHARED_SURFACES = [
  {
    title: "Product Web",
    body: "Landing pages, profiles, leaderboards, and blog chrome should all use the same core recipes.",
  },
  {
    title: "In-Game Shared UI",
    body: "Reconnect banners, resign dialogs, chat, logs, and room settings can stay on the same standard layer.",
  },
  {
    title: "Bespoke Gameplay",
    body: "Board pieces, action bars, dice, and turn-critical controls still get custom treatment on top.",
  },
];

export function UiShowcaseClient() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [displayName, setDisplayName] = useState("Dune Trader");
  const [roomCode, setRoomCode] = useState("SET-2048");
  const [theme, setTheme] = useState("classic");
  const [motionMode, setMotionMode] = useState("standard");
  const [metadataOpen, setMetadataOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(125,211,252,1)_0%,_rgba(59,130,246,1)_42%,_rgba(2,132,199,1)_100%)]">
      <div className="mx-auto max-w-7xl px-ui-4 py-ui-8 md:px-ui-6 md:py-ui-10">
        <div className="grid gap-ui-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Panel
              title="Registry"
              bodyClassName="space-y-ui-4"
              right={
                <span className="type-caption rounded-pill bg-surface-inset px-ui-2 py-ui-0.5 text-ink-secondary">
                  Phase 1
                </span>
              }
            >
              <div className="space-y-ui-2">
                {SECTION_LINKS.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    className="settlex-ui-button settlex-ui-button-utility settlex-ui-focus block px-ui-3 py-ui-2 type-action-small"
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <Banner
                title="One shared standard layer"
                body="Use these recipes for normal product surfaces, then let the board UI stay bespoke."
              />

              <div className="space-y-ui-2 type-body-small text-ink-secondary">
                <Link
                  href="/catana/lobby"
                  className="settlex-ui-button settlex-ui-button-subtle settlex-ui-focus block px-ui-3 py-ui-2 type-action-small"
                >
                  Open lobby
                </Link>
                <Link
                  href="/catana/dev/sandbox"
                  className="settlex-ui-button settlex-ui-button-subtle settlex-ui-focus block px-ui-3 py-ui-2 type-action-small"
                >
                  Open board sandbox
                </Link>
              </div>
            </Panel>
          </aside>

          <main className="space-y-ui-6">
            <section id="overview">
              <Panel className="relative overflow-hidden" bodyClassName="p-ui-8 md:p-ui-10">
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.45),_transparent_40%)]" />
                <div className="relative grid gap-ui-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(260px,1fr)]">
                  <div>
                    <div className="type-caption uppercase text-ink-secondary">
                      Settlex Standard UI
                    </div>
                    <h1 className="type-page mt-ui-3 max-w-2xl text-ink-primary">
                      Shared product surfaces with one motion language and one styling contract.
                    </h1>
                    <p className="type-body mt-ui-4 max-w-2xl text-ink-secondary">
                      This page is the first proving ground for the standard UI layer:
                      dialogs, banners, forms, and panels that can be reused across
                      lobby, profiles, leaderboards, in-game chat, reconnect states,
                      and future admin or blog surfaces.
                    </p>

                    <div className="mt-ui-6 flex flex-wrap gap-ui-3">
                      <Button onClick={() => setDialogOpen(true)}>Open Dialog</Button>
                      <Button variant="secondary" onClick={() => setAlertOpen(true)}>
                        Open Confirm
                      </Button>
                    </div>

                    <div className="mt-ui-6 flex flex-wrap gap-ui-3 type-caption uppercase text-ink-secondary">
                      <span className="rounded-pill bg-surface-inset px-ui-3 py-ui-1">
                        Shared motion timing
                      </span>
                      <span className="rounded-pill bg-surface-inset px-ui-3 py-ui-1">
                        Reusable glass shells
                      </span>
                      <span className="rounded-pill bg-surface-inset px-ui-3 py-ui-1">
                        Product + in-game shared UI
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-ui-3 sm:grid-cols-3 lg:grid-cols-1">
                    {[
                      {
                        title: "Motion",
                        value: "140-220ms",
                        body: "Fast enough for product UI, but still alive on entry and exit.",
                      },
                      {
                        title: "Coverage",
                        value: "7 recipes",
                        body: "Button, panel, banner, input, select, dialog, and alert dialog.",
                      },
                      {
                        title: "Rule",
                        value: "Primitive first",
                        body: "Compose surfaces from shared parts before writing another custom widget.",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="settlex-ui-inset p-ui-4"
                      >
                        <div className="type-caption uppercase text-ink-secondary">
                          {item.title}
                        </div>
                        <div className="mt-ui-2 type-section text-ink-primary">{item.value}</div>
                        <p className="mt-ui-2 type-body-small text-ink-secondary">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Panel>
            </section>

            <section id="buttons">
              <Panel
                title="Button Recipes"
                right={
                  <span className="type-caption rounded-pill bg-surface-inset px-ui-2 py-ui-0.5 text-ink-secondary">
                    Shared action language
                  </span>
                }
              >
                <div className="grid gap-ui-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="settlex-ui-inset p-ui-4">
                    <div className="type-caption uppercase text-ink-secondary">
                      Primary
                    </div>
                    <Button className="mt-ui-3 w-full">Create Match</Button>
                    <p className="mt-ui-3 type-body-small text-ink-secondary">
                      High-emphasis calls to action like play, save, or confirm.
                    </p>
                  </div>

                  <div className="settlex-ui-inset p-ui-4">
                    <div className="type-caption uppercase text-ink-secondary">
                      Secondary
                    </div>
                    <Button variant="secondary" className="mt-ui-3 w-full">
                      View Rules
                    </Button>
                    <p className="mt-ui-3 type-body-small text-ink-secondary">
                      Secondary actions that still feel tactile and on-brand.
                    </p>
                  </div>

                  <div className="settlex-ui-inset p-ui-4">
                    <div className="settlex-ui-label">Floating utility</div>
                    <Button variant="utility" size="sm" className="mt-ui-3" onClick={() => setDialogOpen(true)}>
                      Account
                    </Button>
                    <p className="mt-ui-3 type-body-small text-ink-secondary">
                      A full pill for standalone header controls. Form and play actions keep 14px corners.
                    </p>
                  </div>

                  <div className="settlex-ui-inset p-ui-4">
                    <div className="type-caption uppercase text-ink-secondary">
                      Accent + Subtle
                    </div>
                    <div className="mt-ui-3 flex flex-wrap gap-ui-2">
                      <Button variant="subtle" size="sm">
                        2P
                      </Button>
                      <Button variant="accent" size="sm">
                        3P
                      </Button>
                      <Button variant="subtle" size="sm">
                        4P
                      </Button>
                    </div>
                    <p className="mt-ui-3 type-body-small text-ink-secondary">
                      Alternate emphasis plus low-noise toggles, filters, and mode selectors.
                    </p>
                  </div>

                  <div className="settlex-ui-inset p-ui-4">
                    <div className="type-caption uppercase text-ink-secondary">
                      Danger
                    </div>
                    <Button variant="danger" className="mt-ui-3 w-full">
                      Leave Match
                    </Button>
                    <p className="mt-ui-3 type-body-small text-ink-secondary">
                      Reserved for destructive choices and explicit risk.
                    </p>
                  </div>

                  <div className="settlex-ui-inset p-ui-4">
                    <div className="type-caption uppercase text-ink-secondary">
                      Tooltip
                    </div>
                    <div className="mt-ui-3">
                      <TooltipProvider>
                        <Tooltip label="Open game log">
                          <IconButton aria-label="Open game log" variant="secondary">
                            <span aria-hidden="true">L</span>
                          </IconButton>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <p className="mt-ui-3 type-body-small text-ink-secondary">
                      Icon-only controls keep their accessible name while tooltips add
                      quick visual labels.
                    </p>
                  </div>
                </div>
              </Panel>
            </section>

            <section id="forms">
              <Panel title="Forms + Filters">
                <div className="grid gap-ui-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                  <div className="space-y-ui-4">
                    <div>
                      <label className="type-label block text-ink-secondary">
                        Display Name
                      </label>
                      <Input
                        value={displayName}
                        onChange={(event) => setDisplayName(event.target.value)}
                        className="mt-ui-2"
                        placeholder="Choose a display name"
                      />
                    </div>

                    <div className="grid gap-ui-4 sm:grid-cols-2">
                      <div>
                        <label className="type-label block text-ink-secondary">
                          Tile Theme
                        </label>
                        <Select
                          value={theme}
                          onChange={(event) => setTheme(event.target.value)}
                          className="mt-ui-2"
                        >
                          {THEME_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>

                      <div>
                        <label className="type-label block text-ink-secondary">
                          Motion Preset
                        </label>
                        <Select
                          value={motionMode}
                          onChange={(event) => setMotionMode(event.target.value)}
                          className="mt-ui-2"
                        >
                          {MOTION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-ui-3">
                      <Button>Save Preferences</Button>
                      <Button variant="secondary">
                        Reset Preview
                      </Button>
                    </div>
                  </div>

                  <div className="settlex-ui-inset p-ui-4">
                    <div className="type-caption uppercase text-ink-secondary">
                      Live Summary
                    </div>
                    <div className="mt-ui-3 space-y-ui-2 type-body-small text-ink-secondary">
                      <div className="flex items-center justify-between gap-ui-3">
                        <span>Name</span>
                        <span className="type-label text-ink-primary">{displayName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-ui-3">
                        <span>Theme</span>
                        <span className="type-label text-ink-primary">
                          {THEME_OPTIONS.find((option) => option.value === theme)?.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-ui-3">
                        <span>Motion</span>
                        <span className="type-label text-ink-primary">
                          {MOTION_OPTIONS.find((option) => option.value === motionMode)?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            </section>

            <section id="feedback">
              <Panel title="Status + Feedback">
                <div className="grid gap-ui-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
                  <div className="space-y-ui-3">
                    <Banner
                      title="Connection restored"
                      body="Reconnect banners, notifications, and low-friction status messages should all use the same recipe."
                    />
                    <Banner
                      variant="danger"
                      title="Matchmaking stalled"
                      body="This is the same shared feedback layer used for disconnect, idle timeout, or failed room joins."
                    />
                  </div>

                  <div className="settlex-ui-inset p-ui-4">
                    <div className="type-caption uppercase text-ink-secondary">
                      Shared use cases
                    </div>
                    <div className="mt-ui-3 space-y-ui-3">
                      {SAMPLE_LOG.map((item) => (
                        <div
                          key={item.title}
                          className="settlex-ui-inset px-ui-3 py-ui-3 type-body-small"
                        >
                          <div className="type-label text-ink-primary">{item.title}</div>
                          <div className="mt-ui-1 text-ink-secondary">{item.body}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Panel>
            </section>

            <section id="metadata">
              <Panel title="Ambient Metadata">
                <div className="grid gap-ui-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                  <div className="settlex-ui-inset p-ui-5">
                    <div className="type-caption uppercase text-ink-secondary">
                      Role
                    </div>
                    <p className="mt-ui-3 type-body-small text-ink-secondary">
                      Release marks, build ids, diagnostics, and timestamps are not
                      commands. If they reveal details, they should read as quiet
                      metadata first and use disclosure behavior second.
                    </p>
                  </div>

                  <div className="settlex-ui-hud p-ui-4">
                    <div className="relative min-h-36 rounded-panel bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.22),_rgba(37,99,235,0.24)_46%,_rgba(29,78,216,0.42)_100%)]">
                      <div className="absolute bottom-4 right-4">
                        <MetaDisclosure
                          open={metadataOpen}
                          onOpenChange={setMetadataOpen}
                          label="release 1"
                          ariaLabel="Show release notes for release 1"
                        >
                          <div className="type-caption uppercase text-ink-muted">
                            What changed
                          </div>
                          <h2 className="mt-ui-1 type-body-small text-ink-primary">
                            Release 1 · Initial MVP Launch
                          </h2>
                          <p className="mt-ui-3 type-caption text-ink-secondary">
                            This preview uses the same low-emphasis trigger as the
                            homepage release mark.
                          </p>
                        </MetaDisclosure>
                      </div>
                    </div>
                  </div>
                </div>
              </Panel>
            </section>

            <section id="surfaces">
              <Panel title="Shared Surfaces">
                <div className="grid gap-ui-4 md:grid-cols-3">
                  {SHARED_SURFACES.map((surface) => (
                    <div
                      key={surface.title}
                      className="settlex-ui-inset p-ui-5"
                    >
                      <div className="type-caption uppercase text-ink-secondary">
                        {surface.title}
                      </div>
                      <p className="mt-ui-3 type-body-small text-ink-secondary">
                        {surface.body}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>

            <section id="overlays">
              <Panel title="Overlay Preview">
                <div className="grid gap-ui-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
                  <div className="space-y-ui-4">
                    <div className="settlex-ui-inset p-ui-5">
                      <div className="type-caption uppercase text-ink-secondary">
                        Dialog trigger
                      </div>
                      <p className="mt-ui-2 type-body-small text-ink-secondary">
                        Standard product modals should enter with the same quick,
                        glassy motion, whether they are used for resign, idle checks,
                        confirmation flows, or future settings pages.
                      </p>
                      <div className="mt-ui-4 flex flex-wrap gap-ui-3">
                        <Button onClick={() => setDialogOpen(true)}>Preview Dialog</Button>
                        <Button variant="danger" onClick={() => setAlertOpen(true)}>
                          Preview Confirm
                        </Button>
                      </div>
                    </div>

                    <div className="settlex-ui-inset p-ui-5">
                      <div className="type-caption uppercase text-ink-secondary">
                        Room join sample
                      </div>
                      <div className="mt-ui-3 flex gap-ui-2">
                        <Input
                          value={roomCode}
                          onChange={(event) => setRoomCode(event.target.value)}
                          className="min-w-0 flex-1"
                          placeholder="Room code"
                        />
                        <Button>Join Room</Button>
                      </div>
                    </div>
                  </div>

                  <div className="settlex-ui-inset p-ui-5">
                    <div className="type-caption uppercase text-ink-secondary">
                      Why this page exists
                    </div>
                    <p className="mt-ui-3 type-body-small text-ink-secondary">
                      The goal is not to freeze the entire product in one aesthetic
                      screenshot. It is to prove that the shared layer already gives
                      us predictable buttons, panels, banners, fields, and overlays
                      before we branch into more bespoke game-specific work.
                    </p>
                    <p className="mt-ui-3 type-body-small text-ink-secondary">
                      That makes future additions like tooltips, toasts, chat rails,
                      account forms, and room setup much easier to implement without
                      rethinking motion or styling every time.
                    </p>
                  </div>
                </div>
              </Panel>
            </section>
          </main>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Shared dialog recipe"
        description="This uses the same Base UI-backed wrapper as idle checks and other standard product overlays."
        actions={
          <div className="flex flex-wrap justify-end gap-ui-2">
            <Button
              variant="secondary"
              onClick={() => setDialogOpen(false)}
            >
              Later
            </Button>
            <Button onClick={() => setDialogOpen(false)}>Looks Good</Button>
          </div>
        }
        maxWidthClassName="max-w-lg"
      >
        <div className="space-y-ui-3 type-body-small text-ink-secondary">
          <p>
            Dialogs should feel crisp and consistent, not like a separate animation
            system got dropped into the app.
          </p>
          <Banner
            title="Applied rule"
            body="Same overlay recipe for product modals, in-game resign, idle timeout, and future settings surfaces."
          />
        </div>
      </Dialog>

      <AlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        title="Leave this showcase?"
        description="This confirm pattern is the same one now used for resign, and it should cover future destructive actions too."
        confirmLabel="Leave Preview"
        cancelLabel="Stay Here"
        onConfirm={() => setAlertOpen(false)}
        onCancel={() => setAlertOpen(false)}
      />
    </div>
  );
}
