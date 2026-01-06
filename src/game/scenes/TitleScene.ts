import { type Scene } from "./Scene";
import { Game } from "../Game";

export class TitleScene implements Scene {
    private done = false;
    private next: string | null = null;

    constructor(private game: Game) {}

    update(): void {
        if (
            this.game.input.consumePressed("Space") ||
            this.game.input.consumePressed("Enter")
        ) {
            this.done = true;
            this.next = "planet";
        }
    }

    draw(): void {
        const ctx = this.game.ctx;
        const { w, h } = this.game.view;

        ctx.clearRect(0, 0, w, h);
        this.game.drawStars();

        ctx.fillStyle = "#ddd";
        ctx.font = "28px sans-serif";
        ctx.fillText("Silent Journey", 24, 56);

        ctx.fillStyle = "#888";
        ctx.font = "14px sans-serif";
        ctx.fillText("Press Space / Enter", 24, 86);
        ctx.fillText("Move: WASD or Arrow Keys", 24, 106);
    }

    isDone(): boolean {
        return this.done;
    }
    nextSceneKey(): string | null {
        return this.next;
    }
}
