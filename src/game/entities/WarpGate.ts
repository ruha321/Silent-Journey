type GateP = { a: number; r: number; w: number; life: number; seed: number };

export class WarpGate {
    x: number;
    y: number;
    r: number;

    private state: "hidden" | "spawning" | "idle" | "consuming" | "done" =
        "hidden";
    private t = 0;
    private particles: GateP[] = [];

    constructor(x: number, y: number, r = 56) {
        this.x = x;
        this.y = y;
        this.r = r;
    }

    spawn(): void {
        if (this.state !== "hidden") return;
        this.state = "spawning";
        this.t = 0;
        // 粒子：外側から輪へ収束
        const n = 90;
        this.particles = Array.from({ length: n }, (_, i) => ({
            a: (i / n) * Math.PI * 2,
            r: this.r * (1.8 + Math.random() * 2.2),
            w: 1.6 + Math.random() * 2.2,
            life: 0.6 + Math.random() * 0.8,
            seed: Math.random() * 1000,
        }));
    }

    getRadius(): number {
        return this.r * 1.75;
    }

    beginConsume() {
        if (this.state === "idle") {
            this.state = "consuming";
            this.t = 0;
        }
    }

    isActive(): boolean {
        return this.state === "idle";
    }
    isDone(): boolean {
        return this.state === "done";
    }
    isVisible(): boolean {
        return this.state !== "hidden";
    }

    update(dt: number) {
        if (this.state === "hidden" || this.state === "done") return;
        this.t += dt;

        if (this.state === "spawning") {
            // 粒子が輪に吸い寄せられる
            for (const p of this.particles) {
                p.r += (this.r - p.r) * (p.w * dt);
                p.a += (0.6 + 0.4 * Math.sin(p.seed + this.t)) * dt;
                p.life = Math.max(0, p.life - dt * 0.35);
            }
            if (this.t >= 1.2) {
                this.state = "idle";
                this.t = 0;
            }
        } else if (this.state === "consuming") {
            // 輪が消えていく
            if (this.t >= 1.8) {
                this.state = "done";
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D, sx: number, sy: number) {
        if (!this.isVisible() || this.isDone()) return;

        const time = performance.now() / 1000;
        const pulse = 1 + 0.06 * Math.sin(time * 2.1);

        // 状態に応じた透明度
        const spawnA =
            this.state === "spawning" ? Math.min(1, this.t / 1.0) : 1;
        const consumeA =
            this.state === "consuming" ? Math.max(0, 1 - this.t / 1.2) : 1;
        const a = spawnA * consumeA;

        ctx.save();
        ctx.translate(sx, sy);

        // 粒子（spawning時のみ強め）
        if (this.state === "spawning") {
            ctx.globalAlpha = 0.9 * spawnA;
            for (const p of this.particles) {
                const rr = p.r * (0.92 + 0.08 * Math.sin(p.seed + time * 2));
                const px = Math.cos(p.a) * rr;
                const py = Math.sin(p.a) * rr;

                // 粒子の薄いハロー
                ctx.globalAlpha = 0.1 * spawnA;
                ctx.beginPath();
                ctx.arc(px, py, 10, 0, Math.PI * 2);
                ctx.fillStyle = "#b56bff";
                ctx.fill();

                // コア
                ctx.globalAlpha = 0.9 * spawnA;
                ctx.beginPath();
                ctx.arc(px, py, 2.2, 0, Math.PI * 2);
                ctx.fillStyle = "#ffffff";
                ctx.fill();
            }
        }

        // 外側のハロー（紫）
        ctx.globalAlpha = 0.16 * a;
        ctx.beginPath();
        ctx.arc(0, 0, this.r * 1.75 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = "#c79bff";
        ctx.fill();

        // メインリング
        ctx.globalAlpha = 0.95 * a;
        ctx.lineWidth = 8;
        ctx.strokeStyle = "#ead7ff";
        ctx.beginPath();
        ctx.arc(0, 0, this.r * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // 内側リング
        ctx.globalAlpha = 0.35 * a;
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#b56bff";
        ctx.beginPath();
        ctx.arc(0, 0, this.r * 0.72 * pulse, 0, Math.PI * 2);
        ctx.stroke();

        // 回転弧
        ctx.globalAlpha = 0.85 * a;
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#ffffff";
        const rot = time * 0.9;
        for (let i = 0; i < 3; i++) {
            const a0 = rot + i * 2.1;
            ctx.beginPath();
            ctx.arc(0, 0, this.r * pulse, a0, a0 + 0.8);
            ctx.stroke();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }
}
