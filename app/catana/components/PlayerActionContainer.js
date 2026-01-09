import Image from "next/image";
import longestRoadIcon from "../../../public/svgs/icon_longest_road.svg";
import largestArmyIcon from "../../../public/svgs/icon_largest_army.svg";
import { Dock } from "./ActionsDock/Dock";
import { DockCard } from "./ActionsDock/DockCard";
import { RESOURCE_ICON_SVGS, ResourceType, STANDARD_RESOURCES } from "../game/types";
import React, { useState, useMemo } from "react";
import {
  ChevronDoubleRightIcon,
  ForwardIcon,
} from "@heroicons/react/24/outline";
import { useDie } from "./Die";
import { useEffectListener } from "bgio-effects/react";


export const CardIcon = ({ playerCards, resource, player, setIsTrading, ctx }) => {
  return (
    <div
      className="flex items-center mr-6"
      id={`p${player}-${resource}`}
      //onClick={() => setIsTrading(resource)}
      //TODO: remove
      onClick={() => ctx.moves.DEBUG_takeCardsFromBank(player, [resource])}
      
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

export const PlayerActionContainer = ({ setPlayerAction, bgioProps, player }) => {

  
  const { G, ctx, moves } = bgioProps;

  const [Die, rollTo] = useDie(G.diceRoll[0]);
  const [Die2, rollTo2] = useDie(G.diceRoll[1]);

  const [isTrading, setIsTrading] = useState(null);

  function countResources(resourceArray) {
    const initialCount = STANDARD_RESOURCES.reduce((acc, resource) => {
        acc[resource] = 0;
        return acc;
    }, {});
    

    return resourceArray.reduce((acc, resource) => {
        if (acc.hasOwnProperty(resource)) {
            acc[resource] += 1;
        }
        return acc;
    }, initialCount);
}

  

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
      style: null,
    },
    null
  ];

  //TODO: might be better/easier to put this in isActionValid/moves 
  const isActionEnabled = (actionName) => {
    //if it's not our turn, can't do anything
    if (ctx.currentPlayer !== player.id.toString()) return false
    //if we have less than 2 cards, can't do anything
    if (player.resources.length < 2) return false
    //if we're not in 'postRoll', can't do anything here
    if (ctx.activePlayers[0] !== "postRoll") return false

    const resourceCount = countResources(player.resources);
    switch (actionName) {
        //if not user's turn, return false
      case 'road':
        if (resourceCount["Wood"]  < 1 || resourceCount["Brick"] < 1) return false
        if (player.roadsRemaining < 1) return false
        //if roads left > 0
        // & canPlaceRoad
        //return bgioProps.G.someConditionForRoad;
        return true
      case 'settlement':
        if (resourceCount["Wood"]  < 1 || resourceCount["Brick"] < 1 || resourceCount["Wheat"]  < 1 || resourceCount["Sheep"] < 1) return false
        if (player.settlementsRemaining < 1) return false
        return true
      // Add cases for other actions
      case 'city':
        if (resourceCount["Wheat"]  < 2 || resourceCount["Ore"] < 3) return false
        if (player.citiesRemaining < 1) return false

        return true;
    default:
        return false
    }
  };

  const dynamicActions = useMemo(() => ACTIONS.map((action) => {
    if (!action) return null;
    return {
      ...action,
      enabled: isActionEnabled(action.name),
    };
  }), [bgioProps]);

  //
  
  const avatarColor = `from-${player.color}-500 to-${player.color}-800`

  return (
    <div className="flex fixed w-full bottom-4 px-4 ">
      {/* Other elements */}
      <div className="flex flex-1 items-center justify-end self-end">
        {/* Add other divs here */}
        {/* <div className="bg-red-200 w-16 h-16">Settlement</div>
  <div className="bg-green-200 w-16 h-16">City</div> */}
        <span className="flex relative">
          <div className={`h-20 w-20 rounded-md bg-gradient-to-t ring-4 ring-white flex justify-center items-center text-6xl ${avatarColor}`}>
            🤠
          </div>
          <span className="absolute right-0 top-0 block h-8 w-8 -translate-y-1/2 translate-x-1/2 transform rounded-full bg-blue-50 ring-2 ring-white text-xl font-semibold flex items-center justify-center">
            4
          </span>
        </span>
        <span className="bg-blue-200 bg-opacity-50 rounded-r-md flex flex-col h-20 w-20 pt-1 ring-2 ring-slate-300">
          <div className="flex ml-3 items-center">
            <Image
              src={longestRoadIcon}
              alt="Longest road"
              width={35}
              height={35}
            />
            <span className="mx-3 text-white text-xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
              1
            </span>
          </div>
          <div className="flex ml-3 items-center">
            <Image
              src={largestArmyIcon}
              alt="Largest army"
              width={35}
              height={35}
            />
            <span className="mx-3 text-white text-xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
              1
            </span>
          </div>
        </span>
      </div>

      {/* Centered card container */}
      <div className="grow-0 self-end">
        <div className="relative h-20 ml-4 mr-8 flex pl-4 bg-blue-200 bg-opacity-50 rounded-md ring-2 ring-slate-300">
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
              return (
                <CardIcon
                  playerCards={player.resources}
                  key={resource}
                  resource={resource}
                  setIsTrading={setIsTrading}
                  //TODO: change this for more players:
                  player={player.id}
                  ctx={bgioProps}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 items-center justify-start self-end ">
        {ctx.phase === "main" && (
        <div className="ml-12 flex-col grow-0 w-36">
          <div className={`flex ${ctx.currentPlayer === player.id && ctx.activePlayers[player.id] === 'preRoll' ? 'opacity-100' : 'opacity-50'}`} 
          
          onClick={ctx.currentPlayer === player.id && ctx.activePlayers[player.id] === 'preRoll' ? () => moves.rollDice() : ()=>{}}>
            <Die dieSize="3.5rem" />
            <div className="px-4" />
            <Die2 dieSize="3.5rem" />
          </div>
          <button
            className={`bg-opacity-50 bg-blue-200 hover:bg-blue-300 mx-auto rounded-md flex h-20 w-20 ring-2 ring-slate-300 hover:fill-blue-200 hover:stroke-black`}
            onClick={() => moves.endTurn()}
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
