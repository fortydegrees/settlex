// Bundle entry for design-sync — the module the converter compiles into
// `window.SettleHex`, and the surface the claude.ai/design agent builds with.
//
// SettleHex is a Next.js app, not a published component package, so there is no
// `dist/` to point `--entry` at. This file is that entry: it names every
// component the repo's Storybook covers, under the same identifier as its
// source file's basename. That basename match is load-bearing — it is what
// makes `lib/story-imports.mjs` redirect a story's `import { Button } from
// "./Button"` to `window.SettleHex.Button`, so previews exercise the shipped
// bundle rather than a second copy compiled from source.
//
// Adding a component: export it here under its file basename, add a `titleMap`
// entry in config.json if its story title differs, and rebuild.

// ── Root wrapper ───────────────────────────────────────────────────────────
// Wrap every screen in this: it carries the table background and the Outfit
// body font that live in app/layout.js and .storybook/preview.js rather than in
// any component. Also serves as cfg.provider for previews.
export { SettleHexRoot } from "./SettleHexRoot";

// ── Primitives (app/ui) ────────────────────────────────────────────────────
export { Button } from "../app/ui/Button";
export { IconButton } from "../app/ui/IconButton";
export { Tooltip, TooltipProvider } from "../app/ui/Tooltip";
export { Banner } from "../app/ui/Banner";
export { Panel } from "../app/ui/Panel";
export { Input } from "../app/ui/Input";
export { Select } from "../app/ui/Select";
export { SwatchPicker } from "../app/ui/SwatchPicker";
export { Dialog } from "../app/ui/Dialog";
export { AlertDialog } from "../app/ui/AlertDialog";
export { Popover } from "../app/ui/Popover";
export { MetaDisclosure } from "../app/ui/MetaDisclosure";

// ── Account & identity ─────────────────────────────────────────────────────
export { AccountPageView, getAccountProfileCopy } from "../app/account/AccountPageView";
export { AccountEntryModal } from "../app/catana/lobby/AccountEntryModal";
export { IdentityModal, EmojiPicker } from "../app/catana/lobby/IdentityModal";
export { SystemAccountMenu } from "../app/catana/home/SystemAccountMenu";
export { SystemTopChrome } from "../app/catana/home/SystemTopChrome";
export { PublicProfileView } from "../app/u/[username]/PublicProfileView";

// ── Lobby & matchmaking ────────────────────────────────────────────────────
export {
  HomeTitleChrome,
  HomeGameModeDock,
  SYSTEM_ACTIONS,
} from "../app/catana/home/HomeTitleChrome";
export { SearchingModal } from "../app/catana/home/SearchingModal";
// Not a component — exported so story previews can read it off the bundle
// instead of compiling releaseInfo.js from source, which reads
// process.env.NEXT_PUBLIC_* that only the prebuild shims. See
// cfg.storyImports.shim.
export { publicReleaseInfo } from "../app/catana/lobby/releaseInfo";
export { OpenMatchRoom } from "../app/catana/lobby/[matchID]/OpenMatchRoom";
export { PendingFriendChallengeScreen } from "../app/catana/lobby/[matchID]/PendingFriendChallengeScreen";

// ── Alerts & recovery ──────────────────────────────────────────────────────
export { MatchAlertDialog } from "../app/catana/matchAlerts/MatchAlertDialog";
export {
  GlobalReconnectBanner,
  getReconnectStatusBannerProps,
} from "../app/catana/components/GlobalReconnectBanner";
export { StatusBanner } from "../app/catana/components/StatusBanner";
export { GlassPillButton } from "../app/catana/components/GlassPillButton";
export { IdlePromptModal } from "../app/catana/components/IdlePromptModal";
export { ResignConfirmDialog } from "../app/catana/components/ResignConfirmDialog";
export { InterruptedDuelRecovery } from "../app/catana/lobby/[matchID]/InterruptedDuelRecovery";
export { UnavailableMatchPage } from "../app/g/[matchID]/UnavailableMatchPage";

// ── Postgame & replay ──────────────────────────────────────────────────────
export { GameOverModal } from "../app/catana/components/GameOverModal";
export { PostgameOverlay } from "../app/catana/components/PostgameOverlay";
export { ReplayPanel } from "../app/replays/components/ReplayPanel";
export { ReplayStatusPage } from "../app/replays/components/ReplayStatusPage";
export { ReplayStepControls } from "../app/replays/components/ReplayStepControls";
export {
  ReplayScoreChart,
  getReplayChartKeyboardSeekIndex,
  getReplayEventIndexAtChartX,
  getVisibleReplayScoreData,
} from "../app/replays/components/ReplayScoreChart";
