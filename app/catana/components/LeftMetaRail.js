import React from "react";
import { GameLogPanel } from "./GameLogPanel";
import { ChatPanel } from "./ChatPanel";
import { DebugPanel } from "./DebugPanel";

const isDevEnvironment = process.env.NODE_ENV !== "production";

const LeftMetaRailComponent = ({
  entries = [],
  logPlayerMap = {},
  themeId,
  playerID,
  bgioProps,
}) => {
  return React.createElement(
    "div",
    {
      className:
        "fixed left-4 bottom-4 z-30 w-72 md:w-80 pointer-events-auto",
      "data-allow-interaction": "true",
    },
    React.createElement(
      "div",
      { className: "flex w-full flex-col gap-3" },
      isDevEnvironment
        ? React.createElement(DebugPanel, { bgioProps })
        : null,
      React.createElement(GameLogPanel, {
        entries,
        playerMap: logPlayerMap,
        themeId,
        rootClassName: "w-full",
      }),
      React.createElement(ChatPanel, {
        playerID,
        playerMap: logPlayerMap,
        themeId,
        chatMessages: bgioProps?.chatMessages ?? [],
        sendChatMessage: bgioProps?.sendChatMessage,
      })
    )
  );
};

export const LeftMetaRail = React.memo(LeftMetaRailComponent);
LeftMetaRail.displayName = "LeftMetaRail";
