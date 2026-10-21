// Type surface for the design-sync bundle (see entry.js).
//
// SettleHex is authored in plain JavaScript, so no build step can recover these
// types — neither esbuild nor tsc parses the repo's JSX-in-.js. This file is
// therefore hand-maintained, and it is what the converter reads to discover
// components and to emit each `components/<group>/<Name>/<Name>.d.ts`. Prop
// names and defaults below are transcribed from the component signatures; keep
// them in step when a signature changes.
//
// `package.json` "types" points here, which is how the converter finds it.

import * as React from "react";

// ── Root wrapper ───────────────────────────────────────────────────────────

export interface SettleHexRootProps {
  children?: React.ReactNode;
  /** Extra classes on the root element; merged after the built-in ones. */
  className?: string;
  /** Style overrides merged over the table background and font stack. */
  style?: React.CSSProperties | null;
}
/**
 * The surface every SettleHex screen sits on — carries the Catana table
 * background, the Outfit body font, and the `settlex-ui-root` stacking context.
 * Wrap whole screens in it; components render unstyled-looking without it.
 */
export declare const SettleHexRoot: React.FC<SettleHexRootProps>;

// ── Shared domain shapes ───────────────────────────────────────────────────

/** A player's display identity: chosen name, emoji avatar, and colour key. */
export interface Identity {
  name: string;
  emoji: string;
  color: string;
}

/**
 * Derived match-alert (push notification) state. Produced by
 * `getMatchAlertDisplayState` in app/catana/matchAlerts/matchAlertState — pass
 * one of those objects through rather than assembling it by hand.
 */
export interface MatchAlertDisplay {
  [key: string]: unknown;
}

/** Whether the viewer is a guest, a saved account, or signed out. */
export type AccountStatus = "guest" | "saved" | "signed-out" | (string & {});

/** One row of an end-of-game scoreboard. */
export interface ScoreboardEntry {
  [key: string]: unknown;
}

// ── Primitives ─────────────────────────────────────────────────────────────

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. `pill` aliases `secondary`, `chip` aliases `subtle`. */
  variant?:
    | "primary"
    | "secondary"
    | "accent"
    | "ghost"
    | "subtle"
    | "danger"
    | "pill"
    | "chip";
  size?: "sm" | "md" | "lg" | "xl";
  /** Adds the animated gloss sweep used on primary calls to action. */
  sheen?: boolean;
  className?: string;
  children?: React.ReactNode;
}
export declare const Button: React.ForwardRefExoticComponent<
  ButtonProps & React.RefAttributes<HTMLButtonElement>
>;

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "accent" | "ghost" | "subtle" | "danger";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  /** Required — the button renders an icon only, with no visible label. */
  "aria-label": string;
  children?: React.ReactNode;
}
export declare const IconButton: React.ForwardRefExoticComponent<
  IconButtonProps & React.RefAttributes<HTMLButtonElement>
>;

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}
export declare const Input: React.ForwardRefExoticComponent<
  InputProps & React.RefAttributes<HTMLInputElement>
>;

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  children?: React.ReactNode;
}
export declare const Select: React.ForwardRefExoticComponent<
  SelectProps & React.RefAttributes<HTMLSelectElement>
>;

export interface BannerProps {
  variant?: "neutral" | "danger" | "success" | "warning";
  title?: React.ReactNode;
  body?: React.ReactNode;
  /** Trailing action area, typically one or two Buttons. */
  actions?: React.ReactNode;
  className?: string;
}
export declare const Banner: React.FC<BannerProps>;

export interface PanelProps {
  title?: React.ReactNode;
  /** Content pinned to the panel header's trailing edge. */
  right?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children?: React.ReactNode;
}
export declare const Panel: React.FC<PanelProps>;

export interface SwatchPickerProps {
  /** Selectable colour options, in render order. */
  options: ReadonlyArray<{ value: string; label?: string; gradient?: string }>;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  swatchClassName?: string;
}
export declare const SwatchPicker: React.FC<SwatchPickerProps>;

export interface TooltipProps {
  label: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  align?: "start" | "center" | "end";
  triggerAriaLabel?: string;
}
export declare const Tooltip: React.FC<TooltipProps>;

