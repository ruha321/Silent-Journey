import { fitCanvas } from "./core/canvas";
import { Input } from "./core/input";
import { Game } from "./game/Game";

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
if (!canvas) throw new Error("canvas#game not found");

const ctx = canvas.getContext("2d");
if (!ctx) throw new Error("2d context not available");

const input = new Input(window);
const game = new Game(canvas, ctx, input);

function frame(t: number) {
    fitCanvas(canvas, ctx!);
    game.tick(t);
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
