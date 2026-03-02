export const PixelBanner = () => {
  const [topRaw, setTopRaw] = useState(null)
  const[bottomRaw, setBottomRaw] = useState(null)
  const [topCanvas, setTopCanvas] = useState(null)
  const [bottomCanvas, setBottomCanvas] = useState(null)
  const[pendingColor, setPendingColor] = useState("#FFFFFF")
  const [pendingAlpha, setPendingAlpha] = useState(255)
  const [error, setError] = useState("")
  const[dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState("")

  const hexToRgb = (hex) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  })

  const buildHalfCanvas = (srcData, shadowR, shadowG, shadowB, shadowA) => {
    const SW = 264, SH = 8, SCALE = 4
    const CW = SW + 1, CH = SH + 1

    const canvas = document.createElement("canvas")
    canvas.width = CW * SCALE
    canvas.height = CH * SCALE
    const ctx = canvas.getContext("2d")
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const out = ctx.createImageData(canvas.width, canvas.height)

    const write = (destX, destY, r, g, b, a) => {
      if (destX < 0 || destY < 0 || destX >= CW || destY >= CH) return
      for (let py = 0; py < SCALE; py++) {
        for (let px = 0; px < SCALE; px++) {
          const i = (((destY * SCALE + py) * (CW * SCALE)) + (destX * SCALE + px)) * 4
          out.data[i]     = r
          out.data[i + 1] = g
          out.data[i + 2] = b
          out.data[i + 3] = a
        }
      }
    }

    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const si = (y * SW + x) * 4
        const srcA = srcData[si + 3]
        if (srcA === 0) continue

        const r = Math.round((srcData[si]     * shadowR) / 255)
        const g = Math.round((srcData[si + 1] * shadowG) / 255)
        const b = Math.round((srcData[si + 2] * shadowB) / 255)
        const a = Math.round((srcA             * shadowA) / 255)

        write(x + 1, y + 1, r, g, b, a)
      }
    }

    for (let y = 0; y < SH; y++) {
      for (let x = 0; x < SW; x++) {
        const si = (y * SW + x) * 4
        write(x, y, srcData[si], srcData[si + 1], srcData[si + 2], srcData[si + 3])
      }
    }

    ctx.putImageData(out, 0, 0)
    return canvas
  }

  const applyWithColor = (tRaw, bRaw, color, alpha) => {
    const { r, g, b } = hexToRgb(color)
    setTopCanvas(buildHalfCanvas(tRaw, r, g, b, alpha))
    setBottomCanvas(buildHalfCanvas(bRaw, r, g, b, alpha))
  }

  const loadFile = (file) => {
    if (!file) return
    setError("")
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width !== 264 || img.height !== 16) {
        setError(`Need exactly 264×16 px — got ${img.width}×${img.height}`)
        return
      }
      const tmp = document.createElement("canvas")
      tmp.width = 264; tmp.height = 16
      tmp.getContext("2d").drawImage(img, 0, 0)
      const ctx = tmp.getContext("2d")
      const td = new Uint8ClampedArray(ctx.getImageData(0, 0, 264, 8).data)
      const bd = new Uint8ClampedArray(ctx.getImageData(0, 8, 264, 8).data)
      setTopRaw(td); setBottomRaw(bd); setFileName(file.name)
      applyWithColor(td, bd, pendingColor, pendingAlpha)
    }
    img.onerror = () => { URL.revokeObjectURL(url); setError("Could not read image.") }
    img.src = url
  }

  const handleApply = () => {
    if (topRaw && bottomRaw) applyWithColor(topRaw, bottomRaw, pendingColor, pendingAlpha)
  }

  const canvasRef = (canvas) => (el) => {
    if (!el || !canvas) return
    el.width = canvas.width
    el.height = canvas.height
    el.getContext("2d").drawImage(canvas, 0, 0)
  }

  return (
    <div style={{
      fontFamily: "'DM Mono', 'Fira Mono', monospace",
      background: "#0e0e10",
      color: "#e8e8e8",
      borderRadius: "10px",
      padding: "20px",
      maxWidth: "680px",
      border: "1px solid #2a2a2e",
      boxSizing: "border-box",
    }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "16px" }}>
        <span style={{ fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#666", fontWeight: 600 }}>
          pixel shadow splitter
        </span>
        <span style={{ fontSize: "10px", color: "#3a3a3e", letterSpacing: "0.06em" }}>264×16 → 2×(265×9 @4×)</span>
      </div>

      {/* Upload zone */}
      <label
        htmlFor="pss-file"
        onDrop={(e) => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "10px 14px",
          marginBottom: "14px",
          borderRadius: "6px",
          border: `1px solid ${dragging ? "#4f8cff" : "#2a2a2e"}`,
          background: dragging ? "rgba(79,140,255,0.06)" : "#18181b",
          cursor: "pointer",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <span style={{ fontSize: "16px", lineHeight: 1 }}>⬆</span>
        <span style={{ fontSize: "11px", color: fileName ? "#a0c4a0" : "#555", letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {fileName || "drop 264×16 image here or click to browse"}
        </span>
        <input id="pss-file" type="file" accept="image/*"
          onChange={(e) => { if (e.target.files[0]) loadFile(e.target.files[0]) }}
          style={{ display: "none" }} />
      </label>

      {error && (
        <div style={{ fontSize: "11px", color: "#f87171", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: "5px", padding: "7px 11px", marginBottom: "12px", letterSpacing: "0.03em" }}>
          ✕ {error}
        </div>
      )}

      {/* Shadow controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "10px", color: "#555", letterSpacing: "0.1em", textTransform: "uppercase" }}>shadow</span>

        {/* Pill: color swatch + A field */}
        <div style={{
          display: "inline-flex",
          alignItems: "stretch",
          borderRadius: "5px",
          border: "1px solid #2a2a2e",
          overflow: "hidden",
          background: "#18181b",
          height: "28px",
        }}>
          {/* Color preview block */}
          <div style={{
            width: "28px",
            background: pendingColor,
            position: "relative",
            cursor: "pointer",
            flexShrink: 0,
          }}>
            <input type="color" value={pendingColor}
              onChange={(e) => setPendingColor(e.target.value)}
              style={{
                position: "absolute", inset: 0, opacity: 0,
                width: "100%", height: "100%", cursor: "pointer", border: "none", padding: 0,
              }} />
          </div>
          {/* Divider */}
          <div style={{ width: "1px", background: "#2a2a2e", flexShrink: 0 }} />
          {/* Hex display */}
          <div style={{ padding: "0 8px", display: "flex", alignItems: "center", fontSize: "11px", color: "#888", letterSpacing: "0.06em", userSelect: "none" }}>
            {pendingColor.toUpperCase()}
          </div>
          {/* Divider */}
          <div style={{ width: "1px", background: "#2a2a2e", flexShrink: 0 }} />
          {/* Alpha field */}
          <div style={{ display: "flex", alignItems: "center", padding: "0 6px 0 8px", gap: "4px" }}>
            <span style={{ fontSize: "10px", color: "#444", fontWeight: 700, letterSpacing: "0.08em" }}>A</span>
            <input type="number" min={0} max={255} value={pendingAlpha}
              onChange={(e) => setPendingAlpha(Math.min(255, Math.max(0, Number(e.target.value))))}
              style={{
                width: "38px", background: "transparent", border: "none",
                color: "#ccc", fontSize: "11px", textAlign: "right", outline: "none",
                padding: 0, fontFamily: "inherit",
              }} />
          </div>
        </div>

        {/* Apply */}
        <button onClick={handleApply} disabled={!topRaw}
          style={{
            height: "28px", padding: "0 14px", borderRadius: "5px",
            border: "1px solid #2a2a2e",
            background: topRaw ? "#1e3a5f" : "#18181b",
            color: topRaw ? "#7ab3ff" : "#333",
            fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase",
            fontWeight: 600, cursor: topRaw ? "pointer" : "not-allowed",
            fontFamily: "inherit", transition: "background 0.15s, color 0.15s",
          }}>
          Apply
        </button>
      </div>

      {/* Preview */}
      {topCanvas && bottomCanvas ? (
        <div>
          <span style={{ fontSize: "10px", color: "#444", letterSpacing: "0.1em", textTransform: "uppercase", display: "block", marginBottom: "8px" }}>preview</span>
          {/* Checkerboard container, two canvases stacked with zero gap */}
          <div style={{
            display: "inline-block",
            background: "repeating-conic-gradient(#1e1e22 0% 25%, #2a2a2e 0% 50%) 0 0 / 8px 8px",
            borderRadius: "4px",
            overflow: "hidden",
            lineHeight: 0,
            border: "1px solid #2a2a2e",
            maxWidth: "100%", // Fixed layout issue here
          }}>
            <canvas
              ref={canvasRef(topCanvas)}
              style={{ display: "block", imageRendering: "pixelated", maxWidth: "100%", height: "auto" }} // Fixed layout issue here
            />
            <canvas
              ref={canvasRef(bottomCanvas)}
              style={{ display: "block", imageRendering: "pixelated", maxWidth: "100%", height: "auto" }} // Fixed layout issue here
            />
          </div>
          <div style={{ fontSize: "10px", color: "#3a3a42", marginTop: "6px", letterSpacing: "0.04em" }}>
            {topCanvas.width}×{topCanvas.height * 2} rendered · 4× nearest-neighbour
          </div>
        </div>
      ) : (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "60px", borderRadius: "6px",
          border: "1px dashed #222", color: "#333",
          fontSize: "11px", letterSpacing: "0.06em",
        }}>
          upload an image to see output
        </div>
      )}
    </div>
  )
}