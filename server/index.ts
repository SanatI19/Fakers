import express from 'express';
import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { instrument } from "@socket.io/admin-ui";
import cors from "cors";
import {ServerToClientEvents , ClientToServerEvents, Player, GameState, Phase, Loot, LootType, GameType, IDisplayFunction} from "../shared";
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
        origin: ["http://localhost:5174","https://admin.socket.io"],
        methods: ["GET","POST"],
        credentials: true
    }

});

const PORT = process.env.PORT || 3500;
server.listen(PORT, () => {
  console.log("Server listening on port " + (process.env.PORT || 3500));
});


const roomCodeLength = 4;
const maxPlayers = 8;
const ROOM_TIMEOUT= 10*1000*60; // 10 min timer
const SELECTION_TIMER = 5*1000;
const MAX_STORED_LENGTH = 10;


const dataHands = readFileSync("../hands.txt", "utf-8");
const handsTasks = dataHands.split("\n");

const dataPoint = readFileSync("../pointing.txt", "utf-8");
const pointTasks = dataPoint.split("\n");

const dataNumbers = readFileSync("../numbers.txt", "utf-8");
const numbersTasks = dataNumbers.split("\n");


function resetChoiceArray(room: string) {
    games[room].choiceArray = Array(games[room].playerArray.length).fill(-1);
}

function resetVoteArray(room: string) {
    games[room].voteArray = Array(games[room].playerArray.length).fill(-1);
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
        pastChoices: {"hands": [], "point": [], "numbers": []}, 
        question: "", 
        fakerIndex: -1, 
        phase: "choosing", 
        chooserIndex: -1, 
        choiceArray: [], 
        counter: 0, 
        voteArray: [],
    };
}

function initGameTimer(roomId: string) {
    gameTimers[roomId] = setTimeout(() => deleteRoom(roomId), 5*ROOM_TIMEOUT);
}

function resetRoomTimeout(room: string, multiplier: number) {
  if (!room) return;
  clearTimeout(gameTimers[room]);
//   console.log(gameTimers[room])
    delete gameTimers[room];
  gameTimers[room] = setTimeout(() => deleteRoom(room), multiplier* ROOM_TIMEOUT);
//   console.log("New game timers")
//   console.log(gameTimers[room])
}

function deleteRoom(room: string) {
  if (games[room]) { clearTimeout(gameTimers[room]) };
  delete games[room];
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
            return "Point at the player who "
        case "numbers":
            if (phrase[phrase.length-1] == "0"){
                return "On a scale of 1-5, "
            }
            else {
                return "Hold up as many fingers as "
            }
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
    }   
    const question = randomizeChoice(room, type, file);
    return question

}

