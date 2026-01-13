import { Dock } from "./ActionsDock/Dock";
import { DockCard } from "./ActionsDock/DockCard";
import { DevCardDisplay } from "./DevCardDisplay";
import { PlayerAvatarStats } from "./PlayerAvatarStats";
import { RESOURCE_ICON_SVGS } from "../game/types";
import React, { useMemo } from "react";
import {
  ForwardIcon,
} from "@heroicons/react/24/outline";
import { useDie } from "./Die";
import { useEffectListener } from "bgio-effects/react";
import { canBuildRoad, canBuildSettlement, canBuildCity, canMaritimeTrade, canAfford, canPlayDevCard, ResourceType, buildableNodes, buildableEdges } from "@settlex/game-core";
import { getMaritimeTradeRateIfTradable } from "../utils/trade";


export const CardIcon = ({ playerCards, resource, player, onResourceClick }) => {
  const handleClick = () => {
    if (onResourceClick) {
      onResourceClick(resource);
    }
  };

  return (
    <div
      className={`flex items-center mr-6 ${onResourceClick ? "cursor-pointer" : ""}`}
      id={`p${player}-${resource}`}
      onClick={onResourceClick ? handleClick : undefined}
      
    >
      <div className="w-6 select-none text-white mr-1 text-3xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
        {playerCards.filter((item) => item === resource).length}
      </div>
      {resource === ResourceType.BRICK || resource === ResourceType.ORE ? (
        <img src={RESOURCE_ICON_SVGS[resource]} className="h-6" />
      ) : resource == ResourceType.SHEEP ? (
        <img src={RESOURCE_ICON_SVGS[resource]} className="h-7" />
      ) : (
        <img src={RESOURCE_ICON_SVGS[resource]} className="h-8" />
      )}
    </div>
  );
};

