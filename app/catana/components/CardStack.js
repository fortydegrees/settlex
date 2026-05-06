import React from "react";
import Image from "./NextImage";
import { DEFAULT_STACK_MAX_WIDTH, getCardStackLayout } from "./CardStackLayout";
import { getBadgeClasses } from "./CardStackStyles";

export const CardStack = ({
  count = 0,
  src,
  alt,
  cardWidth = 52,
  cardHeight = 72,
  stackOffset = 16,
  maxVisible,
  maxStackWidth = DEFAULT_STACK_MAX_WIDTH,
  badgeMinCount = 3,
  badgeTone = "default",
  className = "",
  imageClassName = "object-contain drop-shadow-md",
}) => {
  const layout = getCardStackLayout({
    count,
    cardWidth,
    stackOffset,
    maxVisible,
    maxStackWidth,
    badgeMinCount,
  });

  const outlineClass = layout.isEmpty
    ? "opacity-30"
    : "";

  return (
    <div
      className={`relative h-[72px] ${className}`}
      style={{ width: `${layout.width}px` }}
    >
      {Array.from({ length: layout.visibleCount }).map((_, i) => (
        <div
          key={`stack-${i}`}
          className="absolute top-0"
          style={{ left: `${i * layout.offset}px`, zIndex: i }}
        >
          <Image
            src={src}
            alt={alt}
            width={cardWidth}
            height={cardHeight}
            className={`${imageClassName} ${outlineClass}`}
          />
        </div>
      ))}
      {layout.showBadge && (
        <div className={getBadgeClasses(badgeTone)}>
          {count}
        </div>
      )}
    </div>
  );
};
