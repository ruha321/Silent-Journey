import { type Scene } from "./Scene";
import { Game } from "../Game";

export class WarpScene implements Scene {
    private t = 0;
    private done = false;
    private next: string | null = null;

    constructor(private game: Game) {}

    update(dt: number): void {
        this.t += dt;
        if (this.t >= 1.6) {
            this.done = true;
            // 次の惑星 or エンディング
            this.next = this.game.hasNextPlanet() ? "planet" : "ending";
        }
    }

    draw(): void {
        const ctx = this.game.ctx;
        const { w, h } = this.game.view;

        ctx.clearRect(0, 0, w, h);
        this.game.drawStars();

        // 亀裂っぽいノイズ線（超簡易）
        const p = Math.min(1, this.t / 1.6);
        ctx.globalAlpha = 0.9;
        ctx.strokeStyle = "#444";
        ctx.lineWidth = 1;

        const lines = Math.floor(20 + p * 120);
        for (let i = 0; i < lines; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + (Math.random() - 0.5) * 80,
                y + (Math.random() - 0.5) * 80
            );
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    isDone(): boolean {
        return this.done;
    }
    nextSceneKey(): string | null {
        return this.next;
    }
}
