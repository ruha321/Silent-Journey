import { type Scene } from "./Scene";
import { Game } from "../Game";

export class GameOverScene implements Scene {
    private done = false;
    private next: string | null = null;

    constructor(private game: Game) {}

    update(): void {
        if (
            this.game.input.consumePressed("KeyR") ||
            this.game.input.consumePressed("Space")
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

        ctx.fillStyle = "#999";
        ctx.font = "18px sans-serif";
        ctx.fillText("Signal lost.", 24, 64);

        ctx.fillStyle = "#666";
        ctx.font = "12px sans-serif";
        ctx.fillText("Press R / Space to retry", 24, 88);
    }

    isDone(): boolean {
        return this.done;
    }
    nextSceneKey(): string | null {
        return this.next;
    }
}
