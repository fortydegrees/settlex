const RESOURCE_OPTIONS = ["Wood", "Brick", "Sheep", "Wheat", "Ore"];
const DEV_CARD_OPTIONS = [
  { id: "knight", label: "Knight" },
  { id: "victoryPoint", label: "VP" },
  { id: "roadBuilding", label: "Road" },
  { id: "yearOfPlenty", label: "Plenty" },
  { id: "monopoly", label: "Mono" }
];
const DEV_CARD_EFFECT_OPTIONS = [
  { id: "knight", label: "Knight" },
  { id: "roadBuilding", label: "Road Building" },
  { id: "yearOfPlenty", label: "Year of Plenty" },
  { id: "monopoly", label: "Monopoly" }
];

export function SandboxPanel({
  presets,
  presetId,
  viewerSeat,
  playerIds,
  isCollapsed,
  onPresetChange,
  onViewerSeatChange,
  onReset,
  onToggleCollapsed,
  onGiveResource,
  onGiveDevCard,
  onOpponentDevCardPlayStart,
  onOpponentDevCardPlayResolve,
  onDevCardPlayReset,
  onRemoteRobberMoveReplay,
  onLongestRoadAwardReplay,
  onLongestRoadTakeoverReplay,
  onLargestArmyAwardReplay,
  onLargestArmyTakeoverReplay
}) {
  return (
    <div className="pointer-events-auto w-full" data-allow-interaction="true">
      <div className="settlex-ui-pane overflow-hidden">
        <div className="type-caption flex items-center justify-between gap-ui-3 border-b border-edge-subtle bg-surface-hover px-ui-4 py-ui-3 uppercase text-ink-secondary">
          <span>Dev Sandbox</span>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="settlex-ui-button settlex-ui-button-utility settlex-ui-focus type-action-small px-ui-3 py-ui-1"
          >
            {isCollapsed ? "Expand" : "Collapse"}
          </button>
        </div>

        {isCollapsed ? null : (
          <div className="type-body-small flex flex-col gap-ui-4 p-ui-4 text-ink-primary">
            <label className="flex flex-col gap-ui-1.5">
              <span className="type-label text-ink-secondary">
                Preset
              </span>
              <select
                value={presetId}
                onChange={(event) => onPresetChange(event.target.value)}
                className="settlex-ui-field"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-ui-1.5">
              <span className="type-label text-ink-secondary">
                Viewer seat
              </span>
              <select
                value={viewerSeat}
                onChange={(event) => onViewerSeatChange(event.target.value)}
                className="settlex-ui-field"
              >
                {playerIds.map((playerId, index) => (
                  <option key={playerId} value={playerId}>
                    {`Visitor ${index + 1}`}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="button"
              onClick={onReset}
              className="settlex-ui-button settlex-ui-button-primary settlex-ui-focus type-action-small px-ui-4 py-ui-2"
            >
              Reset
            </button>

            <div className="flex flex-col gap-ui-2">
              <div className="type-label text-ink-secondary">
                Quick resources
              </div>
              <div className="grid grid-cols-5 gap-ui-2">
                {RESOURCE_OPTIONS.map((resource) => (
                  <button
                    key={resource}
                    type="button"
                    onClick={() => onGiveResource(resource)}
                    className="settlex-ui-button settlex-ui-button-secondary settlex-ui-focus type-action-small px-ui-2 py-ui-2"
                  >
                    {resource.slice(0, 2)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-ui-2">
              <div className="type-label text-ink-secondary">
                Quick dev cards
              </div>
              <div className="grid grid-cols-3 gap-ui-2">
                {DEV_CARD_OPTIONS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onGiveDevCard(card.id)}
                    className="settlex-ui-button settlex-ui-button-accent settlex-ui-focus type-action-small px-ui-2 py-ui-2"
                  >
                    {card.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-ui-2">
              <div className="type-label text-ink-secondary">
                Dev-card effects
              </div>
              <div className="grid grid-cols-2 gap-ui-2">
                {DEV_CARD_EFFECT_OPTIONS.map((card) => (
                  <button
                    key={`${card.id}-start`}
                    type="button"
                    onClick={() => onOpponentDevCardPlayStart(card.id)}
                    className="settlex-ui-button settlex-ui-button-subtle settlex-ui-focus type-action-small px-ui-3 py-ui-2 text-left"
                  >
                    {`Opponent Plays ${card.label}`}
                  </button>
                ))}
                {DEV_CARD_EFFECT_OPTIONS.map((card) => (
                  <button
                    key={`${card.id}-resolve`}
                    type="button"
                    onClick={() => onOpponentDevCardPlayResolve(card.id)}
                    className="settlex-ui-button settlex-ui-button-subtle settlex-ui-focus type-action-small px-ui-3 py-ui-2 text-left"
                  >
                    {`Resolve ${card.label}`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onDevCardPlayReset}
                  className="settlex-ui-button settlex-ui-button-subtle settlex-ui-focus type-action-small col-span-2 px-ui-3 py-ui-2 text-left"
                >
                  Reset Dev Visual
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-ui-2">
              <div className="type-label text-ink-secondary">
                Board effects
              </div>
              <button
                type="button"
                onClick={onRemoteRobberMoveReplay}
                className="settlex-ui-button settlex-ui-button-secondary settlex-ui-focus type-action-small px-ui-3 py-ui-2 text-left"
              >
                Replay Remote Robber Move
              </button>
              <button
                type="button"
                onClick={onLongestRoadAwardReplay}
                className="settlex-ui-button settlex-ui-button-accent settlex-ui-focus type-action-small px-ui-3 py-ui-2 text-left"
              >
                Replay Longest Road Award
              </button>
              <button
                type="button"
                onClick={onLongestRoadTakeoverReplay}
                className="settlex-ui-button settlex-ui-button-accent settlex-ui-focus type-action-small px-ui-3 py-ui-2 text-left"
              >
                Replay Road Takeover
              </button>
              <button
                type="button"
                onClick={onLargestArmyAwardReplay}
                className="settlex-ui-button settlex-ui-button-danger settlex-ui-focus type-action-small px-ui-3 py-ui-2 text-left"
              >
                Replay Largest Army Award
              </button>
              <button
                type="button"
                onClick={onLargestArmyTakeoverReplay}
                className="settlex-ui-button settlex-ui-button-danger settlex-ui-focus type-action-small px-ui-3 py-ui-2 text-left"
              >
                Replay Army Takeover
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
