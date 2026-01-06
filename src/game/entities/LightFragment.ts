import { type Vec2, v } from "../../core/vec2";
import { Entity } from "./Entity";

export class LightFragment extends Entity {
    constructor(pos: Vec2) {
        super(pos, v(0, 0), 7);
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this.dead) return;
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = "#ffffff";
        ctx.fill();
    }
}
