import { type Vec2, add, mul } from "../../core/vec2";

export interface Updatable {
    update(dt: number, worldW?: number, worldH?: number): void;
}
export interface Drawable {
    draw(ctx: CanvasRenderingContext2D): void;
}

export abstract class Entity implements Updatable, Drawable {
    pos: Vec2;
    vel: Vec2;
    radius: number;
    dead = false;

    constructor(pos: Vec2, vel: Vec2, radius: number) {
        this.pos = pos;
        this.vel = vel;
        this.radius = radius;
    }

    // 共通の移動（派生で super.update(dt) する）
    update(dt: number, _worldW?: number, _worldH?: number): void {
        this.pos = add(this.pos, mul(this.vel, dt));
    }

    abstract draw(ctx: CanvasRenderingContext2D): void;
}
