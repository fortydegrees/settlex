import React, { useCallback, useMemo, useRef, useState } from "react";
import Image from "./NextImage";
import "./DevCardDisplay.css";
import { getCardStackLayout } from "./CardStackLayout";
import { getBadgeClasses } from "./CardStackStyles";
import { DEV_CARD_DISPLAY_ORDER, getPlayableDevCardGroups } from "./devCardDisplayUtils";
import { Tooltip, TooltipProvider } from "../../ui/Tooltip";

// Map DevCard types to their SVGs
const DEV_CARD_SVGS = {
  knight: "/svgs/cards/development/knight.svg",
  victoryPoint: "/svgs/cards/development/victory_point.svg",
  roadBuilding: "/svgs/cards/development/roadbuilding.svg",
  yearOfPlenty: "/svgs/cards/development/year_of_plenty.svg",
  monopoly: "/svgs/cards/development/monopoly.svg",
};

const DEV_CARD_TEXT = {
  knight: {
    name: "Knight",
    description: "Move the robber and build toward Largest Army."
  },
  victoryPoint: {
    name: "Victory Point",
    description: "A secret point that counts toward your final score."
  },
  roadBuilding: {
    name: "Road Building",
    description: "Place up to two roads without spending resources."
  },
  yearOfPlenty: {
    name: "Year of Plenty",
    description: "Take any two resources from the bank."
  },
  monopoly: {
    name: "Monopoly",
    description: "Choose a resource and claim every copy from other players."
  },
};

const CARD_WIDTH = 52;
const CARD_HEIGHT = 72;
const DOCK_PADDING_X = 12;
const DOCK_ITEM_GAP = 10;
const STACK_OFFSET = 16;
const STACK_MAX_WIDTH = CARD_WIDTH + STACK_OFFSET;
const MAGNIFICATION_DISTANCE = 124;
const MAX_SCALE = 1.28;
const MAX_LIFT = 15;
const MAX_NEIGHBOR_SCALE = 1.09;
const MAX_NEIGHBOR_LIFT = 5;

const getDockItemMotion = ({
  centerX,
  pointerX,
  focusedCenterX,
  order,
  isPrimaryTarget,
}) => {
  const activeX = pointerX ?? focusedCenterX;

  if (activeX == null) {
    return {
      scale: 1,
      lift: 0,
      zIndex: order + 1,
    };
  }

  const distance = Math.abs(activeX - centerX);
  const influence = Math.max(0, 1 - distance / MAGNIFICATION_DISTANCE);
  const eased = influence * influence * (3 - 2 * influence);
  const maxScale = isPrimaryTarget ? MAX_SCALE : MAX_NEIGHBOR_SCALE;
  const maxLift = isPrimaryTarget ? MAX_LIFT : MAX_NEIGHBOR_LIFT;
  const targetEased = isPrimaryTarget ? eased : eased * eased;

  return {
    scale: 1 + targetEased * (maxScale - 1),
    lift: targetEased * maxLift,
    zIndex: Math.round(10 + targetEased * (isPrimaryTarget ? 40 : 18)),
  };
};

const getDevCardDockItems = ({
  cards,
  playableCountsByType,
  badgeMinCount,
}) => {
  const victoryPointCount = cards.filter((card) => card === "victoryPoint").length;
  const playableGroups = getPlayableDevCardGroups({
    cards,
    playableCountsByType,
    cardWidth: CARD_WIDTH,
    badgeMinCount,
  });
  const itemsByType = new Map();

  if (victoryPointCount > 0) {
    itemsByType.set("victoryPoint", {
      type: "victoryPoint",
      count: victoryPointCount,
      playableCount: 0,
      isPlayable: false,
      layout: getCardStackLayout({
        count: victoryPointCount,
        cardWidth: CARD_WIDTH,
        stackOffset: STACK_OFFSET,
        maxVisible: victoryPointCount,
        maxStackWidth: STACK_MAX_WIDTH,
        badgeMinCount,
      }),
    });
  }

  playableGroups.forEach((group) => {
    itemsByType.set(group.type, {
      type: group.type,
      count: group.count,
      playableCount: group.playableCount,
      isPlayable: group.playableCount > 0,
      layout: getCardStackLayout({
        count: group.count,
        cardWidth: CARD_WIDTH,
        stackOffset: STACK_OFFSET,
        maxVisible: group.count,
        maxStackWidth: STACK_MAX_WIDTH,
        badgeMinCount,
      }),
    });
  });

  return ["victoryPoint", ...DEV_CARD_DISPLAY_ORDER]
    .map((type) => itemsByType.get(type))
    .filter(Boolean);
};

