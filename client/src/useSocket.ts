// useSocket.ts
import { useEffect } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket;

export function useSocket(event: string, handler: (data: any) => void) {
  useEffect(() => {
    if (!socket) {
      socket = io("http://localhost:3000");
    }

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);

  return socket;
}
