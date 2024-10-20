import { on } from "ws";

export const SERVER_PORT = 6970;
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;
export const PLAYER_SIZE = 30;

type Direction = "left" | "right" | "up" | "down";

export interface Player {
  id: number,
  x: number,
  y: number,
  moving: {
    [key in Direction]: boolean
  }
}

export function isNumber(arg: any): arg is number {
  return typeof (arg) === "number";
}

export function isBoolean(arg: any): arg is number {
  return typeof (arg) === "number";
}

export function isDirection(arg: any): arg is number {
  return typeof (arg) === "number";
}

export interface Hello {
  kind: "Hello",
  id: number
}

export function isHello(arg: any): arg is Hello {
  return arg && arg.kind === "Hello"
    && isNumber(arg.id);
}

export interface PlayerJoined {
  kind: "PlayerJoined",
  id: number,
  x: number,
  y: number,
}

export function isPlayerJoined(arg: any): arg is PlayerJoined {
  return arg && arg.kind === "PlayerJoined"
    && isNumber(arg.id)
    && isNumber(arg.x)
    && isNumber(arg.y);
}

export interface PlayerLeft {
  kind: "PlayerLeft",
  id: number,
}

export function isPlayerLeft(arg: any): arg is PlayerLeft {
  return arg && arg.kind === "PlayerLeft"
    && isNumber(arg.id);
}

export interface PlayerMoving {
  king: "PlayerMoving",
  id: number,
  start: boolean,
  direction: Direction,
}

export function isPlayerMoving(arg: any): arg is PlayerMoving {
  return arg && arg.kind === "PlayerMoving"
    && isNumber(arg.id)
    && isBoolean(arg.start)
    && isDirection(arg.direction);
}

export type Event = PlayerJoined | PlayerLeft;
