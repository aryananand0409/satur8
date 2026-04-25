import { useState, useEffect, useRef } from 'react'
import { hsbToHex, luma, scoreGuess, generateColors } from './colorUtils'
import GuessCard from './components/GuessCard'

function flavorText(s) {
  if (s >= 9.5) return 'Dialed in. Perfectly.'
  if (s >= 8.5) return 'Almost pixel-perfect.'
  if (s >= 7)   return 'Pretty close, actually.'
  if (s >= 5)   return 'You got the vibe, not the shade.'
  if (s >= 3)   return 'Your memory is in a different area code.'
  return 'Were you even looking?'
}

// ── Theme ──────────────────────────────────────────────────────────────────────
function makeTheme(dark) {
  return dark ? {
    bg:      '#2b2b2b',
    cardBg:  '#1a1a1a',
    panelBg: '#161616',
    text:    '#e8e4de',
    textDim: 'rgba(232,228,222,0.4)',
    border:  'rgba(232,228,222,0.13)',
    btnBg:   'rgba(232,228,222,0.09)',
    barBg:   'rgba(255,255,255,0.07)',
    shadow:  'none',
  } : {
    bg:      '#f0ede8',
    cardBg:  '#ffffff',
    panelBg: '#e4e0db',
    text:    '#1a1a1a',
    textDim: 'rgba(26,26,26,0.42)',
    border:  'rgba(26,26,26,0.11)',
    btnBg:   'rgba(26,26,26,0.06)',
    barBg:   'rgba(0,0,0,0.07)',
    shadow:  '0 4px 32px rgba(0,0,0,0.09)',
  }
}

// ── Constants ──────────────────────────────────────────────────────────────────
const CARD_W = 520
const CARD_H = 400
const INTRO_W = 480
const INTRO_H = 350
const TOTAL_ROUNDS = 5
const MEMORIZE_MS = 5000

// ── Icons ──────────────────────────────────────────────────────────────────────
function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M13.5 10A6 6 0 016 2.5a.5.5 0 00-.6.65A6 6 0 1013.35 10.6a.5.5 0 00-.65-.6z" fill="currentColor" />
    </svg>
  )
}
function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="3" fill="currentColor" />
      <line x1="8" y1="1"  x2="8"  y2="3"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="13" x2="8"  y2="15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="1" y1="8"  x2="3"  y2="8"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="13" y1="8" x2="15" y2="8"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="3.05"  y1="3.05"  x2="4.46"  y2="4.46"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11.54" y1="11.54" x2="12.95" y2="12.95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12.95" y1="3.05"  x2="11.54" y2="4.46"  stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="4.46"  y1="11.54" x2="3.05"  y2="12.95" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── IntroCard ──────────────────────────────────────────────────────────────────
