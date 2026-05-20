/* eslint-disable @next/next/no-img-element */
import React, { useCallback, useMemo } from "react";
import Image from "./NextImage";
import {
  DEV_CARD_SVGS,
  getMobileDevCardButtonState,
} from "./devCardDisplayUtils";

const DEV_CARD_BACK_SVG = "/svgs/cards/development/card_devcardback.svg";

export function MobileDevCardButton({
  cards = [],
  playableCountsByType = {},
  playerId = null,
  isOpen = false,
  onToggle,
  containerRef = null,
  forceMount = false,
}) {
  const { totalCount, previewType } = useMemo(
    () => getMobileDevCardButtonState({ cards, playableCountsByType }),
    [cards, playableCountsByType]
  );
  const setContainerNode = useCallback(
    (node) => {
      if (typeof containerRef === "function") {
        containerRef(node);
      } else if (containerRef) {
        containerRef.current = node;
      }
    },
    [containerRef]
  );
  const anchorId = playerId != null ? `p${playerId}-devcards` : undefined;

  if (totalCount === 0 && !forceMount) {
    return null;
  }

  if (totalCount === 0) {
    return (
      <span
        ref={setContainerNode}
        id={anchorId}
        className="pointer-events-none absolute right-3 top-1/2 h-14 w-10 -translate-y-1/2 opacity-0"
        aria-hidden="true"
        data-mobile-devcard-reveal-anchor="true"
      />
    );
  }

  const previewSrc = previewType ? DEV_CARD_SVGS[previewType] : DEV_CARD_BACK_SVG;
  const showStack = totalCount > 1;
  const buttonClassName = [
    "relative flex h-[3.6rem] w-[2.85rem] shrink-0 items-center justify-center overflow-visible rounded-[0.85rem] bg-transparent p-0 transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-[0.98]",
    isOpen ? "" : "hover:brightness-105",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={setContainerNode}
      id={anchorId}
      type="button"
      className={buttonClassName}
      aria-label={`Development cards: ${totalCount}`}
      aria-expanded={isOpen}
      aria-controls={isOpen ? "mobile-devcard-tray" : undefined}
      onClick={onToggle}
      onContextMenu={(event) => event.preventDefault()}
      data-mobile-devcard-button="true"
      data-allow-interaction="true"
    >
      {isOpen ? (
        <span
          className="relative flex h-[2.65rem] w-[1.75rem] items-center justify-center rounded-[0.7rem] border border-white/[0.24] bg-white/[0.1] shadow-[0_10px_18px_-14px_rgba(15,23,42,0.78)]"
          data-mobile-devcard-collapse-handle="true"
        >
          <span
            className="h-2.5 w-2.5 rotate-45 border-l-2 border-t-2 border-white/82"
            aria-hidden="true"
          />
        </span>
      ) : showStack ? (
        <>
          <Image
            src={DEV_CARD_BACK_SVG}
            alt=""
            width={52}
            height={72}
            className="absolute left-[0.36rem] top-1/2 z-0 h-[2.78rem] w-[2.02rem] -translate-y-1/2 -rotate-[7deg] rounded-[0.38rem] object-contain opacity-90"
          />
          <Image
            src={DEV_CARD_BACK_SVG}
            alt=""
            width={52}
            height={72}
            className="absolute left-[0.58rem] top-1/2 z-0 h-[2.86rem] w-[2.08rem] -translate-y-1/2 rotate-[4deg] rounded-[0.38rem] object-contain opacity-95"
          />
        </>
      ) : null}
      {!isOpen ? (
        <Image
          src={previewSrc}
          alt=""
          width={52}
          height={72}
          className="relative z-10 h-[2.98rem] w-[2.16rem] rounded-[0.38rem] object-contain"
        />
      ) : null}
    </button>
  );
}
