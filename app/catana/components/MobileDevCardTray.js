/* eslint-disable @next/next/no-img-element */
import React, { useMemo } from "react";
import Image from "./NextImage";
import {
  DEV_CARD_SVGS,
  DEV_CARD_TEXT,
  getDevCardHandGroups,
} from "./devCardDisplayUtils";

const MOBILE_TRAY_CARD_WIDTH = 36;
const MOBILE_TRAY_CARD_HEIGHT = 50;

function MobileDevCardGroupButton({ group, activeCardType, onPlayCard, onClose }) {
  const text = DEV_CARD_TEXT[group.type];
  const isActive = activeCardType === group.type;
  const isPlayable = group.isPlayable;
  const cardCountLabel = group.count > 1 ? ` x${group.count}` : "";
  const className = [
    "mobile-devcard-group relative flex min-w-[3.25rem] items-center justify-center rounded-small px-ui-1.5 py-ui-0.5 transition duration-150 ease-out",
    isPlayable
      ? "mobile-devcard-group--playable"
      : "mobile-devcard-group--inactive",
    isActive ? "mobile-devcard-group--active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={className}
      aria-label={`${text.name}${cardCountLabel}`}
      aria-disabled={!isPlayable}
      onClick={(event) => {
        if (!isPlayable) {
          event.preventDefault();
          return;
        }
        onPlayCard?.(group.type);
        onClose?.();
      }}
      onContextMenu={(event) => event.preventDefault()}
      data-mobile-devcard-tray-card="true"
      data-allow-interaction="true"
    >
      <span
        className="relative block"
        style={{
          width: `${Math.round(group.layout.width)}px`,
          height: `${MOBILE_TRAY_CARD_HEIGHT}px`,
        }}
      >
        {Array.from({ length: group.layout.visibleCount }).map((_, cardIndex) => (
          <span
            key={`mobile-devcard-${group.type}-${cardIndex}`}
            className="absolute top-0 overflow-hidden rounded-[0.38rem]"
            style={{
              left: `${cardIndex * group.layout.offset}px`,
              width: `${MOBILE_TRAY_CARD_WIDTH}px`,
              height: `${MOBILE_TRAY_CARD_HEIGHT}px`,
              zIndex: cardIndex + 1,
            }}
          >
            <Image
              src={DEV_CARD_SVGS[group.type]}
              alt=""
              width={52}
              height={72}
              className={`h-full w-full object-contain ${
                isPlayable ? "" : "saturate-[0.86] brightness-[0.86]"
              }`}
            />
            {!isPlayable ? (
              <span className="mobile-devcard-sleep-veil absolute inset-[2px] rounded-[0.32rem]" />
            ) : null}
          </span>
        ))}
        {group.count > 3 ? (
          <span className="mobile-devcard-count-badge absolute -right-ui-2 -top-ui-2 z-20 flex h-5 min-w-5 items-center justify-center rounded-pill border px-ui-1 type-hud-tray-count">
            {group.count}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export function MobileDevCardTray({
  cards = [],
  playableCountsByType = {},
  activeCardType,
  onPlayCard,
  onClose,
}) {
  const groups = useMemo(
    () =>
      getDevCardHandGroups({
        cards,
        playableCountsByType,
        cardWidth: MOBILE_TRAY_CARD_WIDTH,
        stackOffset: 11,
        maxStackWidth: 62,
        badgeMinCount: 4,
      }),
    [cards, playableCountsByType]
  );

  if (groups.length === 0) {
    return null;
  }

  return (
    <div
      className="mobile-devcard-tray relative z-10 mx-auto mt-ui-1.5 w-fit min-w-[7.25rem] max-w-full overflow-hidden rounded-control border px-ui-3 py-ui-1"
      id="mobile-devcard-tray"
      role="dialog"
      aria-label="Development cards"
      data-mobile-devcard-tray-layer="true"
      data-mobile-devcard-tray="true"
      data-allow-interaction="true"
    >
      <div className="mx-auto flex w-max max-w-full items-center justify-center gap-ui-5 overflow-x-auto px-ui-0.5 py-ui-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {groups.map((group) => (
          <MobileDevCardGroupButton
            key={group.type}
            group={group}
            activeCardType={activeCardType}
            onPlayCard={onPlayCard}
            onClose={onClose}
          />
        ))}
      </div>
    </div>
  );
}
