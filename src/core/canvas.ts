export function fitCanvas(
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
) {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssW = Math.floor(canvas.clientWidth);
    const cssH = Math.floor(canvas.clientHeight);
    const w = Math.floor(cssW * dpr);
    const h = Math.floor(cssH * dpr);

    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }
    // 以降はCSSピクセル座標で描けるようにする
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
