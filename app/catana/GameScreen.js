"use client";
import { CatanBoard} from "./Board";
import {
  TransformWrapper,
  TransformComponent,
} from "../../react-zoom-pan-pinch";


import React, { useRef, useState, useMemo, useEffect, MouseEvent } from "react";

import { RESOURCE_ICON_SVGS, ResourceType } from "./game/types";

import { EffectsBoardWrapper, useEffectListener } from "bgio-effects/react";


const CardIcon = ({ playerCards, resource, player }) => {
  return (
    <div className="flex items-center mr-6" id={`p${player}-${resource}`}>
      <div className="w-6 text-white mr-1 text-3xl drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]">
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

export function GameScreen(bgioProps) {

  const playerCards = bgioProps.G.players[0].resourceCards; //TODO: horrible, clean up. might need to check if playerID exists (e.g. what about spectator)
  const otherPlayerCards = bgioProps.G.players[1].resourceCards; //TODO: horrible, clean up. might need to check if playerID exists (e.g. what about spectator)


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
      <div
        className="fixed left-1/2 -translate-x-1/2 flex items-center pl-4 bottom-4 bg-blue-200 bg-opacity-50 rounded-md h-24"
       
      >
        {Object.keys(RESOURCE_ICON_SVGS).map((resource) => {
          return (
            <CardIcon
              playerCards={playerCards}
              key={resource}
              resource={resource}
              //TODO: change this for more players:
              player={0}
            />
          );
        })}
      </div>
      <div className="fixed left-1/2 -translate-x-1/2 flex items-center pl-4 top-4 bg-blue-200 bg-opacity-50 rounded-md h-24">
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