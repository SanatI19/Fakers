import { useState, createContext } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import PreLobby from "./PreLobby";
import PreGame from "./PreGame";
import PreGameDisplay from "./PreGameDisplay";
import Game from "./Game";
import GameDisplay from "./GameDisplay";
import { ServerToClientEvents, ClientToServerEvents } from "../../shared";

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("http://localhost:3500");
// const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();


export const SocketContext = createContext<Socket<ServerToClientEvents, ClientToServerEvents>>(socket);

function App() {
  // Top-level socket: only one connection for the whole app
  const [socket] = useState<Socket<ServerToClientEvents, ClientToServerEvents>>(() =>
    io("http://localhost:3500")
    // io()
  );

  return (
    <SocketContext.Provider value={socket}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<PreLobby />} />
          <Route path="/:roomId/pregame" element={<PreGame />} />
          <Route path="/:roomId/pregameDisplay" element={<PreGameDisplay />} />
          <Route path="/:roomId/game" element={<Game />} />
          <Route path="/:roomId/gameDisplay" element={<GameDisplay />} />
        </Routes>
      </BrowserRouter>
    </SocketContext.Provider>
  );
}

export default App;
