export default function ScoringCard({ onBack, t }) {
  return (
    <div
      style={{
        width: "100%",
        flex: 1,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        animation: "popIn 0.3s ease",
        padding: "40px 24px 80px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column", gap: 36 }}>

        {/* Back */}
        <button
          onClick={onBack}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: t.textDim, fontSize: 12, fontFamily: "inherit",
            padding: 0, textAlign: "left", letterSpacing: "0.04em",
            transition: "opacity 0.15s", width: "fit-content",
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = "0.5"}
          onMouseLeave={e => e.currentTarget.style.opacity = "1"}
        >
          ← back
        </button>

        {/* Title */}
        <div>
          <div style={{ fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: t.textDim, marginBottom: 10 }}>
            Satur8 · Scoring
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 600, color: t.text, letterSpacing: "-0.02em", lineHeight: 1.2, margin: "0 0 12px" }}>
            How Scoring Works
          </h1>
          <P t={t} dim>Updated Apr 2026</P>
        </div>

        {/* Short version */}
        <Block>
          <H2 t={t}>The short version</H2>
          <P t={t}>
            We don't just compare slider values. Both colors are converted into a color space designed
            to match human vision, then the distance between them is measured using <B t={t}>CIEDE2000</B> — a
            formula from color science that quantifies how different two colors <em>look</em>, not how
            far apart their numbers are. It corrects for known issues where older formulas scored greens,
            blues, and purples unfairly. That distance is shaped into a game score that rewards getting
            the right color family — because remembering "it was a warm orange" is the hardest part,
            and that should count. Five rounds, 0–10 per round, max 50.
          </P>
        </Block>

        <HR t={t} />

        {/* Why not sliders */}
        <Block>
          <H2 t={t}>Why not just compare the slider values?</H2>
          <P t={t}>
            The game picker uses three sliders: Hue, Saturation, and Brightness (HSB). It's tempting
            to just measure how far off each slider is and call it a day. But that would produce scores
            that feel unfair — because human eyes don't see color the way numbers work.
          </P>
          <P t={t}>
            The same numerical difference on a slider can look dramatic or invisible depending on
            context. A 10% brightness shift on a dark color is barely visible. The same shift on a
            bright color is obvious. A 40° hue shift on a saturated color looks completely wrong.
            The same shift on a near-gray is invisible. A scoring system based on raw slider math
            would reward and punish the wrong things. So we use color science instead.
          </P>
        </Block>

        <HR t={t} />

        <P t={t} style={{ fontWeight: 600, color: t.text, opacity: 1, fontSize: 13 }}>
          Four stages: convert to a perceptual color space, measure distance, shape it into a score,
          then adjust for hue accuracy.
        </P>

        {/* Step 1 */}
        <Block>
          <H2 t={t}>1. Color Space Conversion</H2>
          <P t={t}>
            Both colors are converted from HSB to <B t={t}>CIELAB</B> — a color model specifically
            designed so that equal distances correspond to equal perceived differences. It was created
            by the International Commission on Illumination and is the standard model in color science
            for measuring how colors look to people.
          </P>
          <P t={t}>CIELAB has three axes:</P>
          <Table t={t} rows={[
            ["L*", "Lightness — 0 is black, 100 is white. Each step looks equally different to the eye."],
            ["a*", "Green–Red axis. Negative values are green, positive values are red."],
            ["b*", "Blue–Yellow axis. Negative values are blue, positive values are yellow."],
          ]} />
        </Block>

        {/* Step 2 */}
        <Block>
          <H2 t={t}>2. Measuring the Difference</H2>
          <P t={t}>
            With both colors in CIELAB, we measure perceptual distance using <B t={t}>CIEDE2000</B> — the
            most accurate Delta E formula in color science. Unlike the simpler CIE76 (which measures
            straight-line distance in Lab), CIEDE2000 applies corrections for lightness, chroma, and
            hue that match how human vision actually works.
          </P>
          <P t={t}>
            The formula accounts for the fact that we're more sensitive to differences in some color
            regions than others — a hue shift near green looks bigger to us than the same shift near
            blue. CIE76 ignores this, which is why older scoring systems treated greens and purples
            unfairly harshly.
          </P>
          <P t={t}>What does a CIEDE2000 distance actually mean?</P>
          <Code t={t}>{`< 1      Imperceptible to most people
1 – 5    Slight difference. You'd notice up close
5 – 15   Clearly not the same color
15 – 50  Wrong color family entirely
50 +     Unrelated colors`}</Code>
        </Block>

        {/* Step 3 */}
        <Block>
          <H2 t={t}>3. Turning Distance into a Score</H2>
          <P t={t}>
            A raw CIEDE2000 value is a distance, not a game score. We map it to 0–10 using
            an <B t={t}>S-shaped curve</B> that's generous for close matches, punishing for misses,
            and steepest in the middle where differentiation matters most.
          </P>
          <Code t={t}>{"score = 10 / (1 + (dE / 25.25) ^ 1.55)"}</Code>
          <P t={t}>The two constants control the shape:</P>
          <Table t={t} rows={[
            ["25.25", "Midpoint. At a CIEDE2000 distance of 25.25, the score crosses 5/10."],
            ["1.55", "Steepness. How sharply the curve drops off. 1.55 gives a gradual falloff that rewards incremental precision."],
          ]} />
          <P t={t}>
            Precision matters most above 7/10 — you need to be very close to earn a high score,
            but bad guesses all compress toward 1–2.
          </P>
        </Block>

        {/* Step 4 */}
        <Block>
          <H2 t={t}>4. Rewarding Color Memory</H2>
          <P t={t}>
            The base score treats all perceptual errors equally. But in a memory game,
            <B t={t}> remembering the right color family is the hardest part</B> and the most
            satisfying to get right. Two adjustments tilt the score toward hue accuracy.
          </P>

          <H3 t={t}>Hue Recovery</H3>
          <P t={t}>
            If you got the hue right (within ~25°), you earn back some of the points you lost
            from saturation or brightness errors.
          </P>
          <Code t={t}>{`hue accuracy = max(0, 1 − (hueDiff / 25) ^ 1.5)
sat weight   = min(1, avgSat / 30)
recovery     = (10 − base) × hueAccuracy × satWeight × 0.25`}</Code>
          <P t={t}>
            Nailing the hue when brightness or saturation are off can recover 1–2 points.
            On grays (saturation under 30%), recovery fades to zero — hue is visually
            meaningless on desaturated colors.
          </P>

          <H3 t={t}>Hue Penalty</H3>
          <P t={t}>
            If your hue is off by more than 30°, you take a penalty — but only on vivid
            colors where that difference is actually visible.
          </P>
          <Code t={t}>{`penalty factor = max(0, (hueDiff − 30) / 150)
sat weight     = min(1, avgSat / 40)
penalty        = base × penaltyFactor × satWeight × 0.15`}</Code>
          <P t={t}>
            The 30° dead zone means small hue errors are never penalized. Guessing the wrong
            hue on a gray costs nothing.
          </P>

          <H3 t={t}>Final Score</H3>
          <Code t={t}>{"round score = clamp(base + recovery − penalty, 0, 10)"}</Code>
        </Block>

        <HR t={t} />

        {/* Why CIEDE2000 */}
        <Block>
          <H2 t={t}>Why CIEDE2000?</H2>
          <P t={t}>
            Older scoring systems used CIE76 — the simplest Delta E formula, a straight-line
            distance in Lab space. It worked, but it didn't treat all colors equally. A 20° hue
            shift on green produced a CIE76 distance 3× larger than the same shift on blue.
            That meant greens, purples, and cyans were scored unfairly harshly for the same
            quality of guess.
          </P>
          <P t={t}>
            CIEDE2000 corrects for this. The overall difficulty is unchanged — average scores
            across random color pairs are nearly identical — but greens, blues, and purples are
            no longer penalized for being in the wrong part of the color wheel.
          </P>
        </Block>

      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Block({ children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>;
}
function H2({ t, children }) {
  return <h2 style={{ fontSize: 17, fontWeight: 600, color: t.text, margin: 0, letterSpacing: "-0.01em" }}>{children}</h2>;
}
function H3({ t, children }) {
  return <h3 style={{ fontSize: 13, fontWeight: 600, color: t.text, margin: 0, letterSpacing: "-0.01em" }}>{children}</h3>;
}
function P({ t, children, dim }) {
  return (
    <p style={{ fontSize: 13, lineHeight: 1.85, color: t.text, opacity: dim ? 0.45 : 0.72, margin: 0 }}>
      {children}
    </p>
  );
}
function B({ t, children }) {
  return <span style={{ fontWeight: 600, color: t.text, opacity: 1 }}>{children}</span>;
}
function Code({ t, children }) {
  return (
    <pre style={{
      background: t.panelBg, border: `1px solid ${t.border}`,
      borderRadius: 9, padding: "12px 16px", fontSize: 11,
      fontFamily: "monospace", color: t.text, lineHeight: 1.9,
      overflowX: "auto", margin: 0, transition: "background 0.3s",
    }}>
      {children}
    </pre>
  );
}
function HR({ t }) {
  return <div style={{ height: 1, background: t.border }} />;
}
function Table({ t, rows }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, border: `1px solid ${t.border}`, borderRadius: 9, overflow: "hidden" }}>
      {rows.map(([label, desc], i) => (
        <div
          key={i}
          style={{
            display: "flex", gap: 16, padding: "10px 16px",
            borderBottom: i < rows.length - 1 ? `1px solid ${t.border}` : "none",
            background: i % 2 === 0 ? t.panelBg : "transparent",
            transition: "background 0.3s",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: t.text, minWidth: 48, fontFamily: "monospace", flexShrink: 0 }}>
            {label}
          </div>
          <div style={{ fontSize: 12, color: t.text, opacity: 0.65, lineHeight: 1.6 }}>
            {desc}
          </div>
        </div>
      ))}
    </div>
  );
}
