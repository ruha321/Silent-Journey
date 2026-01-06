import { type Vec2, v, wrap, clamp } from "../../core/vec2";
import { Entity } from "./Entity";

export class RepairKit extends Entity {
    private t = 0;
    private phase = Math.random() * 1000;
    private rot0 = Math.random() * Math.PI * 2;
    private rotSpeed = (Math.random() * 2 - 1) * 0.7;

    constructor(pos: Vec2) {
        // ★デブリ最小より少し小さめ
        const vel = v(
            (Math.random() * 2 - 1) * 22,
            (Math.random() * 2 - 1) * 14
        );
        super(pos, vel, 9);
    }

    override update(dt: number, worldW: number, worldH: number): void {
        if (this.dead) return;

        this.t += dt;

        // ふわっと漂う（速度を抑える）
        const k = Math.max(0, 1 - 0.12 * dt);
        this.vel.x *= k;
        this.vel.y *= k;

        // ちょい上下に揺らす
        this.vel.y += Math.sin(this.phase + this.t * 1.1) * 6 * dt;

        super.update(dt);

        // ラップ / 端回避
        if (worldW > 0) this.pos.x = wrap(this.pos.x, worldW);
        if (worldH > 0) this.pos.y = clamp(this.pos.y, 24, worldH - 24);
    }

    draw(ctx: CanvasRenderingContext2D, sx?: number, sy?: number): void {
        if (this.dead) return;
        const x = sx ?? this.pos.x;
        const y = sy ?? this.pos.y;

        const t = performance.now() / 1000;
        const rot = this.rot0 + (this.t + t) * this.rotSpeed;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);

        // 薄いハロー（目立たせる、でもデブリより控えめ）
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fillStyle = "#bff7ff";
        ctx.fill();

        // 外周リング
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
        ctx.strokeStyle = "#8fd9ff";
        ctx.lineWidth = 2;
        ctx.stroke();

        // ＋マーク（修理っぽさ）
        ctx.beginPath();
        ctx.moveTo(-4.5, 0);
        ctx.lineTo(4.5, 0);
        ctx.moveTo(0, -4.5);
        ctx.lineTo(0, 4.5);
        ctx.strokeStyle = "#e7fbff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
        ctx.globalAlpha = 1;
    }
}
