import { type Vec2 } from "../../core/vec2";
import { Entity } from "./Entity";

export class Debris extends Entity {
    private size: number;

    constructor(pos: Vec2, vel: Vec2, radius: number) {
        super(pos, vel, radius);
        this.size = radius;
    }

    override update(dt: number, worldW: number, worldH: number): void {
        if (this.dead) return;
        super.update(dt);
        // ラップ
        if (this.pos.x < 0) this.pos.x += worldW;
        if (this.pos.x > worldW) this.pos.x -= worldW;
        if (this.pos.y < 0) this.pos.y += worldH;
        if (this.pos.y > worldH) this.pos.y -= worldH;
    }

    override draw(
        ctx: CanvasRenderingContext2D,
        sx?: number,
        sy?: number
    ): void {
        if (this.dead) return;
        const x = sx ?? this.pos.x;
        const y = sy ?? this.pos.y;

        ctx.beginPath();
        ctx.arc(x, y, this.size, 0, Math.PI * 2);
        ctx.strokeStyle = "#555";
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
}