function IntroCard({ onPlay, t }) {
  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); onPlay() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onPlay])

  return (
    <div style={{
      width: INTRO_W,
      height: INTRO_H,
      borderRadius: 16,
      background: t.cardBg,
      boxShadow: t.shadow,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '32px 40px',
      position: 'relative',
      animation: 'popIn 0.35s ease',
      transition: 'background 0.3s, box-shadow 0.3s',
    }}>
      <div style={{
        fontSize: 11,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: 4,
        fontFamily: 'Inter, sans-serif',
        color: t.text,
        opacity: 0.5,
      }}>
        color memory
      </div>
      <div style={{
        textAlign: 'center',
        maxWidth: 260,
        fontFamily: 'Inter, sans-serif',
        fontSize: 13,
        lineHeight: 2,
        color: t.text,
        opacity: 0.75,
      }}>
        We show you a color for 5 seconds.<br />Then you recreate it from memory.
      </div>
      <button
        onClick={onPlay}
        style={{
          marginTop: 12,
          padding: '10px 36px',
          background: t.btnBg,
          border: `1px solid ${t.border}`,
          color: t.text,
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 500,
          letterSpacing: '0.04em',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.6'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        play
      </button>
      <div style={{ fontSize: 10, color: t.textDim, letterSpacing: '0.04em', opacity: 0.6 }}>
        press space to start
      </div>
      <div style={{
        position: 'absolute',
        bottom: 14,
        right: 16,
        fontSize: 10,
        color: t.textDim,
        letterSpacing: '0.04em',
      }}>
        HueHunt
      </div>
    </div>
  )
}

// ── MemorizeCard ───────────────────────────────────────────────────────────────
function MemorizeCard({ color, round, totalRounds, onDone }) {
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())
  const rafRef = useRef(null)
  const firedRef = useRef(false)

  useEffect(() => {
    startRef.current = Date.now()
    firedRef.current = false
    setElapsed(0)
    const tick = () => {
      const e = Date.now() - startRef.current
      setElapsed(e)
      if (e >= MEMORIZE_MS) {
        if (!firedRef.current) { firedRef.current = true; onDone() }
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [round])

  const remaining = Math.max(0, MEMORIZE_MS - elapsed)
  const countdown = Math.ceil(remaining / 10)
  const display = String(Math.max(0, countdown)).padStart(3, '0')
  const hex = hsbToHex(...color)
  const l = luma(...color)
  const dim    = l > 0.55 ? 'rgba(0,0,0,0.28)'    : 'rgba(255,255,255,0.28)'
  const strong = l > 0.55 ? 'rgba(0,0,0,0.65)'    : 'rgba(255,255,255,0.75)'

  return (
    <div style={{
      width: CARD_W,
      height: CARD_H,
      borderRadius: 16,
      background: hex,
      position: 'relative',
      overflow: 'hidden',
      animation: 'popIn 0.25s ease',
    }}>
      <div style={{
        position: 'absolute',
        top: 16,
        left: 18,
        fontSize: 12,
        color: dim,
        fontWeight: 500,
        letterSpacing: '0.04em',
      }}>
        {round} / {totalRounds}
      </div>

      {/* Timer — top right */}
      <div style={{ position: 'absolute', top: 14, right: 18, textAlign: 'right' }}>
        <div style={{
          fontSize: 96,
          fontWeight: 500,
          lineHeight: 1,
          color: strong,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {display}
        </div>
      </div>

      <div style={{
        position: 'absolute',
        bottom: 14,
        right: 16,
        fontSize: 10,
        color: dim,
        letterSpacing: '0.04em',
      }}>
        HueHunt
      </div>
    </div>
  )
}

// ── ResultCard ─────────────────────────────────────────────────────────────────
function ResultCard({ targetColor, guessColor, score, round, totalRounds, onNext }) {
  const gHex = hsbToHex(...guessColor)
  const tHex = hsbToHex(...targetColor)
  const gl = luma(...guessColor)
  const tl = luma(...targetColor)

  const gInk = gl > 0.55 ? 'rgba(0,0,0,0.78)'  : 'rgba(255,255,255,0.88)'
  const gDim = gl > 0.55 ? 'rgba(0,0,0,0.35)'  : 'rgba(255,255,255,0.38)'
  const tDim = tl > 0.55 ? 'rgba(0,0,0,0.35)'  : 'rgba(255,255,255,0.38)'

  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    const duration = 1100
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setDisplayed((1 - Math.pow(1 - t, 3)) * score)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [score])

  useEffect(() => {
    const handler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); onNext() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onNext])

  return (
    <div style={{
      width: CARD_W,
      height: CARD_H,
      borderRadius: 16,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      animation: 'popIn 0.3s ease',
      flexShrink: 0,
    }}>
      {/* Top half — guess color */}
      <div style={{ flex: 1, background: gHex, position: 'relative', padding: '20px 24px' }}>
        <div style={{ fontSize: 11, color: gDim, letterSpacing: '0.04em' }}>{round} / {totalRounds}</div>

        <div style={{ position: 'absolute', top: 20, right: 24, textAlign: 'right' }}>
          <div style={{ fontSize: 96, fontWeight: 500, lineHeight: 1, color: gInk, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {displayed.toFixed(2)}
          </div>
          <div style={{ fontSize: 18, fontWeight: 500, color: gInk, marginTop: 10, lineHeight: 1.3, maxWidth: 320, textAlign: 'right' }}>
            {flavorText(score)}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 20, left: 24 }}>
          <div style={{ fontSize: 11, color: gDim, marginBottom: 3 }}>Your selection</div>
          <div style={{ fontSize: 13, color: gInk, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            H{guessColor[0]} S{guessColor[1]} B{guessColor[2]}
          </div>
        </div>
      </div>

      {/* Bottom half — original color */}
      <div style={{ flex: 1, background: tHex, position: 'relative', padding: '20px 24px' }}>
        <div style={{ position: 'absolute', bottom: 20, left: 24 }}>
          <div style={{ fontSize: 11, color: tDim, marginBottom: 3 }}>Original</div>
          <div style={{ fontSize: 13, color: tDim, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
            H{targetColor[0]} S{targetColor[1]} B{targetColor[2]}
          </div>
        </div>

        <button
          onClick={onNext}
          style={{
            position: 'absolute', bottom: 20, right: 20,
            width: 52, height: 52, borderRadius: '50%',
            background: '#fff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 12px rgba(0,0,0,0.25)', color: '#111',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
            <path d="M5 2l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── FinalCard ──────────────────────────────────────────────────────────────────
function FinalCard({ scores, colors, guesses, onPlayAgain, onHome, t }) {
  const total = scores.reduce((a, b) => a + b, 0)
  const maxScore = scores.length * 10
  const [copied, setCopied] = useState(false)

  const handleShare = () => {
    const rows = scores.map(s => {
      const blocks = Math.round(s / 10 * 5)
      return '█'.repeat(blocks) + '░'.repeat(5 - blocks)
    }).join('\n')
    navigator.clipboard?.writeText(`HueHunt · ${total.toFixed(2)}/${maxScore}\n${rows}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      width: CARD_W,
      borderRadius: 16,
      overflow: 'hidden',
      background: t.cardBg,
      boxShadow: t.shadow,
      animation: 'popIn 0.35s ease',
      flexShrink: 0,
      transition: 'background 0.3s, box-shadow 0.3s',
    }}>
      {/* Color comparison strip */}
      <div style={{ display: 'flex', height: 52 }}>
        {colors.map((c, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
            <div style={{ flex: 1, background: hsbToHex(...guesses[i]) }} />
            <div style={{ flex: 1, background: hsbToHex(...c) }} />
          </div>
        ))}
      </div>

      {/* Total score */}
      <div style={{ padding: '22px 28px 0', textAlign: 'center' }}>
        <div style={{
          fontSize: 11,
          color: t.textDim,
          letterSpacing: '0.1em',
          marginBottom: 4,
          textTransform: 'uppercase',
        }}>
          total score
        </div>
        <div style={{
          fontSize: 96,
          fontWeight: 500,
          lineHeight: 1,
          letterSpacing: '-0.03em',
          fontVariantNumeric: 'tabular-nums',
          color: t.text,
        }}>
          {total.toFixed(2)}
        </div>
        <div style={{ fontSize: 12, color: t.textDim, marginTop: 3 }}>
          / {maxScore}.00
        </div>
      </div>

      {/* Per-round breakdown */}
      <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 7 }}>
        {scores.map((sc, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 20, height: 20, borderRadius: 4,
              background: hsbToHex(...guesses[i]), flexShrink: 0,
            }} />
            <div style={{
              width: 20, height: 20, borderRadius: 4,
              background: hsbToHex(...colors[i]), flexShrink: 0,
            }} />
            <div style={{
              flex: 1, height: 3, background: t.barBg,
              borderRadius: 2, overflow: 'hidden',
            }}>
              <div style={{
                width: `${sc / 10 * 100}%`,
                height: '100%',
                background: sc >= 8 ? '#5caf7a' : sc >= 5 ? '#c9a94e' : '#b85c5c',
                borderRadius: 2,
                transition: 'width 0.8s ease',
              }} />
            </div>
            <div style={{
              fontSize: 12,
              color: t.textDim,
              width: 34,
              textAlign: 'right',
              flexShrink: 0,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {sc.toFixed(2)}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ padding: '0 22px 22px', display: 'flex', gap: 8 }}>
        <button
          onClick={onHome}
          title="Home"
          style={{
            width: 40, height: 40, flexShrink: 0,
            background: t.btnBg, border: `1px solid ${t.border}`,
            color: t.textDim, borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2 6.5L7 2l5 4.5V12H9.5V8.5h-3V12H2V6.5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={handleShare}
          style={{
            flex: 1, padding: '10px',
            background: t.btnBg, border: `1px solid ${t.border}`,
            color: t.textDim, borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontFamily: 'Inter, sans-serif',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          {copied ? '✓ copied' : 'share'}
        </button>
        <button
          onClick={onPlayAgain}
          style={{
            flex: 1, padding: '10px',
            background: t.btnBg, border: `1px solid ${t.border}`,
            color: t.text, borderRadius: 8, cursor: 'pointer',
            fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          play again
        </button>
      </div>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true)
  const [screen, setScreen] = useState('intro')
  const [colors, setColors] = useState([])
  const [round, setRound] = useState(0)
  const [guesses, setGuesses] = useState([])
  const [scores, setScores] = useState([])
  const [lastGuess, setLastGuess] = useState(null)
  const [lastScore, setLastScore] = useState(null)

  const t = makeTheme(dark)

  const start = () => {
    setColors(generateColors(TOTAL_ROUNDS))
    setRound(0); setGuesses([]); setScores([])
    setScreen('memorize')
  }

  const onGuessSubmit = (guess, score) => {
    setLastGuess(guess); setLastScore(score)
    setGuesses(g => [...g, guess])
    setScores(s => [...s, score])
    setScreen('result')
  }

  const onNext = () => {
    const next = round + 1
    if (next >= TOTAL_ROUNDS) setScreen('final')
    else { setRound(next); setScreen('memorize') }
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: t.bg,
      transition: 'background 0.3s',
      color: t.text,
    }}>
      {/* Header */}
      <header style={{
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setScreen('intro')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, flex: 1,
            fontSize: 14, fontWeight: 700, color: t.text,
            letterSpacing: '-0.01em', fontFamily: 'Inter, sans-serif',
            textAlign: 'left',
          }}
        >
          HueHunt
        </button>
        <button
          onClick={() => setDark(d => !d)}
          title={dark ? 'Switch to light' : 'Switch to dark'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: t.text, display: 'flex', alignItems: 'center',
            padding: '4px', opacity: 0.45, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.45'}
        >
          {dark ? <MoonIcon /> : <SunIcon />}
        </button>
      </header>

      {/* Stage */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        padding: '8px',
      }}>
        {screen === 'intro' && (
          <IntroCard onPlay={start} t={t} />
        )}
        {screen === 'memorize' && colors[round] && (
          <MemorizeCard
            key={`m${round}`}
            color={colors[round]}
            round={round + 1}
            totalRounds={TOTAL_ROUNDS}
            onDone={() => setScreen('guess')}
          />
        )}
        {screen === 'guess' && colors[round] && (
          <GuessCard
            key={`g${round}`}
            targetColor={colors[round]}
            round={round + 1}
            totalRounds={TOTAL_ROUNDS}
            onSubmit={onGuessSubmit}
            W={CARD_W}
            H={CARD_H}
            t={t}
          />
        )}
        {screen === 'result' && lastGuess && (
          <ResultCard
            key={`r${round}`}
            targetColor={colors[round]}
            guessColor={lastGuess}
            score={lastScore}
            round={round + 1}
            totalRounds={TOTAL_ROUNDS}
            onNext={onNext}
          />
        )}
        {screen === 'final' && (
          <FinalCard
            scores={scores}
            colors={colors}
            guesses={guesses}
            onPlayAgain={start}
            onHome={() => setScreen('intro')}
            t={t}
          />
        )}
      </div>

      {/* Footer */}
      <footer style={{
        padding: '10px 20px',
        display: 'flex',
        gap: 14,
        flexShrink: 0,
      }}>
        {['v1.0', 'Privacy', 'Scoring'].map((l, i) => (
          <span key={i} style={{
            fontSize: 10,
            color: t.textDim,
            opacity: 0.6,
            cursor: 'default',
            letterSpacing: '0.03em',
          }}>
            {l}
          </span>
        ))}
      </footer>
    </div>
  )
}
