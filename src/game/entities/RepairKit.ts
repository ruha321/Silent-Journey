import { type Vec2, v } from "../../core/vec2";
import { Entity } from "./Entity";

export class RepairKit extends Entity {
    constructor(pos: Vec2) {
        super(pos, v(0, 0), 10);
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this.dead) return;
        ctx.save();
        ctx.translate(this.pos.x, this.pos.y);

        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, Math.PI * 2);
        ctx.strokeStyle = "#666";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // ＋マーク（修理っぽさ）
        ctx.beginPath();
        ctx.moveTo(-4, 0);
        ctx.lineTo(4, 0);
        ctx.moveTo(0, -4);
        ctx.lineTo(0, 4);
        ctx.strokeStyle = "#888";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}
