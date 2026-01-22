
import { useContext, useEffect, useState, useMemo, JSX, useCallback} from "react";
// import { motion } from "framer-motion";
import { useLocation, useNavigate} from "react-router-dom";
import { SocketContext } from "./App";
import { GameState, Player , Phase, GameType, ChoiceType, PowerType} from "../../shared";
import "./App.css";

// const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;
const numbers = [0,1,2,3,4,5];
const opinions = [
  "Strongly agree",
  "Agree",
  "Somewhat agree",
  "Neutral",
  "Somewhat disagree",
  "Disagree",
  "Strongly disagree"
];

//NEED TO CHANGE THIS
const fakerImage = "/images/faker.svg";
const closeImage = "/images/close.svg";
const pauseImage = "/images/pause.svg";

const fakerText = "You are the faker, pick something random"

function getGameTypeString(type: GameType) : string {
  switch(type) {
    case "hands":
      return "Lend a hand"
    case "point":
      return "To the point"
    case "numbers":
      return "By the numbers"
    case "emoji":
      return "Emoji madness"
    case "percent":
      return "Give 110%"
    case "opinion":
      return "Agree to disagree"
  }
}

function getBackgroundColor(type: GameType, phase: Phase) : string {
  if (phase == "choosing" || phase == "gameover") {
    return "rgb(213, 213, 213)"
  }
  // if (phase == "reveal") {
  //   return "purple"
  // }
  switch(type) {
    case "hands":
      return "rgb(227, 147, 61)"
    case "point":
      return "rgb(103, 230, 105)"
    case "numbers":
      return "rgb(85, 198, 255)"
    case "emoji":
      return "rgb(249, 252, 99)"
    case "percent":
      return "rgb(151, 106, 255)"
    case "opinion":
      // return "rgb(250, 103, 103)"
      return "rgb(123, 123, 168)"
  }
}

