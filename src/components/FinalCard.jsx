import { useState, useEffect, useRef } from "react";
import { hsbToHex } from "../colorUtils";
import { playClick, playFinalFanfare } from "../sounds";

export default function FinalCard({ scores, colors, guesses, onPlayAgain, onHome, W, t, rankData }) {
  const total = scores.reduce((a, b) => a + b, 0);
  const maxScore = scores.length * 10;
  const [copied, setCopied] = useState(false);
  const [displayedRank, setDisplayedRank] = useState(() => Math.floor(Math.random() * 999) + 1);
  const [displayedTotal, setDisplayedTotal] = useState(() => Math.floor(Math.random() * 9999) + 1);
  const intervalRef = useRef(null);

  useEffect(() => { playFinalFanfare(total, maxScore); }, []);

  // Start rolling immediately on mount
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setDisplayedRank(Math.floor(Math.random() * 999) + 1);
      setDisplayedTotal(Math.floor(Math.random() * 9999) + 1);
    }, 80);
    return () => clearInterval(intervalRef.current);
  }, []);

  // When rankData arrives, clear rolling and count up to real values
  useEffect(() => {
    if (!rankData) return;
    clearInterval(intervalRef.current);
    const fromRank = displayedRank;
    const fromTotal = displayedTotal;
    const duration = 800;
    const start = performance.now();
    let animId;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setDisplayedRank(fromRank + (rankData.rank - fromRank) * ease);
      setDisplayedTotal(fromTotal + (rankData.total - fromTotal) * ease);
      if (t < 1) {
        animId = requestAnimationFrame(tick);
      } else {
        setDisplayedRank(rankData.rank);
        setDisplayedTotal(rankData.total);
      }
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [rankData]);

  const handleShare = async () => {
    if (!rankData) return;
    playClick();
    const bars = scores.map((s) => (s >= 8 ? "🟩" : s >= 5 ? "🟨" : "🟥")).join("");
    const text = `HueHunt ${total.toFixed(2)}/50 · ${rankData.rank}/${rankData.total}\n${bars}\nhttps://satur8.vercel.app`;

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      const el = document.createElement('textarea');
      el.value = text;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Same horizontal padding as the buttons row
  const PADDING = 22;
  const squareRowW = W - PADDING * 2;
  const GAP = 3;
  const squareSize = Math.floor((squareRowW - GAP * (colors.length - 1)) / colors.length);

  return (
    <div
      style={{
        width: W,
        borderRadius: 18,
        overflow: "hidden",
        background: t.cardBg,
        animation: "popIn 0.35s ease",
        flexShrink: 0,
        transition: "background 0.3s",
        border: `1px solid ${t.border}`,
      }}
    >
      {/* ── Total score ── */}
      <div style={{
        padding: "24px 22px 16px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}>
        {/* Rank — left */}
        <div style={{ textAlign: "left" }}>
          <div style={{
            fontSize: 10,
            color: t.textDim,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 3,
          }}>
            your rank
          </div>
          <div style={{
            fontSize: 22,
            color: t.textDim,
            letterSpacing: "0.04em",
            fontVariantNumeric: "tabular-nums",
            fontWeight: 500,
            lineHeight: 1,
          }}>
            {Math.round(displayedRank)}/{Math.round(displayedTotal)}
          </div>
        </div>

        {/* Total score — right */}
        <div style={{ textAlign: "right" }}>
          <div style={{
            fontSize: 10,
            color: t.textDim,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 3,
          }}>
            total score
          </div>
          <div style={{
            fontSize: 70,
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: "-0.03em",
            fontVariantNumeric: "tabular-nums",
            color: t.text,
          }}>
            {total.toFixed(2)}
          </div>
          <div style={{ fontSize: 11, color: t.textDim, marginTop: 2 }}>
            / {maxScore}.00
          </div>
        </div>
      </div>

      {/* ── Diagonal squares ── */}
      <div style={{
        padding: `0 ${PADDING}px`,
        marginBottom: 20,
      }}>
        <div style={{ display: "flex", gap: 3 }}>
          {colors.map((targetHsb, i) => {
            const targetHex = hsbToHex(...targetHsb);
            const guessHex = hsbToHex(...guesses[i]);
            const sc = scores[i];

            return (
              <div
                key={i}
                style={{
                  width: squareSize,
                  height: squareSize,
                  position: "relative",
                  overflow: "hidden",
                  flexShrink: 0,
                  borderRadius: 6,
                }}
              >
                <svg
                  width={squareSize}
                  height={squareSize}
                  viewBox={`0 0 ${squareSize} ${squareSize}`}
                  style={{ display: "block" }}
                  preserveAspectRatio="none"
                >
                  {/* Top-left triangle — target color */}
                  <polygon
                    points={`0,0 ${squareSize},0 0,${squareSize}`}
                    fill={targetHex}
                  />
                  {/* Bottom-right triangle — guess color */}
                  <polygon
                    points={`${squareSize},0 ${squareSize},${squareSize} 0,${squareSize}`}
                    fill={guessHex}
                  />
                </svg>

                {/* Score top-left */}
                <div style={{
                  position: "absolute",
                  top: 5,
                  left: 5,
                  fontSize: 10,
                  fontWeight: 600,
                  color: "#fff",
                  letterSpacing: "-0.02em",
                  fontVariantNumeric: "tabular-nums",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  lineHeight: 1,
                }}>
                  {sc.toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ padding: `0 ${PADDING}px ${PADDING}px`, display: "flex", gap: 8 }}>
        <button
          onClick={() => { playClick(); onHome(); }}
          title="Home"
          style={{
            width: 40, height: 40, flexShrink: 0,
            background: t.btnBg, border: `1px solid ${t.border}`,
            color: t.textDim, borderRadius: 9, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.5"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 6.5L7 2l5 4.5V12H9.5V8.5h-3V12H2V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={handleShare}
          disabled={!rankData}
          style={{
            flex: 1, padding: "10px",
            background: t.btnBg, border: `1px solid ${t.border}`,
            color: t.text, fontWeight: 600,
            borderRadius: 9, cursor: rankData ? "pointer" : "not-allowed",
            fontSize: 12, fontFamily: "inherit",
            opacity: rankData ? 1 : 0.35,
            transition: "opacity 0.15s",
          }}
          onMouseEnter={rankData ? e => e.currentTarget.style.opacity = "0.55" : undefined}
          onMouseLeave={rankData ? e => e.currentTarget.style.opacity = "1" : undefined}
        >
          {copied ? "✓ copied" : "share"}
        </button>
        <button
          onClick={() => { playClick(); onPlayAgain(); }}
          style={{
            flex: 1, padding: "10px",
            background: t.btnBg, border: `1px solid ${t.border}`,
            color: t.text, borderRadius: 9, cursor: "pointer",
            fontSize: 12, fontWeight: 600, fontFamily: "inherit",
            transition: "opacity 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.55"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          play again
        </button>
      </div>
    </div>
  );
}
