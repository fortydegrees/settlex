import React, { useMemo, useState } from "react";
import { buildChatEntries, submitChatDraft } from "../utils/chatMessages";
import { formatChatEntry } from "../utils/gameText";
import { FeedPanel } from "./FeedPanel";
import { FeedTokenRow } from "./FeedTokenRow";

const defaultComposerInputClassName =
  "settlex-ui-feed-composer settlex-ui-focus w-full rounded-control px-ui-3 py-ui-2 type-label";
const defaultFooterClassName =
  "settlex-ui-feed-footer px-ui-3 py-ui-2.5";

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
  headerClassName = "settlex-ui-feed-header px-ui-4 py-ui-2 type-action-small text-ink-secondary",
  panelClassName =
    "settlex-ui-hud flex h-[20vh] xl:h-[24vh] flex-col overflow-hidden select-text",
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
    scrollViewportClassName: "h-full overflow-y-auto px-ui-3",
    scrollClassName: "feed-panel-scroll chat-panel-scroll",
    fadeClassName: "feed-panel-fade chat-panel-fade",
    entryClassName:
      "feed-panel-entry chat-panel-entry break-words type-body-small text-ink-primary",
    contentClassName: "space-y-ui-1.5 py-ui-2 type-body-small",
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
