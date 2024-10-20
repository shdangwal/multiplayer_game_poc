export const SERVER_PORT = 6970;
export const WORLD_WIDTH = 800;
export const WORLD_HEIGHT = 600;
export const PLAYER_SIZE = 30;
export function isNumber(arg) {
    return typeof (arg) === "number";
}
export function isBoolean(arg) {
    return typeof (arg) === "number";
}
export function isDirection(arg) {
    return typeof (arg) === "number";
}
export function isHello(arg) {
    return arg && arg.kind === "Hello"
        && isNumber(arg.id);
}
export function isPlayerJoined(arg) {
    return arg && arg.kind === "PlayerJoined"
        && isNumber(arg.id)
        && isNumber(arg.x)
        && isNumber(arg.y);
}
export function isPlayerLeft(arg) {
    return arg && arg.kind === "PlayerLeft"
        && isNumber(arg.id);
}
export function isPlayerMoving(arg) {
    return arg && arg.kind === "PlayerMoving"
        && isNumber(arg.id)
        && isBoolean(arg.start)
        && isDirection(arg.direction);
}