const getStackCardTransform = ({ cardIndex, visibleCount, lift, scale }) => {
  const depthFromFront = visibleCount - 1 - cardIndex;

  if (depthFromFront <= 0) {
    return "translateY(0px) rotate(0deg) scale(1)";
  }

  const focus = Math.max(0, Math.min(1, (scale - 1) / (MAX_SCALE - 1)));
  const fan = focus * focus;
  const maxFanDepth = Math.min(Math.max(visibleCount - 1, 1), 4);
  const depthRatio = Math.min(1, depthFromFront / maxFanDepth);
  const depthCurve = Math.pow(depthRatio, 0.78);
  const liftCounter = depthCurve * lift * 0.92 / scale;
  const rotation = -(0.35 + depthCurve * 1.75) * fan;
  const scaleCounter = 1 / (1 + (scale - 1) * depthCurve * 0.88);
  const depthScale = Math.max(0.78, scaleCounter);

  return `translateY(${liftCounter.toFixed(2)}px) rotate(${rotation.toFixed(2)}deg) scale(${depthScale.toFixed(3)})`;
};

const DevCardTooltipContent = ({ item }) => {
  const text = DEV_CARD_TEXT[item.type];
  const countLabel = item.count > 1 ? ` x${item.count}` : "";

  return (
    <span className="block max-w-[12rem] text-center">
      <span className="block text-sm font-bold text-slate-800">
        {text.name}
        {countLabel}
      </span>
      <span className="mt-0.5 block text-xs font-medium leading-snug text-slate-600">
        {text.description}
      </span>
    </span>
  );
};

const DevCardDockItem = ({
  item,
  index,
  playerId,
  motion,
  activeCardType,
  onFocusItem,
  onBlurItem,
  onPlayCard,
}) => {
  const text = DEV_CARD_TEXT[item.type];
  const isActive = activeCardType === item.type;
  const className = [
    "devcard-card",
    item.isPlayable ? "devcard-playable" : "devcard-disabled",
    isActive ? "devcard-active" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tooltip
      label={<DevCardTooltipContent item={item} />}
      className="devcard-tooltip px-2.5 py-1.5"
      side="top"
      sideOffset={14}
      triggerAriaLabel={`${text.name}. ${text.description}`}
    >
      <button
        id={playerId != null ? `p${playerId}-devcard-${item.type}` : undefined}
        type="button"
        className={className}
        aria-disabled={!item.isPlayable}
        onFocus={() => onFocusItem(index)}
        onBlur={onBlurItem}
        onClick={(event) => {
          if (!item.isPlayable || !onPlayCard) {
            event.preventDefault();
            return;
          }
          onPlayCard(item.type);
        }}
        style={{
          transform: `translateY(${-motion.lift}px) scale(${motion.scale})`,
          zIndex: motion.zIndex,
          width: `${item.layout.width}px`,
        }}
      >
        {Array.from({ length: item.layout.visibleCount }).map((_, cardIndex) => (
          <span
            key={`devcard-stack-${item.type}-${cardIndex}`}
            className="devcard-stack-card"
            style={{
              left: `${cardIndex * item.layout.offset}px`,
              zIndex: cardIndex + 1,
              transform: getStackCardTransform({
                cardIndex,
                visibleCount: item.layout.visibleCount,
                lift: motion.lift,
                scale: motion.scale,
              }),
            }}
          >
            <Image
              src={DEV_CARD_SVGS[item.type]}
              alt=""
              width={CARD_WIDTH}
              height={CARD_HEIGHT}
              className="devcard-image"
            />
          </span>
        ))}
        {item.layout.showBadge && (
          <span className="devcard-copy-badge" aria-hidden="true">
            {item.count}
          </span>
        )}
      </button>
    </Tooltip>
  );
};

