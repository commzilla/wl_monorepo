import { useState, useEffect, useCallback, useMemo } from 'react';

interface WelcomeScreenProps {
  onComplete: () => void;
}

interface Star {
  id: number;
  left: string;
  top: string;
  size: string;
  delay: string;
  duration: string;
  // For warp effect: angle and distance from center
  angle: number;
  distance: number;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState(0);
  const [isWarping, setIsWarping] = useState(false);
  const [isFadingIn, setIsFadingIn] = useState(false);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),    // Stars appear
      setTimeout(() => setPhase(2), 1000),   // Logo fades in
      setTimeout(() => setPhase(3), 2000),   // "2.0" reveals
      setTimeout(() => setPhase(4), 2800),   // Rocket launches
      setTimeout(() => setPhase(5), 3600),   // Tagline reveals
      setTimeout(() => setPhase(6), 4400),   // Button appears
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleLaunch = useCallback(() => {
    if (isWarping) return;
    setIsWarping(true);
    // Phase 1: Warp speed (stars stretch into lines, content zooms) - 1s
    // Phase 2: Whole screen smoothly fades out revealing CRM - 1.5s
    setTimeout(() => setIsFadingIn(true), 1000);
    setTimeout(onComplete, 2800);
  }, [onComplete, isWarping]);

  // Generate stars once with angle/distance for warp
  const stars: Star[] = useMemo(() =>
    Array.from({ length: 100 }, (_, i) => {
      const left = Math.random() * 100;
      const top = Math.random() * 100;
      // Calculate angle from center for warp streaks
      const dx = left - 50;
      const dy = top - 50;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      const distance = Math.sqrt(dx * dx + dy * dy);
      return {
        id: i,
        left: `${left}%`,
        top: `${top}%`,
        size: `${Math.random() * 3 + 1}px`,
        delay: `${Math.random() * 3}s`,
        duration: `${Math.random() * 2 + 1.5}s`,
        angle,
        distance,
      };
    }), []);

  // Shooting stars
  const shootingStars = useMemo(() =>
    Array.from({ length: 4 }, (_, i) => ({
      id: i,
      delay: `${i * 2.5 + 1}s`,
      top: `${15 + Math.random() * 40}%`,
    })), []);

  // Warp speed streaks (generated for the hyperspace effect)
  const warpStreaks = useMemo(() =>
    Array.from({ length: 120 }, (_, i) => {
      const angle = Math.random() * 360;
      const rad = angle * (Math.PI / 180);
      const startDist = Math.random() * 5 + 2; // start near center
      const length = Math.random() * 40 + 20; // streak length
      return {
        id: i,
        angle,
        startX: 50 + Math.cos(rad) * startDist,
        startY: 50 + Math.sin(rad) * startDist,
        length,
        width: Math.random() * 2 + 0.5,
        delay: Math.random() * 0.4,
        opacity: Math.random() * 0.6 + 0.4,
      };
    }), []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden ${
        isFadingIn ? 'welcome-screen-fadeout' : ''
      }`}
      style={{ background: 'radial-gradient(ellipse at center, #0a1628 0%, #050d1a 50%, #020409 100%)' }}
    >
      {/* Starfield - stars stretch into lines during warp */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-1500 ${phase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        {stars.map((star) => (
          <div
            key={star.id}
            className={`absolute rounded-full ${isWarping ? '' : 'welcome-star'}`}
            style={{
              left: star.left,
              top: star.top,
              width: isWarping ? `${Math.max(parseFloat(star.size), 2)}px` : star.size,
              height: isWarping ? `${star.distance * 3 + 20}px` : star.size,
              background: isWarping
                ? `linear-gradient(${star.angle + 90}deg, transparent, rgba(147,197,253,0.9), rgba(255,255,255,0.95))`
                : 'radial-gradient(circle, rgba(147,197,253,0.9), rgba(59,130,246,0.3))',
              borderRadius: isWarping ? '2px' : '50%',
              transform: isWarping
                ? `rotate(${star.angle}deg) translateX(${star.distance * 8}px)`
                : 'none',
              transition: isWarping
                ? `all ${0.6 + Math.random() * 0.4}s cubic-bezier(0.23, 1, 0.32, 1)`
                : 'none',
              opacity: isWarping ? 0.9 : undefined,
              animationDelay: isWarping ? undefined : star.delay,
              animationDuration: isWarping ? undefined : star.duration,
            }}
          />
        ))}
      </div>

      {/* Warp speed streaks - only visible during warp */}
      {isWarping && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {warpStreaks.map((streak) => (
            <div
              key={streak.id}
              className="absolute welcome-warp-streak"
              style={{
                left: `${streak.startX}%`,
                top: `${streak.startY}%`,
                width: `${streak.length}vmax`,
                height: `${streak.width}px`,
                transform: `rotate(${streak.angle}deg)`,
                transformOrigin: '0% 50%',
                background: `linear-gradient(90deg, transparent, rgba(147,197,253,${streak.opacity}), rgba(255,255,255,0.9), transparent)`,
                animationDelay: `${streak.delay}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* Shooting stars - hide during warp */}
      {phase >= 1 && !isWarping && shootingStars.map((s) => (
        <div
          key={s.id}
          className="absolute welcome-shooting-star"
          style={{
            top: s.top,
            animationDelay: s.delay,
          }}
        />
      ))}

      {/* Background Planets - large, scattered in the galaxy */}
      <div className={`absolute inset-0 pointer-events-none transition-all duration-1500 ${
        phase >= 1 ? 'opacity-100' : 'opacity-0'
      } ${isWarping ? '!opacity-0 !duration-700' : ''}`}>

        {/* Large planet - bottom left, partially off-screen */}
        <div className="absolute welcome-planet-drift-1"
          style={{ bottom: '-8%', left: '-4%' }}
        >
          <svg viewBox="0 0 300 300" style={{ width: '320px', height: '320px' }}>
            <defs>
              <radialGradient id="planet-lg" cx="40%" cy="35%">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.9" />
                <stop offset="25%" stopColor="#60a5fa" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.7" />
                <stop offset="75%" stopColor="#1d4ed8" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0f1d3a" stopOpacity="0.5" />
              </radialGradient>
              <radialGradient id="planet-lg-glow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="rgba(59,130,246,0.2)" />
                <stop offset="60%" stopColor="rgba(59,130,246,0.05)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <circle cx="150" cy="150" r="150" fill="url(#planet-lg-glow)" />
            <circle cx="150" cy="150" r="120" fill="url(#planet-lg)" />
            {/* Surface bands */}
            <ellipse cx="150" cy="120" rx="110" ry="18" fill="rgba(147,197,253,0.08)" />
            <ellipse cx="150" cy="155" rx="105" ry="14" fill="rgba(29,78,216,0.1)" />
            <ellipse cx="150" cy="180" rx="95" ry="10" fill="rgba(147,197,253,0.06)" />
            {/* Specular highlight */}
            <ellipse cx="120" cy="110" rx="40" ry="25" fill="rgba(191,219,254,0.12)" transform="rotate(-15 120 110)" />
            {/* Atmospheric rim */}
            <circle cx="150" cy="150" r="120" fill="none" stroke="rgba(96,165,250,0.15)" strokeWidth="2" />
          </svg>
        </div>

        {/* Medium planet - top right */}
        <div className="absolute welcome-planet-drift-2"
          style={{ top: '5%', right: '8%' }}
        >
          <svg viewBox="0 0 200 200" style={{ width: '180px', height: '180px' }}>
            <defs>
              <radialGradient id="planet-md" cx="35%" cy="30%">
                <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.85" />
                <stop offset="35%" stopColor="#2563eb" stopOpacity="0.7" />
                <stop offset="70%" stopColor="#1e40af" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#0c1e3a" stopOpacity="0.4" />
              </radialGradient>
              <radialGradient id="planet-md-glow" cx="50%" cy="50%">
                <stop offset="0%" stopColor="rgba(37,99,235,0.15)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="100" fill="url(#planet-md-glow)" />
            <circle cx="100" cy="100" r="75" fill="url(#planet-md)" />
            {/* Planet ring */}
            <ellipse cx="100" cy="100" rx="110" ry="20" fill="none" stroke="rgba(96,165,250,0.12)" strokeWidth="3"
              transform="rotate(-20 100 100)" />
            <ellipse cx="100" cy="100" rx="110" ry="20" fill="none" stroke="rgba(147,197,253,0.06)" strokeWidth="8"
              transform="rotate(-20 100 100)" />
            {/* Surface detail */}
            <ellipse cx="100" cy="85" rx="65" ry="12" fill="rgba(147,197,253,0.08)" />
            <ellipse cx="100" cy="110" rx="60" ry="8" fill="rgba(30,64,175,0.1)" />
            {/* Specular */}
            <ellipse cx="82" cy="78" rx="22" ry="14" fill="rgba(191,219,254,0.1)" transform="rotate(-10 82 78)" />
            <circle cx="100" cy="100" r="75" fill="none" stroke="rgba(96,165,250,0.1)" strokeWidth="1.5" />
          </svg>
        </div>

        {/* Small planet - mid left */}
        <div className="absolute welcome-planet-drift-3"
          style={{ top: '25%', left: '12%' }}
        >
          <svg viewBox="0 0 100 100" style={{ width: '90px', height: '90px' }}>
            <defs>
              <radialGradient id="planet-sm" cx="30%" cy="30%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#0594CC" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#0c4a6e" stopOpacity="0.4" />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="50" fill="rgba(5,148,204,0.08)" />
            <circle cx="50" cy="50" r="36" fill="url(#planet-sm)" />
            <ellipse cx="50" cy="42" rx="30" ry="6" fill="rgba(186,230,253,0.07)" />
            <ellipse cx="42" cy="38" rx="12" ry="7" fill="rgba(186,230,253,0.08)" transform="rotate(-15 42 38)" />
            <circle cx="50" cy="50" r="36" fill="none" stroke="rgba(56,189,248,0.1)" strokeWidth="1" />
          </svg>
        </div>

        {/* Tiny distant planet - right center */}
        <div className="absolute welcome-planet-drift-4"
          style={{ top: '60%', right: '15%' }}
        >
          <svg viewBox="0 0 60 60" style={{ width: '50px', height: '50px' }}>
            <defs>
              <radialGradient id="planet-xs" cx="35%" cy="35%">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.7" />
                <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#1e3a5f" stopOpacity="0.3" />
              </radialGradient>
            </defs>
            <circle cx="30" cy="30" r="30" fill="rgba(59,130,246,0.06)" />
            <circle cx="30" cy="30" r="20" fill="url(#planet-xs)" />
            <ellipse cx="26" cy="25" rx="7" ry="4" fill="rgba(191,219,254,0.08)" />
          </svg>
        </div>

        {/* Another tiny one - top left area, very distant feel */}
        <div className="absolute welcome-planet-drift-5"
          style={{ top: '12%', left: '35%' }}
        >
          <div className="rounded-full"
            style={{
              width: '24px',
              height: '24px',
              background: 'radial-gradient(circle at 30% 30%, rgba(96,165,250,0.6), rgba(37,99,235,0.4), rgba(15,23,42,0.3))',
              boxShadow: '0 0 15px rgba(59,130,246,0.15)',
            }}
          />
        </div>
      </div>

      {/* Nebula glow */}
      <div className={`absolute w-[600px] h-[600px] pointer-events-none rounded-full transition-all ${
        isWarping ? 'duration-500 scale-[3] opacity-0' : 'duration-2000'
      } ${phase >= 2 ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(59,130,246,0.05) 40%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      {/* Subtle blue flash at warp peak - NOT white */}
      <div className={`absolute inset-0 pointer-events-none transition-all ${
        isWarping && !isFadingIn ? 'opacity-60 duration-700' : 'opacity-0 duration-500'
      }`}
        style={{
          background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, rgba(30,58,138,0.2) 50%, transparent 80%)',
        }}
      />

      {/* Main content */}
      <div className={`relative z-30 flex flex-col items-center gap-2 transition-all ${
        isWarping ? 'duration-700 scale-[0.3] opacity-0' : 'duration-300'
      }`}>
        {/* "Welcome to" text */}
        <div className={`transition-all duration-700 ${
          phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <span className="text-blue-300/70 text-lg tracking-[0.3em] uppercase font-light">
            Welcome to
          </span>
        </div>

        {/* Logo + 2.0 container */}
        <div className="flex items-center gap-5 mb-2">
          {/* WeFund Logo */}
          <div className={`transition-all duration-1000 ${
            phase >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
          }`}>
            <img
              src="/wefund-logo.svg"
              alt="WeFund"
              className="h-20 drop-shadow-[0_0_30px_rgba(59,130,246,0.5)] welcome-logo-glow"
            />
          </div>

          {/* 2.0 */}
          <div className={`transition-all duration-700 ${
            phase >= 3 ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-50 -translate-x-8'
          }`}>
            <span
              className="text-7xl font-black tracking-tight welcome-version-text"
              style={{
                background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 30%, #93c5fd 50%, #3b82f6 70%, #1d4ed8 100%)',
                backgroundSize: '200% 200%',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.6))',
              }}
            >
              2.0
            </span>
          </div>
        </div>

        {/* Divider line */}
        <div className={`h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent transition-all duration-1000 my-3 ${
          phase >= 5 ? 'w-80 opacity-100' : 'w-0 opacity-0'
        }`} />

        {/* Tagline */}
        <div className={`transition-all duration-1000 ${
          phase >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}>
          <h2 className="text-2xl font-light tracking-[0.15em] text-blue-100/90">
            The Future of{' '}
            <span className="font-semibold text-transparent bg-clip-text"
              style={{
                background: 'linear-gradient(90deg, #60a5fa, #38bdf8, #60a5fa)',
                backgroundSize: '200% 100%',
                WebkitBackgroundClip: 'text',
                animation: 'welcome-gradient-shift 3s ease infinite',
              }}
            >
              Prop Trading
            </span>
          </h2>
        </div>

        {/* Launch button */}
        <div className={`mt-8 transition-all duration-700 ${
          phase >= 6 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}>
          <button
            onClick={handleLaunch}
            className="group relative px-10 py-3 rounded-full font-medium text-white tracking-wider uppercase text-sm overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(59,130,246,0.5)] active:scale-95"
            style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(37,99,235,0.5))',
              border: '1px solid rgba(96,165,250,0.4)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <span className="relative z-10 flex items-center gap-2">
              Launch CRM
              <svg className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
            {/* Hover glow */}
            <div className="absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(37,99,235,0.4))' }}
            />
          </button>
        </div>
      </div>

      {/* Ambient particles - hide during warp */}
      {phase >= 2 && !isWarping && (
        <div className="absolute inset-0 pointer-events-none">
          {Array.from({ length: 15 }, (_, i) => (
            <div
              key={`particle-${i}`}
              className="absolute welcome-float-particle"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `${10 + Math.random() * 80}%`,
                width: `${Math.random() * 4 + 2}px`,
                height: `${Math.random() * 4 + 2}px`,
                background: `rgba(59,130,246,${Math.random() * 0.3 + 0.1})`,
                borderRadius: '50%',
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 4 + 4}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default WelcomeScreen;
