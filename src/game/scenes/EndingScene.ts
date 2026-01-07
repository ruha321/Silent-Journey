import { type Scene } from "./Scene";
import { clamp01 } from "../../core/vec2";
import { Game } from "../Game";

export class EndingScene implements Scene {
    private t = 0;
    private rays = Array.from({ length: 160 }, () => ({
        a: Math.random() * Math.PI * 2,
        s: 0.4 + Math.random() * 1.8,
    }));

    constructor(private game: Game) {}

    update(dt: number): void {
        this.t += dt;
    }

    draw(): void {
        const ctx = this.game.ctx;
        const { w, h } = this.game.view;

        ctx.clearRect(0, 0, w, h);
        this.game.drawStars();

        // 侵食：周り→真ん中（or 真ん中→周り） + 黒の後に白フラッシュ
        const cx = w * 0.5;
        const cy = h * 0.5;
        const R = Math.max(w, h);

        // 0..1（侵食の進み）
        const p = clamp01(this.t / 3.0);

        const BLEACH_FROM: "edge" | "center" = "center"; // ←ここ好みで切り替え

        const feather = 0.02; // 侵食の“ぼかし幅”
        const hole =
            BLEACH_FROM === "edge"
                ? (1 - p) * (R * 0.85) // 中心の“残る領域”が縮む
                : p * (R * 0.85); // 白い領域が外へ広がるための基準

        const stop = Math.max(0, Math.min(1, hole / R));
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);

        if (BLEACH_FROM === "edge") {
            // 中心は見える（透明）→ 外側が白（不透明）
            g.addColorStop(0, "rgba(255,255,255,0)");
            g.addColorStop(stop, "rgba(255,255,255,0)");
            g.addColorStop(
                Math.min(1, stop + feather),
                "rgba(255,255,255,0.98)"
            );
            g.addColorStop(1, "rgba(255,255,255,1)");
        } else {
            // 中心が白（不透明）→ 外側は見える（透明）
            g.addColorStop(0, "rgba(255,255,255,1)");
            g.addColorStop(stop, "rgba(255,255,255,0.98)");
            g.addColorStop(Math.min(1, stop + feather), "rgba(255,255,255,0)");
            g.addColorStop(1, "rgba(255,255,255,0)");
        }

        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);

        // 完全侵食後は“白を維持”して余韻（黒にはしない）
        if (p >= 1) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, w, h);
        }
    }

    isDone(): boolean {
        return false;
    }
    nextSceneKey(): string | null {
        return null;
    }
}
