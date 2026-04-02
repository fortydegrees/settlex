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
    return React.createElement("div", {
      className: isStrong
        ? "my-3 h-0.5 w-full bg-slate-400/80"
        : "my-2 h-px w-full bg-slate-300/70",
    });
  }

  if (token.kind === "player") {
    const nameColor = token.color ? getPlayerNameHex(token.color) ?? token.color : null;
    return React.createElement(
      "span",
      { className: "inline-flex items-center gap-1 font-semibold align-baseline" },
      token.emoji ? React.createElement("span", { "aria-hidden": "true" }, token.emoji) : null,
      React.createElement(
        "span",
        {
          className: nameColor ? "" : "text-slate-900",
          style: nameColor ? { color: nameColor } : undefined,
        },
        token.name
      )
    );
  }

  if (token.kind === "resource") {
    const icon = getResourceIconPath(themeId, token.resource);
    const iconFallback = getClassicResourceIconPath(token.resource);
    return icon
      ? React.createElement("img", {
          src: icon,
          alt: "",
          title: token.resource,
          className: "mx-0.5 inline-block h-4 w-4 align-[-0.125em]",
          draggable: false,
          onError: (event) => handleThemeImageError(event, iconFallback),
        })
      : React.createElement(
        "span",
          { className: "mx-0.5 inline-block" },
          token.resource
        );
  }

  if (token.kind === "text") {
    return React.createElement("span", null, token.text);
  }

  return null;
};
