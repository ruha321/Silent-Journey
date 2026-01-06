import { type Scene } from "./Scene";
import { Game } from "../Game";
import {
    v,
    sub,
    mul,
    len2,
    dot,
    wrap,
    wrapDelta,
    clamp,
} from "../../core/vec2";
import { PlayerShip } from "../entities/PlayerShip";
import { LightFragment } from "../entities/LightFragment";
import { Debris } from "../entities/Debris";
import { RepairKit } from "../entities/RepairKit";

export type PlanetConfig = {
    worldW: number; // ★リングの周長（px）
    lights: number;
    debris: number;
    debrisSpeed: number;
    repairs?: number;
};

export class PlanetScene implements Scene {
    private done = false;
    private next: string | null = null;
    private DEBRIS_ON_HIT: "break" | "bounce" = "break"; // デブリ衝突時の挙動

    private worldW: number;
    private worldH: number;

    private player: PlayerShip;
    private lights: LightFragment[] = [];
    private debris: Debris[] = [];
    private repairs: RepairKit[] = [];

    private collected = 0;
    private total = 0;

    // カメラ（画面中心が指すワールド座標）
    private camX = 0;
    private camY = 0;

    private warpGate: { x: number; y: number; r: number } | null = null;
    private warpT = -1; // ワープ突入演出タイマー（-1: 未突入 / 0以上: 演出中）

    constructor(
        private game: Game,
        private cfg: PlanetConfig,
        private planetIndex: number
    ) {
        const { w, h } = game.view;
        this.worldW = cfg.worldW;
        this.worldH = h; // はる要望：縦は画面と同じくらい

        this.player = new PlayerShip(v(w * 0.5, h * 0.5), game.input);
        this.player.grantIFrames(1.2);

        // カメラ初期
        this.camX = this.player.pos.x;
        this.camY = h * 0.5;

        // lights
        this.total = cfg.lights;
        const yMargin = 32;
        for (let i = 0; i < cfg.lights; i++) {
            const spawnPos = this.randPosFarFromPlayer(120, yMargin);
            this.lights.push(new LightFragment(spawnPos));
        }

        // debris
        for (let i = 0; i < cfg.debris; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = cfg.debrisSpeed * (0.5 + Math.random());
            const vel = v(Math.cos(angle) * speed, Math.sin(angle) * speed);
            const r = 10 + Math.random() * 16;
            const spawnPos = this.randPosFarFromPlayer(260, 16);
            this.debris.push(new Debris(spawnPos, vel, r));
        }

        // repair kits
        const repairCount = cfg.repairs ?? 1 + (planetIndex >= 2 ? 1 : 0);
        for (let i = 0; i < repairCount; i++) {
            const spawnPos = this.randPosFarFromPlayer(200, yMargin);
            this.repairs.push(new RepairKit(spawnPos));
        }
    }

    private randPosFarFromPlayer(minDist: number, yMargin: number) {
        const min2 = minDist * minDist;
        for (let i = 0; i < 120; i++) {
            const x = Math.random() * this.worldW;
            const y = yMargin + Math.random() * (this.worldH - 2 * yMargin);

            const dx = wrapDelta(x - this.player.pos.x, this.worldW);
            const dy = y - this.player.pos.y;
            if (dx * dx + dy * dy >= min2) return v(x, y);
        }
        // 保険：右方向にずらす
        return v(
            wrap(this.player.pos.x + minDist, this.worldW),
            clamp(this.player.pos.y, yMargin, this.worldH - yMargin)
        );
    }

    private updateCamera() {
        const { w, h } = this.game.view;

        // 縦は固定（世界＝画面高）
        this.camY = h * 0.5;

        // 横はデッドゾーン追従（リングなのでwrapDeltaで相対を見る）
        const deadX = w * 0.2;
        const relX = wrapDelta(this.player.pos.x - this.camX, this.worldW);

        if (relX > deadX)
            this.camX = wrap(this.camX + (relX - deadX), this.worldW);
        else if (relX < -deadX)
            this.camX = wrap(this.camX + (relX + deadX), this.worldW);
    }

    private sx(wx: number) {
        const { w } = this.game.view;
        return w * 0.5 + wrapDelta(wx - this.camX, this.worldW);
    }
    private sy(wy: number) {
        const { h } = this.game.view;
        return h * 0.5 + (wy - this.camY);
    }

