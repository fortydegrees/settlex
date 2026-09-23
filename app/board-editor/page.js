"use client";
import { Fragment, useState, useRef } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import "./page.css";

import {
  TransformWrapper,
  TransformComponent,
} from "react-zoom-pan-pinch";
import { Tile } from "./Tile";
import { Board } from "./Board";
import { Piece } from "./Piece"
import { CATANA_TABLE_BACKGROUND } from "../catana/theme/backgrounds";
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
      <div style={{ background: CATANA_TABLE_BACKGROUND }}>
        <div className="flex">
          {/* Standard control chrome; tile and piece geometry stays in its own components. */}
          <div className="settlex-ui-pane flex w-1/5 flex-col items-center p-ui-4">
            <span className="type-section mb-ui-4 text-ink-primary">Resource Tiles</span>
            <div className="grid grid-cols-2 gap-ui-8 inline-block">
              {STANDARD_RESOURCES.map((resource) => {
                return <Tile key={resource} resource={resource} draggable />;
              })}
            </div>
            <span className="type-section mb-ui-4 mt-ui-4 text-ink-primary">Other Tiles</span>
            <div className="grid grid-cols-2 gap-ui-8 inline-block">
              {SPECIAL_TILES.map((resource) => {
                return <Tile key={resource} resource={resource} draggable />;
              })}
            </div>
            <span className="type-section mb-ui-4 mt-ui-8 text-ink-primary">Pieces</span>
            <div className="grid grid-cols-3 gap-ui-12 gap-y-ui-4 inline-block">
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
            doubleClick={{ mode: "toggle" }}
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
