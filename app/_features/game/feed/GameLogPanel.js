import React, { useMemo } from "react";
import { formatLogEntry, getGameLogEntryKey } from "../../../../lib/shared/gameText";
import { FeedPanel } from "./FeedPanel";
import { FeedTokenRow } from "./FeedTokenRow";
import { SelectableRow } from "../../../ui/SelectableRow";

const GameLogPanelComponent = ({
  entries = [],
  playerMap = {},
  themeId,
  activeEntryKey = null,
  onEntrySelect,
  arrivalMode = onEntrySelect || activeEntryKey != null ? "quiet" : "live",
  headerClassName = "settlehex-ui-feed-header px-ui-4 py-ui-2 type-action-small text-ink-secondary",
  rootClassName = "fixed left-ui-4 bottom-ui-4 w-72 md:w-80 xl:w-96 z-30 pointer-events-auto",
  panelClassName = "settlehex-ui-hud flex h-[20vh] xl:h-[24vh] flex-col select-text overflow-hidden",
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
      arrivalMode={arrivalMode}
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
        <SelectableRow
          density="compact"
          className={`game-log-entry break-words ${entry.isServerEntry ? "italic text-ink-secondary" : "text-ink-primary"}`}
          current={entry.isActive ? "step" : false}
          onActivate={onEntrySelect ? () => onEntrySelect(entry.key) : undefined}
        >
          {entry.tokens.map((token, tokenIndex) => (
            <FeedTokenRow
              key={`${entry.key}-${tokenIndex}`}
              token={token}
              themeId={themeId}
            />
          ))}
        </SelectableRow>
      )}
    />
  );
};

export const GameLogPanel = React.memo(GameLogPanelComponent);
GameLogPanel.displayName = "GameLogPanel";
