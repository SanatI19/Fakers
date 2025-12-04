
import { useContext, useEffect, useState} from "react";
import { useNavigate, useLocation} from "react-router-dom";
import { SocketContext } from "./App";
import { Player } from "../../shared";

const thisId = -1;

function PreGameDisplay() {
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [playerArray, setPlayerArray] = useState<Player[]>([]);
  const {state} = useLocation()
  const room = state.room;
  let playerId : string;
  let deviceId : string;

  function removePlayer(index: number) {
    socket.emit("requestRemovePlayer", room, index);
  }

  useEffect(() => {
      let playerUUID = sessionStorage.getItem("playerUUID");
      let deviceUUID = localStorage.getItem("deviceUUIDlawlessForever");
      if (playerUUID === null) {
        playerUUID = crypto.randomUUID();
        playerId = playerUUID;
        sessionStorage.setItem("playerUUID",playerId);
      }
      if (deviceUUID === null) {
        deviceUUID = crypto.randomUUID();
        deviceId = deviceUUID;
        localStorage.setItem("deviceUUIDlawlessForever",deviceId);
      }

      socket.emit("joinDisplaySocket", room, deviceId, playerId);

      const handleSendPlayerArray = (playerArrayIn: Player[]) => {
          setPlayerArray(playerArrayIn);
      }

      const handleFailedToAccessRoom = () => {
        navigate(`/`)
      }

      const handleRemovePlayerFromLobby = (index: number, playerArray: Player[]) => {
        setPlayerArray(playerArray);
        if (thisId == index) {
          navigate(`/`);
        }
      }

      const handleRequestPastChoices = () => {
        const pastChoices = localStorage.getItem("fakersPastChoices")
        if (pastChoices) {
          const pastChoicesOut: Record<string, number[]> = JSON.parse(pastChoices)
          socket.emit("sendPastChoices",room,pastChoicesOut)
        }
      }

      const handleStartGame = () => {
        navigate(`/${room}/gameDisplay`,{state :{room: room, id: thisId}})
      }

      socket.on("sendPlayerArray",handleSendPlayerArray);
      socket.on("requestPastChoices",handleRequestPastChoices);
      socket.on("startGame", handleStartGame);
      socket.on("failedToAccessRoom",handleFailedToAccessRoom);
      socket.on("removePlayerFromLobby",handleRemovePlayerFromLobby)

      return () => {
        socket.off("sendPlayerArray",handleSendPlayerArray);
        socket.off("requestPastChoices",handleRequestPastChoices);
        socket.off("startGame", handleStartGame);
        socket.off("failedToAccessRoom",handleFailedToAccessRoom);
        socket.off("removePlayerFromLobby",handleRemovePlayerFromLobby)
      };
  },[])

  return <div>
      <h1>Room {room}</h1>
      <div>
        {playerArray.map((player: Player, id: number) =>
          <p key={id} 
          className="text" 
          onClick={() => removePlayer(id)}>{player.name}</p>
          )
        }
      </div>
      <br/>
    </div>
  
}
export default PreGameDisplay
