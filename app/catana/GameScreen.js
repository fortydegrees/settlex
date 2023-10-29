"use client";
import { CatanBoard } from "./Board";
import {
  TransformWrapper,
  TransformComponent,
} from "../../react-zoom-pan-pinch";
import Image from "next/image";
import React, { useRef, useState, useMemo, useEffect, MouseEvent } from "react";

import { RESOURCE_ICON_SVGS, ResourceType } from "./game/types";

import { EffectsBoardWrapper, useEffectListener } from "bgio-effects/react";
import { useDie } from "./components/Die";
import longestRoadIcon from "../../public/svgs/icon_longest_road.svg";
import largestArmyIcon from "../../public/svgs/icon_largest_army.svg";

import { Dock } from "./components/ActionsDock/Dock";
import { DockCard } from "./components/ActionsDock/DockCard";

import {Card} from './Card'

import {ChevronDoubleRightIcon, ForwardIcon} from '@heroicons/react/24/outline'


//OLD, with numbers and stuff
const CardIcon = ({ playerCards, resource, player, setIsTrading }) => {
  return (
    <div className="flex items-center mr-6" id={`p${player}-${resource}`} onClick={()=>setIsTrading(resource)}>
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

// const CardIcon = ({ playerCards, resource, player, setIsTrading }) => {
//     return (
//       <div className="flex items-center mr-6" id={`p${player}-${resource}`} onClick={()=>setIsTrading(resource)}>
//         <Card style={{
//                 position: "relative",
//                 willChange: "transform",
               
//                 zIndex: 5,
//                 width: 50,
//                 height: 70,
//               }}
//               resource={resource} />
//       </div>
//     );
//   };


export function GameScreen(bgioProps) {
  const { G, ctx, moves } = bgioProps;
  const [isTrading, setIsTrading] = useState(null)
  const [Die, rollTo] = useDie(G.diceRoll[0]);
  const [Die2, rollTo2] = useDie(G.diceRoll[1]);
  const playerCards = bgioProps.G.players[0].resourceCards; //TODO: horrible, clean up. might need to check if playerID exists (e.g. what about spectator)
  const otherPlayerCards = bgioProps.G.players[1].resourceCards; //TODO: horrible, clean up. might need to check if playerID exists (e.g. what about spectator)

  

  //dice roll animation
  useEffectListener(
    "roll",
    (dice) => {
      rollTo(dice[0]);
      rollTo2(dice[1]);
    },
    []
  );


  const ACTIONS = [{
    name: 'road',
    action: ()=>moves.placeRoad(),
    img: "/svgs/road_red.svg",
    count: 15,
    enabled: true,
    style:{ transform: "rotate(90deg) scale(0.8)"}
  },
  {
    name: 'settlement',
    action: ()=>moves.placeSettlement(),
    img:  "/svgs/settlement_red.svg",
    count: 5,
    enabled: true,
    style: null
  },
  {
    name: 'city',
    action: ()=>moves.placeRoad(),
    img: "/svgs/city_red.svg",
    count: 4,
    enabled: false,
    style: null
  },
  null,
{
    name: 'buyDev',
    action: ()=> moves.placeRoad(),
    img: "/svgs/card_devcardback.svg",
    count: null,
    enabled: true,
    style: {transform: "scale(0.7)"}
  }]

  return (
    <div
      className="bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600"
      style={{
        width: "100vw", // Use viewport width to take the full screen width
        height: "100vh", // Use viewport height to take the full screen height
        overflow: "hidden", // Prevent scrollbars on the page
        position: "fixed", // Fix the object in place
        top: 0,
        left: 0,
      }}
    >
      {/* board in zoom/pan/pinch wrapper  */}
      <TransformWrapper
        minPositionX={-500}
        minPositionY={-200}
        maxPositionX={500}
        maxPositionY={500}
        maxScale={6}
        minScale={0.3}
      >
        <TransformComponent>
          <CatanBoard {...bgioProps} />
        </TransformComponent>
      </TransformWrapper>

      {/* player card box
      maybe include card dock react-spring thing: https://codesandbox.io/s/6zchkl?file=/src/components/Dock/index.tsx */}

      <div className="flex fixed w-full bottom-4 px-4 ">
        {/* Other elements */}
        <div className="flex flex-1 items-center justify-end self-end">
          {/* Add other divs here */}
          {/* <div className="bg-red-200 w-16 h-16">Settlement</div>
          <div className="bg-green-200 w-16 h-16">City</div> */}
          <span className="flex relative">
            <div className="h-20 w-20 rounded-md bg-gradient-to-t from-red-500 to-red-800 ring-4 ring-white flex justify-center items-center text-6xl">
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
              {ACTIONS.map((action, index) =>
                action ? (
                  <DockCard key={index} action={action} />
                ) : (
                  <span />
                )
              )}
            </Dock>
            <div className="flex self-end mb-4">
            {Object.keys(RESOURCE_ICON_SVGS).map((resource) => {
              return (
                <CardIcon
                  playerCards={playerCards}
                  key={resource}
                  resource={resource}
                  setIsTrading={setIsTrading}
                  //TODO: change this for more players:
                  player={0}
                />
              );
            })}
            </div>
          </div>
        </div>

        <div className="flex-1 items-center justify-start self-end ">
        
            {/* {ctx.phase === "main" && ( */}
              <div className="ml-12 flex-col grow-0 w-36">
                <div
                  className="flex"
                  onClick={() => moves.rollDice()}
                >
                  <Die dieSize="3.5rem"/>
                  <div className="px-4" />
                  <Die2 dieSize="3.5rem" />
                </div>
                <button
                  className="opacity-50 bg-blue-200 hover:bg-blue-300 mx-auto bg-opacity-50 rounded-md flex h-20 w-20 ring-2 ring-slate-300 hover:fill-blue-200 hover:stroke-black"
                  onClick={() => moves.rollDice()}
                >
<ForwardIcon className="w-16 h-16 mx-auto stroke-[0.6px] stroke-blue-200 my-auto" />
                </button>
              </div>
            {/* )} */}

          {/* Add other divs here */}
          {/* <div className="bg-red-200 w-16 h-16">Element 1</div>
          <div className="bg-green-200 w-16 h-16">Element 2</div> */}
        </div>
      </div>
      <div className="fixed left-1/2 -translate-x-1/2 flex items-center pl-4 top-4 bg-blue-200 bg-opacity-50 rounded-md h-20">
        {Object.keys(RESOURCE_ICON_SVGS).map((resource) => {
          return (
            <CardIcon
              playerCards={otherPlayerCards}
              key={resource}
              resource={resource}
              //TODO: change this for more players:
              player={1}
            />
          );
        })}
      </div>
    </div>
  );
}

export const GameScreenWithEffects = EffectsBoardWrapper(GameScreen, {
  // Wait until all effects have finished before updating state.
  updateStateAfterEffects: true,
});
