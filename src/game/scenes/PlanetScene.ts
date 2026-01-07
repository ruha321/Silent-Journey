import { type Scene } from "./Scene";
import { Game } from "../Game";
import {
    v,
    sub,
    mul,
    len2,
    len,
    dot,
    wrap,
    wrapDelta,
    clamp,
} from "../../core/vec2";
import { PlayerShip } from "../entities/PlayerShip";
import { LightFragment } from "../entities/LightFragment";
import { Debris } from "../entities/Debris";
import { RepairKit } from "../entities/RepairKit";
import { WarpGate } from "../entities/WarpGate";

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

    private warpGate: WarpGate | null = null;
    // ワープ演出用（視界判定＆派手演出の素材）
    private warpRays: { a: number; s: number }[] = [];
    private warpT = -1; // ワープ突入演出タイマー（-1: 未突入 / 0以上: 演出中）
    private deathT = -1; // ゲームオーバー突入演出 (-1: 未突入)
    // ゲート出現の“気づき”演出
    private gatePingT = -1; // 0..:発動中

    constructor(
        private game: Game,
        private cfg: PlanetConfig,
        private planetIndex: number
    ) {
        const { h } = game.view;
        this.worldW = cfg.worldW;
        this.worldH = h;

        this.player = new PlayerShip(v(this.worldW * 0.5, h * 0.5), game.input);
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

    // （追加）ゲートが“しっかり画面内”に入った判定（円周がだいたい収まる）
    private gateFullyInView(g: WarpGate, pad = 10): boolean {
        const { w, h } = this.game.view;
        const sx = this.sx(g.x);
        const sy = this.sy(g.y);

        const m = g.getRadius() + pad; // 半径＋少し余裕
        return sx > m && sx < w - m && sy > -m && sy < h + m;
    }

    private inView(wx: number, wy: number, margin = 120): boolean {
        const { w, h } = this.game.view;
        const sx = this.sx(wx);
        const sy = this.sy(wy);
        return (
            sx > -margin && sx < w + margin && sy > -margin && sy < h + margin
        );
    }

    update(dt: number): void {
        // ---- ゲームオーバー突入演出 ----
        if (this.deathT >= 0) {
            this.deathT += dt;

            const f = Math.max(0, Math.min(1, this.deathT / 0.9));
            this.player.setWarpFade(f);
            this.updateCamera();

            if (this.deathT >= 1.1) {
                this.done = true;
                this.next = "gameover";
            }
            return;
        }

        // ---- ワープ突入演出 ----
        if (this.warpT >= 0) {
            this.warpT += dt;

            this.warpGate?.update(dt);

            // 船体の光だけ消える（余韻長め）
            const fade = Math.max(0, Math.min(1, this.warpT / 1.2));
            this.player.setWarpFade(fade);
            this.updateCamera();

            if (this.warpT >= 3.8) {
                this.done = true;
                this.next = "warp";
                this.game.setWarpFrom(this.planetIndex);
            }
            return;
        }
        this.player.update(dt, this.worldW, this.worldH);

        // デブリ更新
        for (const d of this.debris) {
            if (d.dead) continue;
            d.update(dt, this.worldW, this.worldH);
            d.pos.x = wrap(d.pos.x, this.worldW);
            d.pos.y = clamp(d.pos.y, 0, this.worldH);
        }

        // 修理キットも漂わせる（見た目のため）
        for (const r of this.repairs) {
            if (r.dead) continue;
            r.update(dt, this.worldW, this.worldH);
            r.pos.x = wrap(r.pos.x, this.worldW);
            r.pos.y = clamp(r.pos.y, 0, this.worldH);
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
            const p = this.randPosFarFromPlayer(260, yMargin) as any;
            this.warpGate = new WarpGate(p.x, p.y, 56);
        }

        // ゲート更新（見た目・粒子）
        this.warpGate?.update(dt);

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

        // まだ出現演出してないゲートが視界に入ったら spawn
        if (this.warpGate && !this.warpGate.isVisible()) {
            if (this.gateFullyInView(this.warpGate, 10)) {
                this.warpGate.spawn();
                this.gatePingT = 0;
            }
        }

        // ゲート出現ピンの時間進行
        if (this.gatePingT >= 0) {
            this.gatePingT += dt;
            if (this.gatePingT > 0.25) this.gatePingT = -1;
        }

        // 死亡（即遷移せず、軽く演出）
        if (this.player.isDestroyed()) {
            this.deathT = 0;
            this.player.setControlsEnabled(false);
            this.player.vel = v(0, 0);
            return;
        }

        // 光を使い切ったらゲームオーバーにしたい場合はオンにしてOK
        if (this.player.isOutOfLight()) {
            this.deathT = 0;
            this.player.setControlsEnabled(false);
            this.player.vel = v(0, 0);
            return;
        }

        // ワープ処理（ゲートに入ったら演出へ）
        if (this.warpGate && this.warpT < 0 && this.warpGate.isActive()) {
            const dx = wrapDelta(
                this.player.pos.x - this.warpGate.x,
                this.worldW
            );
            const dy = this.player.pos.y - this.warpGate.y;
            const dxdy = { x: dx, y: dy };
            const d2 = len2(dxdy);
            const d = len(dxdy);
            const rr = this.player.radius + this.warpGate.r;

            // 近づくと少しだけ薄く（吸われてる感）
            const near = Math.max(
                0,
                Math.min(1, 1 - d / (this.warpGate.r * 3))
            );
            this.player.setWarpFade(near * 0.55);

            if (d2 <= rr * rr) {
                this.warpT = 0;
                this.player.setControlsEnabled(false);
                this.player.vel = v(0, 0);
                this.warpGate.beginConsume();
            }

            // ワープ演出の“放射線”を固定生成（毎フレームrandしない）
            if (this.warpRays.length === 0) {
                const n = 140;
                this.warpRays = Array.from({ length: n }, () => ({
                    a: Math.random() * Math.PI * 2,
                    s: 0.4 + Math.random() * 1.6,
                }));
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

        const t = performance.now() / 1000;
        for (const l of this.lights) {
            const wob =
                Math.sin(t * 0.9 + l.pos.x * 0.01 + l.pos.y * 0.02) * 2.0;
            l.draw(ctx, this.sx(l.pos.x), this.sy(l.pos.y + wob));
        }
        for (const d of this.debris)
            d.draw(ctx, this.sx(d.pos.x), this.sy(d.pos.y));
        for (const r of this.repairs)
            r.draw(ctx, this.sx(r.pos.x), this.sy(r.pos.y));

        // ゲート出現ピン：一瞬だけ紫白く光る
        if (this.gatePingT >= 0) {
            const { w, h } = this.game.view;
            const p = Math.max(0, Math.min(1, this.gatePingT / 0.1)); // 0.1秒で立ち上がる
            const a = (1 - p) * 0.35;

            ctx.globalAlpha = a;
            ctx.fillStyle = "#f3eaff"; // 白紫
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
        }

        // ワープゲートの描画
        if (this.warpGate) {
            const sx = this.sx(this.warpGate.x);
            const sy = this.sy(this.warpGate.y);
            this.warpGate.draw(ctx, sx, sy);
        }

        const hideShip = this.warpT >= 0 && this.warpT > 0.7;
        if (!hideShip) {
            this.player.draw(
                ctx,
                this.sx(this.player.pos.x),
                this.sy(this.player.pos.y)
            );
        }

        // ---- ワープ突入の“派手演出” ----
        if (this.warpT >= 0) {
            const { w, h } = this.game.view;
            const cx = this.warpGate ? this.sx(this.warpGate.x) : w * 0.5;
            const cy = this.warpGate ? this.sy(this.warpGate.y) : h * 0.5;

            // 0..1（2.6秒で立ち上がる）
            const p = Math.max(0, Math.min(1, this.warpT / 2.6));

            // 紫の渦（中心発光）
            const R = Math.max(w, h) * (0.6 + 0.6 * p);
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
            g.addColorStop(0, `rgba(197,155,255,${0.35 * p})`);
            g.addColorStop(0.25, `rgba(120,40,180,${0.18 * p})`);
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);

            // 星の伸び（放射状の線）
            ctx.save();
            ctx.translate(cx, cy);
            ctx.globalAlpha = 0.2 * p;
            ctx.strokeStyle = "#ffffff";
            for (const r of this.warpRays) {
                const a = r.a + this.warpT * 0.9; // わずかに回転
                const x0 = Math.cos(a) * (12 + 10 * p);
                const y0 = Math.sin(a) * (12 + 10 * p);
                const L = (80 + 900 * p) * r.s;
                const x1 = Math.cos(a) * L;
                const y1 = Math.sin(a) * L;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(x0, y0);
                ctx.lineTo(x1, y1);
                ctx.stroke();
            }
            ctx.restore();
            ctx.globalAlpha = 1;
        }

        // 画面フェード（演出）
        if (this.warpT >= 0) {
            // 後半で暗転（紫寄り）
            const a = Math.max(0, Math.min(1, (this.warpT - 0.6) / 1.6));
            ctx.globalAlpha = 0.15 + 0.85 * a;
            ctx.fillStyle = "#07050d";
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
        }
        if (this.deathT >= 0) {
            const a = Math.max(0, Math.min(1, this.deathT / 0.9));
            ctx.globalAlpha = 0.15 + 0.85 * a;
            ctx.fillStyle = "#000000";
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
        }
    }

    isDone(): boolean {
        return this.done;
    }
    nextSceneKey(): string | null {
        return this.next;
    }
}