export interface TooltipProviderProps {
  children?: React.ReactNode;
  /** Hover delay before opening, in ms. */
  delay?: number;
  closeDelay?: number;
}
export declare const TooltipProvider: React.FC<TooltipProviderProps>;

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Footer action area. */
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Tailwind max-width class for the dialog panel. Defaults to `max-w-md`. */
  maxWidthClassName?: string;
}
export declare const Dialog: React.FC<DialogProps>;

export interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  className?: string;
  confirmVariant?: ButtonProps["variant"];
}
export declare const AlertDialog: React.FC<AlertDialogProps>;

export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Rendered inside the popover's trigger button. */
  triggerContent?: React.ReactNode;
  triggerClassName?: string;
  triggerAriaLabel?: string;
  children?: React.ReactNode;
  className?: string;
  sideOffset?: number;
  align?: "start" | "center" | "end";
}
export declare const Popover: React.FC<PopoverProps>;

export interface MetaDisclosureProps {
  label?: React.ReactNode;
  ariaLabel?: string;
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
  triggerClassName?: string;
  panelClassName?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
}
export declare const MetaDisclosure: React.FC<MetaDisclosureProps>;

// ── Account & identity ─────────────────────────────────────────────────────

export interface AuthOptions {
  emailPassword?: boolean;
  socialProviders?: string[];
}

export interface AccountPageViewProps {
  /** `null` renders the signed-out state. */
  account: { email?: string; identity?: Identity; [key: string]: unknown } | null;
  authOptions?: AuthOptions;
  onEmailSignIn?: (credentials: { email: string; password: string }) => void;
  onEmailSignUp?: (credentials: { email: string; password: string }) => void;
  onSignInProvider?: (provider: string) => void;
}
export declare const AccountPageView: React.FC<AccountPageViewProps>;

export interface AccountEntryModalProps {
  open?: boolean;
  /** Which entry flow to present. */
  mode?: "auth-first" | "save-profile" | "choose-identity" | (string & {});
  intent?: "online" | "friend" | (string & {});
  identity?: Partial<Identity>;
  authOptions?: AuthOptions;
  onClose?: () => void;
  onSwitchToAuth?: () => void;
  onPlayUsernameSubmit?: (name: string) => void;
  onEmailSignIn?: (credentials: { email: string; password: string }) => void;
  onEmailSignUp?: (credentials: { email: string; password: string }) => void;
  onSignInProvider?: (provider: string) => void;
  onContinueAsGuest?: () => void;
}
export declare const AccountEntryModal: React.FC<AccountEntryModalProps>;

export interface IdentityModalProps {
  onSubmit?: (identity: Identity) => void;
  onClose?: () => void;
  initialName?: string;
  initialEmoji?: string;
  initialColor?: string;
}
export declare const IdentityModal: React.FC<IdentityModalProps>;

export interface EmojiPickerProps {
  value?: string;
  onChange?: (emoji: string) => void;
  /** CSS gradient used behind the selected emoji. */
  colorGradient?: string;
}
export declare const EmojiPicker: React.FC<EmojiPickerProps>;

