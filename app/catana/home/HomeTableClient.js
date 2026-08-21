"use client";

import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Button } from "../../ui/Button";
import { StatusBanner } from "../components/StatusBanner";
import { HomeDemoBoardPoster } from "../homeDemo/HomeDemoBoardPoster";
import { createHomeDemoPieceState } from "../homeDemo/homeDemoSequence";
import { useLobbyHomeActions } from "../lobby/useLobbyHomeActions";
import { useMatchAlerts } from "../matchAlerts/useMatchAlerts.js";
import { consumePlayOnlineIntent } from "../matchmaking/matchmakingRescue.js";
import { CATANA_TABLE_BACKGROUND } from "../theme/backgrounds";
import {
  HomeTitleChrome,
  useHomeBrandLogoOptions,
} from "./HomeTitleChrome";
import { SearchingModal } from "./SearchingModal";
import "../components/hudGlass.css";

let homeDemoBoardPromise;
const loadHomeDemoBoard = () =>
  (homeDemoBoardPromise ??= import("../homeDemo/HomeDemoBoard"));
const LazyHomeDemoBoard = React.lazy(() =>
  loadHomeDemoBoard().then((module) => ({ default: module.HomeDemoBoard }))
);

let homeDemoEffectBridgePromise;
const loadHomeDemoEffectBridge = () =>
  (homeDemoEffectBridgePromise ??= import("../homeDemo/HomeDemoEffectBridge"));
const LazyHomeDemoEffectBridge = React.lazy(() =>
  loadHomeDemoEffectBridge().then((module) => ({
    default: module.HomeDemoEffectBridge,
  }))
);

let accountEntryModalPromise;
const loadAccountEntryModal = () =>
  (accountEntryModalPromise ??= import("../lobby/AccountEntryModal"));
const LazyAccountEntryModal = React.lazy(() =>
  loadAccountEntryModal().then((module) => ({
    default: module.AccountEntryModal,
  }))
);

let identityModalPromise;
const loadIdentityModal = () =>
  (identityModalPromise ??= import("../lobby/IdentityModal"));
const LazyIdentityModal = React.lazy(() =>
  loadIdentityModal().then((module) => ({ default: module.IdentityModal }))
);

const useBrowserLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

const useMatchFoundSound = () => {
  const matchFoundSoundPlayedRef = useRef(false);
  const audioRef = useRef(null);

  // Fetch the cue while matchmaking runs so it fires instantly on match
  // found instead of racing the navigation with a cold network request.
  const prime = useCallback(() => {
    if (audioRef.current) return;
    if (typeof window === "undefined") return;
    try {
      if (window.localStorage.getItem("catana:audioMuted") === "true") return;
      const audio = new window.Audio("/sounds/game-start.mp3");
      audio.preload = "auto";
      audioRef.current = audio;
    } catch (err) {
      /* Priming is best-effort. */
    }
  }, []);

  const play = useCallback(() => {
    if (matchFoundSoundPlayedRef.current) return;
    matchFoundSoundPlayedRef.current = true;
    if (typeof window === "undefined") return;

    try {
      if (window.localStorage.getItem("catana:audioMuted") === "true") return;
      const audio =
        audioRef.current ?? new window.Audio("/sounds/game-start.mp3");
      const playback = audio.play();
      void playback?.catch?.(() => {});
    } catch (err) {
      /* Match-found sound must never block navigation. */
    }
  }, []);

  return { prime, play };
};

