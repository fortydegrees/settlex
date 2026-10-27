/* eslint-disable @next/next/no-img-element */
import React from "react";
import { AnimatedCount } from "./AnimatedCount";
import { getResourceIconPath, getClassicResourceIconPath, handleThemeImageError } from "../../theme/themes";

export const StackedResourceCount = ({
  playerId,
  resource,
  count,
  canQuickTrade,
  onResourceClick,
  themeId,
}) => {
  const iconSrc = getResourceIconPath(themeId, resource);
  const iconFallback = getClassicResourceIconPath(resource);
  const content = (
    <>
      <img
        src={iconSrc}
        alt=""
        className="h-6 w-6 object-contain drop-shadow-[0_1px_1px_rgba(15,23,42,0.38)] min-[400px]:h-7 min-[400px]:w-7"
        draggable={false}
        onError={(event) => handleThemeImageError(event, iconFallback)}
      />
      <span className="type-hud-resource text-ink-hud-on-glass drop-shadow-[0_1px_1px_rgba(15,23,42,0.48)] min-[400px]:type-hud-resource-wide">
        <AnimatedCount
          value={count}
          className="resource-dock-count"
          ariaLabel={`${count} ${resource}`}
        />
      </span>
    </>
  );

  if (canQuickTrade) {
    return (
      <button
        type="button"
        id={`p${playerId}-${resource}`}
        className="mobile-resource-count-trigger flex min-w-[1.9rem] flex-col items-center justify-end gap-ui-0.5 rounded-small px-ui-0.5 py-ui-1 transition min-[400px]:min-w-[2.2rem]"
        onClick={() => onResourceClick(resource)}
        aria-label={`Trade ${resource}`}
        data-allow-interaction="true"
      >
        {content}
      </button>
    );
  }

  return (
    <span
      id={`p${playerId}-${resource}`}
      className="flex min-w-[1.9rem] flex-col items-center justify-end gap-ui-0.5 px-ui-0.5 py-ui-1 min-[400px]:min-w-[2.2rem]"
    >
      {content}
    </span>
  );
};