function randomizeChoice(room: string, type: GameType, file: string[]): string {
    let index = Math.floor(Math.random()*file.length);
    // if (!games[room].pastChoices[type]) {
    //     games[room].pastChoices[type] = [index];
    // }
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

const games : Record<string,GameState> = {};
const gameTimers : Record<string,NodeJS.Timeout> = {}
const socketToRoom : Record<string,string> = {};

io.on("connection", (socket: Socket<ClientToServerEvents,ServerToClientEvents>) => {
    socket.on("clientMsg",(data) => {
        io.sockets.emit("serverMsg",data);
    })

    socket.on("joinRoom",(room: string, deviceId: string, playerId: string) => {
        let outRoom = "";
        let reason = "";
        let id = -1;
        if (games[room] !== undefined && games[room].joinable) {
            // do some putting of the players in the array
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
            // initGameTimer(roomId);
            // if (games[])
            games[roomId].sockets.push(socket.id);
            // if (games)
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
        }
        else {
            // resetRoomTimeout(room, 1)
            socket.join(room)
            socketToRoom[socket.id] = room;

            const playerArray = games[room].playerArray;
            const playerIds = playerArray.map(player => player.internalId);
            const deviceIds = playerArray.map(player => player.deviceId);
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
                    // playerArray[index].id = index;
                    games[room].sockets[index] = socket.id;
                    socket.emit("getPlayerIndex",index);
                    io.to(room).emit("sendPlayerArray",playerArray);
                }
            }
            if (playerArray.length == 8) {
                games[room].joinable = false;
                // need to add something to fix potential race condition
            }
        }
    })

    socket.on("requestRemovePlayer", (room: string, index: number) => {
        if (games[room] === undefined) {
            socket.emit("failedToAccessRoom");
        }
        else {
            // resetRoomTimeout(room, 1);
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
            // resetRoomTimeout(room,1);
            games[room].playerArray[id].name = name;
            io.to(room).emit("sendPlayerArray",games[room].playerArray);
        }
    })

    socket.on("triggerStartGame",(room: string) => {
        if (games[room] === undefined) {
            socket.emit("failedToAccessRoom");
        }
        else {
            // resetRoomTimeout(room, 1);
            games[room].chooserIndex = getRandomPlayer(games[room].playerArray.length);
            games[room].fakerIndex = getRandomPlayer(games[room].playerArray.length);
            // games[room].started = true;
            // games[room].joinable = false;
            // games[room].totalAlivePlayers = games[room].playerArray.length;
            // games[room].lootTurnPlayerIndex = -1
            // games[room].bossId = chooseGodfather(games[room].totalAlivePlayers);
            // games[room].lootDict = getLootDict(games[room].lootDeck);
            resetChoiceArray(room);
            resetVoteArray(room);
            setTimer(room,changeToAnswering)
            io.to(room).emit("startGame");
        }
    })

    socket.on("requestInitialState",(room: string, id: number) => {
        if (games[room] !== undefined) {  
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
        else {
            socket.emit("failedToAccessRoom");
        }
    })

    socket.on("requestGameState", (room: string) => {
        if (games[room] === undefined) {
            socket.emit("failedToAccessRoom");
        }
        else {
            socket.emit("getGameState", games[room]);
        }
    })

    function prepForAnswering(room: string, type: GameType) : void {
        let string = getRandomQuestion(room,type)
        const prefix = getPrefix(type,string)
        type == "numbers" ? string=string.slice(0,string.length-1) : string=string;
        const question : string = prefix + string
        games[room].question = question;
        games[room].phase = "answering";
        games[room].fakerIndex = getRandomPlayer(games[room].playerArray.length);
    }

    // socket.on("set")
    socket.on("sendGameTypeDecision", (room: string, type: GameType) => {
        // need to get the question
        games[room].gameType = type;
        prepForAnswering(room,type)
        //sends to the regular people in the room
        io.to(room).emit("getGameState",games[room])
        // need to send out the question to each member in the regular game, including faker
        setTimer(room, changeToVoting);
    })

    socket.on("sendChoice",(room: string, id: number, index: number) => {
        games[room].choiceArray[id] = index;
        games[room].counter++;
        if (games[room].counter == games[room].playerArray.length) {
            // games[room].counter = 0;
            changeToVoting(room)
        }
    })

    socket.on("sendVote",(room: string, id: number, index: number) => {
        games[room].voteArray[id] = index;
        games[room].counter++;
        if (games[room].counter == games[room].playerArray.length) {
            changeToReveal(room)
        }
    })
    

    socket.on("disconnect", (reason) => {
        const roomId = socketToRoom[socket.id];
        // console.log(games)
        if (roomId !== undefined && games[roomId] !== undefined) {
            const index = games[roomId].sockets.indexOf(socket.id);
            if (index > 0) {
                games[roomId].playerArray[index].connected = false;
                io.to(roomId).emit("changeConnected",games[roomId].playerArray);
            }
            // else if (games[roomId].displaySocket == socket.id) {
                
            // }
        }
    })

    function setTimer(room: string,input: IDisplayFunction) {
        if (!games[room]) return;
        clearTimeout(gameTimers[room])
        delete gameTimers[room];
        gameTimers[room] = setTimeout(() => input(room), SELECTION_TIMER);
    }

    // function setDisplayTimer(room: string, type: GameType) {
    //     if (!games[room]) return;
    //     clearTimeout(gameTimers[room])
    //     delete gameTimers[room];
    //     gameTimers[room] = setTimeout(() => sendToDisplay(room, type), SELECTION_TIMER);
    // }
    function changeToChoosing(room: string) : void {
        if (!(games[room])) {
            io.to(room).emit("failedToAccessRoom") 
            return
        }
        games[room].phase = "choosing"
        games[room].chooserIndex = getRandomPlayer(games[room].playerArray.length);
        games[room].fakerIndex = getRandomPlayer(games[room].playerArray.length);
        io.to(room).emit("getGameState",games[room])
        setTimer(room,changeToAnswering)
    }

    function changeToAnswering(room: string) : void {
        console.log("changing to choosing")
        if (!(games[room])) {
            io.to(room).emit("failedToAccessRoom") 
            return
        }
        games[room].phase = "answering"
        games[room].gameType = getRandomGameType();
        prepForAnswering(room,games[room].gameType)
        io.to(room).emit("getGameState",games[room])
        console.log("changing to answering")
        setTimer(room,changeToVoting)
    }


    function changeToVoting(room: string) : void {
        if (!(games[room])) {
            io.to(room).emit("failedToAccessRoom") 
            return
        }
        games[room].counter = 0;
        games[room].phase = "voting"
        io.to(room).emit("getGameState",games[room])
        setTimer(room,changeToReveal)
    }

    function changeToReveal(room: string) : void {
        if (!(games[room])) {
            io.to(room).emit("failedToAccessRoom") 
            return
        }
        games[room].phase = "reveal";
        io.to(room).emit("getGameState",games[room])
        setTimer(room,changeToChoosing)
    }

    function sendToDisplay(room: string, type: GameType) {
        // switch (type) {
        //     case "hands":
        //         sendHandsToDisplay(room);
        //         break
        //     case "numbers":
        //         sendNumbersToDisplay(room);
        //         break
        //     case "point":
        //         sendPointsToDisplay(room);
        //         break
        // }
        // games[room].sendQuestion = true;
        io.to(room).emit("getGameState",games[room])
    }

    function sendPointsToDisplay(room: string) {
        if (!games[room]) return;
        clearTimeout(gameTimers[room])
        io.to(games[room].displaySocket).emit("displayPoints")
    }

    function sendNumbersToDisplay(room: string) {
        if (!games[room]) return;
        clearTimeout(gameTimers[room])
        io.to(games[room].displaySocket).emit("displayNumbers")
    }

    function sendHandsToDisplay(room: string) {
        if (!games[room]) return;
        clearTimeout(gameTimers[room])
        io.to(games[room].displaySocket).emit("displayHands")
    }

    
})

instrument(io, {
  auth: false
});