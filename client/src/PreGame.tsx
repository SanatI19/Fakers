
import { useContext, useEffect, useState} from "react";
import { useNavigate, useLocation} from "react-router-dom";
import { SocketContext } from "./App";
import { Player } from "../../shared";

let thisId: number;
const settingsImage = "/images/settings.svg";
const closeImage = "/images/close.svg";

function PreGame() {
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [length,setLength] = useState(Number);
  const [name,setName] = useState<string>("");
  const [nameChange, setNameChange] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [answerTimer, setAnswerTimer] = useState<number>(30);
  const [voteTimer, setVoteTimer] = useState<number>(90);
  const [powerups, setPowerups] = useState<boolean>(false);
  const {state} = useLocation()
  const room = state.room;
  let playerId : string;
  let deviceId : string;
  
  const triggerStartGame = () => {
    if (thisId == 0) {
      let answerTimerOut = answerTimer;
      if (answerTimerOut > 200) {answerTimerOut = 200}
      else if (answerTimerOut < 15) {answerTimerOut = 15}
      let voteTimerOut = voteTimer;
      if (voteTimerOut > 300) {answerTimerOut = 300}
      else if (voteTimerOut < 30) {voteTimerOut = 30}
      socket.emit("sendSettings",room,answerTimerOut,voteTimerOut,powerups);
    }
    socket.emit("triggerStartGame",room)
  }

  const changeTheName = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameChange(true);
  }

  const trySetAnswerTimer = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log(e.target.value)
    if (e.target.value == "") {
      setAnswerTimer(15);
    }
    setAnswerTimer(parseInt(e.target.value))
  }

  const trySetVoteTimer = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value == "") {
      setVoteTimer(30);
    }
    setVoteTimer(parseInt(e.target.value))
  }

  const changeName = (name: string) => {
    setName(name)
    setNameChange(false);
    socket.emit("sendName", name, thisId,room);
  }

  useEffect(() => {
    let playerUUID = sessionStorage.getItem("playerUUID");
    let deviceUUID = localStorage.getItem("deviceUUIDlawlessForever");
    if (playerUUID === null) {
        playerUUID = crypto.randomUUID();
    }
    if (deviceUUID === null) {
      deviceUUID = crypto.randomUUID();
    }
    playerId = playerUUID;
    sessionStorage.setItem("playerUUID",playerId);
    deviceId = deviceUUID;
    localStorage.setItem("deviceUUIDlawlessForever",deviceId);
    socket.emit("joinPlayerArray", room, deviceId,playerId)
  },[room])

  useEffect(() => {
    socket.on("connect",() => {
      socket.emit("joinPlayerArray", room, deviceId,playerId)
    })
  },[])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (!socket.connected) {
          console.log("Reconnecting socket...");
          socket.connect();
        }
      }
  };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
      const handleGetPlayerIndex = (index: number) => {
          thisId = index;
      }


      const handleFailedToAccessRoom = () => {
        navigate(`/`)
      }

      const handleRemovePlayerFromLobby = (index: number, playerArray: Player[]) => {
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
        if (thisId === undefined) {
          navigate(`/`);
        }
        else {
          navigate(`/${room}/game`,{state :{room: room, id: thisId}})
        }
      }

      socket.on("getPlayerIndex", handleGetPlayerIndex);
      socket.on("startGame", handleStartGame);
      socket.on("failedToAccessRoom",handleFailedToAccessRoom);
      socket.on("removePlayerFromLobby",handleRemovePlayerFromLobby)

      return () => {
        socket.off("getPlayerIndex", handleGetPlayerIndex);
        socket.off("startGame", handleStartGame);
        socket.off("failedToAccessRoom",handleFailedToAccessRoom);
        socket.off("removePlayerFromLobby",handleRemovePlayerFromLobby)
      };

  },[])

  useEffect(() => {
    const handleSendPlayerArray = (playerArrayIn: Player[]) => {
        setLength(playerArrayIn.length);
        if (name == "") {
          setName(playerArrayIn[thisId].name)
        }
    }

    socket.on("sendPlayerArray",handleSendPlayerArray);
    
    return () => {
      socket.off("sendPlayerArray",handleSendPlayerArray);
    }
  },[name])

  return <div>
    {showSettings ? (
        <div className="overlay">
          <h1>Game settings</h1>
        {/* <div className="popup">
          <div className="buttonCont" */}
          <button
            style={{
              position: "fixed",
              top: "1%",
              right: "1%",
              width: "clamp(10vw, 15vw, 100px)",   // min 24px, preferred 5vw, max 60px
              height: "clamp(10vw, 15vw, 100px)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => setShowSettings(false)}
          >
            <svg width="100%" height="100%">
              <image href={closeImage} height={"100%"} width={"100%"}/>
            </svg>
          </button>
        <span>Answering timer: </span>
        <input type="number" min={15} max={200} width={1} value={answerTimer} onChange={(e) => trySetAnswerTimer(e)}/>
        <br/>
        <span>Voting timer: </span>
        <input type="number" min={30} max={300} width={5} value={voteTimer} onChange={(e) => trySetVoteTimer(e)}/>
        <br/>
        <span>Powerups?</span>
        <input type="checkbox" checked={powerups} onChange={(e) => setPowerups(e.target.checked)}/>

      </div>) : null}
      <div>
        {thisId == 0 ? (
          <button
            style={{
              position: "fixed",
              top: "1%",
              right: "1%",
              width: "clamp(10vw, 15vw, 100px)",   // min 24px, preferred 5vw, max 60px
              height: "clamp(10vw, 15vw, 100px)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
            }}
            onClick={() => setShowSettings(true)}
          >
            <svg width="100%" height="100%">
              <image href={settingsImage} height={"100%"} width={"100%"}/>
            </svg>
          </button>): null}
        <input id="nameInput" autoComplete="off" type="text" maxLength={8} placeholder="Player name" value={name} onChange={(e) => 
          changeTheName(e)}/>  
        <button disabled={!nameChange} onClick={() => changeName(name)}>Change name</button>
      </div>
      <br/>
      {thisId === 0 ? (<button disabled={length < 3} onClick={triggerStartGame}>Start Game</button>) : null}
    </div>
  
}

export default PreGame
