import WebSocket, { WebSocketServer } from "ws";
import * as common from "./common.mjs";
import { PlayerJoined, Player, Event } from "./common.mjs";

const SERVER_FPS = 30;

let eventQueue: Array<Event> = [];
interface PlayerWithSocket extends Player {
  ws: WebSocket,
}

let idCounter = 0;
const players = new Map<number, PlayerWithSocket>();

const wss = new WebSocketServer({
  port: common.SERVER_PORT,
});

wss.on("connection", (ws) => {
  const id = idCounter++;
  const x = Math.random() * common.WORLD_WIDTH;
  const y = Math.random() * common.WORLD_HEIGHT;

  const player: PlayerWithSocket = {
    ws,
    id,
    x,
    y,
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
    id, x, y,
  });
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data.toString());
    if (common.isPlayerMoving(message)) {
      if (message.id !== id) {
        console.log(`Player ${id} tried to cheat by sending message ${message}`);
        ws.close();
      }
      eventQueue.push(message);
    } else {
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
  });
});

function tick() {
  for (let event of eventQueue) {
    switch (event.kind) {
      case "PlayerJoined": {
        const joinedPlayer = players.get(event.id);
        if (joinedPlayer === undefined) continue;
        joinedPlayer.ws.send(JSON.stringify({
          kind: "Hello",
          id: joinedPlayer.id,
        }));
        const eventString = JSON.stringify(event);
        players.forEach((otherPlayer) => {
          joinedPlayer.ws.send(JSON.stringify({
            kind: "PlayerJoined",
            id: otherPlayer.id,
            x: otherPlayer.x,
            y: otherPlayer.y,
          }));
          if (otherPlayer.id !== joinedPlayer.id) {
            otherPlayer.ws.send(eventString);
          }
        });
      } break;
      case "PlayerLeft": {
        const eventString = JSON.stringify(event);
        players.forEach((player) => player.ws.send(eventString));
      } break;
      case "PlayerMoving": {
        const player = players.get(event.id);
        if (player === undefined) continue;
        player.moving[event.direction] = event.start;
        const eventString = JSON.stringify(event);
        players.forEach((player) => player.ws.send(eventString));
      } break;
    }
  }
  eventQueue.length = 0;
  setTimeout(tick, 1000 / SERVER_FPS);
}
setTimeout(tick, 1000 / SERVER_FPS);
console.log("Listening to ws://localhost:6970");
