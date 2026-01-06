import { type Vec2 } from "../../core/vec2";
import { Entity } from "./Entity";

export class Debris extends Entity {
    private size: number;
    private kind: "chunk" | "shard" | "spike";
    private hue: number;
    private rot0: number;
    private rotSpeed: number;
    private jag: number[];

    constructor(pos: Vec2, vel: Vec2, radius: number) {
        super(pos, vel, radius);
        this.size = radius;
        const kinds: Debris["kind"][] = ["chunk", "shard", "spike"];
        this.kind = kinds[Math.floor(Math.random() * kinds.length)];

        // ゲート(紫)と被らない色域を中心に（赤/橙/青緑/青）
        const hues = [10, 25, 190, 210];
        this.hue = hues[Math.floor(Math.random() * hues.length)];

        this.rot0 = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() * 2 - 1) * 0.9; // -0.9..0.9

        // いびつポリゴン用
        this.jag = Array.from({ length: 7 }, () => 0.65 + Math.random() * 0.6);
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

        const t = performance.now() / 1000;
        const ang = this.rot0 + t * this.rotSpeed;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(ang);

        // うっすら危険オーラ（主張）
        ctx.globalAlpha = 0.1;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${this.hue} 90% 55%)`;
        ctx.fill();

        // 本体（暗めだけど色が乗る）
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = `hsl(${this.hue} 70% 16%)`;

        if (this.kind === "chunk") {
            ctx.beginPath();
            for (let i = 0; i < this.jag.length; i++) {
                const a = (i / this.jag.length) * Math.PI * 2;
                const r = this.radius * this.jag[i];
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        } else if (this.kind === "shard") {
            ctx.beginPath();
            ctx.moveTo(this.radius * 1.15, 0);
            ctx.lineTo(-this.radius * 0.9, this.radius * 0.55);
            ctx.lineTo(-this.radius * 0.65, -this.radius * 0.55);
            ctx.closePath();
            ctx.fill();
        } else {
            // spike
            ctx.beginPath();
            const spikes = 9;
            for (let i = 0; i < spikes * 2; i++) {
                const a = (i / (spikes * 2)) * Math.PI * 2;
                const r = i % 2 === 0 ? this.radius * 1.05 : this.radius * 0.55;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }

        // 輪郭（明るい色＋破線）
        ctx.globalAlpha = 0.95;
        ctx.setLineDash([6, 5]);
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = `hsl(${this.hue} 95% 65%)`;
        ctx.stroke();
        ctx.setLineDash([]);

        // ひび割れっぽい線（アクセント）
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = `hsl(${this.hue} 90% 75%)`;
        ctx.beginPath();
        ctx.moveTo(-this.radius * 0.2, -this.radius * 0.6);
        ctx.lineTo(this.radius * 0.7, this.radius * 0.1);
        ctx.lineTo(-this.radius * 0.1, this.radius * 0.6);
        ctx.stroke();

        ctx.restore();
        ctx.globalAlpha = 1;
    }
}
