import * as common from "./common.mjs"
import type { Hello, Player } from "./common.mjs"

(async () => {
  const gameCanvas = document.getElementById("game") as HTMLCanvasElement | null;
  if (gameCanvas === null) throw new Error("No element with id `game`");
  gameCanvas.width = common.WORLD_WIDTH;
  gameCanvas.height = common.WORLD_HEIGHT;
  const ctx = gameCanvas.getContext("2d");
  if (ctx === null) throw new Error("2d canvas is not supported.");

  const ws = new WebSocket("ws://localhost:6970");
  let myId: undefined | number = undefined;
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
    if (myId === undefined) {
      const message = JSON.parse(event.data);
      if (common.isHello(message)) {
        myId = message.id;
        console.log(`Connected as Player:${myId}`);
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
          moving: common.DEFAULT_MOVING,
        });
      } else if (common.isPlayerLeft(message)) {
        players.delete(message.id);
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

    ctx.fillStyle = "grey";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "red";
    players.forEach((player) => {
      ctx.fillRect(player.x, player.y, common.PLAYER_SIZE, common.PLAYER_SIZE);
    });

    window.requestAnimationFrame(frame);
  };
  window.requestAnimationFrame((timestamp) => {
    previousTimestamp = timestamp;
    window.requestAnimationFrame(frame);
  })
})();
