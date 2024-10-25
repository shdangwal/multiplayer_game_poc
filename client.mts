import * as common from "./common.mjs"
import type { Direction, Player, AmmaMoving } from "./common.mjs"

const DIRECTION_KEYS: { [key: string]: Direction } = {
  "ArrowLeft": "left",
  "ArrowRight": "right",
  "ArrowUp": "up",
  "ArrowDown": "down",
  "KeyA": "left",
  "KeyD": "right",
  "KeyW": "up",
  "KeyS": "down",
};

(async () => {
  const gameCanvas = document.getElementById("game") as HTMLCanvasElement | null;
  if (gameCanvas === null) throw new Error("No element with id `game`");
  gameCanvas.width = common.WORLD_WIDTH;
  gameCanvas.height = common.WORLD_HEIGHT;
  const ctx = gameCanvas.getContext("2d");
  if (ctx === null) throw new Error("2d canvas is not supported.");

  const ws = new WebSocket(`ws://${window.location.hostname}:${common.SERVER_PORT}`);
  let me: undefined | Player = undefined;
  const players = new Map<number, Player>();
  ws.addEventListener("close", (event) => {
    console.log("WebSocket Close: ", event);
  });
  ws.addEventListener("open", (event) => {
    console.log("WebSocket Open: ", event);
  });
  ws.addEventListener("errro", (event) => {
    console.log("WebSocket ERROR: ", event);
  });
  ws.addEventListener("message", (event) => {
    if (me === undefined) {
      const message = JSON.parse(event.data);
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
      const message = JSON.parse(event.data);
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

  let previousTimestamp = 0;
  const frame = (timestamp: number) => {
    const deltaTime = (timestamp - previousTimestamp) / 1000;
    previousTimestamp = timestamp;

    ctx.fillStyle = "#282828";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    players.forEach((player) => {
      if (me !== undefined) {
        common.updatePlayer(player, deltaTime);
        ctx.fillStyle = player.style;
        ctx.fillRect(player.x, player.y, common.PLAYER_SIZE, common.PLAYER_SIZE);
        if (me.id === player.id) {
          ctx.strokeStyle = "#fefefe";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.strokeRect(player.x, player.y, common.PLAYER_SIZE, common.PLAYER_SIZE);
          ctx.stroke();
        }
      }
    });

    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame((timestamp) => {
    previousTimestamp = timestamp;
    window.requestAnimationFrame(frame);
  })

  window.addEventListener("keydown", (e) => {
    if (me !== undefined) {
      if (!e.repeat) {
        const direction = DIRECTION_KEYS[e.code];
        if (direction !== undefined) {
          common.sendMessage<AmmaMoving>(ws, {
            kind: "AmmaMoving",
            start: true,
            direction
          });
        }
      }
    }
  });

  window.addEventListener("keyup", (e) => {
    if (me !== undefined) {
      if (!e.repeat) {
        const direction = DIRECTION_KEYS[e.code];
        if (direction !== undefined) {
          common.sendMessage<AmmaMoving>(ws, {
            kind: "AmmaMoving",
            start: false,
            direction
          });
        }
      }
    }
  });
})();
