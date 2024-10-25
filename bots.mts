import { WebSocket } from "ws";
import * as common from "./common.mjs";

const ws = new WebSocket(`ws://localhost:${common.SERVER_PORT}`);