    update(dt: number): void {
        if (this.warpT >= 0) {
            this.warpT += dt;
            const fade = Math.max(0, Math.min(1, this.warpT / 1.0));
            this.player.setWarpFade(fade);

            this.updateCamera();

            if (this.warpT >= 1.1) {
                this.done = true;
                this.next = "warp";
                this.game.setWarpFrom(this.planetIndex);
            }
            return;
        }

        // const { w, h } = this.game.view;
        this.player.update(dt, this.worldW, this.worldH);

        // デブリ更新
        for (const d of this.debris) {
            if (d.dead) continue;
            d.update(dt, this.worldW, this.worldH);
            d.pos.x = wrap(d.pos.x, this.worldW);
            d.pos.y = clamp(d.pos.y, 0, this.worldH);
        }

        // 光回収
        for (const l of this.lights) {
            if (l.dead) continue;
            const dx = wrapDelta(this.player.pos.x - l.pos.x, this.worldW);
            const dy = this.player.pos.y - l.pos.y;
            const dxdy = { x: dx, y: dy };
            const d2 = len2(dxdy);
            const rr = this.player.radius + l.radius;
            if (d2 <= rr * rr) {
                l.dead = true;
                this.collected++;
                this.player.gainLight(this.collected / this.total);
            }
        }

        // ワープゲート出現
        if (!this.warpGate && this.collected >= this.total) {
            // プレイヤーの近くには出さない
            const yMargin = 32;
            this.warpGate = {
                ...(this.randPosFarFromPlayer(260, yMargin) as any),
                r: 22,
            };
        }

        // デブリ衝突
        for (const d of this.debris) {
            if (d.dead) continue;

            const dx = wrapDelta(this.player.pos.x - d.pos.x, this.worldW);
            const dy = this.player.pos.y - d.pos.y;
            const dxdy = { x: dx, y: dy };
            const d2 = len2(dxdy);
            const rr = this.player.radius + d.radius;

            if (d2 <= rr * rr) {
                // 1) 押し出し（めり込み解消）
                const dist = Math.max(0.00001, Math.sqrt(d2));
                const n = { x: dx / dist, y: dy / dist };
                const overlap = rr - dist;

                this.player.pos.x = wrap(
                    this.player.pos.x + n.x * (overlap + 0.5),
                    this.worldW
                );
                this.player.pos.y = clamp(
                    this.player.pos.y + n.y * (overlap + 0.5),
                    0,
                    this.worldH
                );

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

            const dx = wrapDelta(this.player.pos.x - r.pos.x, this.worldW);
            const dy = this.player.pos.y - r.pos.y;
            const dxdy = { x: dx, y: dy };
            const d2 = len2(dxdy);
            const rr = this.player.radius + r.radius;
            if (d2 <= rr * rr) {
                r.dead = true;
                this.player.repair(1);
            }
        }

        this.updateCamera();

        // 死亡
        if (this.player.isDestroyed()) {
            this.done = true;
            this.next = "gameover";
            return;
        }

        // ワープ処理
        if (this.warpGate && this.warpT < 0) {
            const dx = wrapDelta(
                this.player.pos.x - this.warpGate.x,
                this.worldW
            );
            const dy = this.player.pos.y - this.warpGate.y;
            const dxdy = { x: dx, y: dy };
            const d2 = len2(dxdy);
            const rr = this.player.radius + this.warpGate.r;
            if (d2 <= rr * rr) {
                this.warpT = 0;
                this.player.setControlsEnabled(false);
                this.player.vel.x = 0;
                this.player.vel.y = 0;
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

        for (const d of this.debris)
            d.draw(ctx, this.sx(d.pos.x), this.sy(d.pos.y));
        for (const l of this.lights)
            l.draw(ctx, this.sx(l.pos.x), this.sy(l.pos.y));
        for (const r of this.repairs)
            r.draw(ctx, this.sx(r.pos.x), this.sy(r.pos.y));
        this.player.draw(
            ctx,
            this.sx(this.player.pos.x),
            this.sy(this.player.pos.y)
        );

        // ワープゲートの描画
        if (this.warpGate) {
            const a = this.warpT >= 0 ? 1 - Math.min(1, this.warpT / 1.0) : 1;
            ctx.globalAlpha = 0.4 + 0.6 * a;

            const x = this.sx(this.warpGate.x);
            const y = this.sy(this.warpGate.y);

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, this.warpGate.r, 0, Math.PI * 2);
            ctx.strokeStyle = "#777";
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
            ctx.globalAlpha = 1;
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
