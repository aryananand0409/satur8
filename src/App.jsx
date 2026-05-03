import { useState, useEffect, useRef, useCallback } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { hsbToHex, luma, scoreGuess, generateColors } from './colorUtils'
import {
  playClick, playTransition, playMemorizeStart,
  playTick, playTickUrgent, playScoreReveal, playResultJingle,
} from './sounds'
import { submitScore } from './leaderboard'
import GuessCard from './components/GuessCard'
import FinalCard from './components/FinalCard'
import ScoringCard from './components/ScoringCard'

const FLAVOR = {
  perfect: [
    "Photographic memory. Suspicious.",
    "Are you even human?",
    "Perfect. We're watching you.",
  ],
  extraordinary: [
    "Your cones are working overtime.",
    "That's not memory. That's a gift.",
    "Pantone would hire you.",
    "Frighteningly close.",
    "Your eyes don't lie.",
  ],
  excellent: [
    "Almost pixel-perfect.",
    "Your brain held that well.",
    "Color theory runs in your blood.",
    "Close enough to hurt.",
    "You've done this before.",
  ],
  good: [
    "Pretty close, actually.",
    "The vibe was right. The shade, mostly.",
    "You had the right neighborhood.",
    "Solid memory. Imperfect execution.",
    "Not bad. Not great. Honest.",
  ],
  decent: [
    "You got the family, not the face.",
    "Close-ish. In a generous light.",
    "The hue was willing. The eye was weak.",
    "Somewhere in the right timezone.",
    "You got the vibe, not the shade.",
  ],
  off: [
    "That's a cousin, not a twin.",
    "Same neighborhood, wrong house.",
    "Your memory rounded aggressively.",
    "Close enough for horseshoes. Not this.",
    "The color forgives you. We don't.",
  ],
  bad: [
    "Your memory is in a different area code.",
    "Bold choice. Wrong choice.",
    "That's a different color. Entirely.",
    "You saw something. Not that.",
    "Confident. Incorrect. Interesting.",
  ],
  veryBad: [
    "Did you guess with your eyes closed?",
    "That's not even the same temperature.",
    "Warm vs cool. Pick a side.",
    "Your eyes and your brain had a falling out.",
    "We showed you a color. You showed us nothing.",
  ],
  catastrophic: [
    "Were you even looking?",
    "Truly, spectacularly wrong.",
    "A bold tribute to a color that wasn't there.",
    "This will not be spoken of again.",
    "Historical. In the worst way.",
  ],
};

const _lastFlavorIdx = {};

function flavorText(s) {
  const tier =
    s >= 10   ? 'perfect'
  : s >= 9.5  ? 'extraordinary'
  : s >= 8.5  ? 'excellent'
  : s >= 7.5  ? 'good'
  : s >= 6.0  ? 'decent'
  : s >= 4.5  ? 'off'
  : s >= 3.0  ? 'bad'
  : s >= 1.5  ? 'veryBad'
  : 'catastrophic';

  const options = FLAVOR[tier];
  const lastIdx = _lastFlavorIdx[tier] ?? -1;

  let idx;
  do {
    idx = Math.floor(Math.random() * options.length);
  } while (options.length > 1 && idx === lastIdx);

  _lastFlavorIdx[tier] = idx;
  return options[idx];
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
const BASE_W = 520
const BASE_H = 400
const INTRO_W = 480
const INTRO_H = 350
const TOTAL_ROUNDS = 5

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
function IntroCard({ onPlay, t, mode, onModeChange, disabled = false }) {
  useEffect(() => {
    const handler = (e) => {
      if (disabled) return
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); onPlay() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onPlay, disabled])

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
      <div style={{
        display: 'flex',
        background: t.btnBg,
        borderRadius: 999,
        padding: 2,
        gap: 2,
        border: `0.5px solid ${t.border}`,
        marginTop: 4,
      }}>
        {['classic', 'hard'].map(m => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            style={{
              padding: '4px 14px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              fontFamily: 'inherit',
              letterSpacing: '0.04em',
              transition: 'background 0.15s, color 0.15s',
              background: mode === m ? t.text : 'transparent',
              color: mode === m ? t.bg : t.textDim,
              fontWeight: mode === m ? 500 : 400,
            }}
          >
            {m}
          </button>
        ))}
      </div>
      <div style={{
        fontSize: 11,
        color: t.textDim,
        letterSpacing: '0.04em',
        minHeight: 16,
      }}>
        {mode === 'hard' ? '3 seconds to memorize' : '5 seconds to memorize'}
      </div>
      <button
        onClick={() => { playClick(); onPlay(); }}
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
        Satur8
      </div>
    </div>
  )
}

