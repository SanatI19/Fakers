
import { useContext, useEffect, useState, useMemo, JSX} from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate} from "react-router-dom";
import { SocketContext } from "./App";
import { GameState, Player , Phase, GameType, ChoiceType} from "../../shared";
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
const starImage = "/images/star.svg";

function getTotalVotes(votes: number[]) : number[] {
  const out =  Array(votes.length).fill(0);
  for (const x of votes) {
    if (x >= 0) {
      out[x] += 1
    }
  }
  return out
}

const gametypeImageRefs: Record<GameType,string> = {
  "numbers": "/images/numbers.svg",
  "hands": "/images/hands.svg",
  "point": "/images/point.svg",
  "emoji": "/images/emoji.svg",
  "percent": "/images/percent.svg",
  "opinion": "/images/opinion.svg",
}

const opinionRefs = [
  "/images/strongAgree.svg",
  "/images/agree.svg",
  "/images/somewhatAgree.svg",
  "/images/neutral.svg",
  "/images/somewhatDisagree.svg",
  "/images/disagree.svg",
  "/images/strongDisagree.svg"
]

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

const gradients = [
  { id: "lightgrey", start:"rgb(175, 175, 175)", end: "rgb(128, 128, 128)"},
  { id: "tan", start:"rgb(250, 214, 166)", end: "rgb(210, 180, 140)"},
  { id: "grey", start:"rgb(213, 213, 213)", end: "rgb(153, 153, 153)"},
  { id: "orange", start:"rgb(227, 147, 61)", end: "rgb(228, 123, 11)"},
  { id: "green", start: "rgb(103, 230, 105)", end: "rgb(49, 230, 52)" },
  { id: "blue", start: "rgb(85, 198, 255)", end: "rgb(0, 166, 249)"},
  { id: "pink", end: "rgb(252, 99, 240)", start: "rgb(255, 149, 246)"},
  { id: "purple", end: "rgb(151, 106, 255)", start: "rgb(181, 149, 255)"},
  { id: "yellow", end: "rgb(249, 252, 99)", start: "rgb(253, 255, 153)"},
  { id: "red", end: "rgb(250, 103, 103)", start: "rgb(255, 157, 157)"},
  { id: "navy", end: "rgb(83, 83, 168)", start: "rgb(123, 123, 168)"},
  { id: "white", end: "rgb(197, 197, 197)", start: "rgb(255, 255, 255)"},
  // { id: "navy", start: "rgb(89, 252, 151)", end: "rgb(254, 205, 44)"},
];

function getBannerColor(type: GameType, phase: Phase) : string {
  if (phase == "choosing" || phase == "gameover") {
    return "url(#grey)"
  }
  // if (phase == "reveal") {
  //   return "purple"
  // }
  switch(type) {
    case "hands":
      return "url(#orange)"
    case "point":
      return "url(#green)"
    case "numbers":
      return "url(#blue)"
    case "emoji":
      return "url(#yellow)"
    case "percent":
      return "url(#purple)"
    case "opinion":
      return "url(#navy)"
  }
}

function getCenteredX(font: number, length: number): number {
  const charWidth = font*0.5;
  return 50 - length*charWidth/2
  
}

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
    return 31
  }
  return 18
}

function getAnsweredX(index: number) : number {
  return 9*index+12
}

