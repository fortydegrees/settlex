import React, { useMemo } from "react";
import Image from "./NextImage";
import "./DevCardDisplay.css";
import { CardStack } from "./CardStack";
import { DEFAULT_STACK_MAX_WIDTH, getCardStackLayout } from "./CardStackLayout";
import { getBadgeClasses } from "./CardStackStyles";
import { getPlayableDevCardGroups } from "./devCardDisplayUtils";

// Map DevCard types to their SVGs
const DEV_CARD_SVGS = {
  knight: "/svgs/cards/development/knight.svg",
  victoryPoint: "/svgs/cards/development/victory_point.svg",
  roadBuilding: "/svgs/cards/development/roadbuilding.svg",
  yearOfPlenty: "/svgs/cards/development/year_of_plenty.svg",
  monopoly: "/svgs/cards/development/monopoly.svg",
};

export const DevCardDisplay = ({
  cards = [],
  playableCountsByType = {},
  onPlayCard,
  activeCardType,
  showCountBadge = false,
  badgeMinCount = 3,
}) => {
  const { nonPlayable, playableGroups, boxWidth, groupGap } =
    useMemo(() => {
      const vps = cards.filter((card) => card === "victoryPoint");
      const cardWidth = 52;
      const vpStackOffsetValue = 16;
      const playableGroupGap = 10;
      const playableGroups = getPlayableDevCardGroups({
        cards,
        playableCountsByType,
        cardWidth,
        stackOffset: vpStackOffsetValue,
        maxStackWidth: DEFAULT_STACK_MAX_WIDTH,
        badgeMinCount
      });

      const groupGap =
        vps.length > 0 && playableGroups.length > 0 ? 16 : 0;
      const paddingX = 12;
      const vpLayout = vps.length
        ? getCardStackLayout({
            count: vps.length,
            cardWidth,
            stackOffset: vpStackOffsetValue,
            maxVisible: vps.length,
            maxStackWidth: DEFAULT_STACK_MAX_WIDTH,
            badgeMinCount
          })
        : null;
      const vpWidth = vpLayout ? vpLayout.width : 0;
      const playableWidth = playableGroups.reduce((total, group, index) => {
        const gap = index > 0 ? playableGroupGap : 0;
        return total + gap + group.layout.width;
      }, 0);
      const contentWidth = vpWidth + playableWidth + groupGap;
      const width = contentWidth > 0 ? paddingX * 2 + contentWidth : 0;

      return {
        nonPlayable: vps,
        playableGroups,
        boxWidth: Math.round(width),
        groupGap: playableGroupGap
      };
    }, [cards, playableCountsByType, badgeMinCount]);

  if (cards.length === 0) {
    return null;
  }

  const cardStyle =
    "h-[72px] w-[52px] shrink-0 object-contain drop-shadow-md";
  const hasBoth = nonPlayable.length > 0 && playableGroups.length > 0;

  return (
    <div
      className="devcard-box devcard-pop inline-flex h-20 items-center rounded-md bg-blue-200/50 px-3 ring-2 ring-slate-300 shadow-sm origin-bottom-left relative"
      style={{ width: `${boxWidth}px` }}
    >
      {/* Non-Playable (Victory Points) */}
      {nonPlayable.length > 0 && (
        <CardStack
          count={nonPlayable.length}
          src={DEV_CARD_SVGS.victoryPoint}
          alt="Victory point"
          maxVisible={nonPlayable.length}
          badgeMinCount={badgeMinCount}
        />
      )}

      {/* Spacer if we have both types */}
      {hasBoth && <div className="w-4" />}

      {/* Playable Cards */}
      <div className="flex items-center">
        {playableGroups.map((group, groupIndex) => (
          <div
            key={`playable-group-${group.type}`}
            className="relative h-[72px]"
            style={{
              width: `${group.layout.width}px`,
              marginLeft: groupIndex > 0 ? `${groupGap}px` : 0
            }}
          >
            {group.layout.showBadge && (
              <div className={getBadgeClasses("default")}>{group.count}</div>
            )}
            {group.cards.map((card, index) => {
              const isPlayable = card.isPlayable;
              const isActive = activeCardType === card.type;
              const wrapperClass = [
                "absolute top-0 devcard-card",
                isPlayable ? "devcard-playable" : "devcard-disabled",
                isActive ? "devcard-active" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <button
                  key={`playable-${card.type}-${index}`}
                  type="button"
                  className={wrapperClass}
                  onClick={() => {
                    if (isPlayable && onPlayCard) onPlayCard(card.type);
                  }}
                  disabled={!isPlayable}
                  style={{
                    left: `${index * group.layout.offset}px`,
                    zIndex: index
                  }}
                >
                  <Image
                    src={DEV_CARD_SVGS[card.type]}
                    alt={card.type}
                    width={52}
                    height={72}
                    className={cardStyle}
                  />
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {showCountBadge && (
        <div className={getBadgeClasses("default")}>{cards.length}</div>
      )}
    </div>
  );
};
