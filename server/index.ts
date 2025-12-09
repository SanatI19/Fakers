import express from 'express';
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import cors from "cors";
import {ServerToClientEvents , ClientToServerEvents, Player, GameState, GameType, IDisplayFunction, ChoiceType} from "../shared";
import path from "path";
import { readFileSync } from "fs";

const app = express()
app.use(cors());

app.use(express.static(path.join(__dirname, "../../../client/dist"))); 
app.get("/*path", (req, res) => {
res.sendFile(path.join(__dirname, "../../../client/dist/index.html"));
});

const server = createServer(app)
const io = new Server<ClientToServerEvents,ServerToClientEvents>(server, {
    cors: {
        origin: ["http://localhost:5173","https://admin.socket.io"],
        methods: ["GET","POST"],
        credentials: true
    }

});

const PORT = process.env.PORT || 3500;
server.listen(PORT, () => {
  console.log("Server listening on port " + (process.env.PORT || 3500));
});


const roomCodeLength = 4;
const MAX_PLAYERS = 10;
const ROOM_TIMEOUT= 5*1000*60*60; // 5 min timer
const MAX_STORED_LENGTH = 40;
const MAX_ROUNDS = 10;

const ANSWER_TIMER = 30*1000;
const VOTE_TIMER = 90*1000;
const CHOOSING_TIMER = 10*1000;

const dataHands = readFileSync("../hands.txt", "utf-8");
const handsTasks = dataHands.split("\n");

const dataPoint = readFileSync("../pointing.txt", "utf-8");
const pointTasks = dataPoint.split("\n");

const dataNumbers = readFileSync("../numbers.txt", "utf-8");
const numbersTasks = dataNumbers.split("\n");

const dataEmojis = readFileSync("../emojis.txt", "utf-8");
const emojisTasks = dataEmojis.split("\n");

const dataPercent = readFileSync("../percent.txt", "utf-8");
const percentTasks = dataPercent.split("\n");

const dataOpinion = readFileSync("../opinion.txt", "utf-8");
const opinionTasks = dataOpinion.split("\n");

const fakerScoreRound = [200,250,300]
const nonFakerScoreRound = [250,200,150]

function resetChoiceArray(room: string) {
    games[room].choiceArray = Array(games[room].playerArray.length).fill(-1);
}

function resetVoteArray(room: string) {
    games[room].voteArray = Array(games[room].playerArray.length).fill(-1);
}

function resetVoteLocks(room: string) {
    games[room].voteLocked = Array(games[room].playerArray.length).fill(false);
}

function resetStoredChoices(room: string) {
    games[room].storedChoices = Array.from({ length: games[room].playerArray.length }, () => []);
}

function newGameState(type: boolean):GameState {
    const playerArray : Player[] = []
    let joinable = true;
    return {playerArray, 
        joinable, 
        round: 0, 
        sockets: [], 
        started: false, 
        displaySocket: "", 
        classic: type, 
        gameType: "hands", 
        pastChoices: {"hands": [], "point": [], "numbers": [], "emoji": [], "percent": [], "opinion": []}, 
        question: "", 
        fakerIndex: -1, 
        phase: "choosing", 
        chooserIndex: -1, 
        choiceArray: [], 
        counter: 0, 
        voteArray: [],
        voteLocked: [],
        storedChoices: [],
        votedIndex: -1,
        fakerCaught: false,
        roundQuestions: [],
        votesNeeded: 0,
        endTime: 0,
    };
}

function resetRoomTimeout(room: string, multiplier: number) {
  if (!room) return;
  clearTimeout(gameoverTimers[room]);
  delete gameoverTimers[room];
  gameoverTimers[room] = setTimeout(() => deleteRoom(room), multiplier* ROOM_TIMEOUT);
}

function deleteRoom(room: string) {
    if (games[room]) { 
        clearTimeout(gameoverTimers[room]) 
        delete gameoverTimers[room]
    };

    io.to(room).emit("failedToAccessRoom");
    delete games[room];
}

function updateStoredVotes(room: string) : void {
    for (let i = 0; i < games[room].voteArray.length; i++) {
        games[room].storedChoices[i].push(games[room].voteArray[i]);
    }
}

function updateRoundQuestions(room:string) : void {
    games[room].roundQuestions.push(games[room].question);
}

