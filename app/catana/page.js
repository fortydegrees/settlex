"use client";
import { Client } from "boardgame.io/react";
import { Local } from 'boardgame.io/multiplayer';
import { Catan } from "./Game";
import { CatanBoard } from "./Board";



const CatanClient = Client({
  game: Catan,
  board: CatanBoard,
  multiplayer: Local(),
});

const Page = () => {
  return (
    <div
      className="bg-blue-300"
      style={{
        width: "100vw", // Use viewport width to take the full screen width
        height: "100vh", // Use viewport height to take the full screen height
        overflow: "hidden", // Prevent scrollbars on the page
        position: "fixed", // Fix the object in place
        top: 0,
        left: 0,
      }}
    >
    <CatanClient playerID="0" />
    {/* <CatanClient playerID="1" /> */}
    </div>
  );
};

export default Page;
