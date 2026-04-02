import React from "react";
import { RESOURCE_ICON_FILES_BY_RESOURCE } from "../theme/themes";

const DEV_CARD_OPTIONS = [
  { id: "knight", label: "Knight" },
  { id: "victoryPoint", label: "VP" },
  { id: "roadBuilding", label: "Road" },
  { id: "yearOfPlenty", label: "Plenty" },
  { id: "monopoly", label: "Mono" }
];

const getPlayerLabel = (playerId, matchData) => {
  const matchPlayer = Array.isArray(matchData)
    ? matchData.find((player) => String(player?.id) === String(playerId))
    : null;
  return matchPlayer?.name || `Player ${playerId}`;
};

export const DebugPanel = ({ bgioProps }) => {
  const { G, moves, playerID, matchData } = bgioProps;
  const playerIds = React.useMemo(() => G?.core?.players ?? [], [G?.core?.players]);
  const [selectedPlayerId, setSelectedPlayerId] = React.useState(
    playerID ?? playerIds[0] ?? "0"
  );
  const [scenarios, setScenarios] = React.useState([]);
  const [newScenarioName, setNewScenarioName] = React.useState("");
  const [isLoadingScenarios, setIsLoadingScenarios] = React.useState(false);
  const [isSavingScenario, setIsSavingScenario] = React.useState(false);
  const [pendingSaveName, setPendingSaveName] = React.useState("");

  React.useEffect(() => {
    if (selectedPlayerId != null) return;
    setSelectedPlayerId(playerID ?? playerIds[0] ?? "0");
  }, [playerID, playerIds, selectedPlayerId]);

  const fetchScenarios = React.useCallback(async () => {
    setIsLoadingScenarios(true);
    try {
      const res = await fetch("/api/scenarios", { cache: "no-store" });
      const json = await res.json();
      setScenarios(json?.scenarios ?? []);
    } catch (error) {
      console.error("Failed to fetch scenarios", error);
    } finally {
      setIsLoadingScenarios(false);
    }
  }, []);

  React.useEffect(() => {
    fetchScenarios();
  }, [fetchScenarios]);

  React.useEffect(() => {
    if (!pendingSaveName || !G?.debugScenarioState) return;

    let cancelled = false;

    const persistScenario = async () => {
      setIsSavingScenario(true);
      try {
        const res = await fetch("/api/scenarios", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: pendingSaveName,
            data: G.debugScenarioState
          })
        });

        if (!res.ok) {
          throw new Error(`Failed to save scenario (${res.status})`);
        }

        if (!cancelled) {
          setNewScenarioName("");
          await fetchScenarios();
        }
      } catch (error) {
        console.error("Failed to save scenario", error);
      } finally {
        if (!cancelled) {
          setPendingSaveName("");
          setIsSavingScenario(false);
          moves.DEBUG_clearCapturedScenarioState?.();
        }
      }
    };

    persistScenario();

    return () => {
      cancelled = true;
    };
  }, [G?.debugScenarioState, fetchScenarios, moves, pendingSaveName]);

  const handleSaveScenario = () => {
    const trimmedName = newScenarioName.trim();
    if (!trimmedName) return;
    setPendingSaveName(trimmedName);
    moves.DEBUG_captureScenarioState?.();
  };

  const handleGiveResource = (resource) => {
    if (!selectedPlayerId) return;
    moves.DEBUG_takeCardsFromBank(selectedPlayerId, [resource]);
  };

  const handleGiveDevCard = (cardType) => {
    if (!selectedPlayerId) return;
    moves.DEBUG_takeDevCards(selectedPlayerId, [cardType]);
  };

  return (
    <div
      className="pointer-events-auto w-full"
      data-allow-interaction="true"
    >
      <div className="overflow-hidden rounded-lg bg-white/25 shadow-lg ring-1 ring-white/30 backdrop-blur-sm select-text">
        <div className="border-b border-white/40 bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-slate-700">
          Dev Tools
        </div>

        <div className="flex flex-col gap-4 p-4 text-sm text-slate-800">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">
              Target Player
            </span>
            <select
              className="rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-800 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70"
              value={selectedPlayerId ?? ""}
              onChange={(event) => setSelectedPlayerId(event.target.value)}
            >
              {playerIds.map((id) => (
                <option key={id} value={id}>
                  {getPlayerLabel(id, matchData)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">
              Give Resource
            </div>
            <div className="grid grid-cols-5 gap-2">
              {Object.keys(RESOURCE_ICON_FILES_BY_RESOURCE).map((resource) => (
                <button
                  key={resource}
                  type="button"
                  onClick={() => handleGiveResource(resource)}
                  className="rounded-lg bg-white/60 px-2 py-2 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-white/50 transition hover:bg-white/80"
                  title={`Give ${resource}`}
                >
                  {resource.slice(0, 2)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">
              Give Dev Card
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEV_CARD_OPTIONS.map((card) => (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleGiveDevCard(card.id)}
                  className="rounded-lg bg-white/60 px-2 py-2 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-white/50 transition hover:bg-white/80"
                  title={`Give ${card.id}`}
                >
                  {card.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-white/30 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-600">
                Saved Scenarios
              </div>
              <button
                type="button"
                onClick={fetchScenarios}
                className="rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-white/50 transition hover:bg-white/80"
              >
                Refresh
              </button>
            </div>
            <div className="max-h-24 overflow-y-auto rounded-lg bg-white/30 px-3 py-2 text-xs text-slate-600 ring-1 ring-white/30">
              {isLoadingScenarios ? (
                <div>Loading…</div>
              ) : scenarios.length === 0 ? (
                <div>No saved scenarios yet.</div>
              ) : (
                scenarios.map((scenario) => (
                  <div key={scenario.id}>{scenario.name}</div>
                ))
              )}
            </div>
            <div className="text-xs text-slate-600">
              Load scenarios from the lobby via <span className="font-semibold">Start from scenario</span>.
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newScenarioName}
                onChange={(event) => setNewScenarioName(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
                placeholder="save current state as…"
                className="min-w-0 flex-1 rounded-lg bg-white/60 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 shadow-inner ring-1 ring-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-white/70"
              />
              <button
                type="button"
                onClick={handleSaveScenario}
                disabled={!newScenarioName.trim() || isSavingScenario || !!pendingSaveName}
                className="rounded-lg bg-lime-500 px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-lime-600 disabled:bg-slate-300 disabled:text-slate-500"
              >
                {isSavingScenario || pendingSaveName ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
