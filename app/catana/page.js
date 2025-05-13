"use client";
import { Client, Lobby } from "boardgame.io/react";
import { Local, SocketIO } from "boardgame.io/multiplayer";
import { Catan } from "./Game";
import { GameScreenWithEffects } from "./GameScreen";
import React, { useState } from "react";

const CatanClient = Client({
  game: Catan,
  board: GameScreenWithEffects,
  multiplayer: Local(),
  //multiplayer: SocketIO({ server: "localhost:8000" }),
  //debug: false,
});

const Page = () => {

  return(

    <CatanClient playerID={"0"} />



  )

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
        // <div style={{ background: "white", padding: "20px", borderRadius: "10px", boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)" }}>
        //   <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        //     <label>
        //       Username:
        //       <input type="text" name="username" required style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} />
        //     </label>
        //     <label>
        //       Room ID:
        //       <input type="text" name="roomID" required style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ccc" }} />
        //     </label>
        //     <button type="submit" style={{ padding: "10px", borderRadius: "5px", border: "none", backgroundColor: "#007bff", color: "white", cursor: "pointer" }}>
        //       Join Game
        //     </button>
        //   </form>
        // </div>
        <Lobby
          gameServer={`http://localhost:8000`}
          lobbyServer={`http://localhost:8080`}
          gameComponents={[{ game: Catan, board: GameScreenWithEffects }]}
        />
      ) : (
        // <CatanClient username={auth.username} matchID={auth.roomID} />
        <div>w/e</div>
      )}
    </div>
  );
};

export default Page;
