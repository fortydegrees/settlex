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
      <div className="overflow-hidden rounded-xl bg-white/78 shadow-xl ring-1 ring-white/70 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-3 border-b border-white/50 bg-white/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-700">
          <span>Dev Sandbox</span>
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="rounded-full bg-slate-700 px-3 py-1 text-[10px] font-bold tracking-[0.2em] text-white transition hover:bg-slate-800"
          >
            {isCollapsed ? "Expand" : "Collapse"}
          </button>
        </div>

        {isCollapsed ? null : (
          <div className="flex flex-col gap-4 p-4 text-sm text-slate-800">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Preset
              </span>
              <select
                value={presetId}
                onChange={(event) => onPresetChange(event.target.value)}
                className="rounded-lg bg-white px-3 py-2 text-sm text-slate-800 shadow-inner ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Viewer seat
              </span>
              <select
                value={viewerSeat}
                onChange={(event) => onViewerSeatChange(event.target.value)}
                className="rounded-lg bg-white px-3 py-2 text-sm text-slate-800 shadow-inner ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-300"
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
              className="rounded-lg bg-lime-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-lime-600"
            >
              Reset
            </button>

            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Quick resources
              </div>
              <div className="grid grid-cols-5 gap-2">
                {RESOURCE_OPTIONS.map((resource) => (
                  <button
                    key={resource}
                    type="button"
                    onClick={() => onGiveResource(resource)}
                    className="rounded-lg bg-sky-100 px-2 py-2 text-[11px] font-semibold text-slate-700 ring-1 ring-sky-200 transition hover:bg-sky-200"
                  >
                    {resource.slice(0, 2)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Quick dev cards
              </div>
              <div className="grid grid-cols-3 gap-2">
                {DEV_CARD_OPTIONS.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => onGiveDevCard(card.id)}
                    className="rounded-lg bg-amber-100 px-2 py-2 text-[11px] font-semibold text-slate-700 ring-1 ring-amber-200 transition hover:bg-amber-200"
                  >
                    {card.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Dev-card effects
              </div>
              <div className="grid grid-cols-2 gap-2">
                {DEV_CARD_EFFECT_OPTIONS.map((card) => (
                  <button
                    key={`${card.id}-start`}
                    type="button"
                    onClick={() => onOpponentDevCardPlayStart(card.id)}
                    className="rounded-lg bg-violet-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 ring-1 ring-violet-200 transition hover:bg-violet-200"
                  >
                    {`Opponent Plays ${card.label}`}
                  </button>
                ))}
                {DEV_CARD_EFFECT_OPTIONS.map((card) => (
                  <button
                    key={`${card.id}-resolve`}
                    type="button"
                    onClick={() => onOpponentDevCardPlayResolve(card.id)}
                    className="rounded-lg bg-violet-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 ring-1 ring-violet-200 transition hover:bg-violet-200"
                  >
                    {`Resolve ${card.label}`}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={onDevCardPlayReset}
                  className="col-span-2 rounded-lg bg-slate-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200"
                >
                  Reset Dev Visual
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600">
                Board effects
              </div>
              <button
                type="button"
                onClick={onRemoteRobberMoveReplay}
                className="rounded-lg bg-sky-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 ring-1 ring-sky-200 transition hover:bg-sky-200"
              >
                Replay Remote Robber Move
              </button>
              <button
                type="button"
                onClick={onLongestRoadAwardReplay}
                className="rounded-lg bg-amber-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 ring-1 ring-amber-200 transition hover:bg-amber-200"
              >
                Replay Longest Road Award
              </button>
              <button
                type="button"
                onClick={onLongestRoadTakeoverReplay}
                className="rounded-lg bg-amber-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 ring-1 ring-amber-200 transition hover:bg-amber-200"
              >
                Replay Road Takeover
              </button>
              <button
                type="button"
                onClick={onLargestArmyAwardReplay}
                className="rounded-lg bg-rose-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 ring-1 ring-rose-200 transition hover:bg-rose-200"
              >
                Replay Largest Army Award
              </button>
              <button
                type="button"
                onClick={onLargestArmyTakeoverReplay}
                className="rounded-lg bg-rose-100 px-3 py-2 text-left text-[11px] font-semibold text-slate-700 ring-1 ring-rose-200 transition hover:bg-rose-200"
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
