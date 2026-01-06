import { type Vec2, v } from "../../core/vec2";
import { Entity } from "./Entity";

export class LightFragment extends Entity {
    constructor(pos: Vec2) {
        super(pos, v(0, 0), 7);
    }

    draw(ctx: CanvasRenderingContext2D, sx?: number, sy?: number): void {
        if (this.dead) return;
        const x = sx ?? this.pos.x;
        // 見た目だけ：ふわっと漂う
        const t = performance.now() / 1000;
        const wob =
            Math.sin(t * 0.9 + this.pos.x * 0.01 + this.pos.y * 0.02) * 2.0;
        const y = (sy ?? this.pos.y) + wob;

        // ちょい明滅（星と同化しない）
        const tw = 0.85 + 0.15 * Math.sin(t * 5 + this.pos.x * 0.02);

        ctx.save();

        // ハロー（薄い光）
        ctx.globalAlpha = 0.1 * tw;
        ctx.beginPath();
        ctx.arc(x, y, 12, 0, Math.PI * 2);
        ctx.fillStyle = "#dff1ff";
        ctx.fill();

        // コア
        ctx.globalAlpha = 1;
        ctx.beginPath();
        ctx.arc(x, y, 2.4, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();

        ctx.restore();
    }
}
