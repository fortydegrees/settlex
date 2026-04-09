import React, { useMemo, useState } from "react";
import { buildChatEntries, submitChatDraft } from "../utils/chatMessages";
import { formatChatEntry } from "../utils/gameText";
import { FeedPanel } from "./FeedPanel";
import { FeedTokenRow } from "./FeedTokenRow";

const composerInputClassName =
  "w-full bg-white/50 px-2.5 py-1.5 text-sm text-slate-800 placeholder:text-slate-500 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500";

const emptyRows = [
  {
    key: "chat-empty",
    tokens: [{ kind: "text", text: "No messages yet." }],
  },
];

const ChatPanelComponent = ({
  playerID,
  playerMap = {},
  themeId,
  chatMessages = [],
  sendChatMessage,
}) => {
  const [draft, setDraft] = useState("");
  const canSend = playerID != null && typeof sendChatMessage === "function";

  const rows = useMemo(() => {
    const liveRows = buildChatEntries(chatMessages).map((entry) => ({
      key: entry.id,
      tokens: formatChatEntry(entry, playerMap),
    }));

    return liveRows.length > 0 ? liveRows : emptyRows;
  }, [chatMessages, playerMap]);

  const placeholder = canSend ? "Message..." : "Read-only";

  const footer = React.createElement(
    "form",
    {
      onSubmit: (event) => {
        event.preventDefault();
        const result = submitChatDraft({
          draft,
          playerID,
          sendChatMessage,
        });
        if (result.sent) {
          setDraft(result.nextDraft);
        }
      },
    },
    React.createElement("input", {
      type: "text",
      value: draft,
      disabled: !canSend,
      placeholder,
      maxLength: 280,
      onChange: (event) => setDraft(event.target.value),
      className: composerInputClassName,
      "aria-label": "Chat message",
    })
  );

  return React.createElement(FeedPanel, {
    title: "Chat",
    rows,
    footer,
    autoScrollKey:
      chatMessages.length > 0
        ? chatMessages[chatMessages.length - 1]?.id ?? chatMessages.length
        : "chat-empty",
    rootClassName: "w-full",
    panelClassName:
      "flex h-[20vh] xl:h-[24vh] flex-col overflow-hidden rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text",
    headerClassName:
      "bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700",
    contentWrapClassName: "min-h-0 flex-1",
    scrollViewportClassName: "h-full overflow-y-auto px-3",
    scrollClassName: "feed-panel-scroll chat-panel-scroll",
    fadeClassName: "feed-panel-fade chat-panel-fade",
    entryClassName:
      "feed-panel-entry chat-panel-entry break-words text-sm leading-5 text-slate-800",
    contentClassName: "space-y-1.5 py-1.5 text-sm",
    footerClassName:
      "border-t border-white/35 bg-white/35 backdrop-blur-sm",
    renderRow: (entry) =>
      entry.tokens.map((token, tokenIndex) =>
        React.createElement(FeedTokenRow, {
          key: `${entry.key}-${tokenIndex}`,
          token,
          themeId,
        })
      ),
  });
};

export const ChatPanel = React.memo(ChatPanelComponent);
ChatPanel.displayName = "ChatPanel";
