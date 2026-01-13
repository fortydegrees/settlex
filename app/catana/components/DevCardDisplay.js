import React, { useMemo } from "react";
import Image from "next/image";
import "./DevCardDisplay.css";
import { CardStack } from "./CardStack";
import { getCardStackLayout } from "./CardStackLayout";

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
  const { nonPlayable, playable, boxWidth } =
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
      const vpLayout = vps.length
        ? getCardStackLayout({
            count: vps.length,
            cardWidth,
            stackOffset: vpStackOffsetValue,
            maxVisible: vps.length,
          })
        : null;
      const vpWidth = vpLayout ? vpLayout.width : 0;
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
      {nonPlayable.length > 0 && (
        <CardStack
          count={nonPlayable.length}
          src={DEV_CARD_SVGS.victoryPoint}
          alt="Victory point"
          maxVisible={nonPlayable.length}
        />
      )}

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
