/* eslint-disable @next/next/no-img-element */
import React from "react";
import { AnimatedCount } from "./AnimatedCount";
import {
  getClassicResourceIconPath,
  getResourceIconPath,
  handleThemeImageError,
} from "../../theme/themes";

export const CardIcon = ({
  resourceCount,
  resource,
  player,
  onResourceClick,
  themeId,
  isLast = false,
  compact = false,
}) => {
  const handleClick = () => {
    if (onResourceClick) {
      onResourceClick(resource);
    }
  };
  const iconSrc = getResourceIconPath(themeId, resource);
  const iconFallback = getClassicResourceIconPath(resource);
  const Container = onResourceClick ? "button" : "div";

  return (
    <Container
      className={`flex items-center ${isLast ? "" : compact ? "mr-ui-1" : "mr-ui-6"} ${onResourceClick ? "cursor-pointer settlex-ui-focus" : ""}`}
      id={`p${player}-${resource}`}
      type={onResourceClick ? "button" : undefined}
      aria-label={onResourceClick ? `Trade ${resource}` : undefined}
      onClick={onResourceClick ? handleClick : undefined}

    >
      <div className={`${compact ? "w-5 type-hud-resource-wide" : "w-7 type-hud-resource-desktop"} text-center select-none text-ink-hud-on-glass mr-ui-1 drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]`}>
        <AnimatedCount
          value={resourceCount}
          className="resource-dock-count"
          ariaLabel={`${resourceCount} ${resource}`}
        />
      </div>
      <img
        src={iconSrc}
        alt=""
        className={`${compact ? "h-6 w-6" : "h-10 w-10"} object-contain`}
        draggable={false}
        onError={(event) => handleThemeImageError(event, iconFallback)}
      />
    </Container>
  );
};
