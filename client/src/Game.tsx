
import { useContext, useEffect, useState, useMemo, JSX} from "react";
// import { motion } from "framer-motion";
import { useLocation, useNavigate} from "react-router-dom";
import { SocketContext } from "./App";
import { GameState, Player , Phase, GameType} from "../../shared";
import "./App.css";

const fakerText = "You are the faker, pick something random"

function getGameTypeString(type: GameType) : string {
  switch(type) {
    case "hands":
      return "Lend a hand"
    case "point":
      return "To the point"
    case "numbers":
      return "By the numbers"
  }
}

function Game() {
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [playerNames,setPlayerNames] = useState<string[]>([""]);
  const [completedPhase,setCompletedPhase] = useState(false);
  const [fakerIndex, setFakerIndex] = useState<number>(0);
  const [gameType, setGameType] = useState<GameType>("hands");
  const [phase, setPhase] = useState<Phase>("choosing");
  const [question, setQuestion] = useState<string>("");
  const [chooserIndex, setChooserIndex] = useState<number>(0);
  const [voteIndex, setVoteIndex] = useState<number>(-1);
  const [voteLocked,setVoteLocked] = useState<boolean>(false);

  const {state} = useLocation()
  const room = state.room;
  const thisId = state.id;

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

    const handleGetGameState = (gameState: GameState)  => {
      setChooserIndex(gameState.chooserIndex);
      setFakerIndex(gameState.fakerIndex);
      setGameType(gameState.gameType);
      setPhase(gameState.phase);
      setQuestion(gameState.question);
      setCompletedPhase(gameState.playerArray[thisId].completedPhase)
      setVoteIndex(gameState.voteArray[thisId])
      setVoteLocked(gameState.voteLocked[thisId])
    }

    const handleSocketDisconnect = () => {
      socket.emit("socketDisconnected",thisId,room)
    }

    socket.on("getPlayerNames",handleGetNames)
    socket.on("getGameState",handleGetGameState);
    socket.on("disconnect",handleSocketDisconnect);
    socket.on("failedToAccessRoom", handleFailedToAccessRoom);

    return () => {
      socket.off("getPlayerNames",handleGetNames)
      socket.off("getGameState",handleGetGameState);
      socket.off("disconnect",handleSocketDisconnect);
      socket.off("failedToAccessRoom",handleFailedToAccessRoom);
    }
  },[])

  const questionChoiceButtonsHandler = useMemo(() => {
    return questionChoiceButtons(gameType)
  },[gameType])

  function sendClick(index: number): void {
    socket.emit("sendChoice",room,thisId,index);
  }

  function sendVote(index: number) : void {
    setVoteIndex(index);
    socket.emit("sendVote",room,thisId,index);
  }

  function sendGameChoice(type: GameType) : void {
    socket.emit("sendGameTypeDecision", room, type);
  }

  const lockVote = () => {
    setVoteLocked(true);
    socket.emit("lockInVote",room,thisId)
  }

  function questionChoiceButtons(type: GameType): JSX.Element {
    const numbers = [0,1,2,3,4,5];
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
    return <div>
      {playerNames.map((name:string, index: number) => 
      index == thisId ? null :
      <button key={`${index}-${voteIndex}`} className="buttonGame" disabled={voteIndex == index || voteLocked} style={{backgroundColor: voteIndex==index ? "green": "lightgrey", opacity: voteIndex==index ? 0.8 : 1}} onClick={() => sendVote(index)}>{name}</button>
    )}
      <br/>
      <button className="buttonGame" disabled={voteLocked || voteIndex == -1} onClick={lockVote}>{"Lock vote"}</button>
    </div>
  },[playerNames,voteIndex,voteLocked])

  const gameTypeButtons: JSX.Element = (
    <>
      <button className="buttonGame" onClick={() => sendGameChoice("hands")}>{getGameTypeString("hands")}</button>
      <button className="buttonGame" onClick={() => sendGameChoice("numbers")}>{getGameTypeString("numbers")}</button>
      <button className="buttonGame" onClick={() => sendGameChoice("point")}>{getGameTypeString("point")}</button>
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

      {(phase === "choosing" && (!completedPhase)) && (chooserIndex == thisId) && (
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

      {phase === "gameover" && thisId == 0 && (
        <>
          <button className="buttonGame" onClick={() => socket.emit("triggerStartGame",room)}>Play again</button>
          <button className="buttonGame" onClick={() => socket.emit("triggerEndGame",room)}>Exit</button>
        </>
      )}
    </div>
}

export default Game
