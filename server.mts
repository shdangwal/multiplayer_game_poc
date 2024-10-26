import WebSocket, { WebSocketServer } from "ws";
import * as common from "./common.mjs";
import { PlayerMoving, PlayerJoined, PlayerLeft, Player, Event, Hello, Direction } from "./common.mjs";

const SERVER_FPS = 30;
const STATS_AVERAGE_CAPACITY = 30;

function average(xs: Array<number>): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function pushAverage(xs: Array<number>, x: number) {
  if (xs.push(x) > STATS_AVERAGE_CAPACITY) xs.shift();
}

interface Stats {
  tickCount: number,
  tickTimes: Array<number>,
  messagesSent: number,
  messagesRecieved: number,
  tickMessagesSent: Array<number>,
  tickMessgesRecieved: Array<number>,
  bytesSent: number,
  bytesRecieved: number,
  tickBytesSent: Array<number>,
  tickBytesRecieved: Array<number>,
  playersJoined: number,
  playersLeft: number,
  bogusMessages: number,
  startedAt: number,
}

const stats: Stats = {
  tickCount: 0,
  tickTimes: [],
  messagesSent: 0,
  messagesRecieved: 0,
  tickMessagesSent: [],
  tickMessgesRecieved: [],
  bytesSent: 0,
  bytesRecieved: 0,
  tickBytesSent: [],
  tickBytesRecieved: [],
  playersJoined: 0,
  playersLeft: 0,
  bogusMessages: 0,
  startedAt: performance.now(),
}

function printStats() {
  console.log("Stats");
  console.log(" Tick Count: ", stats.tickCount);
  console.log(" Average time to process a tick: ", average(stats.tickTimes));
  console.log(" Total messages sent: ", stats.messagesSent);
  console.log(" Total messages recieved: ", stats.messagesRecieved);
  console.log(" Average messages sent per tick: ", average(stats.tickMessagesSent));
  console.log(" Average messages recieved per tick: ", average(stats.tickMessgesRecieved));
  console.log(" Total bytes sent: ", stats.bytesSent);
  console.log(" Total bytes recieved: ", stats.bytesRecieved);
  console.log(" Average bytes sent per tick: ", average(stats.tickBytesSent));
  console.log(" Average bytes recieved per tick: ", average(stats.tickBytesRecieved));
  console.log(" Current player count: ", players.size);
  console.log(" Total players joined: ", stats.playersJoined);
  console.log(" Total players left: ", stats.playersLeft);
  console.log(" Total bogus messages: ", stats.bogusMessages);
  console.log(" Uptime(secs): ", (performance.now() - stats.startedAt) / 1000);
}

let eventQueue: Array<Event> = [];
let bytesRecievedWithinTick: number = 0;

function randomStyle(): string {
  return `hsl(${Math.floor(Math.random() * 360)} 80% 50%)`;
}

interface PlayerWithSocket extends Player {
  ws: WebSocket,
}

let idCounter = 0;
const players = new Map<number, PlayerWithSocket>();

const wss = new WebSocketServer({
  port: common.SERVER_PORT,
});
const joinedIds = new Set<number>();
const leftIds = new Set<number>();

wss.on("connection", (ws) => {
  const id = idCounter++;
  const x = Math.random() * (common.WORLD_WIDTH - common.PLAYER_SIZE);
  const y = Math.random() * (common.WORLD_HEIGHT - common.PLAYER_SIZE);
  const style = randomStyle();

  const player: PlayerWithSocket = {
    ws,
    id,
    x,
    y,
    style,
    moving: {
      "left": false,
      "right": false,
      "up": false,
      "down": false,
    }
  }
  players.set(id, player);
  console.log(`Player ${id} connected.`);
  eventQueue.push({
    kind: "PlayerJoined",
    id, x, y, style
  });
  stats.playersJoined += 1;
  ws.addEventListener("message", (event) => {
    stats.messagesRecieved += 1;
    stats.bytesRecieved += event.data.toString().length;
    bytesRecievedWithinTick += event.data.toString().length;
    let message;
    try {
      message = JSON.parse(event.data.toString());
    } catch (e) {
      stats.bogusMessages += 1;
      console.log(`Recieved bogus message from client ${id}: `, message);
      ws.close();
      return;
    }
    if (common.isAmmaMoving(message)) {
      eventQueue.push({
        kind: "PlayerMoving",
        id,
        x: player.x,
        y: player.y,
        start: message.start,
        direction: message.direction
      });
    } else {
      stats.bogusMessages += 1;
      console.log(`Recieved bogus message from client ${id}: `, message);
      ws.close();
    }
  });
  ws.on("close", () => {
    console.log(`Player ${id} disconnected.`);
    players.delete(id);
    eventQueue.push({
      kind: "PlayerLeft",
      id
    });
    stats.playersLeft += 1;
  });
});

