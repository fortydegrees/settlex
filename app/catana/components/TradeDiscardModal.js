/* eslint-disable @next/next/no-img-element */
import React, { useState, useMemo, useEffect, useId } from "react";
import { Button } from "../../ui/Button";
import { STANDARD_RESOURCES, ResourceType } from "../types";
import {
  bestTradeRate,
  getMaritimeTradeReceiveCount,
} from "@settlex/game-core";
import {
  getClassicResourceIconPath,
  getResourceIconPath,
  handleThemeImageError,
} from "../theme/themes";

// Helper to count occurrences of each resource in a list
const countResources = (resources) => {
  const counts = {};
  for (const r of resources) {
    counts[r] = (counts[r] || 0) + 1;
  }
  return counts;
};

export const TradeDiscardModal = ({ 
  mode, // 'discard' | 'trade' | 'dev-yop' | 'dev-monopoly'
  player, // The current player object (with resources)
  onConfirm, 
  onCancel,
  requiredDiscardCount, // For discard mode: how many cards MUST be discarded
  G, // Need access to G and topology for trade rates
  tradePresetResource,
  bgioProps, // Or entire bgioProps
  themeId,
}) => {
  // State for tracking selected resources
  // Format: { [ResourceType]: number }
  const [selected, setSelected] = useState({});
  const [selectedReceive, setSelectedReceive] = useState({});
  const titleId = useId();

  const isDiscard = mode === "discard";
  const isTrade = mode === "trade";
  const isDevYop = mode === "dev-yop";
  const isDevMonopoly = mode === "dev-monopoly";
  const isDevMode = isDevYop || isDevMonopoly;
  const devMaxSelections = isDevYop ? 2 : isDevMonopoly ? 1 : 0;

  // Reset state when mode changes
  useEffect(() => {
    setSelected({});
    setSelectedReceive({});
    if (mode !== "trade") return;
    if (!tradePresetResource) return;
    if (!G || !G.core || !G.coreTopology) return;

    const rate = bestTradeRate(
      G.core,
      G.coreTopology,
      player.id,
      tradePresetResource
    );

    if (rate > 0) {
      setSelected({ [tradePresetResource]: rate });
    }
  }, [mode, requiredDiscardCount, tradePresetResource, G, player.id]);

  const playerResourceCounts = useMemo(() => countResources(player.resources), [player.resources]);
  const bankResourceCounts = useMemo(
    () => countResources(G?.core?.bank?.resources ?? []),
    [G?.core?.bank?.resources]
  );
  const bankFinite = !!G?.core?.ruleset?.bank?.finite;
  const showYearOfPlentyBankCounts =
    G?.gameSettings?.showYearOfPlentyBankCounts === true;

  // Derived totals
  const totalSelected = Object.values(selected).reduce((a, b) => a + b, 0);
  const totalSelectedReceive = Object.values(selectedReceive).reduce(
    (a, b) => a + b,
    0
  );

  const getTradeRate = (resource) => {
    if (!G || !G.core || !G.coreTopology) return 4;
    return bestTradeRate(G.core, G.coreTopology, player.id, resource);
  };

  const selectedGiveResources = Object.entries(selected).flatMap(([res, count]) =>
    Array.from({ length: count }, () => res)
  );

  const tradeReceiveCountResult = useMemo(() => {
    if (!isTrade || !G?.core || !G?.coreTopology) {
      return { ok: true, count: 0 };
    }

    return getMaritimeTradeReceiveCount(
      G.core,
      G.coreTopology,
      player.id,
      selectedGiveResources
    );
  }, [isTrade, G, player.id, selectedGiveResources]);

  const tradeReceiveCapacity = tradeReceiveCountResult.ok
    ? tradeReceiveCountResult.count
    : 0;

  // Determine current trade rate for selected giving resource
  const selectedGiveTypes = isTrade
    ? Object.keys(selected).filter((r) => selected[r] > 0)
    : [];
  const givingResource = selectedGiveTypes.length === 1 ? selectedGiveTypes[0] : null;
  
  const currentTradeRate =
    isTrade && givingResource ? getTradeRate(givingResource) : 0;

  // Handlers for +/- buttons
  const increment = (resource, maxAvailable, side = "give") => {
    if (isTrade && side === "receive") {
      const current = selectedReceive[resource] || 0;
      if (
        totalSelectedReceive >= tradeReceiveCapacity ||
        current >= maxAvailable
      ) {
        return;
      }
      setSelectedReceive({ ...selectedReceive, [resource]: current + 1 });
      return;
    }

    const current = selected[resource] || 0;

    if (isDevMonopoly) {
      setSelected((prev) => (prev[resource] ? {} : { [resource]: 1 }));
      return;
    }

    if (isDevYop && totalSelected >= devMaxSelections) return;

    if (isTrade) {
      const rate = getTradeRate(resource);
      if (current + rate <= maxAvailable) {
        setSelected({ ...selected, [resource]: current + rate });
      }
      return;
    }

    if (current < maxAvailable) {
      if (isDiscard && totalSelected >= requiredDiscardCount) return;
      setSelected({ ...selected, [resource]: current + 1 });
    }
  };

  const decrement = (resource, side = "give") => {
    if (isTrade && side === "receive") {
      const current = selectedReceive[resource] || 0;
      if (current > 0) {
        setSelectedReceive({ ...selectedReceive, [resource]: current - 1 });
      }
      return;
    }

    const current = selected[resource] || 0;
    if (current > 0) {
      if (isTrade) {
        const rate = getTradeRate(resource);
        setSelected({ ...selected, [resource]: Math.max(0, current - rate) });
        return;
      }
      setSelected({ ...selected, [resource]: current - 1 });
    }
  };

  const canConfirm = useMemo(() => {
    if (isDiscard) {
      return totalSelected === requiredDiscardCount;
    }
    if (isTrade) {
      return (
        tradeReceiveCountResult.ok &&
        tradeReceiveCapacity > 0 &&
        totalSelectedReceive === tradeReceiveCapacity
      );
    }
    if (isDevYop) {
      return totalSelected === devMaxSelections;
    }
    if (isDevMonopoly) {
      return totalSelected === devMaxSelections;
    }
    return false;
  }, [
    isDiscard,
    isTrade,
    isDevYop,
    isDevMonopoly,
    totalSelected,
    requiredDiscardCount,
    tradeReceiveCapacity,
    tradeReceiveCountResult,
    totalSelectedReceive,
    devMaxSelections,
  ]);

  const handleConfirm = () => {
    // Convert selected map back to array of resources if needed by the handler
    const selectedResources = [];
    Object.entries(selected).forEach(([res, count]) => {
      for (let i = 0; i < count; i++) selectedResources.push(res);
    });

    if (isDiscard) {
      onConfirm(selectedResources);
    } else if (isTrade) {
      const selectedReceiveResources = [];
      Object.entries(selectedReceive).forEach(([res, count]) => {
        for (let i = 0; i < count; i++) selectedReceiveResources.push(res);
      });
      onConfirm({ give: selectedResources, receive: selectedReceiveResources });
    } else if (isDevYop) {
      onConfirm(selectedResources);
    } else if (isDevMonopoly) {
      onConfirm(selectedResources[0]);
    }
  };

  const title = isDiscard
    ? `Discard ${requiredDiscardCount} Cards`
    : isTrade
    ? "Maritime Trade"
    : isDevYop
    ? "Select Two Resources"
    : "Select a Resource to Claim";

  return (
    <div className="settlex-ui-dialog-backdrop settlex-ui-layer-dialog settlex-ui-dialog-viewport fixed inset-0 flex items-center justify-center pointer-events-auto">
      <div role="dialog" aria-labelledby={titleId} className="settlex-ui-pane settlex-ui-dialog-surface w-[520px] max-w-full max-h-full flex flex-col gap-ui-4">
        
        {/* Header */}
        <h2 id={titleId} className="type-title text-center text-ink-primary">
          {title}
        </h2>

        {/* Content */}
        <div className="flex flex-col gap-ui-4">
          
          {/* GIVE SECTION */}
          {(isDiscard || isTrade) && (
            <div
              className={`settlex-ui-inset p-ui-4 ${
                isTrade ? "order-2" : ""
              }`}
            >
              <h3 className="type-section mb-ui-2 text-ink-primary">
                {isDiscard
                  ? "Select Cards to Discard"
                  : `Give ${
                      givingResource && currentTradeRate
                        ? `(${currentTradeRate}:1)`
                        : ""
                    }`}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(5rem,1fr))] gap-ui-2">
                {STANDARD_RESOURCES.map((res) => {
                  const count = playerResourceCounts[res] || 0;
                  const selectedCount = selected[res] || 0;
                  const available = count; // Start with total owned

                  // Gray out logic for Trade
                  let isDisabled = false;
                  if (isTrade) {
                    let rate = getTradeRate(res);
                    if (available < rate) isDisabled = true;
                  }

                  return (
                    <div
                      key={res}
                      className={`flex flex-col items-center ${
                        isDisabled ? "opacity-40 grayscale" : ""
                      }`}
                    >
                      <div className="relative mb-ui-1">
                        <img
                          src={getResourceIconPath(themeId, res)}
                          alt={res}
                          className="h-10 w-10 drop-shadow-md"
                          draggable={false}
                          onError={(event) =>
                            handleThemeImageError(
                              event,
                              getClassicResourceIconPath(res)
                            )
                          }
                        />
                        <span className="absolute -top-ui-2 -right-ui-2 bg-surface-selected text-ink-primary type-caption rounded-pill h-5 min-w-5 px-ui-0.5 flex items-center justify-center">
                          {available}
                        </span>
                      </div>

                      <div className="settlex-ui-inset flex items-center gap-ui-1 rounded-pill px-ui-1">
                        <button
                          onClick={() => decrement(res)}
                          aria-label={`Decrease give ${res}`}
                          className="settlex-ui-focus w-6 h-6 flex items-center justify-center type-action-small text-ink-secondary hover:text-ink-danger disabled:opacity-30"
                          disabled={selectedCount === 0}
                        >
                          -
                        </button>
                        <span className="w-4 text-center type-label text-ink-primary">
                          {selectedCount}
                        </span>
                        <button
                          onClick={() => increment(res, available)}
                          aria-label={`Increase give ${res}`}
                          className="settlex-ui-focus w-6 h-6 flex items-center justify-center type-action-small text-ink-secondary hover:text-ink-primary disabled:opacity-30"
                          disabled={
                            (isTrade
                              ? selectedCount + getTradeRate(res) > available
                              : selectedCount >= available) ||
                            (isDiscard &&
                              totalSelected >= requiredDiscardCount) ||
                            isDisabled
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* RECEIVE SECTION (Trade Only) */}
          {isTrade && (
            <div className="settlex-ui-inset p-ui-4 order-1">
              <h3 className="type-section mb-ui-2 text-ink-primary">Receive</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(5rem,1fr))] gap-ui-2">
                {STANDARD_RESOURCES.map((res) => {
                    const available = bankFinite
                      ? bankResourceCounts[res] || 0
                      : tradeReceiveCapacity;
                    const selectedCount = selectedReceive[res] || 0;
                    const isDisabled =
                      available === 0 || !tradeReceiveCountResult.ok;

                    return (
                      <div
                        key={res}
                        className={`flex flex-col items-center ${
                          isDisabled ? "opacity-40 grayscale" : ""
                        }`}
                      >
                        <div className="relative mb-ui-1">
                          <img
                            src={getResourceIconPath(themeId, res)}
                            alt={res}
                            className="h-10 w-10 drop-shadow-md"
                            draggable={false}
                            onError={(event) =>
                              handleThemeImageError(
                                event,
                                getClassicResourceIconPath(res)
                              )
                            }
                          />
                          {bankFinite && (
                            <span className="absolute -top-ui-2 -right-ui-2 bg-surface-selected text-ink-primary type-caption rounded-pill h-5 min-w-5 px-ui-0.5 flex items-center justify-center">
                              {available}
                            </span>
                          )}
                        </div>

                        <div className="settlex-ui-inset flex items-center gap-ui-1 rounded-pill px-ui-1">
                          <button
                            onClick={() => decrement(res, "receive")}
                            aria-label={`Decrease receive ${res}`}
                            className="settlex-ui-focus w-6 h-6 flex items-center justify-center type-action-small text-ink-secondary hover:text-ink-danger disabled:opacity-30"
                            disabled={selectedCount === 0}
                          >
                            -
                          </button>
                          <span className="w-4 text-center type-label text-ink-primary">
                            {selectedCount}
                          </span>
                          <button
                            onClick={() => increment(res, available, "receive")}
                            aria-label={`Increase receive ${res}`}
                            className="settlex-ui-focus w-6 h-6 flex items-center justify-center type-action-small text-ink-secondary hover:text-ink-primary disabled:opacity-30"
                            disabled={
                              totalSelectedReceive >= tradeReceiveCapacity ||
                              selectedCount >= available ||
                              isDisabled
                            }
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                })}
              </div>
            </div>
          )}

          {/* DEV CARD SELECT SECTION */}
          {isDevYop && (
            <div className="settlex-ui-inset p-ui-4">
              <h3 className="type-section mb-ui-2 text-ink-primary">
                Select Two Resources
              </h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(5rem,1fr))] gap-ui-2">
                {STANDARD_RESOURCES.map((res) => {
                  const selectedCount = selected[res] || 0;
                  const available = isDevYop
                    ? bankFinite
                      ? bankResourceCounts[res] || 0
                      : devMaxSelections
                    : devMaxSelections;
                  const isDisabled = isDevYop && bankFinite && available === 0;
                  const disableIncrement = isDevYop
                    ? totalSelected >= devMaxSelections ||
                      selectedCount >= available
                    : selectedCount >= devMaxSelections;

                  return (
                    <div
                      key={res}
                      className={`flex flex-col items-center ${
                        isDisabled ? "opacity-40 grayscale" : ""
                      }`}
                    >
                      <div className="relative mb-ui-1">
                        <img
                          src={getResourceIconPath(themeId, res)}
                          alt={res}
                          className="h-10 w-10 drop-shadow-md"
                          draggable={false}
                          onError={(event) =>
                            handleThemeImageError(
                              event,
                              getClassicResourceIconPath(res)
                            )
                          }
                        />
                        {isDevYop && bankFinite && showYearOfPlentyBankCounts && (
                          <span className="absolute -top-ui-2 -right-ui-2 bg-surface-selected text-ink-primary type-caption rounded-pill h-5 min-w-5 px-ui-0.5 flex items-center justify-center">
                            {available}
                          </span>
                        )}
                      </div>

                      <div className="settlex-ui-inset flex items-center gap-ui-1 rounded-pill px-ui-1">
                        <button
                          onClick={() => decrement(res)}
                          aria-label={`Decrease selection ${res}`}
                          className="settlex-ui-focus w-6 h-6 flex items-center justify-center type-action-small text-ink-secondary hover:text-ink-danger disabled:opacity-30"
                          disabled={selectedCount === 0}
                        >
                          -
                        </button>
                        <span className="w-4 text-center type-label text-ink-primary">
                          {selectedCount}
                        </span>
                        <button
                          onClick={() => increment(res, available)}
                          aria-label={`Increase selection ${res}`}
                          className="settlex-ui-focus w-6 h-6 flex items-center justify-center type-action-small text-ink-secondary hover:text-ink-primary disabled:opacity-30"
                          disabled={disableIncrement || isDisabled}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isDevMonopoly && (
            <div className="settlex-ui-inset p-ui-4">
              <h3 className="type-section mb-ui-2 text-ink-primary">
                Select a Resource
              </h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(5rem,1fr))] gap-ui-2">
                {STANDARD_RESOURCES.map((res) => {
                  const isSelected = (selected[res] || 0) > 0;

                  return (
                    <button
                      key={res}
                      onClick={() => increment(res, 1)}
                      aria-label={`Claim ${res}`}
                      className={`settlex-ui-focus flex flex-col items-center p-ui-2 rounded-small transition-all ${
                        isSelected
                          ? "bg-surface-positive ring-2 ring-ink-positive shadow-sm scale-105"
                          : "hover:bg-surface-hover"
                      }`}
                    >
                      <img
                        src={getResourceIconPath(themeId, res)}
                        alt={res}
                        className="h-8 w-8 drop-shadow-md"
                        draggable={false}
                        onError={(event) =>
                          handleThemeImageError(
                            event,
                            getClassicResourceIconPath(res)
                          )
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUMMARY / STATUS */}
          {isDiscard && (
            <div className="text-center type-body-small text-ink-secondary">
              Selected: <span className={totalSelected === requiredDiscardCount ? "text-ink-positive type-action-small" : "text-ink-danger type-action-small"}>{totalSelected}</span> / {requiredDiscardCount}
            </div>
          )}
          {isDevMode && (
            <div className="text-center type-body-small text-ink-secondary">
              Selected:{" "}
              <span
                className={
                  totalSelected === devMaxSelections
                    ? "text-ink-positive type-action-small"
                    : "text-ink-danger type-action-small"
                }
              >
                {totalSelected}
              </span>{" "}
              / {devMaxSelections}
            </div>
          )}
          {isTrade && (
            <div className="text-center type-body-small text-ink-secondary">
              {tradeReceiveCountResult.ok ? (
                <>
                  Receive:{" "}
                  <span
                    className={
                      totalSelectedReceive === tradeReceiveCapacity &&
                      tradeReceiveCapacity > 0
                        ? "text-ink-positive type-action-small"
                        : "text-ink-danger type-action-small"
                    }
                  >
                    {totalSelectedReceive}
                  </span>{" "}
                  / {tradeReceiveCapacity}
                </>
              ) : (
                <span className="text-ink-danger">
                  Offer must fill complete trade chunks.
                </span>
              )}
            </div>
          )}

        </div>

        {/* Footer Buttons */}
        <div className="flex justify-end gap-ui-3 mt-ui-2">
          {onCancel && (
            <Button variant="secondary" size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}
          
          <Button variant="primary" size="sm"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            {isDiscard
              ? "Discard"
              : isTrade
                ? "Trade"
                : isDevMonopoly
                  ? "Claim"
                  : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
};
