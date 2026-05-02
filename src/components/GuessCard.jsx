import { useState, useRef, useCallback } from "react";
import VSlider from "./VSlider";
import { hsbToHex, luma, scoreGuess } from "../colorUtils";
import { playSliderTick, playSubmit } from "../sounds";

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M5.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function GuessCard({ targetColor, round, totalRounds, onSubmit, W, H, t, isMobile = false }) {
  // Internal state — targetColor never touches these
  const [h, setH] = useState(0);
  const [s, setS] = useState(50);
  const [b, setBr] = useState(50);
  const submitted = useRef(false);
  const lastSliderTickRef = useRef(0);

  const tickSlider = useCallback(() => {
    const now = Date.now();
    if (now - lastSliderTickRef.current >= 60) {
      playSliderTick();
      lastSliderTickRef.current = now;
    }
  }, []);

  const onHChange = useCallback((v) => { setH(v); tickSlider(); }, [tickSlider]);
  const onSChange = useCallback((v) => { setS(v); tickSlider(); }, [tickSlider]);
  const onBChange = useCallback((v) => { setBr(v); tickSlider(); }, [tickSlider]);

  // Gradients built from current h/s/b — dense stops so thumb color matches card exactly
  const hueGrad = `linear-gradient(to bottom, ${
    Array.from({ length: 37 }, (_, i) => hsbToHex(i * 10, 100, 100)).join(",")
  })`;
  const satGrad = `linear-gradient(to bottom, ${hsbToHex(h, 100, b)}, ${hsbToHex(h, 0, b)})`;
  const briGrad = `linear-gradient(to bottom, ${hsbToHex(h, s, 100)}, ${hsbToHex(h, s, 0)})`;

  const hex = hsbToHex(h, s, b);
  const l = luma(h, s, b);
  const meta = l > 0.55 ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.3)";
  const btnBg = l > 0.55 ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.88)";
  const btnColor = l > 0.55 ? "#000" : "#111";

  const panelW = isMobile ? Math.round(W * 0.28) : Math.round(W * 0.31);
  const slotW = Math.floor(panelW / 3);
  const lastW = panelW - slotW * 2;

  const handleSubmit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    playSubmit();
    onSubmit([h, s, b], scoreGuess(targetColor, [h, s, b]));
  }, [h, s, b, targetColor, onSubmit]);

  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: 18,
        overflow: "hidden",
        display: "flex",
        animation: "popIn 0.3s ease",
        flexShrink: 0,
      }}
    >
      {/* Slider panel */}
      <div
        style={{
          width: panelW,
          display: "flex",
          flexDirection: "row",
          background: t.panelBg,
          flexShrink: 0,
          overflow: "hidden",
          transition: "background 0.3s",
          WebkitUserSelect: "none",
          userSelect: "none",
          touchAction: "pan-y",
        }}
      >
        <VSlider value={h} min={0} max={360} onChange={onHChange} gradient={hueGrad} slotW={slotW} label="H" />
        <VSlider value={s} min={0} max={100} onChange={onSChange} gradient={satGrad} slotW={slotW} label="S" invert />
        <VSlider value={b} min={0} max={100} onChange={onBChange} gradient={briGrad} slotW={lastW} label="B" invert />
      </div>

      {/* Color preview */}
      <div
        style={{
          flex: 1,
          background: hex,
          position: "relative",
          transition: "background 0.04s",
        }}
      >
        <div style={{ position: "absolute", top: 14, left: 14, fontSize: 11, color: meta, fontWeight: 500, letterSpacing: "0.04em" }}>
          {round} / {totalRounds}
        </div>
        <div style={{ position: "absolute", top: 14, right: 14, fontSize: 9, color: meta, letterSpacing: "0.04em" }}>
          Satur8
        </div>
        <div style={{ position: "absolute", bottom: 60, left: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: meta, fontVariantNumeric: "tabular-nums", letterSpacing: "0.01em" }}>
            {hex.toUpperCase()}
          </div>
          <div style={{ fontSize: 9, color: meta, fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em", marginTop: 2 }}>
            H{h} · S{s} · B{b}
          </div>
        </div>
        <button
          onClick={handleSubmit}
          style={{
            position: "absolute",
            bottom: 14,
            right: 14,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: btnBg,
            border: "none",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 10px rgba(0,0,0,0.28)",
            color: btnColor,
            transition: "transform 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
          onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        >
          <CheckIcon />
        </button>
      </div>
    </div>
  );
}