// ── MemorizeCard ───────────────────────────────────────────────────────────────
const HOLD_MS = 300
const SLIDE_MS = 180

function MemorizeCard({ color, round, totalRounds, onDone, W = BASE_W, H = BASE_H, isMobile = false, mode = 'classic' }) {
  const memorizeMs = mode === 'hard' ? 3000 : 5000
  const [stage, setStage] = useState('ready')
  const [wordOpacity, setWordOpacity] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(null)
  const rafRef = useRef(null)
  const firedRef = useRef(false)
  const lastTickSecRef = useRef(-1)

  useEffect(() => { playMemorizeStart() }, [])

  const hex = hsbToHex(...color)
  const l = luma(...color)
  const strong = l > 0.55 ? 'rgba(0,0,0,0.65)' : 'rgba(255,255,255,0.78)'
  const dim = l > 0.55 ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)'

  useEffect(() => {
    const words = ['ready', 'set', 'go', 'silence']
    let current = 0

    const runWord = () => {
      setStage(words[current])
      setWordOpacity(0)
      const t1 = setTimeout(() => setWordOpacity(1), 30)
      const t2 = setTimeout(() => setWordOpacity(0), 30 + HOLD_MS)
      const t3 = setTimeout(() => {
        current += 1
        if (current < words.length) runWord()
        else {
          setStage('timer')
          startRef.current = Date.now()
          firedRef.current = false
        }
      }, 30 + HOLD_MS + SLIDE_MS)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }

    return runWord()
  }, [round])

  useEffect(() => {
    if (stage !== 'timer') return
    lastTickSecRef.current = -1
    const tick = () => {
      const e = Date.now() - startRef.current
      setElapsed(e)
      const wholeSecond = Math.floor(e / 1000)
      if (wholeSecond !== lastTickSecRef.current) {
        lastTickSecRef.current = wholeSecond
        const secsLeft = Math.ceil((memorizeMs - e) / 1000)
        if (secsLeft <= 2) playTickUrgent()
        else playTick()
      }
      if (e >= memorizeMs) {
        if (!firedRef.current) { firedRef.current = true; onDone() }
        return
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [stage])

  const isBlack = stage === 'ready' || stage === 'set'
  const bg = isBlack ? '#000' : hex
  const textColor = isBlack ? '#fff' : strong

  const countdown = Math.ceil((memorizeMs - elapsed) / 10)
  const display = String(Math.max(0, countdown)).padStart(3, '0')
  const timerFontSize = isMobile
    ? Math.min(80, Math.round(W * 0.20))
    : Math.min(80, Math.round(W * 0.22))

  const wordLabel = stage === 'ready' ? 'ready'
                  : stage === 'set'   ? 'set'
                  : stage === 'go'    ? 'go'
                  : null

  return (
    <div style={{
      width: W,
      height: H,
      borderRadius: 18,
      background: bg,
      transition: 'background 0.25s ease',
      position: 'relative',
      overflow: 'hidden',
      flexShrink: 0,
    }}>
      {stage === 'timer' && (
        <div style={{ position: 'absolute', top: 16, left: 18, fontSize: 11, color: dim, fontWeight: 500, letterSpacing: '0.05em' }}>
          {round} / {totalRounds}
        </div>
      )}

      <div style={{ position: 'absolute', top: 14, right: 18, maxWidth: '90%', overflow: 'hidden' }}>
        {wordLabel && (
          <div style={{
            opacity: wordOpacity,
            transition: `opacity ${SLIDE_MS}ms ease`,
            fontSize: timerFontSize,
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            color: isBlack ? '#fff' : strong,
            fontVariantNumeric: 'tabular-nums',
            userSelect: 'none',
            display: 'block',
          }}>
            {wordLabel}
          </div>
        )}
        {stage === 'timer' && (
          <div style={{
            fontSize: timerFontSize,
            fontWeight: 500,
            lineHeight: 1,
            letterSpacing: '-0.03em',
            fontVariantNumeric: 'tabular-nums',
            display: 'flex',
          }}>
            <span style={{ color: strong }}>{display[0]}</span>
            <span style={{ color: l > 0.55 ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.75)' }}>{display[1]}{display[2]}</span>
          </div>
        )}
      </div>

      {stage === 'timer' && (
        <div style={{ position: 'absolute', bottom: 16, right: 18, fontSize: 9, color: dim, letterSpacing: '0.06em' }}>
          Satur8
        </div>
      )}
    </div>
  )
}

// ── ResultCard ─────────────────────────────────────────────────────────────────
function ResultCard({ targetColor, guessColor, score, round, totalRounds, onNext, W = BASE_W, H = BASE_H }) {
  if (!targetColor || !guessColor || score === null || score === undefined) return null

  const gHex = hsbToHex(...guessColor)
  const tHex = hsbToHex(...targetColor)
  const gl = luma(...guessColor)
  const tl = luma(...targetColor)

  const gInk = gl > 0.55 ? 'rgba(0,0,0,0.78)'  : 'rgba(255,255,255,0.88)'
  const gDim = gl > 0.55 ? 'rgba(0,0,0,0.35)'  : 'rgba(255,255,255,0.38)'
  const tDim = tl > 0.55 ? 'rgba(0,0,0,0.35)'  : 'rgba(255,255,255,0.38)'

  const flavorRef = useRef(flavorText(score))
  const [showFlavor, setShowFlavor] = useState(false)

  const [displayed, setDisplayed] = useState(0)
  const rafRef = useRef(null)
  useEffect(() => {
    const t = setTimeout(() => setShowFlavor(true), 250)
    return () => clearTimeout(t)
  }, [])
  useEffect(() => {
    playScoreReveal(score)
    const jingleTimer = setTimeout(() => playResultJingle(score), 700)
    return () => clearTimeout(jingleTimer)
  }, [])
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

  const fontSize = Math.min(80, Math.round((W || BASE_W) * 0.22))

  return (
    <div style={{
      width: W,
      height: H,
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
          <div style={{ fontSize, fontWeight: 500, lineHeight: 1, color: gInk, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums' }}>
            {displayed.toFixed(2)}
          </div>
          <div style={{
            opacity: showFlavor ? 1 : 0,
            transition: 'opacity 0.5s ease',
            fontSize: 18,
            fontWeight: 500,
            color: gInk,
            marginTop: 10,
            lineHeight: 1.3,
            maxWidth: 320,
            textAlign: 'right',
          }}>
            {flavorRef.current}
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
          onClick={() => { playClick(); onNext(); }}
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

// ── App ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(false)
  const [mode, setMode] = useState('classic')
  const [screen, setScreen] = useState('intro')
  const [colors, setColors] = useState([])
  const [round, setRound] = useState(0)
  const [guesses, setGuesses] = useState([])
  const [scores, setScores] = useState([])
  const [lastGuess, setLastGuess] = useState(null)
  const [lastScore, setLastScore] = useState(null)
  const [rankData, setRankData] = useState(null)
  const [showPrivacy, setShowPrivacy] = useState(false)
  const runningTotalRef = useRef(0)
  const [vw, setVw] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1024)
  const [vh, setVh] = useState(() => typeof window !== 'undefined' ? window.innerHeight : 768)

  useEffect(() => {
    const handle = () => { setVw(window.innerWidth); setVh(window.innerHeight) }
    window.addEventListener('resize', handle)
    return () => window.removeEventListener('resize', handle)
  }, [])

  const isMobile = vw < 768
  const HEADER_H = 49
  const FOOTER_H = 41
  const availableH = vh - HEADER_H - FOOTER_H
  const CARD_W = isMobile ? vw - 32 : BASE_W
  const CARD_H = isMobile ? Math.round(availableH * 0.65) : BASE_H

  const t = makeTheme(dark)

  const start = useCallback(() => {
    playTransition()
    setColors(generateColors(TOTAL_ROUNDS, mode))
    setRound(0); setGuesses([]); setScores([]); setRankData(null)
    runningTotalRef.current = 0
    setScreen('memorize')
  }, [mode])

  const onGuessSubmit = (guess, score) => {
    playTransition()
    runningTotalRef.current += score
    setLastGuess(guess); setLastScore(score)
    setGuesses(g => [...g, guess])
    setScores(s => [...s, score])
    setScreen('result')
  }

  const onNext = useCallback(() => {
    playTransition()
    const next = round + 1
    if (next >= TOTAL_ROUNDS) {
      setRankData(null)
      setScreen('final')
      const totalScore = runningTotalRef.current
      if (Number.isFinite(totalScore)) {
        submitScore(totalScore, mode).then(result => setRankData(result ?? null)).catch(() => {})
      }
    } else {
      setRound(next)
      setScreen('memorize')
    }
  }, [round, mode])

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
          onClick={() => { playClick(); setScreen('intro'); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, flex: 1,
            fontSize: 14, fontWeight: 700, color: t.text,
            letterSpacing: '-0.01em', fontFamily: 'Inter, sans-serif',
            textAlign: 'left',
          }}
        >
          Satur8
        </button>
        <button
          onClick={() => { playClick(); setDark(d => !d); }}
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
        alignItems: screen === 'scoring' ? 'flex-start' : 'center',
        justifyContent: 'center',
        overflow: screen === 'scoring' ? 'auto' : 'hidden',
        padding: screen === 'scoring' ? '0' : '20px 12px',
      }}>
        {screen === 'intro' && (
          <IntroCard onPlay={start} t={t} mode={mode} onModeChange={setMode} disabled={showPrivacy} />
        )}
        {screen === 'memorize' && colors[round] && (
          <MemorizeCard
            key={`m${round}`}
            color={colors[round]}
            round={round + 1}
            totalRounds={TOTAL_ROUNDS}
            onDone={() => setScreen('guess')}
            W={CARD_W}
            H={CARD_H}
            isMobile={isMobile}
            mode={mode}
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
            isMobile={isMobile}
            mode={mode}
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
            W={CARD_W}
            H={CARD_H}
          />
        )}
        {screen === 'final' && (
          <FinalCard
            scores={scores}
            colors={colors}
            guesses={guesses}
            onPlayAgain={start}
            onHome={() => setScreen('intro')}
            W={CARD_W}
            t={t}
            rankData={rankData}
          />
        )}
        {screen === 'scoring' && (
          <ScoringCard onBack={() => setScreen('intro')} t={t} />
        )}
      </div>

      {/* Footer */}
      <footer style={{
        padding: '10px 20px',
        display: 'flex',
        gap: 14,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 10, color: t.textDim, opacity: 0.6, letterSpacing: '0.03em' }}>v1.0</span>
        <button
          onClick={() => setShowPrivacy(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 10,
            color: t.textDim,
            opacity: 0.6,
            letterSpacing: '0.03em',
            fontFamily: 'inherit',
            padding: 0,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
        >
          Privacy
        </button>
        <button
          onClick={() => { playClick(); setScreen('scoring'); }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 10,
            color: t.textDim,
            opacity: 0.6,
            letterSpacing: '0.03em',
            fontFamily: 'inherit',
            padding: 0,
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.6'}
        >
          Scoring
        </button>
      </footer>
      <Analytics />

      {showPrivacy && (
        <div
          onClick={() => setShowPrivacy(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 400,
              borderRadius: 16,
              background: t.cardBg,
              border: `0.5px solid ${t.border}`,
              padding: '28px 28px 24px',
              position: 'relative',
              fontFamily: 'Inter, sans-serif',
              animation: 'popIn 0.25s ease',
            }}
          >
            <button
              onClick={() => setShowPrivacy(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: t.textDim,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                borderRadius: 6,
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.5'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            <div style={{
              fontSize: 11,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: t.textDim,
              marginBottom: 16,
            }}>
              privacy
            </div>

            <div style={{
              fontSize: 12,
              lineHeight: 1.9,
              color: t.textDim,
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}>
              <p style={{ margin: 0, color: t.text }}>Satur8 does not collect any personally identifiable information.</p>
              <p style={{ margin: 0 }}>When you complete a game, your total score is submitted anonymously to our leaderboard. No name, no email address, no device identifier, and no IP address is stored alongside your score.</p>
              <p style={{ margin: 0 }}>We do not use cookies for tracking or advertising. We do not share any data with third parties.</p>
              <p style={{ margin: 0 }}>The only data we store is a number — your score — and the time it was submitted. Nothing that could identify you.</p>
              <p style={{
                margin: 0,
                paddingTop: 12,
                borderTop: `0.5px solid ${t.border}`,
                color: t.textDim,
                fontSize: 11,
              }}>
                In short: we know someone scored 34.17. We have no idea who.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
