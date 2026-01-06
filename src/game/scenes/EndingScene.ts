import { type Scene } from "./Scene";
import { Game } from "../Game";

export class EndingScene implements Scene {
    private t = 0;

    constructor(private game: Game) {}

    update(dt: number): void {
        this.t += dt;
    }

    draw(): void {
        const ctx = this.game.ctx;
        const { w, h } = this.game.view;

        ctx.clearRect(0, 0, w, h);
        this.game.drawStars();

        // フェードアウト
        const a = Math.min(1, Math.max(0, (this.t - 1.0) / 2.0));
        ctx.fillStyle = `rgba(0,0,0,${a})`;
        ctx.fillRect(0, 0, w, h);

        // 最小の余韻（消してもOK）
        if (this.t < 1.0) {
            ctx.fillStyle = "#777";
            ctx.font = "14px sans-serif";
            ctx.fillText("...", 16, h - 20);
        }
    }

    isDone(): boolean {
        return false;
    }
    nextSceneKey(): string | null {
        return null;
    }
}
