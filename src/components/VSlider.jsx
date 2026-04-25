import { useRef, useCallback } from "react";

export default function VSlider({ value, min, max, onChange, gradient, slotW, label }) {
  const trackRef = useRef(null);
  const dragging = useRef(false);

  const getVal = useCallback(
    (clientY) => {
      const r = trackRef.current.getBoundingClientRect();
      // pct: 0 at top, 1 at bottom — drag down = higher value
      const pct = Math.max(0, Math.min(1, (clientY - r.top) / r.height));
      return Math.round(min + pct * (max - min));
    },
    [min, max]
  );

  const onPD = (e) => {
    dragging.current = true;
    trackRef.current.setPointerCapture(e.pointerId);
    onChange(getVal(e.clientY));
  };
  const onPM = (e) => { if (dragging.current) onChange(getVal(e.clientY)); };
  const onPU = () => { dragging.current = false; };

  // thumb sits lower as value increases — matches drag direction
  const thumbPct = ((value - min) / (max - min)) * 100;

  return (
    <div style={{ width: slotW, flex: 1, display: "flex", flexDirection: "column" }}>
      <div
        ref={trackRef}
        onPointerDown={onPD}
        onPointerMove={onPM}
        onPointerUp={onPU}
        style={{
          flex: 1,
          background: gradient,
          position: "relative",
          cursor: "ns-resize",
          userSelect: "none",
          touchAction: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: `${thumbPct}%`,
            transform: "translate(-50%, -50%)",
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            boxShadow: "0 1px 8px rgba(0,0,0,0.55)",
            pointerEvents: "none",
            border: "2px solid rgba(0,0,0,0.12)",
          }}
        />
      </div>
      {label && (
        <div
          style={{
            height: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.5)",
            background: "rgba(0,0,0,0.35)",
            userSelect: "none",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
