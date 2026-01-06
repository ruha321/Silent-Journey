export class Input {
    private down = new Set<string>();
    private pressed = new Set<string>();

    constructor(target: Window) {
        target.addEventListener(
            "keydown",
            (e) => {
                const code = e.code;
                if (!this.down.has(code)) this.pressed.add(code);
                this.down.add(code);
                // スクロール防止（矢印/スペース）
                if (
                    [
                        "ArrowUp",
                        "ArrowDown",
                        "ArrowLeft",
                        "ArrowRight",
                        "Space",
                    ].includes(code)
                )
                    e.preventDefault();
            },
            { passive: false }
        );

        target.addEventListener("keyup", (e) => {
            this.down.delete(e.code);
        });
    }

    isDown(code: string): boolean {
        return this.down.has(code);
    }

    consumePressed(code: string): boolean {
        const had = this.pressed.has(code);
        if (had) this.pressed.delete(code);
        return had;
    }
}