function generateRoomCode(): string {
    let result = '';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < roomCodeLength; i++) {
        const randomIndex = Math.floor(Math.random() * chars.length);
        result += chars[randomIndex];
    }
    return result;

}

function getPrefix(type: GameType, phrase: string) : string {
    switch (type) {
        case "hands":
            return "Raise your hand if "
        case "point":
            return "Select the player who "
        case "numbers":
            if (phrase[phrase.length-1] == "0"){
                return "On a scale of 0-5, "
            }
            else {
                return "Hold up as many fingers as "
            }
        case "emoji":
            return "Pick an emoji to describe "
        case "percent":
            return "What percent "
        case "opinion":
            return ""
    }
}

function getRandomQuestion(room: string, type: GameType) : string {
    let file : string[] = [];
    switch (type) {
        case "hands":
            file = handsTasks;
            break;
        case "point":
            file = pointTasks;
            break;
        case "numbers":
            file = numbersTasks;
            break;
        case "emoji":
            file = emojisTasks;
            break;
        case "percent":
            file = percentTasks;
            break;
        case "opinion":
            file = opinionTasks;
            break;
    }   
    const question = randomizeChoice(room, type, file);
    return question

}

function randomizeChoice(room: string, type: GameType, file: string[]): string {
    let index = Math.floor(Math.random()*file.length);
    if (games[room].pastChoices[type].includes(index)) {
        return randomizeChoice(room,type,file);
    }
    else {
        if (games[room].pastChoices[type].length > MAX_STORED_LENGTH) {
            games[room].pastChoices[type].shift()
        }
        games[room].pastChoices[type].push(index)
        return file[index]
    }
}

function getRandomPlayer(num: number) : number {
    const index = Math.floor(Math.random()*num)
    return index
}

function getRandomGameType() : GameType {
    const index = Math.floor(3*Math.random())
    switch (index) {
        case 0:
            return "hands";
        case 1:
            return "numbers";
        default:
            return "point";
    }
}

function setAllIncomplete(playerArray: Player[]) : void {
    for (const player of playerArray) {
        player.completedPhase = false;
    }
}

function calculateVotes(room: string) : void {
    const votes = games[room].voteArray;
    const out =  Array(votes.length).fill(0);
    for (const x of votes) {
        if (x >= 0) {
        out[x] += 1
        }
    }
    games[room].votedIndex = determineVoteSuccess(out, votes.length);
    if (games[room].votedIndex == games[room].fakerIndex) {
        games[room].fakerCaught = true;
    }
}

function determineVoteSuccess(totalVotes: number[], numPlayers: number) : number {
    const maxVotes = Math.max(...totalVotes);
    if (maxVotes / numPlayers > 0.65) {
        return totalVotes.indexOf(maxVotes);
    }
    else {
        return -1
    }
}

function resetRoundQuestions(room: string): void {
    games[room].roundQuestions = [];
}

function resetPlayers(room: string) : void {
    if (!games[room]) {
        return;
    }
    for (const player of games[room].playerArray) {
        player.prevScore = 0;
        player.totalScore = 0;
    }
}

function removeTimers(room:string) : void {
    clearTimeout(gameTimers[room])
    delete gameTimers[room];
}

function isInitial(pastChoices: Record<GameType,number[]>): boolean {
    if (pastChoices["hands"].length==0 
        && pastChoices["point"].length==0 
        && pastChoices["numbers"].length==0 
        && pastChoices["emoji"].length==0
        && pastChoices["percent"].length==0) {
            return true
        } 
    return false
}

function configurePastChoices(pastChoices: Record<GameType,number[]>): void {
    if (!("hands" in pastChoices)) {
       (pastChoices as Record<GameType,number[]>)["hands"] = [];
    }
    if (!("numbers" in pastChoices)) {
       (pastChoices as Record<GameType,number[]>)["numbers"] = [];
    }
    if (!("point" in pastChoices)) {
       (pastChoices as Record<GameType,number[]>)["point"] = [];
    }
    if (!("emoji" in pastChoices)) {
       (pastChoices as Record<GameType,number[]>)["emoji"] = [];
    }
    if (!("percent" in pastChoices)) {
       (pastChoices as Record<GameType,number[]>)["percent"] = [];
    }
    if (!("opinion" in pastChoices)) {
       (pastChoices as Record<GameType,number[]>)["opinion"] = [];
    }
}


