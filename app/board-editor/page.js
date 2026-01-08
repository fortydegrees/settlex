"use client";
import { Fragment, useState, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import "./page.css";

import {
  TransformWrapper,
  TransformComponent,
} from "../../react-zoom-pan-pinch";
import { Tile } from "./Tile";
import { Board } from "./Board";
import { Piece } from "./Piece"
import { STANDARD_RESOURCES, SPECIAL_TILES, PLAYER_COLORS, PIECE_SVGS} from "./utils/types";

import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

export default function Example() {

//Resource Tiles
//Other Tiles (desert, water)
//Numbers
//Robber (& Merchant)
//Pieces (settles, cities, roads)

//Settings (on right)
//Auto Generate Tiles/Numbers (w/ undo?)
//Board stats (e.g. clumpiness)
//Board size?
//import/export
//play from here

//Options ?
//enforce rules
    //e.g. can't place settle next to other
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-sky-400 to-blue-600">
        <div className="flex">
          {/* White Box for Controls */}
          <div className="w-1/5 bg-gray-300 p-4 bg-opacity-50 flex flex-col items-center">
            <span className="mt-0 mb-4">Resource Tiles</span>
            <div className="grid grid-cols-2 gap-8 inline-block">
              {STANDARD_RESOURCES.map((resource) => {
                return <Tile key={resource} resource={resource} draggable />;
              })}
            </div>
            <span className="mt-4 mb-4">Other Tiles</span>
            <div className="grid grid-cols-2 gap-8 inline-block">
              {SPECIAL_TILES.map((resource) => {
                return <Tile key={resource} resource={resource} draggable />;
              })}
            </div>
            <span className="mt-8 mb-4">Pieces</span>
            <div className="grid grid-cols-3 gap-12 gap-y-4 inline-block">
              {PLAYER_COLORS.map((color) => {
                const COLOR_PIECES = PIECE_SVGS(color)
                return Object.entries(COLOR_PIECES).map((piece)=>{
                    return <Piece key={`${color}-${piece[0]}`} type={piece[0]} svg={piece[1]} size={40}/>;
                })
               
              })}
            </div>
            
          </div>

          {/* Content with TransformWrapper */}
          <TransformWrapper
            minPositionX={-500}
            minPositionY={-200}
            maxPositionX={500}
            maxPositionY={500}
            maxScale={6}
            minScale={0.3}
          >
            <TransformComponent>
              <Board editable={true}/>
            </TransformComponent>
          </TransformWrapper>
        </div>
      </div>
      </DndProvider>
  );
}
