import { useEffect, useState } from 'react';

interface Particle {
  id: number;
  x: number;
  emoji: string;
  delay: number;
  duration: number;
  size: number;
}

const emojis = ['🌸', '🌺', '🌻', '💐', '🎉', '🎊', '✨', '🌷', '🏵️', '💮', '⭐', '💰', '🥳'];

export default function Confetti() {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const items: Particle[] = Array.from({ length: 45 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
      delay: Math.random() * 2.5,
      duration: 3 + Math.random() * 4,
      size: 18 + Math.random() * 22,
    }));
    setParticles(items);
  }, []);

  return (
    <div id="confetti-container" className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute animate-confetti-fall select-none"
          style={{
            left: `${p.x}%`,
            top: -50,
            fontSize: `${p.size}px`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
}