const games : Record<string,GameState> = {};
const gameTimers : Record<string,NodeJS.Timeout> = {}
const gameoverTimers : Record<string,NodeJS.Timeout> = {}
const socketToRoom : Record<string,string> = {};

io.on("connection", (socket: Socket<ClientToServerEvents,ServerToClientEvents>) => {
    socket.on("joinRoom",(room: string, deviceId: string, playerId: string) => {
        let outRoom = "";
        let reason = "";
        let id = -1;
        if (games[room] !== undefined && games[room].joinable) {
            socket.join(room);
            socketToRoom[socket.id] = room;
            outRoom = room;
        }
        if (games[room] === undefined) {
            reason = "Room does not exist";
        }
        else if (!games[room].joinable) {
            reason = "Room is not joinable";
            for (let i = 0; i < games[room].playerArray.length; i++) {
                const player = games[room].playerArray[i];
                if (!player.connected && (player.deviceId == deviceId)) {
                    if (games[room].started) {
                        reason = "join"
                    }
                    else {
                        reason = "rejoin"
                    }
                    outRoom = room;
                    id = i;
                    break
                }
            }
        }
        socket.emit("enterExistingRoom",outRoom, reason, id);

    })

    socket.on("createRoom",(type: boolean) => {
        let ableToCreateRoom = false;
        let roomId: string = "";
        for (let i = 0; i < 10000; i++) {
            roomId = generateRoomCode();
            if (games[roomId] === undefined) {
                ableToCreateRoom = true;
                break
            }
        }

        if (ableToCreateRoom) {
            socket.join(roomId);
            socketToRoom[socket.id] = roomId;
            games[roomId] = newGameState(type);
            games[roomId].sockets.push(socket.id);
            socket.emit("enterExistingRoom",roomId,"display", -1);
        }
        else {
            socket.emit("unableToCreateRoom");
        }
    })

    socket.on("requestRoom", (room: string) => {
        if (games[room] === undefined) {
            socket.emit("failedToAccessRoom");
        }
    })

    socket.on("joinDisplaySocket",(room: string, deviceId: string, playerId: string) => {
        if (games[room] === undefined) {
            socket.emit("failedToAccessRoom")
            return;
        }
        socket.join(room)
        
        games[room].displaySocket = socket.id;
    })

    socket.on("joinPlayerArray",(room: string, deviceId: string, playerId: string) => {
        if (games[room] === undefined) {
            socket.emit("failedToAccessRoom")
            return;
        }
        if (games[room].started) {
            socket.emit("startGame");
            return;
        }
            socket.join(room)
            socketToRoom[socket.id] = room;
            const playerArray = games[room].playerArray;
            const playerIds = playerArray.map(player => player.internalId);
            let index = 0;
            if (playerIds.includes(playerId)) {
                index = playerIds.indexOf(playerId)
                games[room].sockets[index] = socket.id;
                socket.emit("getPlayerIndex",index);
                socket.emit("sendPlayerArray",playerArray);
                if (!games[room].playerArray[index].connected) {
                    games[room].playerArray[index].connected = true;
                    io.to(room).emit("changeConnected",games[room].playerArray);
                }
            }
            else {
                let rejoin = false;
                for (let i = 0; i < games[room].playerArray.length; i++) {
                    const player = games[room].playerArray[i];
                    if (!player.connected && (player.deviceId == deviceId)) {
                        rejoin = true;
                        index = i;
                        player.internalId = playerId;
                        break
                    }
                }

                if (rejoin) {
                    socket.emit("getPlayerIndex",index);
                    socket.emit("sendPlayerArray",playerArray);
                    games[room].sockets[index] = socket.id;
                    if (!games[room].playerArray[index].connected) {
                        games[room].playerArray[index].connected = true;
                        io.to(room).emit("changeConnected",games[room].playerArray);
                    }
                }
                else {
                    index = playerArray.length;
                    const name = "Player" + (index+1);
                    playerArray.push(new Player(name,deviceId, playerId))
                    games[room].sockets[index] = socket.id;
                    socket.emit("getPlayerIndex",index);
                    io.to(room).emit("sendPlayerArray",playerArray)
                }
            }
            if (playerArray.length == MAX_PLAYERS) {
                games[room].joinable = false;
            }
        }
    )

    socket.on("requestRemovePlayer", (room: string, index: number) => {
        if (games[room] === undefined) {
            socket.emit("failedToAccessRoom");
        }
        else {
            const playerArray = games[room].playerArray;
            playerArray.splice(index,1);
            io.to(room).emit("removePlayerFromLobby", index, playerArray);
        }
    })


    socket.on("sendName",(name: string, id: number, room: string) => {
        if (games[room] === undefined) {
            socket.emit("failedToAccessRoom");
        }
        else {
            games[room].playerArray[id].name = name;
            io.to(room).emit("sendPlayerArray",games[room].playerArray);
        }
    })

    socket.on("triggerStartGame",(room: string) => {
        if (!games[room]) {
            socket.emit("failedToAccessRoom");
            return;
        }
        resetGame(room);
        if (isInitial(games[room].pastChoices)) {
            io.to(games[room].displaySocket).emit("requestPastChoices");
        }
        io.to(room).emit("startGame");
    })

    socket.on("sendPastChoices", (room: string, pastChoices: Record<GameType,number[]>) => {
        if (!games[room]) {
            socket.emit("failedToAccessRoom");
            return
        }
        configurePastChoices(pastChoices)
        games[room].pastChoices = pastChoices;
    })

    socket.on("triggerRestartGame", (room: string) => {
        if (!games[room]) {
            socket.emit("failedToAccessRoom");
            return;
        }
        resetGame(room);
        io.to(room).emit("getGameState",games[room]);
    })

    function resetGame(room: string) : void {
        if (!games[room]) {
            socket.emit("failedToAccessRoom");
            return;
        }
        resetPlayers(room);
        resetChoiceArray(room);
        resetVoteArray(room);
        resetVoteLocks(room);
        resetStoredChoices(room);
        resetRoundQuestions(room);
        changeToChoosing(room);
        resetRoomTimeout(room,1);
        games[room].round = 0;
        games[room].started = true;
        games[room].votesNeeded = Math.ceil(0.65*games[room].playerArray.length)
    }

    socket.on("requestInitialState",(room: string, id: number) => {
        if (!games[room]) {  
            socket.emit("failedToAccessRoom");
            return
        }
            socket.join(room);
            socketToRoom[socket.id] = room;
            if (id == -1) {
                games[room].displaySocket = socket.id;
            }
            else {
                games[room].sockets[id] = socket.id;
                if (!games[room].playerArray[id].connected) {
                    games[room].playerArray[id].connected = true;
                    io.to(room).emit("changeConnected",games[room].playerArray);
                }
            }
            socket.emit("getPlayerNames",games[room].playerArray);
            socket.emit("getGameState",games[room]);
        }
    )

    socket.on("requestGameState", (room: string) => {
        if (!games[room]) {
            socket.emit("failedToAccessRoom");
            return
        }
        socket.emit("getGameState", games[room]);
    })

    function prepForAnswering(room: string, type: GameType) : void {
        let string = getRandomQuestion(room,type)
        const prefix = getPrefix(type,string)
        type == "numbers" ? string=string.slice(0,string.length-1) : string=string;
        const question : string = prefix + string
        games[room].question = question;
        games[room].phase = "answering";
    }

    socket.on("sendGameTypeDecision", (room: string, type: GameType) => {
        games[room].gameType = type;
        clearTimeout(gameTimers[room])
        delete gameTimers[room];
        changeToAnswering(room)
    })

    socket.on("sendChoice",(room: string, id: number, index: ChoiceType) => {
        if (!games[room]) {
            socket.emit("failedToAccessRoom")
            return
        };
        games[room].choiceArray[id] = index;
        games[room].counter++;
        games[room].playerArray[id].completedPhase = true;
        if (games[room].counter == games[room].playerArray.length) {
            changeToVoting(room)
        }
        else {
            socket.emit("getGameState",games[room])
            io.to(games[room].displaySocket).emit("getGameState",games[room])
        }
    })

    socket.on("sendVote",(room: string, id: number, index: number) => {
        if (!games[room]) {
            socket.emit("failedToAccessRoom")
            return
        };
        games[room].voteArray[id] = index;
        io.to(games[room].displaySocket).emit("getGameState",games[room]);
    })

    socket.on("lockInVote",(room: string, id: number) => {
        if (!games[room]) {
            socket.emit("failedToAccessRoom");
            return
        };
        games[room].voteLocked[id] = true;
        if (games[room].voteLocked.filter((locked) => locked==false).length == 0) {
            changeToReveal(room);
        }
        io.to(games[room].displaySocket).emit("getGameState",games[room])
    })
    
    socket.on("triggerEndGame", (room: string) => {
        deleteRoom(room);
    })

    function setCountdown(room: string, timer: number) {
        const endTime = Date.now() + timer;
        games[room].endTime = endTime;
    }

    // socket.on("disconnect", (reason) => {
    //     const roomId = socketToRoom[socket.id];
    //     if (roomId !== undefined && games[roomId] !== undefined) {
    //         const index = games[roomId].sockets.indexOf(socket.id);
    //         if (index >= 0) {
    //             games[roomId].playerArray[index].connected = false;
    //             io.to(roomId).emit("changeConnected",games[roomId].playerArray);
    //         }
    //     }
    // })

    function setTimer(room: string,input: IDisplayFunction, timer: number) {
        if (!games[room]) return;
        removeTimers(room);
        gameTimers[room] = setTimeout(() => input(room), timer);
    }

    function changeToChoosing(room: string) : void {
        if (!(games[room])) {
            socket.emit("failedToAccessRoom") 
            return
        }
        games[room].phase = "choosing"
        resetRoomTimeout(room,1);
        resetStoredChoices(room);
        resetRoundQuestions(room);
        games[room].fakerCaught = false;
        games[room].chooserIndex = getRandomPlayer(games[room].playerArray.length);
        games[room].fakerIndex = getRandomPlayer(games[room].playerArray.length);
        setCountdown(room,CHOOSING_TIMER);
        io.to(room).emit("getGameState",games[room])
        setTimer(room,changeToAnsweringAfterTimer,CHOOSING_TIMER) 
    }

    function changeToAnswering(room: string) : void {
        if (!(games[room])) {
            socket.emit("failedToAccessRoom") 
            return
        }
        prepForAnswering(room,games[room].gameType)
        resetRoomTimeout(room,1);
        setCountdown(room,ANSWER_TIMER);
        io.to(room).emit("getGameState",games[room])
        setTimer(room, changeToVoting,ANSWER_TIMER);
    }

    function changeToAnsweringAfterTimer(room: string) : void {
        if (!(games[room])) {
            socket.emit("failedToAccessRoom") 
            return
        }
        resetRoomTimeout(room,1);
        games[room].phase = "answering"
        games[room].gameType = getRandomGameType();
        prepForAnswering(room,games[room].gameType)
        setCountdown(room,ANSWER_TIMER);
        io.to(room).emit("getGameState",games[room])
        setTimer(room,changeToVoting,ANSWER_TIMER)
    }


    function changeToVoting(room: string) : void {
        if (!(games[room])) {
            socket.emit("failedToAccessRoom") 
            return
        }
        resetRoomTimeout(room,1);
        games[room].counter = 0;
        setAllIncomplete(games[room].playerArray);
        games[room].phase = "voting";
        setCountdown(room,VOTE_TIMER);
        io.to(room).emit("getGameState",games[room])
        setTimer(room,changeToReveal,VOTE_TIMER)
    }

    function changeToReveal(room: string) : void {
        if (!(games[room])) {
            socket.emit("failedToAccessRoom") 
            return
        }
        resetRoomTimeout(room,1);
        games[room].phase = "reveal";
        games[room].round++;
        updateStoredVotes(room);
        removeTimers(room);
        updateRoundQuestions(room);
        setAllIncomplete(games[room].playerArray);
        calculateVotes(room);
        io.to(room).emit("getGameState",games[room])
    }

    socket.on("revealOver", (room: string) => {
        revealOver(room);
    })

    function revealOver(room: string) : void {
        if (!(games[room])) {
            socket.emit("failedToAccessRoom") 
            return
        }
        resetVoteArray(room);
        resetVoteLocks(room);
        resetChoiceArray(room);
        if ((games[room].storedChoices[0].length < 3) && (games[room].votedIndex != games[room].fakerIndex)) {
            changeToAnswering(room);
        }
        else {
            changeToScoring(room);
        }
    }

    function changeToScoring(room: string): void {
        resetRoomTimeout(room,1);
        games[room].phase ="scoring";
        calculateScores(room);
        io.to(room).emit("getGameState",games[room]);
        removeTimers(room);
    }

    function changeToGameOver(room: string): void {
        if (!(games[room])) {
            socket.emit("failedToAccessRoom") 
            return
        }
        games[room].phase ="gameover";
        io.to(room).emit("getGameState",games[room]);
        removeTimers(room);
        resetRoomTimeout(room,1);
    }

    socket.on("scoringAnimationOver", (room: string) => {
        if (!games[room]) {
            socket.emit("failedToAccessRoom")
        }
        for(const player of games[room].playerArray) {
            player.prevScore = player.totalScore;
        }
        if (games[room].round > MAX_ROUNDS) {
            changeToGameOver(room);
        }
        else {
            changeToChoosing(room);
        }
    })

    function calculateScores(room: string): void {
        for (let i = 0; i < games[room].playerArray.length; i++) {
            if (i == games[room].fakerIndex) {
                games[room].playerArray[i].totalScore += calculateFakerScore(room,i)
            }
            else {
                games[room].playerArray[i].totalScore += calculateNonFakerScore(room,i)
            }
        }
    }

    // function calculateFakerScore(room: string,index: number): number {
    //     const storedChoices = games[room].storedChoices;
    //     let outNum = 200*storedChoices[0].length;
    //     const votedFor = Array(storedChoices[0].length).fill(0);

    //     for (let i = 0; i< storedChoices.length; i++) {
    //         if (i == games[room].fakerIndex) {
    //             continue;
    //         }
    //         for (let j = 0; j < storedChoices[0].length; j++) {
    //             votedFor[j] += storedChoices[i][j] == games[room].fakerIndex ? 1 : 0;
    //         }
    //     }
    //     for (let i = 0; i < votedFor.length; i++) {
    //         if (i == votedFor.length-1 && games[room].fakerCaught) {
    //             outNum -= 200;
    //         }
    //         else {
    //             outNum -= 100*1/(games[room].playerArray.length-1)*votedFor[i];
    //         }
    //     }
    //     return outNum
    // }

    function calculateFakerScore(room: string,index: number): number {
        const storedChoices = games[room].storedChoices;
        // let outNum = 200*storedChoices[0].length;
        let outNum = 0;
        const votedFor = Array(storedChoices[0].length).fill(0);

        for (let i = 0; i< storedChoices.length; i++) {
            if (i == games[room].fakerIndex) {
                continue;
            }
            for (let j = 0; j < storedChoices[0].length; j++) {
                votedFor[j] += storedChoices[i][j] == games[room].fakerIndex ? 1 : 0;
            }
        }
        for (let i = 0; i < votedFor.length; i++) {
            if (!(i == votedFor.length-1 && games[room].fakerCaught)) {
                outNum += fakerScoreRound[i]
                outNum += 10*(Math.round(10/(games[room].playerArray.length-1)*votedFor[i]));
                // outNum -= 100*1/(games[room].playerArray.length-1)*votedFor[i];
            }
        }
        return outNum
    }

    function calculateNonFakerScore(room: string,index: number): number {
        const storedChoices = games[room].storedChoices;
        // let outNum = 20*(games[room].playerArray.length-2)*storedChoices[0].length;
        let outNum = 0
        const votedFor: number[] = Array(storedChoices[0].length).fill(0);
        const successfullyVotedFor: boolean[] = Array(storedChoices[0].length).fill(false);
        const correctVote : boolean[] = Array(storedChoices[0].length).fill(false);
        for (let i = 0; i< storedChoices.length; i++) {
            if (i == games[room].fakerIndex) {
                continue;
            }
            for (let j = 0; j < storedChoices[i].length; j++) {
                if (storedChoices[i][j] == index) {
                    votedFor[j]++;
                }
                if (i == index) {     
                    correctVote[j]= storedChoices[i][j] == games[room].fakerIndex;
                }
            }
        }

        for (let i = 0; i < votedFor.length;i++) {
            successfullyVotedFor[i] = votedFor[i]/(games[room].playerArray.length) > 0.65
        }

        for (let i= 0; i< successfullyVotedFor.length; i++) {
            if (!successfullyVotedFor[i]) {
                outNum += correctVote[i] ? (nonFakerScoreRound[i]): 0;
            }
        }
        return outNum
    }
})

instrument(io, {
  auth: false
});