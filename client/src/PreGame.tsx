
import { useContext, useEffect, useState} from "react";
import { useNavigate, useLocation} from "react-router-dom";
import { SocketContext } from "./App";
import { Player } from "../../shared";
// const {state} = useLocation()


// const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io("http://localhost:3000/")

// socket.on("connect", () => {
//   console.log(`Client ${socket.id}`)
// })
// let count = 0;
let thisId: number;

function PreGame() {
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
//   const [room, setRoom] = useState("")
//   const [messages, setMessages] = useState<string[]>([]);
  // const [playerArray, setPlayerArray] = useState<Player[]>([]);
  const [length,setLength] = useState(Number);
  const [name,setName] = useState<string>("");
  const [nameChange, setNameChange] = useState<boolean>(false);
  const [connectedArray, setConnectedArray] = useState<boolean[]>([true,true,true,true,true,true,true,true]);
  // const [hoverIndex, setHoverIndex] = useState<number>(-1);
  const {state} = useLocation()
  const room = state.room;
  console.log(room)
  let playerId : string;
  let deviceId : string;

  // const sendName = (name: string, id: number)  => {
  //   setName(name)
  //   socket.emit("sendName",name,id,room);
  // }
  console.log(connectedArray);
  
  const triggerStartGame = () => {
    socket.emit("triggerStartGame",room)
  }

  const changeTheName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameChange(true);
  }

  const changeName = (name: string) => {
    setName(name)
    setNameChange(false);
    socket.emit("sendName", name, thisId,room);
  }
//   setRoom(state.room)

//   const handleSubmit = (e:FormEvent) => {
//     e.preventDefault();
  // useEffect(() => {
  //   socket.emit("requestRoom", room)
  // },[room])
  // const removePlayer = (index: number) => {
  //   console.log(`Removing player: ${index}`)
  // } 
  // function removePlayer(index: number) {
  //   console.log(`Removing player: ${index}`)
  //   socket.emit("requestRemovePlayer", room, index);
  // }

  // console.log(hoverIndex);

    useEffect(() => {
        let playerUUID = sessionStorage.getItem("playerUUID");
        let deviceUUID = localStorage.getItem("deviceUUIDlawlessForever");
        if (playerUUID === null) {
            playerUUID = crypto.randomUUID();
        }
        if (deviceUUID === null) {
          deviceUUID = crypto.randomUUID();
        }
        // console.log(room)
        playerId = playerUUID;
        sessionStorage.setItem("playerUUID",playerId);
        // console.log(playerId)
        deviceId = deviceUUID;
        localStorage.setItem("deviceUUIDlawlessForever",deviceId);
        // console.log("AYO")
    
        socket.emit("joinPlayerArray", room, deviceId, playerId)
        // console.log("")

        const handleGetPlayerIndex = (index: number) => {
            thisId = index;
        }

        const handleSendPlayerArray = (playerArrayIn: Player[]) => {
            // setPlayerArray(playerArrayIn);
            setLength(playerArrayIn.length);
            setName(playerArrayIn[thisId].name)
        }

        const handleFailedToAccessRoom = () => {
          navigate(`/`)
        }

        const handleRemovePlayerFromLobby = (index: number, playerArray: Player[]) => {
          console.log(index)
          // setPlayerArray(playerArray);
          if (thisId == index) {
            navigate(`/`);
          }
          for (let i = 0; i < playerArray.length; i++) {
            const player = playerArray[i]
            if (player.deviceId == deviceId && player.internalId == playerId) {
              thisId = i;
            }
          }
        }


        const handleStartGame = () => {
          navigate(`/${room}/game`,{state :{room: room, id: thisId}})
        }

        const handleChangeConnected = (playerArray: Player[]) => {
          setConnectedArray(playerArray.map(player => player.connected));
        }

        socket.on("sendPlayerArray",handleSendPlayerArray);
        socket.on("getPlayerIndex", handleGetPlayerIndex);
        socket.on("startGame", handleStartGame);
        socket.on("failedToAccessRoom",handleFailedToAccessRoom);
        socket.on("changeConnected",handleChangeConnected);
        socket.on("removePlayerFromLobby",handleRemovePlayerFromLobby)

        return () => {
          socket.off("sendPlayerArray",handleSendPlayerArray);
          socket.off("getPlayerIndex", handleGetPlayerIndex);
          socket.off("startGame", handleStartGame);
          socket.off("failedToAccessRoom",handleFailedToAccessRoom);
          socket.off("changeConnected", handleChangeConnected);
          socket.off("removePlayerFromLobby",handleRemovePlayerFromLobby)

        };

    },[])

  return <div>
      {/* <h1>Room {room}</h1> */}
      <div>
        <input id="nameInput" autoComplete="off" type="text" maxLength={10} placeholder="Player name" value={name} onChange={(e) => 
          changeTheName(e)}/>  
        <button disabled={!nameChange} onClick={() => changeName(name)}>Change name</button>
      </div>
      <br/>
      {thisId === 0 ? (<button disabled={length < 3} onClick={triggerStartGame}>Start Game</button>) : null}
      {/* <div>
        <input type="text" placeholder="Room number" value={room} onChange={(e) => setRoom(e.target.value.toUpperCase())}/>
        <button onClick={joinRoom}>Join Room</button>
      </div>
      <div>
        <button onClick={createRoom}>Create Room</button>
      </div> */}
      {/* <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Enter room key" value={room} onChange={(e) => setRoom(e.target.value)}/>
        <input type="text" placeholder="Enter message" value={msg} onChange={(e) => setMsg(e.target.value)}/>
        <button>Send Message</button>
      </form> */}
    </div>
  
}

export default PreGame
