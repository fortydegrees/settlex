import React from "react";
import { RESOURCE_ICON_SVGS } from "../game/types";

export const DebugPanel = ({ bgioProps }) => {
  const { G, ctx, moves, playerID } = bgioProps;

  const handleSaveState = () => {
    try {
      // We save G and ctx. When loading, we primarily restore G.
      const state = { G, ctx };
      localStorage.setItem("catan_debug_state", JSON.stringify(state));
      console.log("State saved to localStorage");
    } catch (e) {
      console.error("Failed to save state", e);
    }
  };

  const handleLoadState = () => {
    try {
      const saved = localStorage.getItem("catan_debug_state");
      if (saved) {
        const state = JSON.parse(saved);
        // Call the move to update the server/game state
        moves.DEBUG_loadState(state);
        console.log("State loaded");
      }
    } catch (e) {
      console.error("Failed to load state", e);
    }
  };

  // Scenarios State
  const [scenarios, setScenarios] = React.useState([]);
  const [newScenarioName, setNewScenarioName] = React.useState("");
  const [isLoadingScenarios, setIsLoadingScenarios] = React.useState(false);

  // Fetch scenarios on mount
  React.useEffect(() => {
    fetchScenarios();
  }, []);

  const fetchScenarios = async () => {
    setIsLoadingScenarios(true);
    try {
      const res = await fetch('/api/scenarios');
      const json = await res.json();
      if (json.scenarios) {
        setScenarios(json.scenarios);
      }
    } catch (e) {
      console.error("Failed to fetch scenarios", e);
    } finally {
      setIsLoadingScenarios(false);
    }
  };

  const handleSaveScenario = async () => {
    if (!newScenarioName) return;
    try {
      // Save current state (G + ctx) - although we mostly care about G for loading
      const state = { G, ctx };
      const res = await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newScenarioName, data: state }),
      });
      
      if (res.ok) {
        setNewScenarioName("");
        fetchScenarios(); // Refresh list
        console.log("Scenario saved");
      }
    } catch (e) {
      console.error("Failed to save scenario", e);
    }
  };


  return (
    <div className="fixed left-0 top-4 ml-4 w-64 p-4 bg-gray-100 bg-opacity-90 rounded-md shadow-lg border border-gray-300 flex flex-col gap-4 text-xs font-mono z-50 max-h-[90vh] overflow-y-auto">
      <div className="font-bold text-center border-b pb-2">DEBUG PANEL</div>

      {/* State Management (Local Storage) */}
      <div className="flex gap-2 justify-center pb-2 border-b">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
          onClick={handleSaveState}
        >
          Quick Save
        </button>
        <button
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
          onClick={handleLoadState}
        >
          Quick Load
        </button>
      </div>

      {/* Filesystem Scenarios */}
      <div className="flex flex-col gap-2 border-b pb-2">
        <div className="font-semibold text-gray-700">Saved Scenarios:</div>
        
        {/* Load List */}
        <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {isLoadingScenarios && <div>Loading...</div>}
            {!isLoadingScenarios && scenarios.length === 0 && <div className="text-gray-500 italic">No saved files</div>}
            {scenarios.map(sc => (
                <button 
                    key={sc.id}
                    className="text-left px-2 py-1 bg-white border hover:bg-purple-100 rounded flex justify-between items-center"
                    onClick={() => {
                        console.log(`Loading scenario ${sc.name}`, moves);
                        moves.DEBUG_loadState(sc.data);
                    }}
                >
                    <span>{sc.name}</span>
                </button>
            ))}
        </div>

        {/* Save New */}
        <div className="flex gap-1 mt-2">
            <input 
                type="text" 
                className="border rounded px-1 flex-1"
                placeholder="Name..."
                value={newScenarioName}
                onChange={(e) => setNewScenarioName(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
            />
            <button 
                className="bg-purple-600 text-white px-2 rounded"
                onClick={handleSaveScenario}
                disabled={!newScenarioName}
            >
                Save
            </button>
        </div>
      </div>

      {/* Add Resources */}
      <div className="flex flex-col gap-1">
        <div className="font-semibold text-gray-700">Add 1x:</div>
        <div className="grid grid-cols-5 gap-1">
          {Object.keys(RESOURCE_ICON_SVGS).map((res) => (
             <button
                key={res}
                className="flex items-center justify-center p-1 bg-white border rounded hover:bg-gray-100"
                title={`Add ${res}`}
                onClick={() => {
                    console.log(`Adding resource ${res}, playerID: ${playerID}`, moves);
                    moves.DEBUG_takeCardsFromBank(playerID, [res]);
                }}
             >
                {/* Use raw text letter for simplicity in debug panel, or small icon */}
                {res[0]}
             </button>
          ))}
        </div>
      </div>
    </div>
  );
};
