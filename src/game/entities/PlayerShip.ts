import { Input } from "../../core/input";
import { type Vec2, v, clamp01, mul, norm, clamp, wrap } from "../../core/vec2";
import { Entity } from "./Entity";

export class PlayerShip extends Entity {
    // ---- 耐久（回数制） ----
    durabilityMax = 3;
    durability = 3;

    // 連続ヒット防止（秒）
    private hurtCooldown = 0;

    // 0..1（集めた光の進捗で上がる）
    powerLevel = 0;

    // ---- 推進力の光（0..1）----
    DEFAULTLIGHTCHARGE = 1;
    lightCharge = this.DEFAULTLIGHTCHARGE;

    private input: Input;

    private baseThrustMin = 210; // 加速
    private baseThrustMax = 420; // 加速
    private drag = 2.2; // 抵抗

    // 光ゲージの増減（動いてると減る／止まると回復）
    private lightDrain = 0.1;
    private lightRegen = 0.5;

    // ワープ時の光の演出用
    private controlsEnabled = true;
    private warpFade = 0; // 0..1（1で光が消える）

    // ブースト
    private boostCost = 0.3;
    private boostImpulse = 650;
    private boostFlash = 0;

    constructor(pos: Vec2, input: Input) {
        super(pos, v(0, 0), 12); // ← super
        this.input = input;
    }

    setControlsEnabled(v: boolean) {
        this.controlsEnabled = v;
    }

    setWarpFade(f: number) {
        this.warpFade = Math.max(0, Math.min(1, f));
    }

    isDestroyed(): boolean {
        return this.durability <= 0;
    }

    grantIFrames(sec: number) {
        this.hurtCooldown = Math.max(this.hurtCooldown, sec);
    }

    repair(amount = 1) {
        this.durability = Math.min(
            this.durabilityMax,
            this.durability + amount
        );
    }

    /** 衝突ダメージ。入ったら true（＝実際に耐久が減った） */
    takeHit(): boolean {
        if (this.hurtCooldown > 0) return false;
        this.durability -= 1;
        this.hurtCooldown = 0.6;
        this.vel = mul(this.vel, 0.6);
        return true;
    }

    /* 推進力レベルを設定 */
    setPowerLevel(x: number) {}

    /** 推進光を増やす（光を拾った時用） */
    gainLight(x: number) {
        this.powerLevel = Math.max(0, Math.min(1, x));
        this.lightCharge = this.DEFAULTLIGHTCHARGE;
    }

