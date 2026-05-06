import React, { useMemo, useState } from "react";
import { buildChatEntries, submitChatDraft } from "../utils/chatMessages";
import { formatChatEntry } from "../utils/gameText";
import { FeedPanel } from "./FeedPanel";
import { FeedTokenRow } from "./FeedTokenRow";

const defaultComposerInputClassName =
  "w-full rounded-[0.85rem] bg-white/55 px-3 py-2 text-sm font-medium text-slate-800 placeholder:text-slate-500 shadow-[inset_0_1px_2px_rgba(15,23,42,0.08),inset_0_0_0_1px_rgba(255,255,255,0.48)] ring-1 ring-white/45 backdrop-blur-md transition-[background-color,box-shadow] duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-white/75 disabled:cursor-not-allowed disabled:bg-white/38 disabled:text-slate-500 disabled:placeholder:text-slate-500";
const defaultFooterClassName =
  "border-t border-white/24 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.1))] px-3 py-2.5 backdrop-blur-md";

const emptyRows = [
  {
    key: "chat-empty",
    tokens: [{ kind: "text", variant: "server", text: "No messages yet." }],
  },
];

const ChatPanelComponent = ({
  playerID,
  playerMap = {},
  themeId,
  chatMessages = [],
  sendChatMessage,
  rootClassName = "w-full",
  headerClassName = "bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700",
  panelClassName =
    "flex h-[20vh] xl:h-[24vh] flex-col overflow-hidden rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text",
  composerInputClassName = defaultComposerInputClassName,
  footerClassName = defaultFooterClassName,
}) => {
  const [draft, setDraft] = useState("");
  const [resumeAutoScrollKey, setResumeAutoScrollKey] = useState(0);
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
          setResumeAutoScrollKey((value) => value + 1);
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
    resumeAutoScrollKey,
    autoScrollIdleMs: 12000,
    rootClassName,
    trackPanelInteraction: true,
    panelClassName,
    headerClassName,
    contentWrapClassName: "min-h-0 flex-1",
    scrollViewportClassName: "h-full overflow-y-auto px-3",
    scrollClassName: "feed-panel-scroll chat-panel-scroll",
    fadeClassName: "feed-panel-fade chat-panel-fade",
    entryClassName:
      "feed-panel-entry chat-panel-entry break-words text-sm font-medium leading-5 text-slate-800",
    contentClassName: "space-y-1.5 py-2 text-sm",
    footerClassName,
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
