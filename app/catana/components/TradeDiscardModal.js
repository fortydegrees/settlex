import React, { useState, useMemo, useEffect } from "react";
import { RESOURCE_ICON_SVGS, STANDARD_RESOURCES, ResourceType } from "../game/types";
import { bestTradeRate } from "@settlex/game-core";

// Helper to count occurrences of each resource in a list
const countResources = (resources) => {
  const counts = {};
  for (const r of resources) {
    counts[r] = (counts[r] || 0) + 1;
  }
  return counts;
};

export const TradeDiscardModal = ({ 
  mode, // 'discard' | 'trade'
  player, // The current player object (with resources)
  onConfirm, 
  onCancel,
  requiredDiscardCount, // For discard mode: how many cards MUST be discarded
  G, // Need access to G and topology for trade rates
  bgioProps, // Or entire bgioProps
}) => {
  // State for tracking selected resources
  // Format: { [ResourceType]: number }
  const [selected, setSelected] = useState({});
  // Trade specific: "Receive" selection
  const [receiveResource, setReceiveResource] = useState(null);

  // Reset state when mode changes
  useEffect(() => {
    setSelected({});
    setReceiveResource(null);
  }, [mode, requiredDiscardCount]);

  const playerResourceCounts = useMemo(() => countResources(player.resources), [player.resources]);

  // Derived totals
  const totalSelected = Object.values(selected).reduce((a, b) => a + b, 0);

  // Determine current trade rate for selected giving resource
  // Maritime trade implies giving ONE type of resource for ONE type of receive resource.
  // So if we select multiple types in "Give", it's invalid for maritime trade usually.
  // But let's check what the user has selected.
  const selectedGiveTypes = Object.keys(selected).filter(r => selected[r] > 0);
  const givingResource = selectedGiveTypes.length === 1 ? selectedGiveTypes[0] : null;
  
  const currentTradeRate = useMemo(() => {
    if (mode !== 'trade') return 0;
    if (!givingResource) return 0; // Or 4 as default?
    
    // Use core function to get best rate
    // We need G.core, G.coreTopology, playerId, givingResource
    // Assuming G is passed or we can access it. 
    // Wait, the component usage in GameScreen didn't pass G. 
    // We need to update GameScreen to pass G or bgioProps.
    if (!G || !G.core || !G.coreTopology) return 4; // Fallback default
    
    return bestTradeRate(G.core, G.coreTopology, player.id, givingResource);
  }, [mode, givingResource, G, player.id]);

  // Handlers for +/- buttons
  const increment = (resource, maxAvailable) => {
    const current = selected[resource] || 0;
    
    // Validation for Trade Mode:
    // If giving a DIFFERENT resource, clear others? Or prevent?
    // Maritime trade usually is X of ONE resource for 1 of ANY.
    // So if I have Wood selected, I can't select Brick.
    if (mode === 'trade') {
        const otherSelected = Object.keys(selected).find(r => r !== resource && selected[r] > 0);
        if (otherSelected) {
            // Option A: Auto-clear others
            // setSelected({ [resource]: 1 });
            // return;
            
            // Option B: Prevent
            return; 
        }
        
        // Auto-select max required?
        // If I click +, and I have enough for the trade rate, maybe jump to that?
        // Or just let user click. 
        // User asked: "if i click 'brick' ... it automatically selects 4 brick"
        // Let's implement this behavior: Clicking + on 0 -> sets to Rate.
        if (current === 0) {
             // We need to calculate rate for THIS resource
             let rate = 4;
             if (G && G.core && G.coreTopology) {
                 rate = bestTradeRate(G.core, G.coreTopology, player.id, resource);
             }
             
             if (maxAvailable >= rate) {
                 setSelected({ ...selected, [resource]: rate });
                 return;
             }
             // If not enough, maybe select max? or 1?
             // Let's just select 1 and let them see they don't have enough later/now?
        }
    }

    if (current < maxAvailable) {
      if (mode === 'discard' && totalSelected >= requiredDiscardCount) return;
      setSelected({ ...selected, [resource]: current + 1 });
    }
  };

  const decrement = (resource) => {
    const current = selected[resource] || 0;
    if (current > 0) {
      setSelected({ ...selected, [resource]: current - 1 });
    }
  };

  const canConfirm = useMemo(() => {
    if (mode === 'discard') {
      return totalSelected === requiredDiscardCount;
    } 
    if (mode === 'trade') {
      // Must give exactly Rate of ONE resource
      if (!givingResource) return false;
      if (!receiveResource) return false;
      
      const count = selected[givingResource];
      return count === currentTradeRate;
    }
    return false;
  }, [mode, totalSelected, requiredDiscardCount, receiveResource, givingResource, currentTradeRate, selected]);

  const handleConfirm = () => {
    // Convert selected map back to array of resources if needed by the handler
    const selectedResources = [];
    Object.entries(selected).forEach(([res, count]) => {
      for (let i = 0; i < count; i++) selectedResources.push(res);
    });
    
    if (mode === 'discard') {
      onConfirm(selectedResources);
    } else {
      onConfirm({ give: selectedResources, receive: receiveResource });
    }
  };

  const title = mode === 'discard' 
    ? `Discard ${requiredDiscardCount} Cards`
    : 'Maritime Trade';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 pointer-events-auto">
      <div className="bg-blue-200 bg-opacity-90 backdrop-blur-sm rounded-lg shadow-xl ring-2 ring-slate-300 p-6 w-[500px] max-w-full flex flex-col gap-4">
        
        {/* Header */}
        <h2 className="text-2xl font-bold text-center text-slate-800 drop-shadow-sm">
          {title}
        </h2>

        {/* Content */}
        <div className="flex flex-col gap-4">
          
          {/* GIVE SECTION */}
          <div className={`bg-white bg-opacity-40 rounded p-4 ${mode === 'trade' ? 'order-2' : ''}`}>
            <h3 className="font-semibold text-lg mb-2 text-slate-700">
              {mode === 'discard' ? 'Select Cards to Discard' : `Give ${givingResource && currentTradeRate ? `(${currentTradeRate}:1)` : ''}`}
            </h3>
            <div className="grid grid-cols-5 gap-2">
              {STANDARD_RESOURCES.map((res) => {
                const count = playerResourceCounts[res] || 0;
                const selectedCount = selected[res] || 0;
                const available = count; // Start with total owned
                
                // Gray out logic for Trade
                let isDisabled = false;
                if (mode === 'trade') {
                    // Disable if another type is already selected
                    if (givingResource && givingResource !== res) isDisabled = true;
                    // Disable if we don't have enough for even the best possible rate (2)?
                    // Actually let's be more specific. 
                    // We can calculate rate for this resource.
                    let rate = 4; 
                    if (G && G.core) rate = bestTradeRate(G.core, G.coreTopology, player.id, res);
                    if (available < rate) isDisabled = true; 
                }

                return (
                  <div key={res} className={`flex flex-col items-center ${isDisabled ? 'opacity-40 grayscale' : ''}`}>
                    <div className="relative mb-1">
                      <img src={RESOURCE_ICON_SVGS[res]} alt={res} className="h-10 w-10 drop-shadow-md" />
                      <span className="absolute -top-2 -right-2 bg-slate-700 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {available}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 bg-slate-100 rounded-full px-1 shadow-inner">
                      <button 
                        onClick={() => decrement(res)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-red-600 font-bold disabled:opacity-30"
                        disabled={selectedCount === 0}
                      >
                        -
                      </button>
                      <span className="w-4 text-center font-medium text-sm">{selectedCount}</span>
                      <button 
                        onClick={() => increment(res, available)}
                        className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-green-600 font-bold disabled:opacity-30"
                        disabled={selectedCount >= available || (mode === 'discard' && totalSelected >= requiredDiscardCount) || isDisabled}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RECEIVE SECTION (Trade Only) */}
          {mode === 'trade' && (
            <div className="bg-white bg-opacity-40 rounded p-4 order-1">
              <h3 className="font-semibold text-lg mb-2 text-slate-700">Receive</h3>
              <div className="grid grid-cols-5 gap-2">
                {STANDARD_RESOURCES.map((res) => {
                    // Disable receiving the same resource we are giving (optional rule, but logical)
                    const isSame = givingResource === res;
                    // Also check bank if finite? Not implemented in UI yet
                    
                    return (
                      <button
                        key={res}
                        disabled={isSame}
                        onClick={() => setReceiveResource(res)}
                        className={`flex flex-col items-center p-2 rounded transition-all ${
                          receiveResource === res 
                            ? 'bg-green-200 ring-2 ring-green-500 shadow-md scale-105' 
                            : 'hover:bg-white hover:bg-opacity-50'
                        } ${isSame ? 'opacity-30 cursor-not-allowed' : ''}`}
                      >
                         <img src={RESOURCE_ICON_SVGS[res]} alt={res} className="h-8 w-8 drop-shadow-md" />
                      </button>
                    );
                })}
              </div>
            </div>
          )}

          {/* SUMMARY / STATUS */}
          {mode === 'discard' && (
            <div className="text-center font-medium text-slate-700">
              Selected: <span className={totalSelected === requiredDiscardCount ? "text-green-700 font-bold" : "text-red-700"}>{totalSelected}</span> / {requiredDiscardCount}
            </div>
          )}

        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-3 mt-2">
           {/* Only show Cancel if not forced discard? Or maybe always allow 'cancel' to just close modal but game is stuck until they do it? 
               For discard phase, usually you CANT cancel avoiding the discard, but for UI/UX maybe just hiding the modal is fine. 
               Let's keep it simple. */}
          {onCancel && (
            <button 
              onClick={onCancel}
              className="px-4 py-2 rounded bg-slate-400 text-white font-semibold hover:bg-slate-500 shadow-sm"
            >
              Cancel
            </button>
          )}
          
          <button 
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={`px-6 py-2 rounded font-bold text-white shadow-md transition-all ${
              canConfirm 
                ? 'bg-green-500 hover:bg-green-600 hover:scale-105' 
                : 'bg-slate-400 cursor-not-allowed opacity-70'
            }`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};