export const PlayerActionContainer = ({ setPlayerAction, bgioProps, player, onTradeClick }) => {

  
  const { G, ctx, moves } = bgioProps;

  const [Die, rollTo] = useDie(G.diceRoll[0]);
  const [Die2, rollTo2] = useDie(G.diceRoll[1]);
  const clientPlayerID = bgioProps.playerID;
  const isMe = clientPlayerID === player.id;
  const stage = ctx.activePlayers?.[player.id];
  const isDevStage = stage === "preRoll" || stage === "postRoll";
  const devPlayActive = G.devCardPlay && G.devCardPlay.playerId === player.id;
  const canStartDev =
    isMe && ctx.currentPlayer === player.id && isDevStage && !devPlayActive;
  const devPlayableByType = useMemo(() => {
    const playable = {};
    if (!G.core || !player?.devCards) return playable;
    player.devCards.forEach((card) => {
      if (card === "victoryPoint") return;
      playable[card] = canStartDev && canPlayDevCard(G.core, player.id, card);
    });
    return playable;
  }, [G.core, player?.devCards, player.id, canStartDev]);
  const activeDevCardType = devPlayActive ? G.devCardPlay.type : null;

  //dice roll animation
  useEffectListener(
    "roll",
    (dice) => {
      rollTo(dice[0]);
      rollTo2(dice[1]);
    },
    []
  );
  const ACTIONS = [
    {
      name: "trade",
      action: onTradeClick, // Opens the modal
      img: "/svgs/icon_trade.svg", // Placeholder icon for trade, maybe use a custom one later
      count: 0,
      enabled: ctx.currentPlayer === player.id && ctx.phase === 'main', // Only enable trade during main phase & turn
      style: null, 
    },
    {
      name: "road",
      action: () => setPlayerAction("placeRoad"),
      img: "/svgs/road_red.svg",
      count: player.roadsRemaining,
      enabled: false,
      style: { transform: "rotate(90deg) scale(0.9)" },
    },
    {
      name: "settlement",
      action: () => setPlayerAction("placeSettlement"),
      img: "/svgs/settlement_red.svg",
      count: player.settlementsRemaining,
      enabled: false,
      style: null,
    },
    {
      name: "city",
      action: () => setPlayerAction("placeCity"),
      img: "/svgs/city_red.svg",
      count: player.citiesRemaining,
      enabled: false,
      enabled: false,
      style: null,
    },
    {
      name: "devCard",
      action: () => moves.buyDevCard(),
      img: "/svgs/icon_devcard.svg",
      count: 0,
      enabled: false,
      style: null,
    },
    null
  ];

  const isActionEnabled = (actionName) => {
    // UI-level checks (boardgame.io state)
    if (ctx.currentPlayer !== player.id.toString()) return false;
    if (ctx.activePlayers?.[player.id] !== "postRoll") {
        if (actionName === 'devCard') console.log(`DevCard disabled: Wrong phase/stage. Current: ${ctx.activePlayers?.[player.id]}`);
        return false;
    }
    if (!G.core) return false;

    // Game rule checks (from game-core)
    switch (actionName) {
      case 'road':
        if (!canBuildRoad(G.core, player.id).ok) return false;
        // Check if there are any buildable edges
        return buildableEdges(G.core, G.coreTopology, player.id, { initialPlacement: false }).length > 0;
      case 'settlement':
        if (!canBuildSettlement(G.core, player.id).ok) return false;
        // Check if there are any buildable nodes
        return buildableNodes(G.core, G.coreTopology, player.id, { initialPlacement: false }).length > 0;
      case 'city':
        if (!canBuildCity(G.core, player.id).ok) return false;
        // Check if player has any settlements to upgrade
        // City build rule: must replace an existing settlement of the player
        const settlements = Object.values(G.core.buildingsByNodeId).filter(
          b => b.ownerId === player.id && b.type === 'settlement'
        );
        return settlements.length > 0;
      case 'trade':
        // Check if player has enough resources to trade at ANY rate
        return canMaritimeTrade(G.core, G.coreTopology, player.id).ok;
      case 'devCard':
        if (!G.core.devDeck.length) {
            console.log("DevCard disabled: Deck empty");
            return false;
        }
        const affordable = canAfford(G.core.ruleset.buildCosts.devCard, player.resources);
        if (!affordable) {
             console.log("DevCard disabled: Cant afford", { cost: G.core.ruleset.buildCosts.devCard, resources: player.resources });
        }
        return affordable;
      default:
        return false;
    }
  };

  const dynamicActions = useMemo(() => ACTIONS.map((action) => {
    if (!action) return null;
    return {
      ...action,
      enabled: isActionEnabled(action.name),
    };
  }), [bgioProps]);

  const canTradeNow = isActionEnabled("trade");

  const canQuickTradeResource = (resource) => {
    if (!onTradeClick || !canTradeNow) return false;
    return !!getMaritimeTradeRateIfTradable({
      core: G.core,
      coreTopology: G.coreTopology,
      playerId: player.id,
      resource,
      playerResources: player.resources
    });
  };

  const handleResourceClick = (resource) => {
    if (!onTradeClick) return;
    if (!canTradeNow) return;

    const rate = getMaritimeTradeRateIfTradable({
      core: G.core,
      coreTopology: G.coreTopology,
      playerId: player.id,
      resource,
      playerResources: player.resources
    });

    if (!rate) return;
    onTradeClick(resource);
  };

  // Calculate if player is over discard limit
  const totalResources = player.resources.length;
  const discardLimit = G.core?.ruleset?.discardLimit ?? 7;
  const isOverLimit = totalResources > discardLimit;

  // Determine container styling based on limit status
  const containerStyle = isOverLimit 
    ? "bg-rose-500 bg-opacity-40 ring-rose-500" 
    : "bg-blue-200 bg-opacity-50 ring-slate-300";

  return (
    <div className="flex fixed w-full bottom-4 px-4 items-end relative">
      <div className="absolute left-1/2 -translate-x-1/2 flex items-end">
        {/* Avatar + centered dock */}
        <PlayerAvatarStats
          player={player}
          core={G.core}
          coreTopology={G.coreTopology}
          isMe={isMe}
          handCounts={{
            resources: player.resources.length,
            devCards: player.devCards?.length ?? 0,
            isOverLimit,
          }}
        />

        <div className="relative">
          <div className={`relative h-20 ml-4 mr-4 flex pl-4 rounded-md ring-2 transition-colors duration-300 ${containerStyle}`}>
            <Dock>
            {dynamicActions.map((action, index) =>
              action ? (
                <DockCard key={action.name ?? index} action={action} />
              ) : (
                <span key={`empty-${index}`} />
              )
            )}
            </Dock>
            <div className="flex self-end mb-4">
              {Object.keys(RESOURCE_ICON_SVGS).map((resource) => {
                const canQuickTrade = canQuickTradeResource(resource);
                return (
                  <CardIcon
                    playerCards={player.resources}
                    key={resource}
                    resource={resource}
                    //TODO: change this for more players:
                    player={player.id}
                    onResourceClick={canQuickTrade ? handleResourceClick : null}
                  />
                );
              })}
            </div>
          </div>
          {/* Dev Card Display */}
          <div className="absolute left-full ml-0 bottom-[-2px]">
            <DevCardDisplay
              cards={player.devCards}
              playableByType={devPlayableByType}
              onPlayCard={(card) => moves.playDevCardStart(card)}
              activeCardType={activeDevCardType}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-end justify-end self-end pr-6 sm:pr-8 md:pr-10 lg:pr-[4.5rem]">
        {ctx.phase === "main" && (
        <div className="flex w-36 flex-col items-center">
          <div className={`flex ${ctx.currentPlayer === player.id && ctx.activePlayers?.[player.id] === 'preRoll' ? 'opacity-100' : 'opacity-50'}`}
          
          onClick={ctx.currentPlayer === player.id && ctx.activePlayers?.[player.id] === 'preRoll' ? () => moves.rollDice() : ()=>{}}>
            <Die dieSize="3.5rem" />
            <div className="px-4" />
            <Die2 dieSize="3.5rem" />
          </div>
          <button
            className={`bg-opacity-50 bg-blue-200 hover:bg-blue-300 mx-auto rounded-md flex h-20 w-20 ring-2 ring-slate-300 hover:fill-blue-200 hover:stroke-black`}
            onClick={() => {
              setPlayerAction(null);
              moves.endTurn();
            }}
          >
            <ForwardIcon className="w-16 h-16 mx-auto stroke-[0.6px] stroke-blue-200 my-auto" />
          </button>
        </div>
        )}

        {/* Add other divs here */}
        {/* <div className="bg-red-200 w-16 h-16">Element 1</div>
  <div className="bg-green-200 w-16 h-16">Element 2</div> */}
      </div>
    </div>
  );
};
