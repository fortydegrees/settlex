import React from "react";
import {
  getClassicResourceIconPath,
  getResourceIconPath,
  handleThemeImageError,
} from "../theme/themes";
import { getPlayerNameHex } from "../theme/playerColors";

export const FeedTokenRow = ({ token, themeId }) => {
  if (!token) return null;

  if (token.kind === "divider") {
    const isStrong = token.variant === "strong";
    return (
      <div
        className={
          isStrong
            ? "my-3 h-0.5 w-full bg-slate-400/80"
            : "my-2 h-px w-full bg-slate-300/70"
        }
      />
    );
  }

  if (token.kind === "player") {
    const nameColor = token.color ? getPlayerNameHex(token.color) ?? token.color : null;
    return (
      <span className="inline-flex items-center gap-1 font-semibold">
        {token.emoji ? <span aria-hidden="true">{token.emoji}</span> : null}
        <span
          className={nameColor ? "" : "text-slate-900"}
          style={nameColor ? { color: nameColor } : undefined}
        >
          {token.name}
        </span>
      </span>
    );
  }

  if (token.kind === "resource") {
    const icon = getResourceIconPath(themeId, token.resource);
    const iconFallback = getClassicResourceIconPath(token.resource);
    return icon ? (
      <img
        src={icon}
        alt=""
        title={token.resource}
        className="h-4 w-4"
        draggable={false}
        onError={(event) => handleThemeImageError(event, iconFallback)}
      />
    ) : (
      <span className="text-slate-700">{token.resource}</span>
    );
  }

  if (token.kind === "text") {
    return <span className="text-slate-800">{token.text}</span>;
  }

  return null;
};
