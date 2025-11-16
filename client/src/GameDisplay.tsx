
import { useContext, useEffect, useState, useMemo, JSX} from "react";
import { motion } from "framer-motion";
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

const voteImage = "/images/handcuffs.svg";
const pointImage = "/images/point.svg";
const jailImage = "/images/jail.svg";
const fakerImage = "/images/faker.svg";
const redXImage = "/images/redX.svg";
const greenCheckImage = "/images/greenCheck.svg";

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

function getCenteredX(font: number, length: number): number {
  const charWidth = font*0.5;
  return 50 - length*charWidth/2
  
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
      return 5
    case 1:
      return 25
    case 2: 
      return 45
    case 3:
      return 65
    case 4: 
      return 85
    default:
      return 0
  }
}

function getPlayerY(index: number) : number {
  if (index >=5) {
    return 25
  }
  return 15
}

function getAnsweredX(index: number) : number {
  return 9*index+12
}

const getAnsweredY = 40;


function getVoteX(index: number) : number {
  return getPlayerX(index) - 4
}

function getVoteY(index: number) : number {
  return getPlayerY(index) - 2
}

function getR(index: number, scores: number[]): number {
    const maxScore = Math.max(...scores);
    return maxScore > 0 ? (scores[index]/(Math.max(...scores))*2 + 1) : 2
  }

