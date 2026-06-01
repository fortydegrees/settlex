import React, { useCallback, useEffect, useRef, useState } from "react";

const joinClassNames = (...parts) => parts.filter(Boolean).join(" ");
const END_TURN_HOLD_MS = 1000;

export function MobilePrimaryTurnButton({
  mode = "inactive",
  canRoll = false,
  canEnd = false,
  onRoll,
  onEndTurn,
  onHaptic,
  isBusy = false,
}) {
  const isRoll = mode === "roll";
  const isEndTurn = mode === "endTurn";

  const isEnabled = isRoll ? canRoll : canEnd;
  const label = isRoll ? "Roll Dice" : "End Turn";
  const ariaLabel = isRoll ? "Roll dice" : "Hold to end turn";
  const onClick = isRoll ? onRoll : onEndTurn;
  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef(null);
  const holdConfirmedRef = useRef(false);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current != null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
  }, []);

  useEffect(() => clearHold, [clearHold]);

  const confirmEndTurn = useCallback(() => {
    if (!isEndTurn || !isEnabled || isBusy || !onEndTurn) return;
    holdConfirmedRef.current = true;
    clearHold();
    onHaptic?.({ name: "ui:end-turn:hold:confirm" });
    onEndTurn();
  }, [clearHold, isBusy, isEnabled, isEndTurn, onEndTurn, onHaptic]);

  const startEndTurnHold = useCallback(() => {
    if (!isEndTurn || !isEnabled || isBusy || !onEndTurn) return;
    clearHold();
    holdConfirmedRef.current = false;
    setIsHolding(true);
    onHaptic?.({ name: "ui:end-turn:hold:start" });
    holdTimerRef.current = window.setTimeout(confirmEndTurn, END_TURN_HOLD_MS);
  }, [clearHold, confirmEndTurn, isBusy, isEnabled, isEndTurn, onEndTurn, onHaptic]);

  const cancelEndTurnHold = useCallback(() => {
    if (!isEndTurn) return;
    clearHold();
  }, [clearHold, isEndTurn]);

  const handleClick = useCallback(
    (event) => {
      if (isEndTurn) {
        event.preventDefault();
        return;
      }
      if (isEnabled && !isBusy) {
        onHaptic?.({ name: "ui:roll:press" });
        onClick?.();
      }
    },
    [isBusy, isEnabled, isEndTurn, onClick, onHaptic]
  );

  const handlePointerDown = useCallback(
    (event) => {
      if (!isEndTurn) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      startEndTurnHold();
    },
    [isEndTurn, startEndTurnHold]
  );

  const handlePointerUp = useCallback(
    (event) => {
      if (!isEndTurn) return;
      event.preventDefault();
      event.currentTarget.releasePointerCapture?.(event.pointerId);
      if (!holdConfirmedRef.current) cancelEndTurnHold();
      holdConfirmedRef.current = false;
    },
    [cancelEndTurnHold, isEndTurn]
  );

  const handleContextMenu = useCallback(
    (event) => {
      if (!isEndTurn) return;
      event.preventDefault();
    },
    [isEndTurn]
  );

  const handleKeyDown = useCallback(
    (event) => {
      if (!isEndTurn) return;
      if (event.key !== " " && event.key !== "Enter") return;
      if (event.repeat) return;
      event.preventDefault();
      startEndTurnHold();
    },
    [isEndTurn, startEndTurnHold]
  );

  const handleKeyUp = useCallback(
    (event) => {
      if (!isEndTurn) return;
      if (event.key !== " " && event.key !== "Enter") return;
      event.preventDefault();
      if (!holdConfirmedRef.current) cancelEndTurnHold();
      holdConfirmedRef.current = false;
    },
    [cancelEndTurnHold, isEndTurn]
  );

  if (!isRoll && !isEndTurn) return null;

  return (
    <button
      type="button"
      className={joinClassNames(
        "mobile-primary-turn-button relative flex h-[3.85rem] w-full touch-none items-center justify-center overflow-hidden rounded-[1.35rem] border px-6 text-[1.28rem] font-black tracking-normal shadow-[0_20px_38px_-24px_rgba(15,23,42,0.72),inset_0_1px_0_rgba(255,255,255,0.46)] transition-[transform,filter,opacity] duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-white/80 active:scale-[0.985]",
        isRoll &&
          "mobile-primary-turn-button--roll border-yellow-100/70 bg-[linear-gradient(180deg,rgba(254,230,138,0.98),rgba(250,204,21,0.96))] text-amber-950",
        isEndTurn &&
          "mobile-primary-turn-button--end-turn border-lime-100/65 bg-[linear-gradient(180deg,rgba(181,238,82,0.98),rgba(101,198,38,0.96))] text-white",
        !isEnabled && "cursor-not-allowed opacity-55"
      )}
      aria-label={ariaLabel}
      disabled={!isEnabled || isBusy}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelEndTurnHold}
      onPointerLeave={cancelEndTurnHold}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      data-mobile-primary-turn-button={mode}
      data-allow-interaction="true"
      data-hold-active={isEndTurn && isHolding ? "true" : undefined}
    >
      {isEndTurn ? (
        <span
          className={joinClassNames(
            "pointer-events-none absolute inset-y-0 left-0 w-full origin-left bg-[linear-gradient(90deg,rgba(255,255,255,0.18),rgba(255,255,255,0.56),rgba(236,253,245,0.34))] shadow-[inset_-18px_0_24px_-22px_rgba(255,255,255,0.9)] transition-transform ease-linear",
            isHolding ? "scale-x-100" : "scale-x-0 duration-100"
          )}
          style={isHolding ? { transitionDuration: `${END_TURN_HOLD_MS}ms` } : null}
          aria-hidden="true"
        >
          <span className="absolute inset-y-0 right-0 w-8 bg-white/42 blur-[10px]" />
        </span>
      ) : null}
      <span className="relative z-10">{label}</span>
    </button>
  );
}