function tick() {
  const beginTickTime = performance.now();
  let messagesSentCounter: number = 0;
  let bytesSentCounter: number = 0;

  joinedIds.clear()
  leftIds.clear()

  // This makes sure that if somebody joined and left within a 
  // single tick they are never handled
  for (const event of eventQueue) {
    switch (event.kind) {
      case "PlayerJoined": {
        joinedIds.add(event.id);
      } break;
      case "PlayerLeft": {
        if (!joinedIds.delete(event.id)) {
          leftIds.add(event.id);
        }
      } break;
    }
  }

  // Greeting all the joined players and notifying them about other players
  joinedIds.forEach((joinedId) => {
    const joinedPlayer = players.get(joinedId);
    if (joinedPlayer !== undefined) {
      // This should never happen, but we are handling none existing ids
      // for more robustness

      // The greeting
      bytesSentCounter += common.sendMessage<Hello>(joinedPlayer.ws, {
        kind: "Hello",
        id: joinedPlayer.id,
        x: joinedPlayer.x,
        y: joinedPlayer.y,
        style: joinedPlayer.style,
      });
      messagesSentCounter += 1;

      // Reconstructing the state of the other players
      players.forEach((otherPlayer) => {
        if (joinedId !== otherPlayer.id) {
          // Joined player should already know about themselves
          bytesSentCounter += common.sendMessage<PlayerJoined>(joinedPlayer.ws, {
            kind: "PlayerJoined",
            id: otherPlayer.id,
            x: otherPlayer.x,
            y: otherPlayer.y,
            style: otherPlayer.style,
          });
          messagesSentCounter += 1;
          let direction: Direction;
          for (direction in otherPlayer.moving) {
            if (otherPlayer.moving[direction]) {
              bytesSentCounter += common.sendMessage<PlayerMoving>(joinedPlayer.ws, {
                kind: "PlayerMoving",
                id: otherPlayer.id,
                x: otherPlayer.x,
                y: otherPlayer.y,
                start: true,
                direction
              });
              messagesSentCounter += 1;
            }
          }
        }
      });
    }
  });

  // Notifying about who joined
  joinedIds.forEach((joinedId) => {
    const joinedPlayer = players.get(joinedId);
    if (joinedPlayer !== undefined) {
      players.forEach((otherPlayer) => {
        if (joinedId !== otherPlayer.id) {
          bytesSentCounter += common.sendMessage<PlayerJoined>(otherPlayer.ws, {
            kind: "PlayerJoined",
            id: joinedPlayer.id,
            x: joinedPlayer.x,
            y: joinedPlayer.y,
            style: joinedPlayer.style,
          });
          messagesSentCounter += 1;
        }
      });
    }
  });

  //Notifying about who left
  leftIds.forEach((leftId) => {
    players.forEach((player) => {
      bytesSentCounter += common.sendMessage<PlayerLeft>(player.ws, {
        kind: "PlayerLeft",
        id: leftId,
      });
      messagesSentCounter += 1;
    });
  });

  // Notifying about the movements
  for (let event of eventQueue) {
    switch (event.kind) {
      case "PlayerMoving": {
        const player = players.get(event.id);
        if (player !== undefined) {
          player.moving[event.direction] = event.start;
          const eventString = JSON.stringify(event);
          players.forEach((player) => {
            player.ws.send(eventString);
            messagesSentCounter += 1;
          });
        }
      } break;
    }
  }

  // Simulating the world for one server tick
  players.forEach((player) => common.updatePlayer(player, 1 / SERVER_FPS));

  stats.tickCount += 1;
  pushAverage(stats.tickTimes, (performance.now() - beginTickTime) / 1000);
  stats.messagesSent += messagesSentCounter;
  pushAverage(stats.tickMessagesSent, messagesSentCounter);
  pushAverage(stats.tickMessgesRecieved, eventQueue.length);
  stats.bytesSent += bytesSentCounter;
  pushAverage(stats.tickBytesSent, bytesSentCounter);
  pushAverage(stats.tickBytesRecieved, bytesRecievedWithinTick);

  eventQueue.length = 0;

  if (stats.tickCount % SERVER_FPS) {
    printStats();
  }
  setTimeout(tick, 1000 / SERVER_FPS);
}
setTimeout(tick, 1000 / SERVER_FPS);
console.log("Listening to ws://localhost:6970");
