"use client";
import { CatanBoard } from "./Board";
import {
  TransformWrapper,
  TransformComponent,
} from "../../react-zoom-pan-pinch";
import React, { useState, useEffect } from "react";

import { buildPlayerViewMap } from "./utils/playerView";
import { shouldCancelBuildAction } from "./utils/cancelBuildAction";

import { EffectsBoardWrapper } from "bgio-effects/react";

import { PlayerActionContainer } from "./components/PlayerActionContainer";
import { OpponentPlayerBox } from "./components/OpponentPlayerBox";
import { TradeDiscardModal } from "./components/TradeDiscardModal";
import { DebugPanel } from "./components/DebugPanel";

export function GameScreen(bgioProps) {
  //playerAction is things that appear to the user (not spectator)
  //e.g. placeRoad, placeSettle, placeCity, moveRobber, trading
  //but i think we want this controlled by server/gameState
    //e.g. if disconnect after placing one road of RB, reconnect will want to prompt to place second road
  const [playerAction, setPlayerAction] = useState(null);
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [tradePresetResource, setTradePresetResource] = useState(null);
  const moves = bgioProps.moves;

  //get the active playerID of who's watching
  //can be null for spectator?
  //TODO: handle null/spectator
  const playerID = bgioProps.playerID;

  const core = bgioProps.G.core;
  const coreTurn = core?.turn;
  const playerViewMap = buildPlayerViewMap(core);
  const player = playerViewMap[playerID];
  const devPlay = bgioProps.G.devCardPlay;
  const devPlayForMe = devPlay?.playerId === playerID;
  const devPlayMode =
    devPlay?.type === "yearOfPlenty"
      ? "dev-yop"
      : devPlay?.type === "monopoly"
      ? "dev-monopoly"
      : null;

  useEffect(() => {
    if (devPlay?.type === "roadBuilding" && devPlay.playerId === playerID) {
      if (playerAction !== "roadBuilding") {
        setPlayerAction("roadBuilding");
      }
      return;
    }
    if (playerAction === "roadBuilding") {
      setPlayerAction(null);
    }
  }, [bgioProps.G.devCardPlay, playerID, playerAction]);

  // Discard Logic
  // Check if pendingDiscards list includes the current player
  // NOTE: We used to check bgioProps.ctx.phase === 'robberDiscard' but sometimes
  // the client-side derived ctx.phase might lag or differ if the game engine isn't strictly mapping G to ctx phases 1:1.
  // Relying on G.core.turn.pendingDiscards is more robust because that IS the source of truth for "who needs to discard".
  // Also, G.core.turn.phase should be 'robberDiscard' if pendingDiscards > 0, but let's be safe.
  const needsToDiscard = coreTurn?.pendingDiscards?.includes(playerID) ?? false;
  
  const discardCount = needsToDiscard ? Math.floor(player.resources.length / 2) : 0;

  const handleDiscardConfirm = (resourcesToDiscard) => {
    bgioProps.moves.discardResources(resourcesToDiscard);
    // Modal will auto-close when phase/state updates
  };

  const handleTradeConfirm = (tradeData) => {
    // console.log("Trade:", tradeData);
    // Connect to actual move:
    bgioProps.moves.maritimeTrade(tradeData);
    // For now just close
    setShowTradeModal(false);
    setTradePresetResource(null);
  };

  const handleDevPlayConfirm = (payload) => {
    bgioProps.moves.confirmDevCardPlay(payload);
  };

  const handleDevPlayCancel = () => {
    bgioProps.moves.cancelDevCardPlay();
  };

  const handleTradeOpen = (resource) => {
    setTradePresetResource(resource ?? null);
    setShowTradeModal(true);
  };

  const canRoll = Boolean(
    playerID &&
      bgioProps.ctx.currentPlayer === playerID &&
      bgioProps.ctx.activePlayers?.[playerID] === "preRoll" &&
      core?.phase === "normal" &&
      coreTurn?.phase === "preRoll"
  );

  const canEnd = Boolean(
    playerID &&
      bgioProps.ctx.currentPlayer === playerID &&
      bgioProps.ctx.activePlayers?.[playerID] === "postRoll" &&
      core?.phase === "normal" &&
      coreTurn?.hasRolled &&
      coreTurn?.phase === "postRoll" &&
      (coreTurn?.pendingDiscards?.length ?? 0) === 0
  );

  const hasModalOpen =
    showTradeModal || needsToDiscard || (devPlayForMe && devPlayMode);

  //TODO: this will return multiple for non 1v1 games. handle in UI appropriately
  //const opponentID = bgioProps.G.players.map(p=>(p.id !== playerID) ? p.id : null).filter(p=>p!== null)[0]
  const opponents = Object.values(playerViewMap).filter(
    (view) => view.id !== playerID
  );

  //const otherPlayerCards = bgioProps.G.players[opponentID].resourceCards; //TODO: horrible, clean up. might need to check if playerID exists (e.g. what about spectator)

  //we get a username here, being 'playerID' currently..

  const handleScreenClickCapture = (event) => {
    const target = event?.target;
    const targetIsActionCircle = Boolean(
      target?.closest?.('[data-action-circle="true"]')
    );
    if (
      shouldCancelBuildAction({
        playerAction,
        phase: bgioProps.ctx.phase,
        targetIsActionCircle
      })
    ) {
      setPlayerAction(null);
    }
  };
  const allowInteractionSelector = '[data-allow-interaction="true"]';
  const handleContextMenu = (event) => {
    // Opt-in for future log/chat/status containers.
    if (event?.target?.closest?.(allowInteractionSelector)) return;
    event.preventDefault();
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.code !== "Space") return;
      if (event.repeat) return;
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
        return;
      }

      const targetElement = event.target instanceof Element ? event.target : null;
      const isEditable = targetElement?.closest?.(
        "input, textarea, select, [contenteditable]"
      );
      if (isEditable) return;
      if (hasModalOpen) return;

      event.preventDefault();

      if (canRoll) {
        moves.rollDice();
        return;
      }
      if (canEnd) {
        moves.endTurn();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canRoll, canEnd, hasModalOpen, moves]);
  // console.log('p', player)
  // console.log('opps', opponents)
  return (
    <div
      className="bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600 select-none"
      style={{
        width: "100vw", // Use viewport width to take the full screen width
        height: "100vh", // Use viewport height to take the full screen height
        overflow: "hidden", // Prevent scrollbars on the page
        position: "fixed", // Fix the object in place
        top: 0,
        left: 0,
      }}
      onClickCapture={handleScreenClickCapture}
      onContextMenu={handleContextMenu}
    >
      {/* board in zoom/pan/pinch wrapper  */}
      <TransformWrapper
        minPositionX={-500}
        minPositionY={-200}
        maxPositionX={500}
        maxPositionY={500}
        maxScale={6}
        minScale={0.3}
      >
        <TransformComponent>
          <CatanBoard playerAction={playerAction} setPlayerAction={setPlayerAction} {...bgioProps} />
        </TransformComponent>
      </TransformWrapper>

      {/* our cards and action dock 
TODO: accurately colour it
*/}
      {!!player && (
        <PlayerActionContainer
          setPlayerAction={setPlayerAction}
          bgioProps={bgioProps}
          //playerID={bgioProps.playerID} //for multiplayer
          player={player} //for testing/dev
          onTradeClick={handleTradeOpen}
          canRoll={canRoll}
          canEnd={canEnd}
        />
      )}

      {/* MODALS */}
      {/* 1. Force Discard Modal */}
      {!!player && needsToDiscard && (
        <TradeDiscardModal
          mode="discard"
          player={player}
          requiredDiscardCount={discardCount}
          onConfirm={handleDiscardConfirm}
          // No cancel for forced discard
        />
      )}

      {/* 2. Manual Trade Modal */}
      {!!player && showTradeModal && !needsToDiscard && (
        <TradeDiscardModal
          mode="trade"
          player={player}
          onConfirm={handleTradeConfirm}
          onCancel={() => {
            setShowTradeModal(false);
            setTradePresetResource(null);
          }}
          G={bgioProps.G}
          tradePresetResource={tradePresetResource}
        />
      )}

      {!!player && devPlayForMe && devPlayMode && !needsToDiscard && (
        <TradeDiscardModal
          mode={devPlayMode}
          player={player}
          onConfirm={handleDevPlayConfirm}
          onCancel={handleDevPlayCancel}
          G={bgioProps.G}
        />
      )}

      {opponents.length > 0 && (
        <div className="fixed left-1/2 -translate-x-1/2 top-6 flex items-center gap-4">
          {opponents.map((opponent) => (
            <OpponentPlayerBox
              key={opponent.id}
              player={opponent}
              core={bgioProps.G.core}
              coreTopology={bgioProps.G.coreTopology}
            />
          ))}
        </div>
      )}

      <DebugPanel bgioProps={bgioProps} />
    </div>
  );
}

export const GameScreenWithEffects = EffectsBoardWrapper(GameScreen, {
  // Wait until all effects have finished before updating state.
  updateStateAfterEffects: true,
});
