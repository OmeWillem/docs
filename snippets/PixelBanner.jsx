const SCALE = 4;
const EXPECTED_W = 264;
const EXPECTED_H = 16;
const HALF_H = 8;

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

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

const StripCanvas = ({ canvas }) => {
  return (
    <canvas
      ref={(el) => {
        if (el && canvas) {
          el.width = canvas.width;
          el.height = canvas.height;
          el.getContext("2d").drawImage(canvas, 0, 0);
        }
      }}
      style={{
        width: canvas.width * SCALE,
        height: canvas.height * SCALE,
        imageRendering: "pixelated",
        display: "block",
      }}
    />
  );
};

const BannerStrip = ({ mainCanvas, shadowCanvas }) => {
  return (
    <div style={{ position: "relative", width: mainCanvas.width * SCALE + SCALE, height: mainCanvas.height * SCALE + SCALE }}>
      <div style={{ position: "absolute", top: SCALE, left: SCALE }}>
        <StripCanvas canvas={shadowCanvas} />
      </div>
      <div style={{ position: "absolute", top: 0, left: 0 }}>
        <StripCanvas canvas={mainCanvas} />
      </div>
    </div>
  );
};

export const PixelBanner = () => {
  const [strips, setStrips] = useState(null);
  const [shadowHex, setShadowHex] = useState("#000000");
  const [shadowAlpha, setShadowAlpha] = useState(180);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef(null);
  const mainCanvasesRef = useRef(null);

  const buildStrips = (top, bot, hex, alpha) => {
    const rgb = hexToRgb(hex);
    const sc = { r: rgb.r, g: rgb.g, b: rgb.b, a: alpha };
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
      if (img.width !== EXPECTED_W || img.height !== EXPECTED_H) {
        setError("Image must be exactly 264x16px. Got " + img.width + "x" + img.height + "px.");
        return;
      }
      const full = document.createElement("canvas");
      full.width = EXPECTED_W;
      full.height = EXPECTED_H;
      full.getContext("2d").drawImage(img, 0, 0);
      const top = sliceCanvas(full, 0, 0, EXPECTED_W, HALF_H);
      const bot = sliceCanvas(full, 0, HALF_H, EXPECTED_W, HALF_H);
      mainCanvasesRef.current = [top, bot];
      setStrips(buildStrips(top, bot, shadowHex, shadowAlpha));
    };
    img.src = URL.createObjectURL(file);
  };

  const applySettings = () => {
    if (!mainCanvasesRef.current) return;
    const [top, bot] = mainCanvasesRef.current;
    setStrips(buildStrips(top, bot, shadowHex, shadowAlpha));
  };

  const opacityPct = Math.round((shadowAlpha / 255) * 100);

  const wrapperStyle = {
    fontFamily: "ui-monospace, 'Cascadia Code', Menlo, monospace",
    background: "#0c0c0c",
    border: "1px solid #222",
    borderRadius: 10,
    padding: 20,
    maxWidth: 860,
  };

  const dropBorder = dragging ? "1px dashed #4a9eff" : "1px dashed #2a2a2a";
  const dropBg = dragging ? "rgba(74,158,255,0.04)" : "transparent";
  const dropColor = dragging ? "#4a9eff" : "#444";

  return (
    <div style={wrapperStyle}>
      <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "#444", marginBottom: 16 }}>
        Shadow Preview
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 20, alignItems: "flex-end", marginBottom: 16 }}>
        <label style={{ fontSize: 12, color: "#888", display: "flex", flexDirection: "column", gap: 4 }}>
          Shadow Color
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="color"
              value={shadowHex}
              onChange={(e) => setShadowHex(e.target.value)}
              style={{ width: 34, height: 26, border: "1px solid #333", borderRadius: 4, background: "none", cursor: "pointer", padding: 2 }}
            />
            <span style={{ fontSize: 11, color: "#555" }}>{shadowHex.toUpperCase()}</span>
          </div>
        </label>

        <label style={{ fontSize: 12, color: "#888", display: "flex", flexDirection: "column", gap: 4 }}>
          {"Shadow Opacity (" + opacityPct + "%)"}
          <input
            type="range"
            min={0}
            max={255}
            value={shadowAlpha}
            onChange={(e) => setShadowAlpha(Number(e.target.value))}
            style={{ width: 130, accentColor: "#4a9eff" }}
          />
        </label>

        <button
          onClick={applySettings}
          style={{ fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", background: "#161616", border: "1px solid #2e2e2e", borderRadius: 6, color: "#999", padding: "7px 16px", cursor: "pointer" }}
        >
          Apply
        </button>
      </div>

      <div
        onClick={() => fileInputRef.current && fileInputRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); processImage(e.dataTransfer.files[0]); }}
        style={{ border: dropBorder, borderRadius: 8, padding: "14px 20px", cursor: "pointer", marginBottom: 16, background: dropBg, textAlign: "center", fontSize: 12, color: dropColor, userSelect: "none" }}
      >
        {strips ? "Click or drop to replace image" : "Click or drop a 264x16 PNG here"}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          onChange={(e) => processImage(e.target.files[0])}
          style={{ display: "none" }}
        />
      </div>

      {error && (
        <div style={{ fontSize: 11, color: "#f77", background: "#1a0000", border: "1px solid #3a0000", borderRadius: 6, padding: "8px 12px", marginBottom: 14 }}>
          {error}
        </div>
      )}

      {strips ? (
        <div style={{ background: "#060606", border: "1px solid #1a1a1a", borderRadius: 8, padding: 20, overflowX: "auto" }}>
          <div style={{ display: "inline-flex", flexDirection: "column", gap: 0 }}>
            {strips.map((strip, i) => (
              <BannerStrip key={i} mainCanvas={strip.main} shadowCanvas={strip.shadow} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ background: "#060606", border: "1px solid #1a1a1a", borderRadius: 8, height: 100, display: "flex", alignItems: "center", justifyContent: "center", color: "#222", fontSize: 11, letterSpacing: "0.2em" }}>
          NO IMAGE LOADED
        </div>
      )}
    </div>
  );
};