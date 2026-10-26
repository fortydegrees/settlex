import React, { useMemo } from "react";
import { buildGameLogRows } from "./gameLogRows";
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
    () => buildGameLogRows(entries, playerMap).map((row) => ({
      ...row,
      isActive: !row.isDivider && activeEntryKey != null && String(activeEntryKey) === row.key,
    })),
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
      contentWrapClassName="min-h-0 flex-1"
      scrollClassName="feed-panel-scroll game-log-scroll"
      fadeClassName="feed-panel-fade game-log-fade"
      entryClassName="feed-panel-entry"
      contentClassName="space-y-ui-2 type-body-small py-ui-2"
      renderRow={(entry) => entry.isDivider ? (
        <div className="game-log-turn flex items-center gap-ui-2 py-ui-2 select-none cursor-default type-caption text-ink-muted">
          <span className="h-px min-w-0 flex-1 bg-edge-subtle" aria-hidden="true" />
          <span className="min-w-0 text-center break-words">
            <FeedTokenRow token={{ ...entry.player, emoji: null, variant: "turn" }} themeId={themeId} />’s turn
          </span>
          <span className="h-px min-w-0 flex-1 bg-edge-subtle" aria-hidden="true" />
        </div>
      ) : (
        <SelectableRow
          density="compact"
          className={`game-log-entry break-words ${entry.isServerEntry ? "italic text-ink-secondary" : "text-ink-primary"}`}
          current={entry.isActive ? "step" : false}
          onActivate={onEntrySelect ? (event) => {
            // Dragging text should copy it without seeking.
            const selection = event.currentTarget.ownerDocument.getSelection();
            if (event.detail > 0 && selection && !selection.isCollapsed) return;
            onEntrySelect(entry.key);
          } : undefined}
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
