export interface ServerToClientEvents {
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
}

export interface ClientToServerEvents {
    createRoom: (classic: boolean) => void;
    joinRoom: (room: string, deviceId: string, playerId: string) => void;
    requestPlayerArray: (room: string) => void;
    sendName: (name: string, id: number, room: string) => void;
    triggerStartGame: (room: string) => void;
    triggerRestartGame: (room: string) => void;
    requestInitialState: (room: string, id: number) => void;
    requestGameState: (room: string) => void;
    joinPlayerArray: (room:string, deviceId: string, playerId: string) => void;
    socketDisconnected: (id: number, room: string) => void;
    requestRoom: (room: string) => void;
    requestRemovePlayer: (room: string, index: number) => void;
    joinDisplaySocket: (room: string, deviceId: string, playerId: string) => void;
    sendChoice: (room: string, id: number, index: number) => void;
    sendVote: (room: string, id:number, index: number) => void;
    sendGameTypeDecision: (room: string, type: GameType) => void;
    scoringAnimationOver: (room: string) => void;
    lockInVote: (room: string, id: number) => void;
    revealOver: (room: string) => void;
    triggerEndGame: (room: string) => void;
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
    endTime: number;
}

export interface IDisplayFunction {
    (room: string): void;
}

export type Phase = "choosing" | "answering" | "voting" | "reveal" | "scoring" | "gameover";

export type GameType = "hands" | "numbers" | "point";

export class Player {
    public deviceId: string;
    public internalId: string;
    public name: string = "";
    public connected: boolean;
    public completedPhase = false;
    public prevScore = 0;
    public totalScore = 0;

    public constructor(name: string, deviceIdIn: string, idIn: string) {
        this.name = name;
        this.deviceId = deviceIdIn
        this.internalId = idIn;
        this.connected=true;
    }
}