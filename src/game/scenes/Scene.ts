export interface Scene {
    update(dt: number): void;
    draw(): void;
    isDone(): boolean;
    nextSceneKey(): string | null;
}
