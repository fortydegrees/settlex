import React from "react";
import {
  getClassicResourceIconPath,
  getResourceIconPath,
  getTilePath,
  handleThemeImageError,
} from "../theme/themes";
import { getPlayerNameHex } from "../theme/playerColors";
import { DEV_CARD_SVGS, DEV_CARD_TEXT } from "./devCardDisplayUtils";
import { MiniDiceFace } from "./MiniDiceFace";

const TILE_NUMBER_PIPS = {
  2: "•",
  3: "••",
  4: "•••",
  5: "••••",
  6: "•••••",
  8: "•••••",
  9: "••••",
  10: "•••",
  11: "••",
  12: "•",
};

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

  if (token.kind === "label") {
    if (token.variant === "server") {
      return null;
    }

    return React.createElement(
      "span",
      {
        className:
          "inline-flex rounded-full bg-slate-200/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-700",
      },
      token.text
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

  if (token.kind === "devCard") {
    const label =
      token.label ??
      DEV_CARD_TEXT[token.cardType]?.name ??
      String(token.cardType ?? "Dev card");
    const icon = DEV_CARD_SVGS[token.cardType];

    return React.createElement(
      "span",
      {
        className:
          "mx-0.5 whitespace-nowrap font-semibold text-slate-700",
      },
      icon
        ? React.createElement("img", {
            src: icon,
            alt: "",
            title: label,
            className:
              "mr-1 inline-block h-6 w-auto align-[-0.35em] rounded-[2px] object-contain shadow-sm",
            draggable: false,
          })
        : null,
      React.createElement("span", null, label)
    );
  }

  if (token.kind === "die") {
    return React.createElement(MiniDiceFace, {
      value: token.value,
      className: "mx-0.5 h-5 w-5 align-[-0.22em]",
      withShadow: false,
      "aria-label": `Die ${token.value}`,
    });
  }

  if (token.kind === "tileDestination") {
    const value = Number(token.number);
    const isHot = value === 6 || value === 8;
    const colorClassName = isHot ? "text-red-600" : "text-slate-900";
    const icon = getResourceIconPath(themeId, token.resource);
    const iconFallback = getClassicResourceIconPath(token.resource);
    const tile = getTilePath(themeId, token.resource);
    const tileFallback = getTilePath("classic", token.resource);

    return React.createElement(
      "span",
      {
        role: "img",
        "aria-label": `${token.resource} tile, number ${value}`,
        className:
          "relative mx-0.5 inline-block h-8 w-7 shrink-0 align-[-0.7em]",
      },
      React.createElement("img", {
        src: tile,
        alt: "",
        className: "absolute inset-0 h-full w-full",
        draggable: false,
        onError: (event) => handleThemeImageError(event, tileFallback),
      }),
      icon
        ? React.createElement("img", {
            src: icon,
            alt: "",
            className:
              "absolute left-1/2 top-1 h-3 w-3 -translate-x-1/2",
            draggable: false,
            onError: (event) => handleThemeImageError(event, iconFallback),
          })
        : React.createElement(
            "span",
            { "aria-hidden": "true", className: "text-[10px]" },
            token.resource
          ),
      React.createElement(
        "span",
        {
          "aria-hidden": "true",
          className: `absolute bottom-[3px] left-1/2 inline-flex h-3.5 w-3.5 -translate-x-1/2 flex-col items-center justify-center rounded-[2px] bg-slate-100 shadow-sm ring-1 ring-slate-300/70 ${colorClassName}`,
        },
        React.createElement(
          "span",
          {
            className: "text-[7px] font-black leading-[6px]",
          },
          value
        ),
        React.createElement(
          "span",
          {
            className:
              "text-[3px] font-bold leading-[3px] tracking-[-0.08em]",
          },
          TILE_NUMBER_PIPS[value] ?? ""
        )
      )
    );
  }

  if (token.kind === "text") {
    return React.createElement(
      "span",
      {
        className: token.variant === "server" ? "text-slate-600" : undefined,
      },
      token.text
    );
  }

  return null;
};