function getFakerText(faker: boolean): string {
  if (faker) {
    return "is the faker"
  }
  else {
    return "is NOT the faker"
  }
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
  const [showFaker,setShowFaker] = useState<boolean>(false);
  // const [pastChoices, setPastChoices] = useState<number[]>([]);
  const [roundQuestions, setRoundQuestions] = useState<string[]>([]);
  const [showPastQuestions,setShowPastQuestions] = useState<boolean>(false);
  const [showScores,setShowScores] = useState<boolean>(false);
  const [playerScores,setPlayerScores] = useState<number[]>([]);
  const [playerPrevScores,setPlayerPrevScores] = useState<number[]>([]);
  const [dispScores, setDispScores] = useState<boolean>(false);
  const [fakerCaught, setFakerCaught] = useState<boolean>(false);
  const [storedChoices,setStoredChoices] = useState<number[][]>([]);
  const [votesNeeded,setVotesNeeded] = useState<number>(0);

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
  // function getIndexed()

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
      setFakerCaught(gameState.fakerCaught);
      setPhase(gameState.phase);
      setQuestion(gameState.question);
      setTotalVotes(getTotalVotes(gameState.voteArray));
      setVoteIndex(gameState.votedIndex);
      setFakerIndex(gameState.fakerIndex);
      setPlayerScores(gameState.playerArray.map(player => player.totalScore));
      setPlayerPrevScores(gameState.playerArray.map(player => player.prevScore));
      setStoredChoices(gameState.storedChoices);
      // setPastChoices(gameState.pastChoices[gameState.gameType])
      setRoundQuestions(gameState.roundQuestions);
      setVotesNeeded(gameState.votesNeeded);
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

  useEffect(() => {
    if (phase == "scoring") {
      if (fakerCaught) {
        setShowPastQuestions(true);
      }
      else {
        setShowFaker(true)
        // setShowPastQuestions(true);
      }
    }
  },[phase,fakerCaught])
  
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
        <image href={pointImage} x={getPlayerX(val)+6} y={getPlayerY(val)+2*(counts[val]-1)} height={2} width={2}/>
        <text x={getPlayerX(val)+8.5} y={getPlayerY(val)-0.3+ 2*(counts[val]-1)+1.75} fontSize={1.25}>{playerNames[index]}</text>
      </g>)

    }))}
  ,[choiceArray,playerNames])

  const numberImages : JSX.Element[] = useMemo(() => 
    choiceArray.map((val,index) => (
      val >= 0 ?
      <g key={index}>
        <circle cx={getPlayerX(index) + 6} cy={getPlayerY(index)+2} r={1.5} fill="black"/>
        <text x={getPlayerX(index)+5.5} y={getPlayerY(index)+2.8} fontSize={2.5} fill="white">{val}</text>
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
        <image href={voteImage} x={getVoteX(index)+4.5} y={getVoteY(index)-1} height={4} width={4}></image>
        <text x={getVoteX(index)+6} y={getVoteY(index)-0.2} fill="black" fontSize={2}>{val}</text>
      </g>
      : null
    )
  },[totalVotes])


  // const revealImages = useMemo(() => {
  //   if (voteIndex == -1) {
  //     return <g>
  //       <text x={30} y={20} fontSize={5}>Faker still lurks</text>
  //     </g>
  //   }
  //   else {
  //     if (voteIndex == fakerIndex) {
  //       return <g>
  //         <text x={30} y={20} fontSize={5}>{playerNames[voteIndex]} was the faker</text>
  //       </g>
  //     }
  //       return <g>
  //         <text x={30} y={20} fontSize={5}>{playerNames[voteIndex]} was not the faker</text>
  //       </g>
  //   }
  // },[playerNames, voteIndex])
  const doNothing = () => {

  }

  const sendRevealOver = () => {
    socket.emit("revealOver",room)
  }

  const voteSuccessImage = useMemo(() => {
    if (!playerNames[voteIndex]) {return null}
    return <g>
      <text x={getCenteredX(4,"Majority voted for".length)} y={10} fontSize={4}
      fontFamily="Comic Sans MS"
      >Majority voted for</text>
      <motion.text
        // x={45}
        y={28}
        initial={{
          x: 50,
          fontSize: 0,
        }}
        animate={{
          x: getCenteredX(3,playerNames[voteIndex].length),
          fontSize: 3,
        }}
        transition={{
          delay: 1.5,
          duration: 0.3,
        }}
      >
        {playerNames[voteIndex]}
      </motion.text>
      <motion.image
        href={peopleImagesRefs[voteIndex]}
        initial={{
          height: 0,
          width: 0,
          x: 50,
          y: 20,
        }}
        animate={{
          height:10,
          width: 10,
          x:45,
          y: 15,
        }}
        transition={{
          delay:1.5,
          duration: 0.3,
        }}

      />
      <motion.text
        y = {40}
        initial={{
          fontSize: 0,
          x: 50,
          opacity: 0.99,
        }}
        animate={{
          fontSize: 4,
          x: getCenteredX(4,getFakerText(fakerCaught).length),
          opacity:1,
        }}
        transition={{
          fontSize: {delay: 4, duration:0.3},
          x: {delay:4, duration: 0.3},
          opacity: {delay:4, duration:2.5},
          }}
        onAnimationComplete={sendRevealOver}   
      >
        {getFakerText(fakerCaught)}
      </motion.text>
      {fakerCaught ? 
      <motion.image 
        href={jailImage}
        height={20}
        width={20}
        x={40}
        initial={{
          y:-20
        }}
        animate={{
          y:12
        }}
        transition={{
          delay: 5,
          duration: 0.5,
        }}
      /> 
      : null}
    </g>
  },[fakerCaught,voteIndex])


  const revealNoVote = useMemo(() => {
    return <g>
      <motion.image
        href={fakerImage}
        x={40}
        y={10}
        height={20}
        width={20}
        initial={{opacity: 0.999}}
        animate={{opacity:1}}
        transition={{duration: 3}}
        onAnimationComplete={sendRevealOver}
      />
      <text
      fontSize={4}
      y={34}
      x={getCenteredX(4,"Faker is still lurk".length)}
      >
        Faker is still lurking
      </text>
    </g>
  },[])
  // need to animate this somehow

   const revealImages = useMemo(() => {
    if (voteIndex == -1) {
      return revealNoVote
    }
    else {
      return voteSuccessImage
    }
  },[playerNames,voteIndex, fakerCaught])


  const goToShowPastScores = () => {
    setShowFaker(false);
    setShowPastQuestions(true);
  }

  const goToScoring = () => {
    setShowPastQuestions(false);
    setShowScores(true);
  }

  function finishScoring(index: number) {
    if (index == 0) {
      setShowScores(false);
      setDispScores(false);
      socket.emit("scoringAnimationOver",room);
    }
  }
  

  const showFakerImages = useMemo(() => {
    return <g>
      <motion.text x={40} y={15} fontSize={3}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >The faker was</motion.text>
      <motion.text x={40} y={25} fontSize={5}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 2 }}
        onAnimationComplete={goToShowPastScores}
      >{playerNames[fakerIndex]}</motion.text>
    </g>
  },[playerNames,fakerIndex])

  const scoreText = (index: number) =>
  dispScores ? playerScores[index] : playerPrevScores[index];


  const showPastQuestionsImages = useMemo(() => {
    const playerIndex: number[] = [];
    let j = 0;
    for (let i = 0; i < playerNames.length; i++) {
      if (i != fakerIndex) {
        playerIndex.push(j)
        j++;
      }
      else {
        playerIndex.push(-1);
      }
    }
    // console.log(playerIndex)
    // console.log(pastChoices);
    // console.log(roundQuestions);
    return <g>
      <image href={fakerImage} x={4} y={getAnsweredY+1} height={5} width={5}/>
      <text x={4} y={getAnsweredY} fontSize={1.5}>{playerNames[fakerIndex]}</text>
      {/* {pastChoices.map()} */}
      {roundQuestions.map((question, index) => 
        <motion.g key={index} 
          initial={{opacity:0}}
          animate={{opacity:1}}
          transition={{delay:5*index, duration:0.1}}
        >
          <text x={10} y={8+10*index} fontSize={1.5} fontWeight={"bold"}>Task #{index+1}</text>
          <text x={10} y={10+10*index} fontSize={1.5}>{question}</text>
        </motion.g>
      )}
      {playerNames.map((nameVal,index) => 
        index != fakerIndex ? (
          <g key={index}>
            <text x={getAnsweredX(playerIndex[index])} y={getAnsweredY} fontSize={1.5}>{nameVal}</text>
            {/* <circle cx={getAnsweredX(index)+1} cy={getAnsweredY+2} r={1}/>
            <circle cx={getAnsweredX(index)+3} cy={getAnsweredY+2} r={1}/>
            <circle cx={getAnsweredX(index)+5} cy={getAnsweredY+2} r={1}/> */}
            <image href={fakerImage} x={getAnsweredX(playerIndex[index])} y={getAnsweredY+1} width={2} height={2} />
            <image href={fakerImage} x={getAnsweredX(playerIndex[index])+2} y={getAnsweredY+1} width={2} height={2} />
            <image href={fakerImage} x={getAnsweredX(playerIndex[index])+4} y={getAnsweredY+1} width={2} height={2} />
            {storedChoices[index] && storedChoices[index].map((choice, index2) =>
              <motion.image 
                href={choice == fakerIndex ? greenCheckImage: redXImage}
                x={getAnsweredX(playerIndex[index])+2*index2}
                y={getAnsweredY+1}
                initial={{height: 0, width:0,opacity:0.999}}
                animate={{height:2, width:2, opacity:1}}
                transition={{
                  height: {delay: 2 + 5*index2, duration:0.2},
                  width: {delay: 2 + 5*index2, duration:0.2},
                  opacity: {delay: 5+ 5*index2, duration: 0.1}

                }}

                onAnimationComplete={index2 == storedChoices[index].length-1 ? goToScoring: doNothing}
              />
            )}

          </g>
        ) : (null)

      )}
    </g>
  },[playerNames, fakerIndex,roundQuestions])

  const showScoreImages = useMemo(() => {
    return playerScores.map((_,index: number) => 
      <g key={index}>
        <motion.circle 
          cx = {getPlayerX(index)+2.5}
          cy = {getPlayerY(index)+2.5}
          initial={{r: getR(index,playerPrevScores), 
            opacity: 0.999,
            // cx: getPlayerX(index)+getR(index,playerPrevScores),
            // cy: getPlayerY(index)+getR(index,playerPrevScores),
          }}
          animate={{r: getR(index,playerScores),
            opacity: 1,
            // cx: getPlayerX(index) + getR(index,playerScores),
            // cy: getPlayerY(index) + getR(index,playerScores),
          }}
          transition={{
            r: {delay: 1, duration: 0.1},
            // cx: {delay: 1, duration: 0.1},
            // cy: {delay: 1, duration: 0.1},
            opacity: {duration: 4},
          }}
          // onAnimationComplete={() => finishScoring(index)}
        />
        <motion.text
          fill={"white"}
          y = {getPlayerY(index)+3}
          initial={{
            x: getPlayerX(index)+3-getR(index,playerPrevScores),
            fontSize: getR(index,playerPrevScores)
          }}
          animate={{
            fontSize: getR(index,playerScores),
            x: getPlayerX(index)+3-getR(index,playerScores),
          }}
          transition={{
            fontSize: {delay: 1, duration: 0.1},
            x: {delay: 1, duration: 0.1},
            y: {delay: 1, duration: 0.1},
          }}
          onAnimationComplete={() => setDispScores(true)}
        >{scoreText(index)}</motion.text>
        <text x={getPlayerX(index)} y={getPlayerY(index)+7} fontSize={2}>{playerNames[index]}</text>
      </g>
    )
  },[showScores,dispScores])

  const scoringImages = useMemo(() => {
    if (showFaker) {
      return showFakerImages;
    }
    else if (showPastQuestions) {
      return showPastQuestionsImages;
    }
    else if (showScores) {
      return showScoreImages;
    }
    else {return <text y={10}>Neither</text>}
    // else if (showPrevQ)
  },[showFaker,showScores,showPastQuestions,dispScores,roundQuestions,fakerIndex,playerNames])
  
  return <svg id="main" x = "0px" y="0px" xmlns = "http://www.w3.org/2000/svg" viewBox="0 0 100 50">
      <g>
          <rect x="0" y="0" width="100" height={50} fill="white" stroke="black" strokeWidth={0.1}/>
          <text className="text" x="1" y="3" fontSize="3">Round {round+1}</text>
          {gametypeOuterStyling}
          <text className="text" x="3" y="6" fontSize="3">Phase: {phase}</text>
      </g>    
      {/* <line x1={50} x2={50} y1={0} y2={50} fill={"black"} stroke="black" strokeWidth={0.2}></line> */}
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
                {scoringImages}
              </g>
          }
        })()}
      </g>
    </svg>
}

export default GameDisplay
