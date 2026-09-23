import React, { useMemo } from "react";
import { formatLogEntry, getGameLogEntryKey } from "../utils/gameText";
import { FeedPanel } from "./FeedPanel";
import { FeedTokenRow } from "./FeedTokenRow";

const GameLogPanelComponent = ({
  entries = [],
  playerMap = {},
  themeId,
  activeEntryKey = null,
  onEntrySelect,
  headerClassName = "settlex-ui-feed-header px-ui-4 py-ui-2 type-action-small text-ink-secondary",
  rootClassName = "fixed left-ui-4 bottom-ui-4 w-72 md:w-80 xl:w-96 z-30 pointer-events-auto",
  panelClassName = "settlex-ui-hud flex h-[20vh] xl:h-[24vh] flex-col select-text overflow-hidden",
}) => {
  const formattedEntries = useMemo(
    () =>
      entries
        .map((entry, entryIndex) => {
          const tokens = formatLogEntry(entry, playerMap);
          if (!tokens || tokens.length === 0) return null;

          return {
            key: getGameLogEntryKey(entry, entryIndex),
            entry,
            tokens,
            isActive:
              activeEntryKey != null &&
              String(activeEntryKey) === getGameLogEntryKey(entry, entryIndex),
            isServerEntry:
              typeof entry?.type === "string" && entry.type.startsWith("server:"),
          };
        })
        .filter(Boolean),
    [entries, playerMap, activeEntryKey]
  );

  return (
    <FeedPanel
      title="Game Log"
      rows={formattedEntries}
      activeRowKey={activeEntryKey}
      rootClassName={rootClassName}
      panelClassName={panelClassName}
      headerClassName={headerClassName}
      autoScrollIdleMs={12000}
      trackPanelInteraction
      contentWrapClassName="min-h-0 flex-1 pb-ui-4"
      scrollClassName="feed-panel-scroll game-log-scroll"
      fadeClassName="feed-panel-fade game-log-fade"
      entryClassName="feed-panel-entry"
      contentClassName="space-y-ui-2 type-body-small pt-ui-2"
      renderRow={(entry) => (
        <div
          className={`game-log-entry settlex-ui-focus break-words rounded-small px-ui-1.5 py-ui-0.5 type-body-small ${
            entry.isActive
              ? "settlex-ui-feed-current"
              : ""
          } ${
            entry.isServerEntry ? "italic text-ink-secondary" : "text-ink-primary"
          }`}
          role={onEntrySelect ? "button" : undefined}
          tabIndex={onEntrySelect ? 0 : undefined}
          aria-current={entry.isActive ? "step" : undefined}
          onClick={
            onEntrySelect ? () => onEntrySelect(entry.key) : undefined
          }
          onKeyDown={
            onEntrySelect
              ? (event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  onEntrySelect(entry.key);
                }
              : undefined
          }
        >
          {entry.tokens.map((token, tokenIndex) => (
            <FeedTokenRow
              key={`${entry.key}-${tokenIndex}`}
              token={token}
              themeId={themeId}
            />
          ))}
        </div>
      )}
    />
  );
};

export const GameLogPanel = React.memo(GameLogPanelComponent);
GameLogPanel.displayName = "GameLogPanel";
