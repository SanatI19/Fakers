
import { useContext, useEffect, useState, useMemo, JSX} from "react";
// import { motion } from "framer-motion";
import { useLocation, useNavigate} from "react-router-dom";
import { SocketContext } from "./App";
import { GameState, Player , Phase, GameType} from "../../shared";
import "./App.css";

const peopleImagesRefs = ["/images/person1.svg", "/images/person2.svg",
  "/images/person3.svg","/images/person4.svg",
  "/images/person5.svg","/images/person6.svg",
  "/images/person7.svg","/images/person8.svg",
  "/images/person9.svg","/images/person10.svg"]

const raisedImagesRefs = ["/images/raise1.svg", "/images/raise2.svg",
  "/images/raise3.svg","/images/raise4.svg",
  "/images/raise5.svg","/images/raise6.svg",
  "/images/raise7.svg","/images/raise8.svg",
  "/images/raise9.svg","/images/raise10.svg"]  

const voteImage = "/images/vote.svg";
const pointImage = "/images/point.svg";

function getTotalVotes(votes: number[]) : number[] {
  const out =  Array(votes.length).fill(0);
  for (const x of votes) {
    if (x >= 0) {
      out[x] += 1
    }
  }
  return out
}


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

// function getCompletedX(index: number) : number {
//   const val = index % 5;
//   switch (val) {
//     case 0:
//       return 5
//     case 1: 
//       return 20
//     case 2:
//       return 35
//     case 3:
//       return 50
//     case 4:
//       return 65
//     default:
//       return 80
//   }
//   // return 0
// }

// function getCompletedY(index: number) : number {
//   if (index < 5) {
//     return 5
//   }
//   return 10
// }

function getPlayerX(index: number) : number {
  const mid = index%5;
  switch (mid) {
    case 0:
      return 10
    case 1:
      return 30
    case 2: 
      return 50
    case 3:
      return 70
    case 4: 
      return 90
    default:
      return 0
  }
}

function getPlayerY(index: number) : number {
  if (index >=5) {
    return 30
  }
  return 20
}

function getVoteX(index: number) : number {
  return getPlayerX(index) - 4
}

function getVoteY(index: number) : number {
  return getPlayerY(index) - 2
}

