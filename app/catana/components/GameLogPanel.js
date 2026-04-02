import React, { useMemo } from "react";
import { formatLogEntry } from "../utils/gameText";
import { FeedPanel } from "./FeedPanel";
import { FeedTokenRow } from "./FeedTokenRow";

const GameLogPanelComponent = ({
  entries = [],
  playerMap = {},
  themeId,
  rootClassName = "fixed left-4 bottom-4 w-72 md:w-80 z-30 pointer-events-auto",
}) => {
  const formattedEntries = useMemo(
    () =>
      entries
        .map((entry, entryIndex) => {
          const tokens = formatLogEntry(entry, playerMap);
          if (!tokens || tokens.length === 0) return null;

          return {
            key: entry.id ?? `${entryIndex}-${entry.type}`,
            tokens,
            isServerEntry:
              typeof entry?.type === "string" && entry.type.startsWith("server:"),
          };
        })
        .filter(Boolean),
    [entries, playerMap]
  );

  return (
    <FeedPanel
      title="Game Log"
      rows={formattedEntries}
      rootClassName={rootClassName}
      panelClassName="flex h-[20vh] flex-col rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text overflow-hidden"
      headerClassName="bg-white/50 border-b border-white/40 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700"
      contentWrapClassName="min-h-0 flex-1 pb-4"
      scrollClassName="feed-panel-scroll game-log-scroll"
      fadeClassName="feed-panel-fade game-log-fade"
      entryClassName="feed-panel-entry"
      contentClassName="space-y-2 text-sm pt-2"
      renderRow={(entry) => (
        <div
          className={`game-log-entry break-words text-sm leading-5 ${
            entry.isServerEntry ? "italic text-slate-600" : "text-slate-800"
          }`}
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
