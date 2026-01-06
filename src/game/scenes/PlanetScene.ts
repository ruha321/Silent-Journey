import { type Scene } from "./Scene";
import { Game } from "../Game";
import { v, sub, len2, norm, mul, add, dot } from "../../core/vec2";
import { PlayerShip } from "../entities/PlayerShip";
import { LightFragment } from "../entities/LightFragment";
import { Debris } from "../entities/Debris";
import { RepairKit } from "../entities/RepairKit";

type PlanetConfig = {
    lights: number;
    debris: number;
    debrisSpeed: number;
};

export class PlanetScene implements Scene {
    private done = false;
    private next: string | null = null;
    private DEBRIS_ON_HIT: "break" | "bounce" = "break"; // デブリ衝突時の挙動

    private player: PlayerShip;
    private lights: LightFragment[] = [];
    private debris: Debris[] = [];
    private repairs: RepairKit[] = [];

    private collected = 0;
    private total = 0;

    private warpGate: { x: number; y: number; r: number } | null = null;
    private warpSpawnAt: number;

    constructor(
        private game: Game,
        private cfg: PlanetConfig,
        private planetIndex: number
    ) {
        const { w, h } = game.view;
        const { lights, debris, debrisSpeed } = cfg;
        this.player = new PlayerShip(v(w * 0.5, h * 0.5), game.input);
        this.player.grantIFrames(1.2);

        // lights
        this.total = lights;
        for (let i = 0; i < lights; i++) {
            const safe = 220; // スタート安全距離
            const spawnPos = this.randomFarPos(w, h, this.player.pos, safe);
            this.lights.push(
                new LightFragment({ x: spawnPos.x, y: spawnPos.y })
            );
        }

        // debris
        for (let i = 0; i < debris; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = debrisSpeed * (0.5 + Math.random());
            const vel = v(Math.cos(angle) * speed, Math.sin(angle) * speed);
            const r = 10 + Math.random() * 16;
            const safe = 220; // スタート安全距離
            const spawnPos = this.randomFarPos(w, h, this.player.pos, safe, r);
            this.debris.push(
                new Debris({ x: spawnPos.x, y: spawnPos.y }, vel, r)
            );
        }

        // repair kits
        const repairCount = 1 + (planetIndex >= 2 ? 1 : 0);
        for (let i = 0; i < repairCount; i++) {
            const safe = 220; // スタート安全距離
            const spawnPos = this.randomFarPos(w, h, this.player.pos, safe);
            this.repairs.push(new RepairKit({ x: spawnPos.x, y: spawnPos.y }));
        }

        this.warpSpawnAt = Math.max(3, Math.floor(this.total * 0.55)); // 先にワープ出す閾値
    }

    private randomFarPos(
        w: number,
        h: number,
        from: { x: number; y: number },
        minDist: number,
        r = 18
    ) {
        const min2 = minDist * minDist;
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * w;
            const y = Math.random() * h;
            const dx = x - from.x;
            const dy = y - from.y;
            if (dx * dx + dy * dy >= min2) return { x, y, r };
        }
        return { x: (from.x + minDist) % w, y: (from.y + minDist) % h, r };
    }

    update(dt: number): void {
        const { w, h } = this.game.view;
        this.player.update(dt, w, h);

        for (const d of this.debris) d.update(dt, w, h);

        // 光回収（= チェックポイント）
        for (const l of this.lights) {
            if (l.dead) continue;
            const d2 = len2(sub(this.player.pos, l.pos));
            const rr = (this.player.radius + l.radius) ** 2;
            if (d2 <= rr) {
                l.dead = true;
                this.collected++;
                this.player.gainLight(this.collected / this.total);
            }
        }

        if (!this.warpGate && this.collected >= this.total) {
            // プレイヤーの近くには出さない
            const min = 180;
            this.warpGate = this.randomFarPos(w, h, this.player.pos, min, 18);
        }

        // デブリ衝突
        for (const d of this.debris) {
            if (d.dead) continue;

            const delta = sub(this.player.pos, d.pos);
            const rr = this.player.radius + d.radius;
            const d2 = len2(delta);

            if (d2 <= rr * rr) {
                // 1) 押し出し（めり込み解消）
                const dist = Math.sqrt(Math.max(0.00001, d2));
                const n = { x: delta.x / dist, y: delta.y / dist };
                const overlap = rr - dist;
                this.player.pos = add(this.player.pos, mul(n, overlap + 0.5));

                // 2) ダメージはクールダウン中は入れない
                const damaged = this.player.takeHit();

                // 3) 破壊 or 反射（跳ねる）
                if (damaged) {
                    if (this.DEBRIS_ON_HIT === "break") {
                        d.dead = true;
                    } else {
                        // 反射：v' = v - 2(v·n)n
                        const pv = this.player.vel;
                        const pvn = dot(pv, n);
                        this.player.vel = sub(pv, mul(n, 2 * pvn));

                        const dv = d.vel;
                        const dvn = dot(dv, n);
                        d.vel = sub(dv, mul(n, 2 * dvn));
                    }
                }
            }
        }
        this.debris = this.debris.filter((d) => !d.dead);

        // 修理アイテム回収
        for (const r of this.repairs) {
            if (r.dead) continue;
            const d2 = len2(sub(this.player.pos, r.pos));
            const rr = (this.player.radius + r.radius) ** 2;
            if (d2 <= rr) {
                r.dead = true;
                this.player.repair(1);
            }
        }

        // 死亡
        if (this.player.isDestroyed()) {
            this.done = true;
            this.next = "gameover";
            return;
        }

        // ワープ処理
        if (this.warpGate) {
            const d2 = len2(sub(this.player.pos, this.warpGate));
            const rr = (this.player.radius + this.warpGate.r) ** 2;
            if (d2 <= rr) {
                this.done = true;
                this.next = "warp";
                this.game.setWarpFrom(this.planetIndex);
                return;
            }
        }

        // デバッグ用：Rで即リスタート（消してOK）
        if (this.game.input.consumePressed("KeyR")) {
            this.done = true;
            this.next = "planet";
        }
    }

    draw(): void {
        const ctx = this.game.ctx;
        const { w, h } = this.game.view;

        ctx.clearRect(0, 0, w, h);
        this.game.drawStars();

        for (const d of this.debris) d.draw(ctx);
        for (const l of this.lights) l.draw(ctx);
        for (const r of this.repairs) r.draw(ctx);
        this.player.draw(ctx);

        if (this.warpGate) {
            ctx.beginPath();
            ctx.arc(
                this.warpGate.x,
                this.warpGate.y,
                this.warpGate.r,
                0,
                Math.PI * 2
            );
            ctx.strokeStyle = "#777";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // デバッグ用テキスト
        ctx.fillStyle = "#666";
        ctx.font = "12px sans-serif";
        ctx.fillText(
            `Planet ${this.planetIndex + 1}  Light ${this.collected}/${
                this.total
            }`,
            12,
            18
        );
    }

    isDone(): boolean {
        return this.done;
    }
    nextSceneKey(): string | null {
        return this.next;
    }
}
