function buildShadowCanvas(sourceCanvas, shadowColor) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const ctx = sourceCanvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, w, h);
  const src = imageData.data;
  const shadow = document.createElement("canvas");
  shadow.width = w;
  shadow.height = h;
  const sCtx = shadow.getContext("2d");
  const sData = sCtx.createImageData(w, h);
  const dst = sData.data;
  for (let i = 0; i < src.length; i += 4) {
    dst[i]     = Math.round((src[i]     * shadowColor.r) / 255);
    dst[i + 1] = Math.round((src[i + 1] * shadowColor.g) / 255);
    dst[i + 2] = Math.round((src[i + 2] * shadowColor.b) / 255);
    dst[i + 3] = Math.round((src[i + 3] * shadowColor.a) / 255);
  }
  sCtx.putImageData(sData, 0, 0);
  return shadow;
}

function sliceCanvas(src, x, y, w, h) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  c.getContext("2d").drawImage(src, x, y, w, h, 0, 0, w, h);
  return c;
}

function hexToRgb(hexStr) {
  const clean = hexStr.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export const PixelBanner = () => {
  const scale = 4;
  const expectedW = 264;
  const expectedH = 16;
  const halfH = 8;

  const [strips, setStrips] = useState(null);
  const [hex, setHex] = useState("#000000");
  const [alpha, setAlpha] = useState(255);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const mainCanvasesRef = useRef(null);

  const buildStripsFromCanvases = (top, bot, hexColor, alphaVal) => {
    const rgb = hexToRgb(hexColor);
    const sc = { r: rgb.r, g: rgb.g, b: rgb.b, a: alphaVal };
    return [
      { main: top, shadow: buildShadowCanvas(top, sc) },
      { main: bot, shadow: buildShadowCanvas(bot, sc) },
    ];
  };

  const processImage = (file) => {
    if (!file) return;
    setError("");
    const img = new Image();
    img.onload = () => {
      if (img.width !== expectedW || img.height !== expectedH) {
        setError(`Image must be exactly 264x16px. Got ${img.width}x${img.height}px.`);
        return;
      }
      const full = document.createElement("canvas");
      full.width = expectedW;
      full.height = expectedH;
      full.getContext("2d").drawImage(img, 0, 0);
      const top = sliceCanvas(full, 0, 0, expectedW, halfH);
      const bot = sliceCanvas(full, 0, halfH, expectedW, halfH);
      mainCanvasesRef.current = [top, bot];
      setStrips(buildStripsFromCanvases(top, bot, hex, alpha));
    };
    img.src = URL.createObjectURL(file);
  };

  const applySettings = () => {
    if (!mainCanvasesRef.current) return;
    const [top, bot] = mainCanvasesRef.current;
    setStrips(buildStripsFromCanvases(top, bot, hex, alpha));
  };

  const rgb = hexToRgb(hex);
  const swatchColor = `rgba(${rgb.r},${rgb.g},${rgb.b},${(alpha / 255).toFixed(2)})`;

  return (
    <div className="not-prose p-4 border dark:border-white/10 border-zinc-950/10 rounded-xl space-y-4">

      <div className="flex flex-wrap gap-4 items-end">
        <label className="flex flex-col gap-1 text-sm text-zinc-950/70 dark:text-white/70">
          Shadow color
          <div className="flex items-stretch rounded-lg border border-zinc-950/10 dark:border-white/10 overflow-hidden">
            <div className="relative" style={{ width: 32 }}>
              <div style={{ backgroundColor: swatchColor, position: "absolute", inset: 0 }} />
              <input
                type="color"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%", height: "100%" }}
              />
            </div>
            <div className="w-px bg-zinc-950/10 dark:bg-white/10" />
            <span className="px-2 flex items-center font-mono text-xs text-zinc-950/40 dark:text-white/30 select-none">
              {hex.toUpperCase()}
            </span>
            <div className="w-px bg-zinc-950/10 dark:bg-white/10" />
            <span className="px-2 flex items-center font-mono text-xs text-zinc-950/40 dark:text-white/30 select-none">
              A
            </span>
            <input
              type="number"
              min={0}
              max={255}
              value={alpha}
              onChange={(e) => setAlpha(Math.min(255, Math.max(0, Number(e.target.value))))}
              style={{ width: 48, padding: "0 4px", background: "transparent" }}
              className="font-mono text-sm text-zinc-950/70 dark:text-white/70 focus:outline-none"
            />
          </div>
        </label>

        <button
          onClick={applySettings}
          className="self-end text-sm px-3 py-1.5 rounded-lg border border-zinc-950/10 dark:border-white/10 text-zinc-950/70 dark:text-white/70 hover:bg-zinc-950/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          Apply
        </button>
      </div>

      <div
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); processImage(e.dataTransfer.files[0]); }}
        className={`rounded-lg border border-dashed px-4 py-3 text-center text-sm cursor-pointer select-none transition-colors ${
          dragging
            ? "border-zinc-950/30 dark:border-white/30 text-zinc-950/50 dark:text-white/50 bg-zinc-950/5 dark:bg-white/5"
            : "border-zinc-950/20 dark:border-white/20 text-zinc-950/40 dark:text-white/40 hover:border-zinc-950/30 dark:hover:border-white/30"
        }`}
      >
        {strips ? "Click or drop to replace image" : "Click or drop a 264×16 image here"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={(e) => processImage(e.target.files[0])}
          className="hidden"
        />
      </div>

      {error && (
        <p className="text-sm font-mono text-red-500 dark:text-red-400 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="rounded-lg border border-zinc-950/10 dark:border-white/10 bg-zinc-950/5 dark:bg-white/5 p-4 overflow-x-auto flex items-center justify-center" style={{ minHeight: 64 }}>
        {strips ? (
          <div style={{ display: "inline-flex", flexDirection: "column" }}>
            {strips.map((strip, i) => (
              <div
                key={i}
                style={{
                  position: "relative",
                  width: strip.main.width * scale + scale,
                  height: strip.main.height * scale + scale,
                }}
              >
                <canvas
                  ref={(el) => {
                    if (el && strip.shadow) {
                      el.width = strip.shadow.width;
                      el.height = strip.shadow.height;
                      el.getContext("2d").drawImage(strip.shadow, 0, 0);
                    }
                  }}
                  style={{
                    position: "absolute",
                    top: scale,
                    left: scale,
                    width: strip.shadow.width * scale,
                    height: strip.shadow.height * scale,
                    imageRendering: "pixelated",
                    display: "block",
                  }}
                />
                <canvas
                  ref={(el) => {
                    if (el && strip.main) {
                      el.width = strip.main.width;
                      el.height = strip.main.height;
                      el.getContext("2d").drawImage(strip.main, 0, 0);
                    }
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: strip.main.width * scale,
                    height: strip.main.height * scale,
                    imageRendering: "pixelated",
                    display: "block",
                  }}
                />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-950/30 dark:text-white/30 font-mono">
            No image loaded
          </p>
        )}
      </div>
    </div>
  );
};