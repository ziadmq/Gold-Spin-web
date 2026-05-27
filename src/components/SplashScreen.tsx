import React, { useEffect, useState } from 'react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'visible' | 'exit'>('enter');

  useEffect(() => {
    // Phase 1: entrance animation (0 → 600ms)
    const t1 = setTimeout(() => setPhase('visible'), 600);
    // Phase 2: hold (600ms → 3200ms)
    // Phase 3: exit animation (3200ms → 4000ms)
    const t2 = setTimeout(() => setPhase('exit'), 3200);
    // Phase 4: unmount (4000ms)
    const t3 = setTimeout(() => onFinish(), 4000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onFinish]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1206 0%, #2d1f06 30%, #1a1206 60%, #0f0b04 100%)',
        opacity: phase === 'exit' ? 0 : 1,
        transition: phase === 'exit' ? 'opacity 0.8s ease-in-out' : 'none',
        overflow: 'hidden',
      }}
    >
      {/* Radial gold glow background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, rgba(197,160,89,0.18) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      {/* Particles */}
      {Array.from({ length: 18 }).map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            width: i % 3 === 0 ? '6px' : '3px',
            height: i % 3 === 0 ? '6px' : '3px',
            borderRadius: '50%',
            background: i % 2 === 0 ? '#ffdea5' : '#c5a059',
            left: `${5 + (i * 5.5) % 90}%`,
            top: `${10 + (i * 7.3) % 80}%`,
            opacity: phase === 'enter' ? 0 : 0.55,
            transform: phase === 'enter' ? 'scale(0)' : 'scale(1)',
            transition: `opacity 1s ease ${i * 0.08}s, transform 1s ease ${i * 0.08}s`,
            animation: phase === 'visible' || phase === 'exit'
              ? `float-particle ${3 + (i % 4)}s ease-in-out infinite alternate`
              : 'none',
          }}
        />
      ))}

      {/* Decorative top line */}
      <div style={{
        width: phase === 'enter' ? '0%' : '140px',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, #c5a059, transparent)',
        marginBottom: '28px',
        transition: 'width 0.8s ease 0.2s',
      }} />

      {/* Arabic welcome text */}
      <div
        dir="rtl"
        style={{
          fontFamily: '"Noto Naskh Arabic", "Amiri", Georgia, serif',
          fontSize: 'clamp(1.1rem, 4vw, 1.6rem)',
          color: '#e9c176',
          letterSpacing: '0.04em',
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(20px)' : 'translateY(0)',
          transition: 'opacity 0.9s ease 0.3s, transform 0.9s ease 0.3s',
          textAlign: 'center',
          marginBottom: '10px',
          fontWeight: 600,
        }}
      >
        أهلاً وسهلاً بكم في
      </div>

      {/* Brand name */}
      <div
        style={{
          fontFamily: '"Playfair Display", Georgia, serif',
          fontSize: 'clamp(2.4rem, 9vw, 4.5rem)',
          fontWeight: 900,
          letterSpacing: '0.06em',
          textAlign: 'center',
          lineHeight: 1.1,
          opacity: phase === 'enter' ? 0 : 1,
          transform: phase === 'enter' ? 'translateY(30px) scale(0.92)' : 'translateY(0) scale(1)',
          transition: 'opacity 1s ease 0.55s, transform 1s cubic-bezier(0.34,1.56,0.64,1) 0.55s',
          background: 'linear-gradient(135deg, #c5a059 0%, #ffdea5 40%, #e9c176 60%, #775a19 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textShadow: 'none',
          paddingBottom: '4px',
        }}
      >
        Angel Perfum
      </div>

      {/* Subtitle tagline */}
      <div
        style={{
          fontFamily: '"Hanken Grotesk", sans-serif',
          fontSize: 'clamp(0.65rem, 2vw, 0.85rem)',
          color: 'rgba(233,193,118,0.55)',
          letterSpacing: '0.25em',
          textTransform: 'uppercase',
          marginTop: '10px',
          opacity: phase === 'enter' ? 0 : 0.8,
          transform: phase === 'enter' ? 'translateY(12px)' : 'translateY(0)',
          transition: 'opacity 0.9s ease 0.85s, transform 0.9s ease 0.85s',
        }}
      >
        Luxury Fragrance
      </div>

      {/* Decorative bottom line */}
      <div style={{
        width: phase === 'enter' ? '0%' : '140px',
        height: '1px',
        background: 'linear-gradient(90deg, transparent, #c5a059, transparent)',
        marginTop: '28px',
        transition: 'width 0.8s ease 0.3s',
      }} />

      {/* Loading dots */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '40px',
        opacity: phase === 'enter' ? 0 : 1,
        transition: 'opacity 0.6s ease 1.2s',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#c5a059',
            animation: phase !== 'enter' ? `dot-bounce 1.4s ease-in-out ${i * 0.22}s infinite` : 'none',
          }} />
        ))}
      </div>

      {/* CSS keyframes via style tag */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Hanken+Grotesk:wght@400;600&family=Noto+Naskh+Arabic:wght@400;600;700&display=swap');

        @keyframes float-particle {
          from { transform: translateY(0px) scale(1); opacity: 0.4; }
          to   { transform: translateY(-18px) scale(1.3); opacity: 0.7; }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