/** Props shared by the account menu and the chrome that hosts it. */
export interface AccountMenuProps {
  identity?: Identity | null;
  accountStatus?: AccountStatus;
  hasIdentity?: boolean;
  matchAlertDisplay?: MatchAlertDisplay;
  matchAlertLoading?: boolean;
  matchAlertError?: string;
  onMatchAlertAction?: (action: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onEditIdentity?: () => void;
  onOpenAccount?: () => void;
  onOpenSignIn?: () => void;
  onOpenSaveProfile?: () => void;
  onSignOut?: () => void;
}

export interface SystemAccountMenuProps extends AccountMenuProps {}
export declare const SystemAccountMenu: React.FC<SystemAccountMenuProps>;

export interface SystemTopChromeProps extends AccountMenuProps {}
export declare const SystemTopChrome: React.FC<SystemTopChromeProps>;

export interface PublicProfileViewProps {
  profile: {
    username?: string;
    identity?: Identity;
    recentMatches?: unknown[];
    [key: string]: unknown;
  };
}
export declare const PublicProfileView: React.FC<PublicProfileViewProps>;

// ── Lobby & matchmaking ────────────────────────────────────────────────────

export interface HomeTitleChromeProps
  extends Omit<AccountMenuProps, "open" | "defaultOpen" | "onOpenChange"> {
  accountMenuOpen?: boolean;
  accountMenuDefaultOpen?: boolean;
  onAccountMenuOpenChange?: (open: boolean) => void;
  isBusy?: boolean;
  /** Id of the mode button currently showing a pending state. */
  activeActionId?: string | null;
  onSelectMode?: (actionId: string) => void;
  logoVariant?: string;
  logoTone?: string;
  releaseInfo?: unknown;
  releaseOpen?: boolean;
  onReleaseOpenChange?: (open: boolean) => void;
}
export declare const HomeTitleChrome: React.FC<HomeTitleChromeProps>;

export interface HomeGameModeDockProps {
  isBusy?: boolean;
  activeActionId?: string | null;
  onSelectMode?: (actionId: string) => void;
}
export declare const HomeGameModeDock: React.FC<HomeGameModeDockProps>;

/** The selectable game modes rendered by HomeGameModeDock. */
export declare const SYSTEM_ACTIONS: ReadonlyArray<{
  id: string;
  label: string;
  [key: string]: unknown;
}>;

export interface SearchingModalProps {
  /** Current matchmaking phase. */
  searchState?: unknown;
  searchElapsedSeconds?: number;
  matchAlertDisplay?: MatchAlertDisplay;
  matchAlertLoading?: boolean;
  matchAlertError?: string;
  isPufferTransitionPending?: boolean;
  onMatchAlertAction?: (action: string) => void;
  onCancel?: () => void;
  onPlayPuffer?: () => void;
}
export declare const SearchingModal: React.FC<SearchingModalProps>;

export interface OpenMatchRoomProps {
  matchID?: string;
  gameServer?: string;
  match?: unknown;
  openSeats?: unknown[];
  hasTakenSeats?: boolean;
  playerName?: string;
  playerID?: string;
  isLoadingMatch?: boolean;
  joinPending?: boolean;
  botFillPending?: boolean;
  error?: string;
  onPlayerNameChange?: (name: string) => void;
  onSeatChange?: (seatId: string) => void;
  onJoin?: () => void;
  onSpectate?: () => void;
  onRefresh?: () => void;
  onFillBots?: () => void;
}
export declare const OpenMatchRoom: React.FC<OpenMatchRoomProps>;

export interface PendingFriendChallengeScreenProps {
  /** Whose side of the challenge is being shown. */
  mode?: "inviter" | "invitee";
  matchID?: string;
  challengeUrl?: string;
  match?: unknown;
  challengeState?: unknown;
  playerName?: string;
  setPlayerName?: (name: string) => void;
  joinPending?: boolean;
  cancelPending?: boolean;
  isLoadingMatch?: boolean;
  error?: string;
  /** Clock reading used to render the expiry countdown. */
  nowMs?: number;
  onJoin?: () => void;
  onCancel?: () => void;
  onRefresh?: () => void;
  onBackToLobby?: () => void;
}
export declare const PendingFriendChallengeScreen: React.FC<PendingFriendChallengeScreenProps>;

// ── Alerts & recovery ──────────────────────────────────────────────────────

export interface StatusBannerProps {
  variant?: "neutral" | "danger" | "success" | "warning";
  title?: React.ReactNode;
  body?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  /** Float the banner above the board instead of placing it inline. */
  overlay?: boolean;
  overlayClassName?: string;
}
export declare const StatusBanner: React.FC<StatusBannerProps>;

export interface MatchAlertDialogProps {
  alert?: unknown;
  currentGame?: unknown;
  onClose?: () => void;
  onJoiningChange?: (joining: boolean) => void;
}
export declare const MatchAlertDialog: React.FC<MatchAlertDialogProps>;

/** Self-contained reconnect banner — reads its own connection state. */
export declare const GlobalReconnectBanner: React.FC<Record<string, never>>;

/** Maps a reconnect status into StatusBanner props. */
export declare function getReconnectStatusBannerProps(
  status: unknown
): StatusBannerProps;

export interface GlassPillButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  className?: string;
  children?: React.ReactNode;
}
export declare const GlassPillButton: React.FC<GlassPillButtonProps>;

