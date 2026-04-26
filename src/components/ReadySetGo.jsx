import { useState, useEffect } from "react";
import { hsbToHex, luma } from "../colorUtils";

// Phase sequence:
// 0 - READY on black card
// 1 - SET on black card
// 2 - GO on memory card (animating in/out)
// 3 - 250ms silence on memory card
// done → onDone()

const HOLD_MS = 300;
const SLIDE_MS = 0;

export default function ReadySetGo({ color, W, H, onDone }) {
  const [phase, setPhase] = useState(0);
  const [wordPhase, setWordPhase] = useState("enter"); // enter | hold | exit

  const hex = hsbToHex(...color);
  const l = luma(...color);
  const strong = l > 0.55 ? "rgba(0,0,0,0.65)" : "rgba(255,255,255,0.78)";

  // Drive the enter → hold → exit animation for phases 0, 1, 2
  useEffect(() => {
    if (phase > 2) return;
    setWordPhase("enter");
    const t1 = setTimeout(() => setWordPhase("hold"), SLIDE_MS);
    const t2 = setTimeout(() => setWordPhase("exit"), SLIDE_MS + HOLD_MS);
    const t3 = setTimeout(() => setPhase((p) => p + 1), SLIDE_MS + HOLD_MS + SLIDE_MS);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [phase]);

  // Phase 3: 250ms silence then hand off
  useEffect(() => {
    if (phase === 3) {
      const t = setTimeout(() => onDone(), 250);
      return () => clearTimeout(t);
    }
  }, [phase, onDone]);

  const opacity = wordPhase === "hold" ? 1 : 0;

  const textStyle = {
    opacity,
    transition: `opacity ${SLIDE_MS}ms ease`,
    fontFamily: "'Suisse', 'Inter', system-ui, sans-serif",
    fontSize: 48,
    fontWeight: 500,
    lineHeight: 1,
    letterSpacing: "-0.03em",
    fontVariantNumeric: "tabular-nums",
    userSelect: "none",
  };

  const bg = (phase === 0 || phase === 1) ? "#000" : hex;
  const isBlack = phase === 0 || phase === 1;

  return (
    <div
      style={{
        width: W,
        height: H,
        borderRadius: 18,
        background: bg,
        transition: "background 0.25s ease",
        position: "relative",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      <div style={{ position: "absolute", top: 14, right: 18 }}>
        {phase !== 3 && (
          <div style={{ ...textStyle, color: isBlack ? "#fff" : strong }}>
            {phase === 0 ? "ready" : phase === 1 ? "set" : "go"}
          </div>
        )}
      </div>
    </div>
  );
}
