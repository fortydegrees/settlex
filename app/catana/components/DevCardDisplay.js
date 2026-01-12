import React, { useMemo } from "react";
import Image from "next/image";
import "./DevCardDisplay.css";

// Map DevCard types to their SVGs
const DEV_CARD_SVGS = {
  knight: "/svgs/card_devcard_knight.svg",
  victoryPoint: "/svgs/card_devcard_vp.svg",
  roadBuilding: "/svgs/card_devcard_roadbuilding.svg",
  yearOfPlenty: "/svgs/card_devcard_yearofplenty.svg",
  monopoly: "/svgs/card_devcard_monopoloy.svg", // Typo in filename 'monopoloy' preserved
};

export const DevCardDisplay = ({
  cards = [],
  playableByType = {},
  onPlayCard,
  activeCardType,
}) => {
  const { nonPlayable, playable, boxWidth, vpStackWidth, vpStackOffset } =
    useMemo(() => {
      const vps = [];
      const playableOrder = [];
      const playableCounts = new Map();

    cards.forEach((card) => {
      if (card === "victoryPoint") {
        vps.push(card);
        return;
      }
      if (!playableCounts.has(card)) {
        playableOrder.push(card);
        playableCounts.set(card, 0);
      }
      playableCounts.set(card, playableCounts.get(card) + 1);
    });

    const groupedPlayable = [];
    playableOrder.forEach((card) => {
      const count = playableCounts.get(card) ?? 0;
      for (let i = 0; i < count; i += 1) {
        groupedPlayable.push(card);
      }
    });

    const cardWidth = 52;
    const cardGap = 6;
    const vpStackOffsetValue = 16;
    const groupGap = vps.length > 0 && groupedPlayable.length > 0 ? 16 : 0;
    const paddingX = 12;
    const vpWidth = vps.length
      ? cardWidth + (vps.length - 1) * vpStackOffsetValue
      : 0;
    const playableWidth = groupedPlayable.length
      ? cardWidth * groupedPlayable.length +
        Math.max(0, groupedPlayable.length - 1) * cardGap
      : 0;
    const contentWidth = vpWidth + playableWidth + groupGap;
    const width = contentWidth > 0 ? paddingX * 2 + contentWidth : 0;

      return {
        nonPlayable: vps,
        playable: groupedPlayable,
        boxWidth: Math.round(width),
        vpStackWidth: Math.round(vpWidth),
        vpStackOffset: vpStackOffsetValue,
      };
    }, [cards]);

  if (cards.length === 0) {
    return null;
  }

  const cardStyle =
    "h-[72px] w-[52px] shrink-0 object-contain drop-shadow-md";
  const hasBoth = nonPlayable.length > 0 && playable.length > 0;

  return (
    <div
      className="devcard-box devcard-pop inline-flex h-20 items-center rounded-md bg-blue-200/50 px-3 ring-2 ring-slate-300 shadow-sm origin-bottom-left"
      style={{ width: `${boxWidth}px` }}
    >
      {/* Non-Playable (Victory Points) */}
      <div className="relative h-[72px]" style={{ width: `${vpStackWidth}px` }}>
        {nonPlayable.map((card, i) => (
          <div
            key={`vp-${i}`}
            className="absolute top-0"
            style={{ left: `${i * vpStackOffset}px`, zIndex: i }}
          >
            <Image
              src={DEV_CARD_SVGS[card]}
              alt={card}
              width={52}
              height={72}
              className={cardStyle}
            />
          </div>
        ))}
        {nonPlayable.length >= 3 && (
          <div className="absolute -top-2 -right-2 z-20 h-5 min-w-[1.25rem] rounded-full bg-blue-50 px-1 text-xs font-semibold text-slate-700 ring-2 ring-white flex items-center justify-center">
            {nonPlayable.length}
          </div>
        )}
      </div>

      {/* Spacer if we have both types */}
      {hasBoth && <div className="w-4" />}

      {/* Playable Cards */}
      <div className="flex items-center gap-[6px]">
        {playable.map((card, i) => {
          const isPlayable = Boolean(playableByType[card]);
          const isActive = activeCardType === card;
          const wrapperClass = [
            "relative devcard-card",
            isPlayable ? "devcard-playable" : "devcard-disabled",
            isActive ? "devcard-active" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={`playable-${i}`}
              type="button"
              className={wrapperClass}
              onClick={() => {
                if (isPlayable && onPlayCard) onPlayCard(card);
              }}
              disabled={!isPlayable}
            >
              <Image
                src={DEV_CARD_SVGS[card]}
                alt={card}
                width={52}
                height={72}
                className={cardStyle}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};