export interface IdlePromptModalProps {
  /** Time left before the idle forfeit, in ms. */
  remainingMs?: number;
  onAcknowledge?: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}
export declare const IdlePromptModal: React.FC<IdlePromptModalProps>;

export interface ResignConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm?: () => void;
}
export declare const ResignConfirmDialog: React.FC<ResignConfirmDialogProps>;

export interface InterruptedDuelRecoveryProps {
  pending?: boolean;
  error?: string | null;
  onReturnToLobby?: () => void;
  onLookAgain?: () => void;
}
export declare const InterruptedDuelRecovery: React.FC<InterruptedDuelRecoveryProps>;

export interface UnavailableMatchPageProps {
  matchID?: string;
}
export declare const UnavailableMatchPage: React.FC<UnavailableMatchPageProps>;

// ── Postgame & replay ──────────────────────────────────────────────────────

export interface GameOverModalProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  scoreboard?: ScoreboardEntry[];
  isWinner?: boolean;
  shouldFireConfetti?: boolean;
  onConfettiFired?: () => void;
  onWatchReplay?: () => void;
  replayStatus?: "ready" | "preparing" | "unavailable" | (string & {});
  onViewSummary?: () => void;
  onLobby?: () => void;
  onClose?: () => void;
  showMatchAlertResume?: boolean;
  matchAlertResumeChecked?: boolean;
  matchAlertResumeError?: string;
  matchAlertResumePending?: boolean;
  onMatchAlertResumeCheckedChange?: (checked: boolean) => void;
  onRetryMatchAlertResume?: () => void;
  onContinueWithoutMatchAlerts?: () => void;
}
export declare const GameOverModal: React.FC<GameOverModalProps>;

export interface PostgameOverlayProps {
  /** Narrative summary rows shown above the scoreboard. */
  summary?: unknown[];
  scoreboard?: ScoreboardEntry[];
  onWatchReplay?: () => void;
  onClose?: () => void;
}
export declare const PostgameOverlay: React.FC<PostgameOverlayProps>;

export interface ReplayPanelProps {
  timeline?: unknown;
  currentEvent?: unknown;
  currentEventIndex?: number;
  perspectiveId?: string;
  victoryTarget?: number;
  open?: boolean;
  mobileOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onMobileOpenChange?: (open: boolean) => void;
  onPerspectiveChange?: (perspectiveId: string) => void;
  onResultsOpen?: () => void;
  onPreviousEvent?: () => void;
  onNextEvent?: () => void;
  onPreviousTurn?: () => void;
  onNextTurn?: () => void;
  onSeek?: (index: number) => void;
}
export declare const ReplayPanel: React.FC<ReplayPanelProps>;

export interface ReplayStatusPageProps {
  matchID?: string;
  /** Drives the empty/pending/unavailable copy. */
  status?: string;
}
export declare const ReplayStatusPage: React.FC<ReplayStatusPageProps>;

export interface ReplayStepControlsProps {
  currentEventIndex?: number;
  eventCount?: number;
  /** Event indices at which each turn begins, for turn-wise stepping. */
  turnStarts?: number[];
  onPreviousEvent?: () => void;
  onNextEvent?: () => void;
  onPreviousTurn?: () => void;
  onNextTurn?: () => void;
  onSeek?: (index: number) => void;
  compact?: boolean;
}
export declare const ReplayStepControls: React.FC<ReplayStepControlsProps>;

export interface ReplayScoreChartProps {
  players?: unknown[];
  /** Per-player score series, indexed by event. */
  scoreSeries?: unknown[];
  turnStarts?: number[];
  currentEventIndex?: number;
  eventCount?: number;
  victoryTarget?: number;
  onSeek?: (index: number) => void;
}
export declare const ReplayScoreChart: React.FC<ReplayScoreChartProps>;

export declare function getReplayChartKeyboardSeekIndex(
  event: unknown,
  state: unknown
): number;
export declare function getReplayEventIndexAtChartX(
  x: number,
  state: unknown
): number;
export declare function getVisibleReplayScoreData(state: unknown): unknown;

export declare function getAccountProfileCopy(account: unknown): unknown;