// const gradients = [
//   { id: "lightgrey", start:"rgb(175, 175, 175)", end: "rgb(128, 128, 128)"},
//   { id: "tan", start:"rgb(250, 214, 166)", end: "rgb(210, 180, 140)"},
//   { id: "grey", start:"rgb(213, 213, 213)", end: "rgb(153, 153, 153)"},
//   { id: "orange", start:"rgb(227, 147, 61)", end: "rgb(228, 123, 11)"},
//   { id: "green", start: "rgb(103, 230, 105)", end: "rgb(49, 230, 52)" },
//   { id: "blue", start: "rgb(85, 198, 255)", end: "rgb(0, 166, 249)"},
// ];

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
  const [emojiVal, setEmojiVal] = useState<string>("");
  const [percentVal, setPercentVal] = useState<number>(50);
  const [endTime,setEndTime] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [powers, setPowers] = useState<boolean>(false);
  const [powerType, setPowerType] = useState<PowerType>("copycat");
  const [showPower, setShowPower] = useState<boolean>(false);
  const [powerUsed, setPowerUsed] = useState<boolean>(false);
  const [chooseSelfAllowed, setChooseSelfAllowed] = useState<boolean>(false);
  const [blankedQuestion, setBlankedQuestion] = useState<string>("");
  const [gamePaused, setGamePaused] = useState<boolean>(false);

  const {state} = useLocation()
  const room = state.room;
  const thisId = state.id;

  useEffect(() => {
    socket.emit("requestInitialState", room, thisId)
  },[room])

  useEffect(() => {
    socket.on("connect",() => {
      socket.emit("requestInitialState", room, thisId)
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
      setEndTime(gameState.endTime);
      setVoteLocked(gameState.voteLocked[thisId])
      setPowers(gameState.powerups);
      setPowerType(gameState.powerType);
      setPowerUsed(gameState.roundPowerUsed);
      setChooseSelfAllowed(gameState.pointSelfChooseAllowed);
      setBlankedQuestion(gameState.blankedQuestion);
      setGamePaused(gameState.gamePaused);
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

  useEffect(() => {
    if (!endTime || phase == "scoring" || phase == "gameover" || phase == "reveal") return;
    setRemaining(Math.max(0,endTime-Date.now()))
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, endTime - now);
      setRemaining(diff);
    }, 1000); // Smooth updates

    return () => clearInterval(interval);
  }, [endTime]);

  useEffect(() => {
    function updateVH() {
      document.documentElement.style.setProperty(
        "--vh",
        window.innerHeight * 0.01 + "px"
      );
    }

    updateVH();
    window.addEventListener("resize", updateVH);

    return () => window.removeEventListener("resize", updateVH);
  }, []);

  useEffect(() => {
    setShowPower(false);
  },[phase])


  const timerImage = useMemo(() => {
    if (remaining <= 0 || (phase == "choosing" && thisId != chooserIndex) || phase == "reveal" || phase == "scoring" || phase == "gameover") {
      return null
    }
    return <span style={{backgroundColor: remaining/1000 <= 10 ? "red": "white",
      padding: "0.8rem",
      borderRadius: "1rem",
      display: "inline-block",
    }}> 
        {Math.ceil(remaining/1000)}
      </span>
  },[remaining, phase])

  const handleEmojiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.value == "") {
      setEmojiVal("")
      return;
    }
    const emojis = e.target.value.match(/\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu);
    if (emojis) {
      setEmojiVal(emojis.join(""))
    } 
  };

  const handlePercentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPercentVal(Number(event.target.value));
  };

  // const questionChoiceButtonsHandler = useMemo(() => {
  //   return questionChoiceButtons(gameType)
  // },[gameType])

  function sendClick(choice: ChoiceType): void {
    socket.emit("sendChoice",room,thisId,choice);
    setEmojiVal("")
    setPercentVal(50)
  }

  function sendPower(choice: number) : void {
    socket.emit("sendPowerChoice",room, choice);
    setShowPower(false);
    setPowerUsed(true);
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
  
  const questionChoiceButtons = useMemo(() => {
    switch (gameType) {
      case "hands":
        return <>
          <button className="buttonGame" onClick={() => sendClick(1)}>Raise hand</button>
          <button className="buttonGame" onClick={() => sendClick(0)}>Don't raise hand</button>
        </>
      case "numbers":
        return <>
          {numbers.map((val:number, index:number) => 
            <button key={index} className="buttonGame" onClick={() => sendClick(val)}>{val}</button>
          )}
        </>
      case "point":
        return <>
          {playerNames.map((name: string, index: number) => 
            !chooseSelfAllowed && thisId == index ? null : 
            <button key={index} className="buttonGame" onClick={() => sendClick(index)}>{name}</button>
          )}
        </>
      case "emoji":
        return <>
          <input className="inputGame" type="text" value={emojiVal} onChange={handleEmojiChange} maxLength={2}/>
          <button className="buttonGame" disabled={emojiVal == ""} onClick={() => sendClick(emojiVal)}>Submit</button>
        </>
      case "percent":
        return <>
          <p>{percentVal}%</p>
          <input className="inputGame" type="range" min={0} max={100} step={5} value={percentVal} onChange={handlePercentChange}/>
          <button className="buttonGame" onClick={() => sendClick(percentVal)}>Submit</button>
        </>
      case "opinion":
        return <>
          {opinions.map((val:string, index: number) => 
            <button key={index} className="buttonGame" onClick={()=> sendClick(index)}>{val}</button>
          )}
        </>
    }
  },[gameType,emojiVal,percentVal,chooseSelfAllowed, thisId])

  const powerButtons = useMemo(() => {
    switch(powerType) {
      case "copycat":
        return <>
            <h1>Copycat</h1>
            <h2>Choose a player to copy</h2>
            {playerNames.map((name: string, index: number) => 
            index == thisId ? null :
            <button key={index} className="buttonGame" onClick={() => sendPower(index)}>{name}</button>
          )}
        </>
      case "sabotage":
        return <>
            <h1>Sabotage</h1>
            <h2>Choose a player to sabotage by giving them a random different answer</h2>
            {playerNames.map((name: string, index: number) => 
            index == thisId ? null :
            <button key={index} className="buttonGame" onClick={() => sendPower(index)}>{name}</button>
            )}
        </>
      case "spy":
        return <>
            <h1>Spy</h1>
            <h2>Use ability to see the fragmented question?</h2>
            <button className="buttonGame" onClick={() => sendPower(0)}>Activate</button>
        </>
    }
    
  },[playerNames,powerType])
  // function questionChoiceButtons(type: GameType): JSX.Element {
  //   const numbers = [0,1,2,3,4,5];
  //   switch (type) {
  //     case "hands":
  //       return <>
  //         <button className="buttonGame" onClick={() => sendClick(1)}>Raise hand</button>
  //         <button className="buttonGame" onClick={() => sendClick(0)}>Don't raise hand</button>
  //       </>
  //     case "numbers":
  //       return <>
  //         {numbers.map((val:number, index:number) => 
  //           <button key={index} className="buttonGame" onClick={() => sendClick(val)}>{val}</button>
  //         )}
  //       </>
  //     case "point":
  //       return <>
  //         {playerNames.map((name: string, index: number) => 
  //           <button key={index} className="buttonGame" onClick={() => sendClick(index)}>{name}</button>
  //         )}
  //       </>
  //     case "emoji":
  //       return <>
  //         <input type="text" value={emojiVal} onChange={handleEmojiChange} maxLength={2}/>
  //         <button className="buttonGame" disabled={emojiVal == ""} onClick={() => sendClick(emojiVal)}>Submit</button>
  //       </>
  //   }
  // }

  const voteButtons = useMemo(() => {
    return <div>
      {playerNames.map((name:string, index: number) => 
      index == thisId ? null :
      <button key={`${index}-${voteIndex}`} className="buttonGame" disabled={voteIndex == index || voteLocked} style={{backgroundColor: voteIndex==index ? "green": "rgb(255, 255, 255)", opacity: voteIndex==index ? 0.8 : 1}} onClick={() => sendVote(index)}>{name}</button>
    )}
      <br/><br/><br/>
      <button className="buttonGame" disabled={voteLocked || voteIndex == -1} style={{backgroundColor: "rgb(255, 74, 74)", opacity: voteLocked || voteIndex == -1 ? 0.5: 1}} onClick={lockVote}>{"Lock vote"}</button>
    </div>
  },[thisId,playerNames,voteIndex,voteLocked])

  const gameTypeButtons: JSX.Element = (
    <>
      <button className="buttonGame" onClick={() => sendGameChoice("hands")}>{getGameTypeString("hands")}</button>
      <button className="buttonGame" onClick={() => sendGameChoice("numbers")}>{getGameTypeString("numbers")}</button>
      <button className="buttonGame" onClick={() => sendGameChoice("point")}>{getGameTypeString("point")}</button>
      <button className="buttonGame" onClick={() => sendGameChoice("emoji")}>{getGameTypeString("emoji")}</button>
      <button className="buttonGame" onClick={() => sendGameChoice("percent")}>{getGameTypeString("percent")}</button>
      <button className="buttonGame" onClick={() => sendGameChoice("opinion")}>{getGameTypeString("opinion")}</button>
    </>
  )

  const questionText: string = useMemo(() => {
    if (thisId == fakerIndex) {
      if (powers && powerType == "spy" && powerUsed) {
        return blankedQuestion;
      }
      return fakerText
    }
    else return question
  },[powers,powerType,powerUsed,question,fakerIndex])

  const handleUnpause = useCallback(() => {
    socket.emit("unpauseGame",room)
  },[room,])

  const pauseOverlay = useMemo(() => {
    return (
    gamePaused ? <div className="overlay">
      <p>Game is paused</p>
      {thisId == 0 && <button onClick={handleUnpause}>Resume</button>}
    </div>
    : null
  )}
  ,[gamePaused])

  const handlePause = useCallback(() => {
    const outVal = Math.round(remaining);
    socket.emit("pauseGame",room, outVal)
  },[room,remaining])

  return<div className="gameBackground" style={{backgroundColor: getBackgroundColor(gameType, phase)}}>

    <h2 style={{
      background: "#222",
      color: "white",
      padding: "8px 14px",
      borderRadius: "6px",
      display: "inline-block"
    }}>{phase == "gameover" ? "Game over" : ( phase == "choosing" ? "Choosing a game type": getGameTypeString(gameType))}</h2>
    <br/>
    {pauseOverlay}
    {thisId == 0 && (phase == "choosing" || phase == "answering" || phase == "voting") &&
    <button className="buttonGame"
        style={{
          position: "fixed",
          top: "1%",
          left: "1%",
          width: "clamp(10vw, 15vw, 100px)",   // min 24px, preferred 5vw, max 60px
          height: "clamp(10vw, 15vw, 100px)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
        onClick={handlePause}
      >
        <svg width="100%" height="100%">
          <image href={pauseImage} height={"100%"} width={"100%"}/>
        </svg>
      </button>}
    {timerImage}
    <br/>
    {powers && phase === "answering" && showPower && thisId == fakerIndex && !powerUsed && <div className="overlay">
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
        onClick={() => setShowPower(false)}
      >
        <svg width="100%" height="100%">
          <image href={closeImage} height={"100%"} width={"100%"}/>
        </svg>
      </button>
      {powerButtons}
    </div>}
    {/* INSERT IMAGE HERE OF A BUTTON THAT WILL MAKE IT SO THE OVERLAY APPEARS */}
    {powers && phase === "answering" && thisId == fakerIndex && !showPower && !powerUsed && (
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
            onClick={() => setShowPower(true)}
          >
            <svg width="100%" height="100%">
              <circle cx="50%" cy="50%" r="43%" fill="white" stroke="black"></circle>
              <image href={fakerImage} height={"75%"} width={"75%"} x={"12.5%"} y={"12.5%"}/>
            </svg>
          </button>)}
    {(phase === "choosing" && (!completedPhase)) && (chooserIndex == thisId) && (
      gameTypeButtons
    )}

    {phase === "answering" && !completedPhase && (
      <>
        <p className="textGame">{questionText}</p>
        {questionChoiceButtons}
      </>
    )}

    {phase === "voting" && !completedPhase && (
      <>
        <p className="textGame">Vote for who you think is faking</p>
        {!voteLocked && voteButtons}
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
