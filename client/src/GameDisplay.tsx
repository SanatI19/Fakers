
import { useContext, useEffect, useState, useMemo, JSX} from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate} from "react-router-dom";
import { SocketContext } from "./App";
import { GameState, Player , Phase, Loot, LootType, GameType} from "../../shared";
import "./App.css";

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

function GameDisplay() {
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

// 
    // const playerImage (name:)
    // function playerImage (name: string, index: number): JSX.Element {
    //   let sizes = 2;
    //   let playerSize = 13;
    //   return <g>
    //         {deadArray[index] ? 
    //         (<image 
    //           href={"/images/skull.svg"} 
    //           height={9} 
    //           width={9} 
    //           x={getX(index)+0.5} 
    //           y={getY(index)-5}
    //         />): 
    //         (
    //           <motion.image 
    //           key = {`${index} + ${connectedArray}`}
    //           href={"/images/character.svg"} 
    //           height={hoverIndex==index ? (playerSize+1):(playerSize)} 
    //           width={hoverIndex==index ? (playerSize+1):(playerSize)} 
    //           x={hoverIndex==index ? (getX(index)-2):(getX(index)-1.5)} 
    //           y={hoverIndex==index ? (getY(index)-7):(getY(index)-6.5)}
    //           // opacity={(hidingArray[index] && phase == "LOOTING") ? 0.3: 1}
    //           opacity={connectedArray[index] ? 1 : 0.3}

    //           animate={
    //             ((playerButtons) && (!deadArray[index]) && (index!== thisId) && !((phase=="GODFATHERPRIV") && (thisId !== godfatherIndex) && (index === targetArray[thisId])))
    //             ? {
    //               filter: [
    //                     `
    //                       drop-shadow(0 0 1px rgba(255, 255, 0, 1))
    //                       drop-shadow(0 0 2px rgba(255, 255, 0, 0.9))
    //                       saturate(2)
    //                     `,
    //                     `
    //                       drop-shadow(0 0 0px rgba(255, 255, 0, 1))
    //                       drop-shadow(0 0 0px rgba(255, 255, 0, 0.9))
    //                       saturate(2)
    //                     `,
    //                     `
    //                       drop-shadow(0 0 1px rgba(255, 255, 0, 1))
    //                       drop-shadow(0 0 2px rgba(255, 255, 0, 0.9))
    //                       saturate(2)
    //                     `,
    //                   ],
    //           } 
    //             :
    //             {
    //               filter: index==lootTurnIndex 
    //               ? (`drop-shadow(0 0 0.5px ${"blue"})`) : ("none")
    //             }

    //           }
    //           transition={
    //             {duration: 0}
    //           }
    //           />
    //         )}
            
    //         <text className="text" x={getX(index)+5-(name.length)/2} y={getY(index)-5.5} fontSize={sizes}>{name}</text>
    //         <image href={heartImage} x={getX(index)+sizes} y={getY(index)+4} height={sizes} width={sizes} opacity={playerHealth[index] > 0 ? 1: 0.4}/>
    //         <image href={heartImage} x={getX(index)+2*sizes} y={getY(index)+4} height={sizes} width={sizes} opacity={playerHealth[index] > 1 ? 1: 0.4}/>
    //         <image href={heartImage} x={getX(index)+3*sizes} y={getY(index)+4} height={sizes} width={sizes} opacity={playerHealth[index] > 2 ? 1: 0.4}/>
    //         {index == godfatherIndex ? 
    //         (<image href={getImage("godfather")} x={getX(index)+1.5} y={getY(index)+1} height="3" width="3"/>) : null
    //         }
    //         {hidingArray[index] ? 
    //         (<image href={shieldImage} x={getX(index)+1.5} y={getY(index)-3.5} height={7} width={7}/>) : null
    //         }
    //   </g>
    // }

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
      // const thisPlayer = playerArray[thisId];
      // setPlayerHealth(playerArray.map(player => player.health));
      // setThisPlayer(thisPlayer);
      // setCompletedPhase(thisPlayer.completedPhase);
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

  // console.log(phase)
  const playerAnsweredImages = useMemo(() => {
    return playerArray.map((player,index) => 
      <g key={index}>
        <rect x={getCompletedX(index)} y={getCompletedY(index)} width={10} height={3} fill={player.completedPhase ? "green" : "white"} stroke={"black"} strokeWidth={0.5}/>
        <text x={getCompletedX(index)+1} y={getCompletedY(index)+2} fontSize={1.5} fill="black">{player.name}</text>
      </g>
    )
  },[playerArray])

  const questionText = useMemo(() => {
    return <text x={20} y={30} fontSize={2} fill="black">{question}</text>
  },[question])
  
  return <svg id="main" x = "0px" y="0px" xmlns = "http://www.w3.org/2000/svg" viewBox="0 0 100 50">
      <g>
          <rect x="0" y="0" width="100" height={50} fill="white" stroke="black" strokeWidth={0.1}/>
          <text className="text" x="1" y="3" fontSize="3">Round {round+1}</text>
          {gametypeOuterStyling}
          <text className="text" x="3" y="6" fontSize="3">Phase: {phase}</text>
      </g>    
      <g>
        {(() => {
          switch (phase) {
            case "choosing":
              return <g> </g>
            case "answering":
              return <g>
                {/* {gametypeOuterStyling} */}
                {playerAnsweredImages}
                </g>
            case "voting":
              return <g> 
                {/* {gametypeOuterStyling} */}
                {questionText}
                <text></text>
              </g>
            case "reveal":
              return <g></g>
          }
        })()}
      </g>
    </svg>
}

export default GameDisplay