export const DevCardDisplay = ({
  cards = [],
  playerId = null,
  playableCountsByType = {},
  onPlayCard,
  activeCardType,
  showCountBadge = false,
  badgeMinCount = 3,
  containerRef = null,
  forceMount = false,
}) => {
  const dockRef = useRef(null);
  const [pointerX, setPointerX] = useState(null);
  const [focusedIndex, setFocusedIndex] = useState(null);
  const dockItems = useMemo(
    () =>
      getDevCardDockItems({
        cards,
        playableCountsByType,
        badgeMinCount,
      }),
    [badgeMinCount, cards, playableCountsByType]
  );
  const { laidOutDockItems, boxWidth } = useMemo(() => {
    if (dockItems.length === 0) {
      return {
        laidOutDockItems: [],
        boxWidth: DOCK_PADDING_X * 2 + CARD_WIDTH,
      };
    }

    let left = DOCK_PADDING_X;
    const laidOutDockItems = dockItems.map((item) => {
      const itemWithPosition = {
        ...item,
        left,
        centerX: left + item.layout.width / 2,
      };
      left += item.layout.width + DOCK_ITEM_GAP;
      return itemWithPosition;
    });

    return {
      laidOutDockItems,
      boxWidth: left - DOCK_ITEM_GAP + DOCK_PADDING_X,
    };
  }, [dockItems]);
  const setContainerNode = useCallback(
    (node) => {
      dockRef.current = node;
      if (typeof containerRef === "function") {
        containerRef(node);
      } else if (containerRef) {
        containerRef.current = node;
      }
    },
    [containerRef]
  );
  const handlePointerMove = useCallback((event) => {
    const rect = dockRef.current?.getBoundingClientRect?.();
    if (!rect) return;
    setPointerX(event.clientX - rect.left);
  }, []);
  const primaryDockIndex = useMemo(() => {
    if (focusedIndex != null) return focusedIndex;
    if (pointerX == null || laidOutDockItems.length === 0) return null;

    const directIndex = laidOutDockItems.findIndex((item) => {
      const start = item.left - DOCK_ITEM_GAP / 2;
      const end = item.left + item.layout.width + DOCK_ITEM_GAP / 2;
      return pointerX >= start && pointerX <= end;
    });

    if (directIndex !== -1) return directIndex;

    return laidOutDockItems.reduce((nearestIndex, item, index) => {
      const nearestItem = laidOutDockItems[nearestIndex];
      return Math.abs(pointerX - item.centerX) <
        Math.abs(pointerX - nearestItem.centerX)
        ? index
        : nearestIndex;
    }, 0);
  }, [focusedIndex, laidOutDockItems, pointerX]);

  if (cards.length === 0 && !forceMount) {
    return null;
  }

  return (
    <TooltipProvider delay={130} closeDelay={40}>
      <div
        ref={setContainerNode}
        id={playerId != null ? `p${playerId}-devcards` : undefined}
        className="devcard-box inline-flex origin-bottom-left relative"
        style={{ width: `${Math.round(boxWidth)}px` }}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => {
          setPointerX(null);
          setFocusedIndex(null);
        }}
      >
        <div className="devcard-dock-track">
          {laidOutDockItems.map((item, index) => (
            <DevCardDockItem
              key={`devcard-dock-${item.type}`}
              item={item}
              index={index}
              playerId={playerId}
              motion={getDockItemMotion({
                centerX: item.centerX,
                pointerX,
                focusedCenterX:
                  focusedIndex == null
                    ? null
                    : laidOutDockItems[focusedIndex]?.centerX,
                order: index,
                isPrimaryTarget: primaryDockIndex === index,
              })}
              activeCardType={activeCardType}
              onFocusItem={setFocusedIndex}
              onBlurItem={() => setFocusedIndex(null)}
              onPlayCard={onPlayCard}
            />
          ))}
        </div>
        {showCountBadge && cards.length > 0 && (
          <div className={getBadgeClasses("default")}>{cards.length}</div>
        )}
      </div>
    </TooltipProvider>
  );
};
