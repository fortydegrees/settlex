import React, { useMemo } from "react";
import { buildChatPreviewEntries } from "../utils/chatPreview";
import { formatChatEntry } from "../utils/gameText";
import { FeedPanel } from "./FeedPanel";
import { FeedTokenRow } from "./FeedTokenRow";

const composerInputClassName =
  "w-full rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500";

const composerButtonClassName =
  "rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-sm";

const ChatPanelComponent = ({ playerID, playerMap = {}, themeId }) => {
  const previewRows = useMemo(
    () =>
      buildChatPreviewEntries({ playerID, playerMap }).map((entry) => ({
        key: entry.id,
        tokens: formatChatEntry(entry, playerMap),
      })),
    [playerID, playerMap]
  );

  return React.createElement(
    "div",
    {
      className:
        "fixed right-4 bottom-4 z-30 w-80 space-y-3 md:w-96 pointer-events-auto",
      "data-allow-interaction": "true",
    },
    React.createElement(
      "div",
      {
        className:
          "rounded-full bg-white/60 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-slate-700 shadow-lg ring-1 ring-white/50 backdrop-blur-sm",
      },
      "Preview only"
    ),
    React.createElement(FeedPanel, {
      title: "Chat",
      rows: previewRows,
      rootClassName: "relative w-full",
      panelClassName:
        "flex h-[20vh] flex-col overflow-hidden rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text",
      headerClassName:
        "bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700",
      contentWrapClassName: "min-h-0 flex-1 pb-4",
      scrollClassName: "feed-panel-scroll chat-panel-scroll",
      fadeClassName: "feed-panel-fade chat-panel-fade",
      entryClassName:
        "feed-panel-entry chat-panel-entry flex flex-wrap items-center gap-1",
      contentClassName: "space-y-2 text-sm pt-2",
      renderRow: (entry) =>
        entry.tokens.map((token, tokenIndex) =>
          React.createElement(FeedTokenRow, {
            key: `${entry.key}-${tokenIndex}`,
            token,
            themeId,
          })
        ),
    }),
    React.createElement(
      "div",
      {
        className:
          "rounded-xl bg-white/25 p-3 shadow-lg ring-1 ring-white/30 backdrop-blur-sm",
      },
      React.createElement(
        "div",
        {
          className:
            "text-xs font-semibold uppercase tracking-widest text-slate-700",
        },
        "Coming soon"
      ),
      React.createElement(
        "div",
        { className: "mt-1 text-xs text-slate-600" },
        "Live chat wiring is coming soon."
      ),
      React.createElement(
        "div",
        { className: "mt-3 flex items-center gap-2" },
        React.createElement("input", {
          disabled: true,
          type: "text",
          placeholder: "Type a message",
          className: composerInputClassName,
        }),
        React.createElement(
          "button",
          {
            disabled: true,
            type: "button",
            className: composerButtonClassName,
          },
          "Send"
        )
      )
    )
  );
};

export const ChatPanel = React.memo(ChatPanelComponent);
ChatPanel.displayName = "ChatPanel";
