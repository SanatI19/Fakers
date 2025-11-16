export interface ServerToClientEvents {
    serverMsg: (data : {msg : string; room: string}) => void;
    enterExistingRoom: (room: string, reason: string, id: number) => void;
    unableToCreateRoom: () => void;
    sendPlayerArray: (playerArray: Player[]) => void;
    startGame: () => void;
    getGameState: (gameState: GameState) => void;
    getPlayerNames: (playerArray: Player[]) => void;
    getPlayerIndex: (index: number) => void;
    failedToAccessRoom: () => void;
    changeConnected: (playerArray: Player[]) => void;
    removePlayerFromLobby: (index: number, playerArray: Player[]) => void;
    displayPoints: () => void;
    displayHands: () => void;
    displayNumbers: () => void;
    displayVotes: () => void;
    // sendChoiceToPlayer: (chooserIndex: number) => void;
    // revealPointDecisions: ()
    // list all of the server to client events here (so easy goddamn)
}

export interface ClientToServerEvents {
    clientMsg: (data : {msg : string; room: string}) => void;
    createRoom: (classic: boolean) => void;
    joinRoom: (room: string, deviceId: string, playerId: string) => void;
    requestPlayerArray: (room: string) => void;
    sendName: (name: string, id: number, room: string) => void;
    triggerStartGame: (room: string) => void;
    requestInitialState: (room: string, id: number) => void;
    requestGameState: (room: string) => void;
    sendBulletAndTarget: (bullet: number, targetId: number, id: number, room: string) => void;
    sendGodfatherDecision: (id: number, target: number, room: string) => void;
    sendHidingChoice: (id: number, choice: boolean, room : string) => void;
    requestLootDict: (room: string) => void;
    addItemToPlayer: (itemIndex: number, playerIndex: number, room:string) => void;
    continueToGambling: (room: string) => void;
    joinPlayerArray: (room:string, deviceId: string, playerId: string) => void;
    socketDisconnected: (id: number, room: string) => void;
    itemAnimationComplete: (itemIndex: number, playerIndex: number, room: string) => void;
    shotsFiredComplete: (room: string) => void;
    requestRoom: (room: string) => void;
    requestRemovePlayer: (room: string, index: number) => void;

    // sendPointChoice: (index: number) => void;
    // sendNumberChoice: (num: number) => void;
    // sendHandChoice: (raised: boolean) => void;
    joinDisplaySocket: (room: string, deviceId: string, playerId: string) => void;
    sendChoice: (room: string, id: number, index: number) => void;
    sendVote: (room: string, id:number, index: number) => void;
    sendGameTypeDecision: (room: string, type: GameType) => void;
    scoringAnimationOver: (room: string) => void;
    lockInVote: (room: string, id: number) => void;
    revealOver: (room: string) => void;
    // list all of the client to server events here 
}


export interface GameState {
    playerArray: Player[];
    joinable: boolean;
    round: number;
    sockets: string[];
    started: boolean;

    displaySocket: string;
    classic: boolean;
    gameType: GameType;
    pastChoices: {
        [type: string] : number[]
    };
    question: string;
    counter: number;
    // answering: boolean;
    // voting: boolean;
    fakerIndex: number;
    phase: Phase;
    chooserIndex: number;
    choiceArray: number[];
    voteArray: number[];
    voteLocked: boolean[];
    storedChoices: number[][];
    votedIndex: number;
    fakerCaught: boolean;
    roundQuestions: string[];
    votesNeeded: number;
}

export interface IDisplayFunction {
    (room: string): void;
}

export type Phase = "choosing" | "answering" | "voting" | "reveal" | "scoring";

export type GameType = "hands" | "numbers" | "point";

export class Player {
    // Need to add more
    // public id : number = 0;
    public deviceId: string;
    public internalId: string;
    // public playerId : number = 0;
    public name: string = "";
    public connected: boolean;
    public blanks = 5;
    public bullets = 3;
    public pendingHits = 0;
    public health = 3;
    public dead = false;
    //target of a bullet
    public target = -1;
    public bulletChoice = -1;
    // public godfather = false;
    public hiding = false;
    public choosingLoot = false;
    public damaged = false;
    // public damaged = false;
    // loot things
    public money = 0;
    public nft = 0;
    public gems = 0;

    public completedPhase = false;
    public prevScore = 0;
    public totalScore = 0;


    // public index: number = 0;

    public constructor(name: string, deviceIdIn: string, idIn: string) {
        this.name = name;
        this.deviceId = deviceIdIn
        this.internalId = idIn;
        this.connected=true;
    }
}

// export enum LootType {
//     nft,
//     gem,
//     cash,
//     medKit,
//     clip,
//     godfather,
//     empty
// }

export type LootType = "nft" | "gem" | "cash" | "medkit" | "clip" | "godfather" | "empty";

export class Loot {
    public type: LootType;
    public value = 0;

    public constructor (typeVal: LootType, cashVal: number = 0) {
        this.type = typeVal;
        this.value = cashVal;
    }
}
// export const __forceRuntime = true;