    override update(dt: number, worldW: number, worldH: number): void {
        // 無敵時間の減衰
        this.hurtCooldown = Math.max(0, this.hurtCooldown - dt);
        this.boostFlash = Math.max(0, this.boostFlash - dt);

        // 入力（WASD + 矢印）
        const ax = this.controlsEnabled
            ? (this.input.isDown("ArrowRight") || this.input.isDown("KeyD")
                  ? 1
                  : 0) -
              (this.input.isDown("ArrowLeft") || this.input.isDown("KeyA")
                  ? 1
                  : 0)
            : 0;
        const ay = this.controlsEnabled
            ? (this.input.isDown("ArrowDown") || this.input.isDown("KeyS")
                  ? 1
                  : 0) -
              (this.input.isDown("ArrowUp") || this.input.isDown("KeyW")
                  ? 1
                  : 0)
            : 0;

        const moving = ax !== 0 || ay !== 0;

        // 光が多いほど推進が効く
        const base =
            this.baseThrustMin +
            (this.baseThrustMax - this.baseThrustMin) * this.powerLevel;
        const thrustNow = base * (0.35 + 0.65 * this.lightCharge);

        // 加速
        this.vel.x += ax * thrustNow * dt;
        this.vel.y += ay * thrustNow * dt;

        // 抵抗
        const k = Math.max(0, 1 - this.drag * dt);
        this.vel.x *= k;
        this.vel.y *= k;

        // ブースト（Space）
        if (
            this.controlsEnabled &&
            this.input.consumePressed("Space") &&
            this.lightCharge >= this.boostCost
        ) {
            this.lightCharge = clamp01(this.lightCharge - this.boostCost);

            // 方向：速度があるなら速度方向、なければ入力方向、どっちも無ければ右
            let dx = this.vel.x,
                dy = this.vel.y;
            if (Math.abs(dx) + Math.abs(dy) < 0.05) {
                dx = ax;
                dy = ay;
            }
            if (Math.abs(dx) + Math.abs(dy) < 0.05) {
                dx = 1;
                dy = 0;
            }

            const d = norm({ x: dx, y: dy });
            this.vel.x += d.x * this.boostImpulse;
            this.vel.y += d.y * this.boostImpulse;
            this.boostFlash = 0.18;
        }

        // 共通移動
        super.update(dt);

        // 操作してないときだけ、ゆっくり右に寄せる（逆走可）
        if (!moving && this.controlsEnabled) {
            const cruise = 30; // もっと遅くしたければ 10〜20
            this.vel.x += (cruise - this.vel.x) * (0.6 * dt);
        }

        // リング（x wrap）
        if (worldW > 0) this.pos.x = wrap(this.pos.x, worldW);

        // yは端っこに行かないように（画面と同じ高さ運用）
        if (worldH > 0) {
            const m = 24; // 端マージン
            this.pos.y = clamp(this.pos.y, m, worldH - m);
        }

        // 画面端ラップ（軌道感）
        if (this.pos.x < 0) this.pos.x += worldW;
        if (this.pos.x > worldW) this.pos.x -= worldW;
        if (this.pos.y < 0) this.pos.y += worldH;
        if (this.pos.y > worldH) this.pos.y -= worldH;

        // 光ゲージの増減（時間経過）
        this.lightCharge = clamp01(
            this.lightCharge +
                (moving ? -this.lightDrain : this.lightRegen) * dt
        );
    }

    override draw(
        ctx: CanvasRenderingContext2D,
        sx?: number,
        sy?: number
    ): void {
        const x = sx ?? this.pos.x;
        const y = sy ?? this.pos.y;
        ctx.save();
        ctx.translate(x, y);

        // 推進光のグロー（UIじゃないUI）
        const fade = 1 - this.warpFade;
        const glow = 0.25 + 0.75 * this.powerLevel;
        const glowR = (18 + 22 * glow * this.lightCharge) * (0.6 + 0.4 * fade);
        ctx.globalAlpha =
            (0.12 + 0.35 * glow + (this.boostFlash > 0 ? 0.35 : 0)) * fade;
        ctx.beginPath();
        ctx.arc(0, 0, glowR, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.globalAlpha = 1;

        // 船体（シンプル三角）
        const angle = Math.atan2(this.vel.y, this.vel.x);
        if (Math.abs(this.vel.x) + Math.abs(this.vel.y) > 0.02)
            ctx.rotate(angle);

        ctx.beginPath();
        ctx.moveTo(18, 0);
        ctx.lineTo(-12, 9);
        ctx.lineTo(-10, 0);
        ctx.lineTo(-12, -9);
        ctx.closePath();
        ctx.strokeStyle = "#ddd";
        ctx.lineWidth = 2;
        ctx.stroke();

        // 耐久ランプ（回数制：3つの点で表示）
        const r = this.durability / this.durabilityMax;
        const lamp = r > 0.67 ? "#7CFF7C" : r > 0.34 ? "#FFD27C" : "#FF7C7C";

        // 被弾中点滅したいなら
        const blink =
            this.hurtCooldown > 0 &&
            Math.floor(performance.now() / 100) % 2 === 0;
        ctx.fillStyle = blink ? "#222" : lamp;

        ctx.beginPath();
        ctx.arc(-2, 0, 3.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}
