import { Input } from "../core/input";
import { TitleScene } from "./scenes/TitleScene";
import { PlanetScene, type PlanetConfig } from "./scenes/PlanetScene";
import { WarpScene } from "./scenes/WarpScene";
import { EndingScene } from "./scenes/EndingScene";
import { GameOverScene } from "./scenes/GameOverScene";
import type { Scene } from "./scenes/Scene";

export class Game {
    readonly view = { w: 0, h: 0 };

    private lastT = 0;
    private scene: Scene;

    // ステージ設定
    private planets: PlanetConfig[] = [
        { worldW: 1800, lights: 10, debris: 5, debrisSpeed: 40, repairs: 1 },
        { worldW: 2400, lights: 12, debris: 7, debrisSpeed: 55, repairs: 1 },
        { worldW: 3200, lights: 14, debris: 9, debrisSpeed: 70, repairs: 2 },
        { worldW: 4200, lights: 16, debris: 12, debrisSpeed: 85, repairs: 2 },
    ];

    private planetIndex = 0;
    private warpFrom = 0;

    // 星背景
    private stars: { x: number; y: number; a: number }[] = [];

    constructor(
        public readonly canvas: HTMLCanvasElement,
        public readonly ctx: CanvasRenderingContext2D,
        public readonly input: Input
    ) {
        this.scene = new TitleScene(this);
    }

    tick(tMs: number) {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.view.w = w;
        this.view.h = h;

        if (this.stars.length === 0) this.initStars(220);

        const t = tMs / 1000;
        const dt = Math.min(0.033, Math.max(0, t - this.lastT || 0.016));
        this.lastT = t;

        this.scene.update(dt);
        this.scene.draw();

        if (this.scene.isDone()) {
            const key = this.scene.nextSceneKey();
            this.scene = this.makeScene(key);
        }
    }

    setWarpFrom(i: number) {
        this.warpFrom = i;
    }

    hasNextPlanet(): boolean {
        return this.planetIndex + 1 < this.planets.length;
    }

    private makeScene(key: string | null): Scene {
        if (key === "planet") {
            // タイトル→最初、ワープ→次
            if (this.scene instanceof WarpScene)
                this.planetIndex = Math.min(
                    this.planets.length - 1,
                    this.warpFrom + 1
                );
            // リトライ時
            if (this.scene instanceof GameOverScene)
                this.planetIndex = this.warpFrom;

            return new PlanetScene(
                this,
                this.planets[this.planetIndex],
                this.planetIndex
            );
        }
        if (key === "warp") return new WarpScene(this);
        if (key === "ending") return new EndingScene(this);
        if (key === "gameover") {
            // 惑星番号を保持しておく（リトライ）
            this.warpFrom = this.planetIndex;
            return new GameOverScene(this);
        }
        return new TitleScene(this);
    }

    private initStars(n: number) {
        const w = this.canvas.clientWidth;
        const h = this.canvas.clientHeight;
        this.stars = Array.from({ length: n }, () => ({
            x: Math.random() * w,
            y: Math.random() * h,
            a: 0.2 + Math.random() * 0.8,
        }));
    }

    drawStars() {
        const ctx = this.ctx;
        const { w, h } = this.view;
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#fff";
        for (const s of this.stars) {
            ctx.globalAlpha = s.a;
            ctx.fillRect(s.x, s.y, 1, 1);
        }
        ctx.globalAlpha = 1;
    }
}
