import { WebSocket } from "ws";
import * as common from "./common.mjs";
import { Player, AmmaMoving } from "./common.mjs";

const ws = new WebSocket(`ws://localhost:${common.SERVER_PORT}`);
let me: Player | undefined = undefined;
const players = new Map<number, Player>();
let goalX = common.WORLD_WIDTH * 0.5;
let goalY = common.WORLD_HEIGHT * 0.5;
ws.addEventListener("message", (event) => {
  if (me === undefined) {
    const message = JSON.parse(event.data.toString());
    if (common.isHello(message)) {
      me = {
        id: message.id,
        x: message.x,
        y: message.y,
        moving: {
          "left": false,
          "right": false,
          "up": false,
          "down": false,
        },
        style: message.style,
      }
      players.set(message.id, me);
      console.log(`Connected as Player:${me.id}`, message);
    } else {
      console.log("Received bogus message from server:", message);
      ws.close();
    }
  } else {
    const message = JSON.parse(event.data.toString());
    if (common.isPlayerJoined(message)) {
      players.set(message.id, {
        id: message.id,
        x: message.x,
        y: message.y,
        moving: {
          "left": false,
          "right": false,
          "up": false,
          "down": false,
        },
        style: message.style,
      });
      common.sendMessage<AmmaMoving>(ws, {
        kind: "AmmaMoving",
        start: true,
        direction: "right",
      });
    } else if (common.isPlayerLeft(message)) {
      players.delete(message.id);
    } else if (common.isPlayerMoving(message)) {
      const player = players.get(message.id);
      if (player === undefined) {
        console.log(`Received bogus message from server. We don't know anything about player with id ${message.id} and message: ${message}`);
        ws.close();
        return;
      }
      player.moving[message.direction] = message.start;
      player.x = message.x;
      player.y = message.y;
    } else {
      console.log("Received bogus message from server:", message);
      ws.close();
    }
  }
});