const getAnsweredY = 42;

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
  const [playerArray, setPlayerArray] = useState<Player[]>([]);
  const [choiceArray, setChoiceArray] = useState<ChoiceType[]>(Array(10).fill(-1))
  const [gameType, setGameType] = useState<GameType>("hands");
  const [phase, setPhase] = useState<Phase>("choosing");
  const [question, setQuestion] = useState<string>("");
  const [totalVotes, setTotalVotes] = useState<number[]>([]);
  const [voteIndex, setVoteIndex] = useState<number>(-1);
  const [fakerIndex, setFakerIndex] = useState<number>(-1);
  const [showFaker,setShowFaker] = useState<boolean>(false);
  const [roundQuestions, setRoundQuestions] = useState<string[]>([]);
  const [showPastQuestions,setShowPastQuestions] = useState<boolean>(false);
  const [showScores,setShowScores] = useState<boolean>(false);
  const [playerScores,setPlayerScores] = useState<number[]>([]);
  const [playerPrevScores,setPlayerPrevScores] = useState<number[]>([]);
  const [dispScores, setDispScores] = useState<boolean>(false);
  const [fakerCaught, setFakerCaught] = useState<boolean>(false);
  const [storedChoices,setStoredChoices] = useState<number[][]>([]);
  const [votesNeeded,setVotesNeeded] = useState<number>(0);
  const [showWinner,setShowWinner] = useState<boolean>(false);
  const [endTime,setEndTime] = useState<number>(0);
  const [remaining, setRemaining] = useState<number>(0);
  const [chooserIndex, setChooserIndex] = useState<number>(0);
  const [gamePaused, setGamePaused] = useState<boolean>(false);

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
      setPlayerArray(gameState.playerArray);
      setChoiceArray(gameState.choiceArray);
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
      setRoundQuestions(gameState.roundQuestions);
      setVotesNeeded(gameState.votesNeeded);
      setEndTime(gameState.endTime);
      setChooserIndex(gameState.chooserIndex);
      localStorage.setItem("fakersPastChoices",JSON.stringify(gameState.pastChoices))
      setGamePaused(gameState.gamePaused)
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
    if (phase == "scoring") {
      if (fakerCaught) {
        setShowPastQuestions(true);
      }
      else {
        setShowFaker(true)
      }
    }
    else if (phase == "gameover") {
      setShowWinner(true)
    }
  },[phase,fakerCaught])
  
  useEffect(() => {
    if (!endTime || phase == "scoring" || phase == "gameover" || phase == "reveal") return;
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, endTime - now);
      setRemaining(diff);
    }, 1000); // Smooth updates

    return () => clearInterval(interval);
  }, [endTime]);

  const topBanner: JSX.Element = useMemo(() => {
    return <g>
      <rect filter="url(#shadow)" x={1} y={1} rx={2} ry={2} width={98} height={12} fill={getBannerColor(gameType,phase)}/>
    </g>
  },[gameType,phase])

  const bottomBanner: JSX.Element = useMemo(() => {
    return <g>
      <rect filter="url(#shadow)" x={1} y={39} rx={2} ry={2} width={98} height={10} fill={getBannerColor(gameType,phase)}/>
    </g>
  },[gameType,phase])

  // const banners: JSX.Element = useMemo(() => {
  //   return <g>
  //     <rect filter="url(#shadow)" x={1} y={1} rx={2} ry={2} width={98} height={12} fill={getBannerColor(gameType,phase)}/>
  //     <rect filter="url(#shadow)" x={1} y={39} rx={2} ry={2} width={98} height={10} fill={getBannerColor(gameType,phase)}/>
  //   </g>
  // },[gameType,phase])

  const questionText = useMemo(() => {
    return <foreignObject x={15} y={3.2} width="80" height="15">
    <div
      style={{width:80, fontSize:2, wordWrap:"break-word",fontFamily: "Comic Sans MS", textAlign: "left"}}>
      {question}
    </div>
  </foreignObject>
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
      if (typeof(val) !== "number") {return <g></g>}
      if (val < 0) return <g key={index}></g>
      counts[val]++;
      return (<g key={index}>
        <image href={pointImage} x={getPlayerX(val)+6} y={getPlayerY(val)+2*(counts[val]-1)-1} height={2} width={2}/>
        <text x={getPlayerX(val)+8.5} y={getPlayerY(val)-0.3+ 2*(counts[val]-1)+0.75} fontSize={1.25}>{playerNames[index]}</text>
      </g>)
    }))}
  ,[choiceArray,playerNames])

  const numberImages : JSX.Element[] = useMemo(() => 
    choiceArray.map((val,index) => (
      typeof(val) === "number" && val >= 0 ?
      <g key={index}>
        <circle cx={getPlayerX(index) + 6} cy={getPlayerY(index)+2} r={1.5} fill="black"/>
        <text x={getPlayerX(index)+5.5} y={getPlayerY(index)+2.8} fontSize={2.5} fill="white">{val}</text>
      </g>
      : <g key={index}></g>
    ))
  ,[choiceArray])

  const emojiImages : JSX.Element[] = useMemo(() => 
    choiceArray.map((val,index) => (
      typeof(val) === "string" ?
      <g key={index}>
        <text x={getPlayerX(index)+5.5} y={getPlayerY(index)+2.8} fontSize={3.5} fill="white">{val}</text>
      </g>
      : <g key={index}></g>
    ))
  ,[choiceArray])

  const percentImages : JSX.Element[] = useMemo(() => 
      choiceArray.map((val,index) => (
      typeof(val) === "number" && val != -1 ?
      <g key={index}>
        <rect x={getPlayerX(index) + 4.5} y={getPlayerY(index)+0.5} width={7.5} height={3} fill="white"/>
        <text x={getPlayerX(index)+5.5} y={getPlayerY(index)+2.8} fontSize={2.5} fill="black">{val}%</text>
      </g>
      : <g key={index}></g>
    ))
  ,[choiceArray])

  const opinionImages : JSX.Element[] = useMemo(() => 
      choiceArray.map((val,index) => (
      typeof(val) === "number" && val != -1 ?
      <g key={index}>
        <image href={opinionRefs[val]} x={getPlayerX(index)+6} y={getPlayerY(index)} height={val == 0 || val == 6 ? 5: 3} width={val == 0 || val == 6 ? 5: 3}/>
      </g>
      : <g key={index}></g>
    ))
  ,[choiceArray]) 

  function answerImages(gameType : GameType) : JSX.Element[] {
    switch (gameType) {
      case "hands":
        return raisedImages;
      case "numbers":
        return [<g key={1}>
        {playerImages}
        {numberImages}
      </g>]
      case "point":
        return [<g key={1}>
          {playerImages}
          {pointingImages}
        </g>]
      case "emoji":
        return [<g key={1}>
          {playerImages}
          {emojiImages}
        </g>]
      case "percent":
        return [<g key={1}>
          {playerImages}
          {percentImages}
        </g>]
      case "opinion":
        return [<g key={1}>
          {playerImages}
          {opinionImages}
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

  const doNothing = () => {}

  const sendRevealOver = () => {
    socket.emit("revealOver",room)
  }

  const timerImage = useMemo(() => {
    if (remaining <= 0 || phase == "reveal" || phase == "scoring" || phase == "gameover") {
      return null
    }
    return <g>
      <circle cx={93} cy={44} fill="white" r={4} stroke="black" strokeWidth={0.2}/>
      <text x={Math.ceil(remaining/1000) >=10 ? "90" : "92"} y={46} fontSize={5}>
        {Math.ceil(remaining/1000)}
      </text>
    </g>
  },[remaining, phase])

  const voteSuccessImage = useMemo(() => {
    if (!playerNames[voteIndex]) {return null}
    return <g>
      <text x={getCenteredX(4,"Majority voted for".length)} y={10} fontSize={4}
      fontFamily="Comic Sans MS"
      >Majority voted for</text>
      <motion.text
        // x={45}
        y={32}
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
          y: 24,
        }}
        animate={{
          height:10,
          width: 10,
          x:45,
          y: 19,
        }}
        transition={{
          delay:1.5,
          duration: 0.3,
        }}

      />
      <motion.text
        y = {44}
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
          y:16
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
        y={13}
        height={20}
        width={20}
        initial={{opacity: 0.999}}
        animate={{opacity:1}}
        transition={{duration: 3}}
        onAnimationComplete={sendRevealOver}
      />
      <text
      fontSize={4}
      y={38}
      x={getCenteredX(4,"Faker is still lurk".length)}
      >
        Faker is still lurking
      </text>
    </g>
  },[])

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
      <motion.text x={35} y={10} fontSize={5}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
      >The faker was</motion.text>
      <motion.text x={40} y={35} fontSize={5}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 2 }}
        onAnimationComplete={goToShowPastScores}
      >{playerNames[fakerIndex]}</motion.text>
      <motion.image
        href={peopleImagesRefs[fakerIndex]}
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
          delay:2,
          duration: 0.3,
        }}
      />
    </g>
  },[playerNames,fakerIndex])

  const scoreText = (index: number) =>
  dispScores ? playerScores[index] : playerPrevScores[index];

  const votesNeededImage = useMemo(() => {
    return <g>
      <image href={starImage} x={1} y={1} width={12} height={12} fill="rgb(210, 243, 78)"/>
      <text x={4.5} y={6} fontSize={0.8}>Votes needed</text>
      <text x={6.5} y={8} fontSize={2}>{votesNeeded}</text>
    </g>
  },[votesNeeded])

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

    return <g>
      <image href={fakerImage} x={4} y={getAnsweredY+1} height={5} width={5}/>
      <text x={4} y={getAnsweredY} fontSize={1.5}>{playerNames[fakerIndex]}</text>
      {roundQuestions.map((question, index) => 
        <motion.g key={index} 
          initial={{opacity:0}}
          animate={{opacity:1}}
          transition={{delay:5*index, duration:0.1}}
        >
          <text x={10} y={8+10*index} fontSize={1.5} fontWeight={"bold"}>Task #{index+1}</text>
          <foreignObject x={10} y={9+10*index} width={85} height={10}>
            <div
              style={{width:85, fontSize:1.5, wordWrap: "break-word",fontFamily: "Comic Sans MS", textAlign: "left"}}>
              {question}
            </div>
          </foreignObject>
        </motion.g>
      )}
      {playerNames.map((nameVal,index) => 
        index != fakerIndex ? (
          <g key={index}>
            <text x={getAnsweredX(playerIndex[index])} y={getAnsweredY} fontSize={1.5}>{nameVal}</text>
            <image href={fakerImage} x={getAnsweredX(playerIndex[index])} y={getAnsweredY+1} width={2} height={2} />
            <image href={fakerImage} x={getAnsweredX(playerIndex[index])+2} y={getAnsweredY+1} width={2} height={2} />
            <image href={fakerImage} x={getAnsweredX(playerIndex[index])+4} y={getAnsweredY+1} width={2} height={2} />
            {storedChoices[index] && storedChoices[index].map((choice, index2) =>
              <motion.image key={index2}
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
            {/* {roundAnswers[index] && roundAnswers[index].map((answer, index3) => 
              answer == "" && showAnswers[index3] ? null : 
              <motion.image key={index3}
                // href={answer}
                x={getAnsweredX(playerIndex[index])}
                y={getAnsweredY}
                initial={{height: 0, width:0,opacity:0.999}}
                animate={{height:2, width:2, opacity:1}}
                transition={{
                  height: {delay: 2 + 5*index3, duration:0.2},
                  width: {delay: 2 + 5*index3, duration:0.2},
                  opacity: {delay: 5+ 5*index3, duration: 0.1}
                }}
                onAnimationComplete={() => setShowAnswers([...showAnswers.slice(0, index3), false, ...showAnswers.slice(index3 + 1)])}
              />
            )} */}

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
          }}
          animate={{r: getR(index,playerScores),
            opacity: 1,
          }}
          transition={{
            r: {delay: 1, duration: 0.1},
            opacity: {duration: 4},
          }}
          onAnimationComplete={() => finishScoring(index)}
        />
        <motion.text
          fill={"white"}
          y = {getPlayerY(index)+3}
          initial={{
            x: getPlayerX(index)+3-getR(index,playerPrevScores),
            fontSize: getR(index,playerPrevScores)*0.6
          }}
          animate={{
            fontSize: getR(index,playerScores)*0.6,
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
    else {return null}
  },[showFaker,showScores,showPastQuestions,dispScores,roundQuestions,fakerIndex,playerNames])

  const victoryScreen = useMemo(() => {
    const winnerIndex: number = playerScores.indexOf(Math.max(...playerScores));
    const winnerName: string = playerNames[winnerIndex];
    if ( winnerIndex === -1 || !winnerName) return <g></g>;
    return <g>
      <text x={getCenteredX(3,"The winner is".length)} y={8} fontSize={3}>The winner is</text>
      <motion.text
        y={28}
        initial={{
          x: 50,
          fontSize: 0,
        }}
        animate={{
          x: getCenteredX(3,winnerName.length),
          fontSize: 3,
        }}
        transition={{
          delay: 1.5,
          duration: 0.3,
        }}
      >
        {winnerName}
      </motion.text>
      <motion.image
        href={peopleImagesRefs[winnerIndex]}
        initial={{
          height: 0,
          width: 0,
          x: 50,
          y: 20,
          opacity: 0.999,
        }}
        animate={{
          height:10,
          width: 10,
          x:45,
          y: 15,
          opacity: 1,
        }}
        transition={{
          height: {delay:1.5, duration: 0.3},
          width: {delay:1.5,duration:0.3},
          x: {delay:1.5,duration:0.3},
          y: {delay:1.5,duration:0.3},
          opacity: {delay:1.5,duration:3},
        }}
        onAnimationComplete={() => setShowWinner(false)}
      />
    </g>
  },[playerScores,playerNames])

  const gameTypeImage = useMemo(() => {
    return <g>
      <image href={gametypeImageRefs[gameType]} x={5} y={2} height={5} width={5}/>
      <text x={5} y={10} fontSize={3}>{getGameTypeString(gameType)}</text>
    </g>
  },[gameType])

  const replayScreen = useMemo(() => {
    return <g>
      <text x={getCenteredX(3,`${playerNames[0]}, choose to replay or exit`.length)} y={5} fontSize={3}>{playerNames[0]}, choose to replay or exit</text>
      {playerImages}
      {playerScores.map((score,index) => {
        return <g key={index}>
          <text x={getPlayerX(index)+1} y={getPlayerY(index)-2} fontSize={3}>{score}</text>
        </g>
      })}
    </g>
  },[playerImages,playerScores,playerNames])

  const chooserImage = useMemo(() => {
    return <g>
      <text x={20} y={10} fontSize={3}>{playerNames[chooserIndex]} is choosing a category</text>
    </g>
  },[playerNames,chooserIndex])

  const gameOverImages = useMemo(() => {
    return <g>
      {showWinner ? victoryScreen : replayScreen}
    </g>
  },[showWinner,victoryScreen,replayScreen])
  
  // console.log(victoryScreen)
  // console.log(replayScreen)
  // console.log(showWinner)
  // console.log(gameOverImages)
  // console.log(choiceArray)

  const pauseOverlay = useMemo(() => {
    return (
    gamePaused ? <div className="overlay">
      <p>Game is paused</p>
    </div>
    : null
  )}
  ,[gamePaused])

  return <div className={"displayBackground"}>
  {pauseOverlay}
  <svg id="main" x = "0px" y="0px" xmlns = "http://www.w3.org/2000/svg" viewBox="0 0 100 50">
    <defs>
      <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0.5" stdDeviation="2" floodOpacity="0.3" />
      </filter>
      {gradients.map(g => (
      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={g.start} />
        <stop offset="100%" stopColor={g.end} />
      </linearGradient>
      ))}
    </defs>
      <rect x="-10" y="-10" width={200} height={100} fill={"black"}/>
      <g>
          <rect x="0" y="0" rx="2" ry="2" width="100" height={50} fill="url(#lightgrey)"/>
          {!(phase == "scoring" && (showFaker || showPastQuestions)) && topBanner}
          {!(phase == "scoring" && showFaker) && bottomBanner}
          {timerImage}
      </g>
      <g>
        <rect x="88.5" y="1.5" rx="1" ry="1" height={2} width={10} fill="url(#white)"/>
        <text x="89" y="3" fontSize={1.5} fontWeight={"bold"}>Room: {room}</text>
      </g>    
      <g>
        {(() => {
          switch (phase) {
            case "choosing":
              return <g> 
                {chooserImage}
              </g>
            case "answering":
              return <g>
                {gameTypeImage}
                {playerImages}
                </g>
            case "voting":
              return <g> 
                {questionText}
                {votesNeededImage}
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
                {/* {showPastQuestions && gameTypeImageRight} */}
              </g>
            case "gameover":
              return <g>
                {gameOverImages}
              </g>
          }
        })()}
      </g>
    </svg>
    </div>
}

export default GameDisplay