function useViewportWidth() {
  const [width, setWidth] = useState(0);

  useBrowserLayoutEffect(() => {
    const updateWidth = () => setWidth(window.innerWidth);
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  return width;
}

function FullBoardLayer({
  pieceState,
  reservedHeight,
  centerYOffset = 0,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  onBoardMeasuredChange,
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <React.Suspense fallback={null}>
        <LazyHomeDemoBoard
          pieceState={pieceState}
          reservedHeight={reservedHeight}
          centerYOffset={centerYOffset}
          boardRef={boardRef}
          placementLayerRef={placementLayerRef}
          placementRoadLayerRef={placementRoadLayerRef}
          onBoardMeasuredChange={onBoardMeasuredChange}
        />
      </React.Suspense>
    </div>
  );
}

function HomeTableSurface({
  pieceState,
  isCompact,
  boardRef,
  placementLayerRef,
  placementRoadLayerRef,
  isBoardMeasured,
  onBoardMeasuredChange,
  onSelectMode,
  isBusy,
  activeActionId,
  identity,
  accountStatus,
  hasIdentity,
  matchAlertDisplay,
  matchAlertLoading,
  matchAlertError,
  onMatchAlertAction,
  isBoardLayoutReady,
  isHomeDemoReady,
  actions,
  logoVariant,
  logoTone,
}) {
  return (
    <>
      <HomeDemoBoardPoster hidden={isBoardMeasured} />
      {isBoardLayoutReady && isHomeDemoReady ? (
        <FullBoardLayer
          pieceState={pieceState}
          reservedHeight={isCompact ? 276 : 158}
          centerYOffset={isCompact ? -56 : 0}
          boardRef={boardRef}
          placementLayerRef={placementLayerRef}
          placementRoadLayerRef={placementRoadLayerRef}
          onBoardMeasuredChange={onBoardMeasuredChange}
        />
      ) : null}
      <HomeTitleChrome
        identity={identity}
        accountStatus={accountStatus}
        hasIdentity={hasIdentity}
        matchAlertDisplay={matchAlertDisplay}
        matchAlertLoading={matchAlertLoading}
        matchAlertError={matchAlertError}
        onMatchAlertAction={onMatchAlertAction}
        onEditIdentity={actions.openIdentity}
        onOpenAccount={actions.goToAccount}
        onOpenSignIn={actions.openSignIn}
        onOpenSaveProfile={actions.openSaveProfile}
        onSignOut={actions.signOut}
        logoVariant={logoVariant}
        logoTone={logoTone}
        isBusy={isBusy}
        activeActionId={activeActionId}
        onSelectMode={onSelectMode}
      />
    </>
  );
}

function HomeErrorBanner({ error, onDismiss }) {
  if (!error) return null;

  return (
    <StatusBanner
      overlay
      overlayClassName="top-[5.25rem] sm:top-[6.25rem]"
      variant="danger"
      title="Lobby error"
      body={error}
      className="max-w-md"
      actions={
        <Button variant="secondary" size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      }
    />
  );
}

function HomeTableBoard({ initialAccount = null }) {
  const router = useRouter();
  const matchFoundSound = useMatchFoundSound();
  const viewportWidth = useViewportWidth();
  const { variant: logoVariant, tone: logoTone } = useHomeBrandLogoOptions();
  const isBoardLayoutReady = viewportWidth > 0;
  const isCompact = isBoardLayoutReady && viewportWidth < 760;
  const [pieceState, setPieceState] = useState(() => createHomeDemoPieceState());
  const [isBoardMeasured, setIsBoardMeasured] = useState(false);
  const [isHomeDemoReady, setIsHomeDemoReady] = useState(false);
  const boardRef = useRef(null);
  const placementLayerRef = useRef(null);
  const placementRoadLayerRef = useRef(null);
  const lobby = useLobbyHomeActions({
    initialAccount,
    onMatchFound: matchFoundSound.play,
  });
  useEffect(() => {
    if (lobby.searchState?.phase === "searching") matchFoundSound.prime();
  }, [lobby.searchState?.phase, matchFoundSound]);
  const matchAlerts = useMatchAlerts();
  const handleMatchAlertAction = (action) => {
    if (action === "enable") return matchAlerts.enable();
    if (action === "disable") return matchAlerts.disable();
    if (action === "resume") return matchAlerts.resume();
    return Promise.resolve();
  };
  const handledPlayOnlineQueryRef = useRef(false);
  const boardReservedHeight = isCompact ? 276 : 158;
  const boardCenterYOffset = isCompact ? -56 : 0;

  useEffect(() => {
    const intent = consumePlayOnlineIntent({
      href: window.location.href,
      accountReady: lobby.accountReady,
      alreadyHandled: handledPlayOnlineQueryRef.current,
    });
    handledPlayOnlineQueryRef.current = intent.handled;
    if (!intent.shouldPlay) return;

    router.replace(intent.nextHref, { scroll: false });
    lobby.actions.playOnline();
  }, [lobby.accountReady, lobby.actions, router]);

  const handleSelectMode = (mode) => {
    if (mode === "queue") {
      lobby.actions.playOnline();
      return;
    }

    if (mode === "bot") {
      lobby.actions.playBot();
      return;
    }

    if (mode === "friend") {
      lobby.actions.playFriend();
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadDeferredHomepage = () => {
      void Promise.all([
        loadHomeDemoBoard(),
        loadHomeDemoEffectBridge(),
        loadAccountEntryModal(),
        loadIdentityModal(),
      ]).finally(() => {
        if (!cancelled) setIsHomeDemoReady(true);
      });
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleCallbackId = window.requestIdleCallback(loadDeferredHomepage, {
        timeout: 1500,
      });
      return () => {
        cancelled = true;
        window.cancelIdleCallback?.(idleCallbackId);
      };
    }

    const timeoutId = window.setTimeout(loadDeferredHomepage, 1200);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <main
      className="fixed inset-0 overflow-hidden text-slate-900"
      style={{ background: CATANA_TABLE_BACKGROUND }}
    >
      <HomeTableSurface
        pieceState={pieceState}
        isCompact={isCompact}
        boardRef={boardRef}
        placementLayerRef={placementLayerRef}
        placementRoadLayerRef={placementRoadLayerRef}
        isBoardMeasured={isBoardMeasured}
        onBoardMeasuredChange={setIsBoardMeasured}
        logoVariant={logoVariant}
        logoTone={logoTone}
        isBusy={lobby.isBusy}
        activeActionId={lobby.activeActionId}
        identity={lobby.identity}
        accountStatus={lobby.account?.status}
        hasIdentity={lobby.hasIdentity}
        matchAlertDisplay={matchAlerts.display}
        matchAlertLoading={matchAlerts.loading}
        matchAlertError={matchAlerts.error}
        onMatchAlertAction={handleMatchAlertAction}
        isBoardLayoutReady={isBoardLayoutReady}
        isHomeDemoReady={isHomeDemoReady}
        actions={lobby.actions}
        onSelectMode={handleSelectMode}
      />
      <HomeErrorBanner
        error={lobby.error}
        onDismiss={lobby.actions.dismissError}
      />

      {lobby.entryModal.open ? (
        <React.Suspense fallback={null}>
          <LazyAccountEntryModal
            open={lobby.entryModal.open}
            mode={lobby.entryModal.mode}
            intent={lobby.entryModal.intent}
            identity={lobby.identity}
            authOptions={lobby.authOptions}
            onClose={lobby.overlays.closeEntryModal}
            onSwitchToAuth={lobby.actions.switchEntryToAuth}
            onPlayUsernameSubmit={lobby.overlays.handlePlayUsernameSubmit}
            onEmailSignIn={lobby.overlays.handleAuthEmailSignIn}
            onEmailSignUp={lobby.overlays.handleAuthEmailSignUp}
            onSignInProvider={lobby.actions.signInWithProvider}
            onContinueAsGuest={lobby.actions.continueAsGuest}
          />
        </React.Suspense>
      ) : null}

      {isBoardLayoutReady && isHomeDemoReady ? (
        <React.Suspense fallback={null}>
          <LazyHomeDemoEffectBridge
            placementLayerRef={placementLayerRef}
            placementRoadLayerRef={placementRoadLayerRef}
            reservedHeight={boardReservedHeight}
            centerYOffset={boardCenterYOffset}
            onPieceStateChange={setPieceState}
          />
        </React.Suspense>
      ) : null}

      {lobby.showIdentity ? (
        <React.Suspense fallback={null}>
          <LazyIdentityModal
            onSubmit={lobby.overlays.handleIdentitySubmit}
            onClose={lobby.overlays.closeIdentity}
            initialName={lobby.identity.name}
            initialEmoji={lobby.identity.emoji}
            initialColor={lobby.identity.color}
          />
        </React.Suspense>
      ) : null}

      <SearchingModal
        searchState={lobby.searchState}
        searchElapsedSeconds={lobby.searchElapsedSeconds}
        matchAlertDisplay={matchAlerts.display}
        matchAlertLoading={matchAlerts.loading}
        matchAlertError={matchAlerts.error}
        onMatchAlertAction={handleMatchAlertAction}
        isPufferTransitionPending={lobby.isPufferTransitionPending}
        onCancel={lobby.overlays.cancelSearch}
        onPlayPuffer={lobby.actions.playPufferFromSearch}
      />
    </main>
  );
}

export function HomeTableClient({ initialAccount = null }) {
  return <HomeTableBoard initialAccount={initialAccount} />;
}