function GameDisplay() {
  const socket = useContext(SocketContext);
  const navigate = useNavigate();
  const [playerNames,setPlayerNames] = useState<string[]>([""]);
  // const [phase,setPhase] = useState<Phase>("LOADANDAIM")
  // const [bulletChoice,setBulletChoice] = useState(false);
  // const [playerButtons,setPlayerButtons] = useState(Boolean);
  const [playerArray, setPlayerArray] = useState<Player[]>([]);
  // const [connectedArray, setConnectedArray] = useState<boolean[]>([]);
  // const [completedPhase,setCompletedPhase] = useState(false);
  const [round, setRound] = useState<number>(0);
  // const [fakerIndex, setFakerIndex] = useState<number>(0);
  const [choiceArray, setChoiceArray] = useState<number[]>(Array(8).fill(-1))
  const [gameType, setGameType] = useState<GameType>("hands");
  const [phase, setPhase] = useState<Phase>("choosing");
  const [question, setQuestion] = useState<string>("");
  // const [chooserIndex, setChooserIndex] = useState<number>(0);
  const [totalVotes, setTotalVotes] = useState<number[]>([]);
  const [voteIndex, setVoteIndex] = useState<number>(-1);
  const [fakerIndex, setFakerIndex] = useState<number>(-1);
  // const [playerTableHover, setPlayerTableHover] = useState<boolean>(false);

  const {state} = useLocation()
  const room = state.room;
  const thisId = state.id;


  // const doNothing = () => {

  // }

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

    // const handleChangeConnected = (playerArray: Player[]) => {
    //   setConnectedArray(playerArray.map(player => player.connected));
    // }

    const handleGetGameState = (gameState: GameState)  => {
      setRound(gameState.round);
      // const playerArray = gameState.playerArray;
      // setConnectedArray(playerArray.map(player => player.connected))
      setPlayerArray(gameState.playerArray);
      // setChooserIndex(gameState.chooserIndex);
      setChoiceArray(gameState.choiceArray);
      // setFakerIndex(gameState.fakerIndex);
      setGameType(gameState.gameType);
      setPhase(gameState.phase);
      setQuestion(gameState.question);
      setTotalVotes(getTotalVotes(gameState.voteArray));
      setVoteIndex(gameState.votedIndex);
      setFakerIndex(gameState.fakerIndex);
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
    // socket.on("changeConnected",handleChangeConnected);

    return () => {
      socket.off("getPlayerNames",handleGetNames)
      socket.off("getGameState",handleGetGameState);
      socket.off("disconnect",handleSocketDisconnect);
      socket.off("failedToAccessRoom",handleFailedToAccessRoom);
      // socket.off("changeConnected",handleChangeConnected);
    }
  },[])
  
  const gametypeOuterStyling: JSX.Element = useMemo(() => {
    const borderColor = getBorderColor(gameType, phase);
    return <g>
      <rect x={0} y={0} height={50} width={100} fill={"white"} stroke={borderColor} strokeWidth={5}/>
    </g>
  },[gameType, phase])

  // const playerAnsweredImages = useMemo(() => {
  //   return playerArray.map((player,index) => 
  //     <g key={index}>
  //       <rect x={getCompletedX(index)} y={getCompletedY(index)} width={10} height={3} fill={player.completedPhase ? "green" : "white"} stroke={"black"} strokeWidth={0.5}/>
  //       <text x={getCompletedX(index)+1} y={getCompletedY(index)+2} fontSize={1.5} fill="black">{player.name}</text>
  //     </g>
  //   )
  // },[playerArray])

  const questionText = useMemo(() => {
    return <text x={20} y={5} fontSize={2} fill="black">{question}</text>
  },[question])

  const playerImages: JSX.Element[] = useMemo(() => 
    choiceArray.map((_,index) => (
      <g key={index}>
        <image href={peopleImagesRefs[index]} x={getPlayerX(index)} y={getPlayerY(index)} height={5} width={5} opacity={phase == "answering" ? (playerArray[index]?.completedPhase ? 1 : 0.3) : 1}></image>
        <text x={getPlayerX(index)} y={getPlayerY(index)+7} fontSize={2}>{playerNames[index]}</text>
      </g>
    ))
  ,[choiceArray,gameType, phase, playerNames])

  const raisedImages: JSX.Element[] = useMemo(() => 
    choiceArray.map((val,index) => (
      val ==1 ?
      <g key={index}>
        <image href={raisedImagesRefs[index]} x={getPlayerX(index)} y={getPlayerY(index)} height={5} width={5}></image>
        <text x={getPlayerX(index)} y={getPlayerY(index)+7} fontSize={2}>{playerNames[index]}</text>
      </g>
      :
      <g key={index}>
        <image href={peopleImagesRefs[index]} x={getPlayerX(index)} y={getPlayerY(index)} height={5} width={5}></image>
        <text x={getPlayerX(index)} y={getPlayerY(index)+7} fontSize={2}>{playerNames[index]}</text>
      </g>
    ))
  ,[choiceArray,playerNames])

  const pointingImages : JSX.Element[] = useMemo(() => {
    const counts: number[] = Array(choiceArray.length).fill(0);
    return (choiceArray.map((val,index) => {
      if (val < 0) return <g key={index}></g>
      counts[val]++;
      return (<g key={index}>
        <image href={pointImage} x={getPlayerX(val)+5} y={getPlayerY(val)+2*(counts[val]-1)} height={2} width={2}/>
        <text x={getPlayerX(val)+7} y={getPlayerY(val)+ 2*(counts[val]-1)+1.75} fontSize={1.25}>{playerNames[index]}</text>
      </g>)

    }))}
  ,[choiceArray,playerNames])

  const numberImages : JSX.Element[] = useMemo(() => 
    choiceArray.map((val,index) => (
      val >= 0 ?
      <g key={index}>
        <circle cx={getPlayerX(index) + 3} cy={getPlayerY(index)-2} r={1.5} fill="black"/>
        <text x={getPlayerX(index)+2} y={getPlayerY(index)-2} fontSize={1} fill="white">{val}</text>
      </g>
      : <g key={index}></g>
    ))
  ,[choiceArray])

  function answerImages(gameType : GameType) : JSX.Element[] {
    if (gameType == "hands") {
      return raisedImages;
    }
    else if (gameType == "numbers") {
      return [<g key={1}>
        {playerImages}
        {numberImages}
      </g>]
    }
    else {
      return [<g key={1}>
        {playerImages}
        {pointingImages}
      </g>]
    }
  }

  const voteImages = useMemo(() => {
    return totalVotes.map((val,index) => 
      val > 0 ? 
      <g key={index}>
        <image href={voteImage} x={getVoteX(index)} y={getVoteY(index)} height={4} width={4}></image>
        <text x={getVoteX(index)+2} y={getVoteY(index)+2.5} fill="black" fontSize={2}>{val}</text>
      </g>
      : null
    )
  },[totalVotes])


  const revealImages = useMemo(() => {
    if (voteIndex == -1) {
      return <g>
        <text x={30} y={20} fontSize={5}>Faker still lurks</text>
      </g>
    }
    else {
      if (voteIndex == fakerIndex) {
        return <g>
          <text x={30} y={20} fontSize={5}>{playerNames[voteIndex]} was the faker</text>
        </g>
      }
        return <g>
          <text x={30} y={20} fontSize={5}>{playerNames[voteIndex]} was not the faker</text>
        </g>
    }
  },[playerNames, voteIndex])
  // const voteImages = 
  // console.log(voteIndex)
  
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
                {playerImages}
                </g>
            case "voting":
              return <g> 
                {/* {gametypeOuterStyling} */}
                {questionText}
                {answerImages(gameType)}
                {voteImages}
              </g>
            case "reveal":
              return <g>
                {revealImages}
              </g>
            case "scoring":
              return <g>
                {/* {scoringImages} */}
              </g>
          }
        })()}
      </g>
    </svg>
}

export default GameDisplay
