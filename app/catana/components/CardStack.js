import React from "react";
import Image from "next/image";
import { getCardStackLayout } from "./CardStackLayout";

export const CardStack = ({
  count = 0,
  src,
  alt,
  cardWidth = 52,
  cardHeight = 72,
  stackOffset = 16,
  maxVisible,
  className = "",
}) => {
  const layout = getCardStackLayout({
    count,
    cardWidth,
    stackOffset,
    maxVisible,
  });

  const cardClass = "object-contain drop-shadow-md";
  const outlineClass = layout.isEmpty
    ? "opacity-30 ring-1 ring-blue-100 ring-inset"
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
          style={{ left: `${i * stackOffset}px`, zIndex: i }}
        >
          <Image
            src={src}
            alt={alt}
            width={cardWidth}
            height={cardHeight}
            className={`${cardClass} ${outlineClass}`}
          />
        </div>
      ))}
      {layout.showBadge && (
        <div className="absolute -top-2 -right-2 z-20 h-5 min-w-[1.25rem] rounded-full bg-blue-50 px-1 text-xs font-semibold text-slate-700 ring-2 ring-white flex items-center justify-center">
          {count}
        </div>
      )}
    </div>
  );
};
