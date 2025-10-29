
import { useContext, useEffect, useState, useMemo, JSX} from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate} from "react-router-dom";
import { SocketContext } from "./App";
import { GameState, Player , Phase, Loot, LootType, GameType} from "../../shared";
import "./App.css";


const fakerText = "You are the faker, pick something random"

function getBorderColor(type: GameType, phase: Phase) : string {
  if (phase == "choosing") {
    return "black"
  }
  if (phase == "reveal") {
    return "purple"
  }
  switch(type) {
    case "hands":
      return "orange"
    case "point":
      return "pink"
    case "numbers":
      return "cyan"
  }
}

function getCompletedX(index: number) : number {
  const val = index % 5;
  switch (val) {
    case 0:
      return 5
    case 1: 
      return 20
    case 2:
      return 35
    case 3:
      return 50
    case 4:
      return 65
    default:
      return 80
  }
  // return 0
}

function getCompletedY(index: number) : number {
  if (index < 5) {
    return 5
  }
  return 10
}



function Game() {
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [playerNames,setPlayerNames] = useState<string[]>([""]);
  // const [phase,setPhase] = useState<Phase>("LOADANDAIM")
  // const [bulletChoice,setBulletChoice] = useState(false);
  const [playerButtons,setPlayerButtons] = useState(Boolean);
  const [playerArray, setPlayerArray] = useState<Player[]>([]);
  const [connectedArray, setConnectedArray] = useState<boolean[]>([]);
  const [completedPhase,setCompletedPhase] = useState(false);
  const [round, setRound] = useState<number>(0);
  const [fakerIndex, setFakerIndex] = useState<number>(0);
  const [choiceArray, setChoiceArray] = useState<number[]>(Array(8).fill(-1))
  const [gameType, setGameType] = useState<GameType>("hands");
  const [phase, setPhase] = useState<Phase>("choosing");
  const [question, setQuestion] = useState<string>("");
  const [chooserIndex, setChooserIndex] = useState<number>(0);
  // const [playerTableHover, setPlayerTableHover] = useState<boolean>(false);

  const {state} = useLocation()
  const room = state.room;
  const thisId = state.id;


  const doNothing = () => {

  }



  useEffect(() => {
    socket.emit("requestInitialState", room, thisId)
  },[room])

  


    useEffect(() => {
      const handleGetNames = (playerArray: Player[]) => {
        setPlayerNames(playerArray.map(player => player.name));
      }

      const handleFailedToAccessRoom = () => {
        navigate(`/`)
      }

      const handleChangeConnected = (playerArray: Player[]) => {
        setConnectedArray(playerArray.map(player => player.connected));
      }

      const handleGetGameState = (gameState: GameState)  => {
        setRound(gameState.round);
        const playerArray = gameState.playerArray;
        setConnectedArray(playerArray.map(player => player.connected))
        setPlayerArray(gameState.playerArray);
        setChooserIndex(gameState.chooserIndex);
        setChoiceArray(gameState.choiceArray);
        setFakerIndex(gameState.fakerIndex);
        setGameType(gameState.gameType);
        setPhase(gameState.phase);
        setQuestion(gameState.question);
        setCompletedPhase(gameState.playerArray[thisId].completedPhase)
      }

      const handleSocketDisconnect = () => {
        socket.emit("socketDisconnected",thisId,room)
      }

      // const handleItemAnimation = (itemIndex: number) => {
      //   setBoughtItemIndex(itemIndex);
      //   setItemAnimation(true);
      // }
      socket.on("getPlayerNames",handleGetNames)
      socket.on("getGameState",handleGetGameState);
      socket.on("disconnect",handleSocketDisconnect);
      socket.on("failedToAccessRoom", handleFailedToAccessRoom);
      socket.on("changeConnected",handleChangeConnected);

      return () => {
        socket.off("getPlayerNames",handleGetNames)
        socket.off("getGameState",handleGetGameState);
        socket.off("disconnect",handleSocketDisconnect);
        socket.off("failedToAccessRoom",handleFailedToAccessRoom);
        socket.off("changeConnected",handleChangeConnected);
      }
    },[])
   
  const gametypeOuterStyling: JSX.Element = useMemo(() => {
    const borderColor = getBorderColor(gameType, phase);
    return <g>
      <rect x={0} y={0} height={50} width={100} fill={"white"} stroke={borderColor} strokeWidth={5}/>
    </g>
  },[gameType, phase])

  const questionChoiceButtonsHandler = useMemo(() => {
    return questionChoiceButtons(gameType)
  },[gameType])

  function handleClick() {
    // if (phase === "choosing") setPhase("answering");
    // else if (phase === "answering") setPhase("voting");
    // else setPhase("choosing");
  }

  function sendClick(index: number): void {
    // setCompletedPhase(true)
    socket.emit("sendChoice",room,thisId,index);
  }

  function sendVote(index: number) : void {
    socket.emit("sendVote",room,thisId,index);
  }

  function sendGameChoice(type: GameType) : void {
    socket.emit("sendGameTypeDecision", room, type);
  }

  function questionChoiceButtons(type: GameType): JSX.Element {
    // const hands = [1,0];
    const numbers = [1,2,3,4,5];
    switch (type) {
      case "hands":
        return <g>
          <button className="buttonGame" onClick={() => sendClick(1)}>Raise hand</button>
          <button className="buttonGame" onClick={() => sendClick(0)}>Don't raise hand</button>
        </g>
      case "numbers":
        return <g>
          {numbers.map((val:number, index:number) => 
            <button key={index} className="buttonGame" onClick={() => sendClick(val)}>{val}</button>
          )}
        </g>
      case "point":
        return <g>
          {playerNames.map((name: string, index: number) => 
            <button key={index} className="buttonGame" onClick={() => sendClick(index)}>{name}</button>
          )}
        </g>
    }
  }

  const voteButtons = useMemo(() => {
    return playerNames.map((name:string, index: number) => 
      index == thisId ? null :
      <button className="buttonGame" onClick={() => sendVote(index)}>{name}</button>
    )
  },[playerNames])

  const gameTypeButtons: JSX.Element = (
    <>
      <button className="buttonGame" onClick={() => sendGameChoice("hands")}>Hands</button>
      <button className="buttonGame" onClick={() => sendGameChoice("numbers")}>Numbers</button>
      <button className="buttonGame" onClick={() => sendGameChoice("point")}>Pointing</button>
    </>
  )

  const questionText: string = useMemo(() => {
    if (thisId == fakerIndex) {
      return fakerText
    }
    else return question
  },[question,fakerIndex])

  return<div className="container">
      <h2>Phase: {phase}</h2>

      {(phase === "choosing" && (!completedPhase)) && (
        gameTypeButtons
      )}

      {phase === "answering" && !completedPhase && (
        <>
          <p className="textGame">{questionText}</p>
          {questionChoiceButtonsHandler}
        </>
      )}

      {phase === "voting" && !completedPhase && (
        <>
          <p className="textGame">Vote for who you think is faking</p>
          {voteButtons}
        </>
      )}
    </div>
}

export default Game
