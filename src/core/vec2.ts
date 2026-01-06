export type Vec2 = { x: number; y: number };

export const v = (x = 0, y = 0): Vec2 => ({ x, y });
export const add = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Vec2, s: number): Vec2 => ({ x: a.x * s, y: a.y * s });
export const len2 = (a: Vec2): number => a.x * a.x + a.y * a.y;
export const len = (a: Vec2): number => Math.sqrt(len2(a));
export const norm = (a: Vec2): Vec2 => {
    const l = len(a);
    return l > 1e-9 ? { x: a.x / l, y: a.y / l } : { x: 0, y: 0 };
};
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
