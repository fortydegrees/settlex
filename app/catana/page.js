"use client";
import { Client, Lobby } from "boardgame.io/react";
import { SocketIO } from "boardgame.io/multiplayer";
import { Catan } from "./Game";
import { GameScreenWithEffects } from "./GameScreen";
import React, { useState } from "react";
import {
  getGameServerOrigin,
  getLobbyServerOrigin
} from "./utils/serverOrigins";

const CatanClient = Client({
  game: Catan,
  board: GameScreenWithEffects,
  multiplayer: SocketIO({ server: getGameServerOrigin() }),
  debug: false,
});

const Page = () => {
  const [auth, setAuth] = useState({
    username: null,
    credentials: null,
    roomID: null,
  });

  const handleSubmit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const username = formData.get("username");
    const roomID = formData.get("roomID");

    if (username) {
      setAuth({ ...auth, username, roomID });
    }
  };


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
      {!auth.username ? (
        <Lobby
          gameServer={getGameServerOrigin()}
          lobbyServer={getLobbyServerOrigin()}
          gameComponents={[{ game: Catan, board: GameScreenWithEffects }]}
        />
      ) : (
        <div>w/e</div>
      )}
    </div>
  );
};

export default Page;
