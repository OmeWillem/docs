export const PixelBanner = () => {
  const [topCanvas, setTopCanvas] = useState(null)
  const [bottomCanvas, setBottomCanvas] = useState(null)
  const [pendingColor, setPendingColor] = useState("#000000")
  const [pendingAlpha, setPendingAlpha] = useState(120)
  const [topRaw, setTopRaw] = useState(null)
  const [bottomRaw, setBottomRaw] = useState(null)
  const [error, setError] = useState("")
  const [dragging, setDragging] = useState(false)
  const [fileName, setFileName] = useState("")

  const hexToRgb = (hex) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  })

  const buildShadowedCanvas = (srcData, sw, sh, shadowR, shadowG, shadowB, shadowA) => {
    const scale = 4
    const offset = 1
    const dw = (sw + offset) * scale
    const dh = (sh + offset) * scale

    const canvas = document.createElement("canvas")
    canvas.width = dw
    canvas.height = dh
    const ctx = canvas.getContext("2d")

    // Draw shadow layer
    const shadowImg = ctx.createImageData(dw, dh)
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const si = (y * sw + x) * 4
        const sA = srcData[si + 3]
        if (sA === 0) continue

        const mr = Math.round((srcData[si]     * shadowR) / 255)
        const mg = Math.round((srcData[si + 1] * shadowG) / 255)
        const mb = Math.round((srcData[si + 2] * shadowB) / 255)
        const ma = Math.round((sA              * shadowA) / 255)

        const dx = (x + offset) * scale
        const dy = (y + offset) * scale
        for (let py = 0; py < scale; py++) {
          for (let px = 0; px < scale; px++) {
            const di = ((dy + py) * dw + (dx + px)) * 4
            shadowImg.data[di]     = mr
            shadowImg.data[di + 1] = mg
            shadowImg.data[di + 2] = mb
            shadowImg.data[di + 3] = ma
          }
        }
      }
    }
    ctx.putImageData(shadowImg, 0, 0)

    // Draw main image on top (upscaled, pixelated)
    const tmp = document.createElement("canvas")
    tmp.width = sw
    tmp.height = sh
    const tmpCtx = tmp.getContext("2d")
    const mainImg = tmpCtx.createImageData(sw, sh)
    mainImg.data.set(srcData)
    tmpCtx.putImageData(mainImg, 0, 0)

    ctx.imageSmoothingEnabled = false
    ctx.drawImage(tmp, 0, 0, sw * scale, sh * scale)

    return canvas
  }

  const loadFile = (file) => {
    setError("")
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      if (img.width !== 264 || img.height !== 16) {
        setError(`Expected 264×16, got ${img.width}×${img.height}.`)
        return
      }
      const offscreen = document.createElement("canvas")
      offscreen.width = 264
      offscreen.height = 16
      const octx = offscreen.getContext("2d")
      octx.drawImage(img, 0, 0)

      const td = new Uint8ClampedArray(octx.getImageData(0, 0, 264, 8).data)
      const bd = new Uint8ClampedArray(octx.getImageData(0, 8, 264, 8).data)

      setTopRaw(td)
      setBottomRaw(bd)
      setFileName(file.name)

      const { r, g, b } = hexToRgb(pendingColor)
      setTopCanvas(buildShadowedCanvas(td, 264, 8, r, g, b, pendingAlpha))
      setBottomCanvas(buildShadowedCanvas(bd, 264, 8, r, g, b, pendingAlpha))
    }
    img.onerror = () => { URL.revokeObjectURL(url); setError("Failed to load image.") }
    img.src = url
  }

  const handleApply = () => {
    if (!topRaw || !bottomRaw) return
    const { r, g, b } = hexToRgb(pendingColor)
    setTopCanvas(buildShadowedCanvas(topRaw, 264, 8, r, g, b, pendingAlpha))
    setBottomCanvas(buildShadowedCanvas(bottomRaw, 264, 8, r, g, b, pendingAlpha))
  }

  return (
    <div style={{ fontFamily: "sans-serif", padding: "1.5rem", borderRadius: "0.75rem", border: "1px solid rgba(0,0,0,0.12)", maxWidth: "720px" }}>

      {/* Upload zone */}
      <label
        htmlFor="pss-upload"
        onDrop={(e) => { e.preventDefault(); setDragging(false); loadFile(e.dataTransfer.files[0]) }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          gap: "0.5rem", padding: "2rem", marginBottom: "1.25rem", cursor: "pointer",
          border: `2px dashed ${dragging ? "#6366f1" : "rgba(0,0,0,0.2)"}`,
          borderRadius: "0.5rem",
          background: dragging ? "rgba(99,102,241,0.05)" : "transparent",
          transition: "all 0.15s ease",
        }}
      >
        <span style={{ fontSize: "2rem" }}>🖼️</span>
        <span style={{ fontSize: "0.9rem", opacity: 0.7 }}>
          {fileName ? `✓ ${fileName}` : "Click or drag & drop — 264×16 image"}
        </span>
        <input id="pss-upload" type="file" accept="image/*"
          onChange={(e) => { if (e.target.files[0]) loadFile(e.target.files[0]) }}
          style={{ display: "none" }} />
      </label>

      {error && (
        <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626", borderRadius: "0.4rem", padding: "0.5rem 0.75rem", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {/* Controls row */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Shadow</span>

        {/* Pill: color picker + alpha field */}
        <div style={{ display: "inline-flex", alignItems: "center", borderRadius: "9999px", border: "1px solid rgba(0,0,0,0.18)", overflow: "hidden", background: "rgba(0,0,0,0.03)" }}>
          <label style={{ display: "flex", alignItems: "center", padding: "0.25rem 0.5rem", cursor: "pointer", borderRight: "1px solid rgba(0,0,0,0.12)" }}>
            <input type="color" value={pendingColor} onChange={(e) => setPendingColor(e.target.value)}
              style={{ width: 28, height: 28, border: "none", padding: 0, cursor: "pointer", background: "none" }} />
          </label>
          <div style={{ display: "flex", alignItems: "center", padding: "0 0.5rem 0 0.4rem", gap: "0.2rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, opacity: 0.5 }}>A</span>
            <input type="number" min={0} max={255} value={pendingAlpha}
              onChange={(e) => setPendingAlpha(Math.min(255, Math.max(0, Number(e.target.value))))}
              style={{ width: "3.2rem", border: "none", background: "transparent", fontSize: "0.875rem", textAlign: "right", outline: "none", padding: "0.25rem 0", color: "inherit" }} />
          </div>
        </div>

        <button onClick={handleApply} disabled={!topRaw}
          style={{ padding: "0.35rem 1rem", borderRadius: "9999px", border: "1px solid rgba(99,102,241,0.5)", background: topRaw ? "#6366f1" : "rgba(0,0,0,0.08)", color: topRaw ? "#fff" : "rgba(0,0,0,0.3)", fontSize: "0.875rem", fontWeight: 600, cursor: topRaw ? "pointer" : "not-allowed" }}>
          Apply
        </button>
      </div>

      {/* Output */}
      {topCanvas && bottomCanvas && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", alignItems: "flex-start" }}>
          {[["Top half (rows 0–7)", topCanvas], ["Bottom half (rows 8–15)", bottomCanvas]].map(([label, canvas]) => (
            <div key={label}>
              <div style={{ fontSize: "0.75rem", opacity: 0.5, marginBottom: "0.35rem" }}>{label}</div>
              <div style={{ background: "repeating-conic-gradient(#bbb 0% 25%, #fff 0% 50%) 0 0 / 16px 16px", display: "inline-block", borderRadius: 4, overflow: "hidden", lineHeight: 0 }}>
                <canvas
                  ref={(el) => {
                    if (!el) return
                    el.width = canvas.width
                    el.height = canvas.height
                    el.getContext("2d").drawImage(canvas, 0, 0)
                  }}
                  style={{ imageRendering: "pixelated", display: "block" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}