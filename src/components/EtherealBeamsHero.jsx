import { useEffect, useState } from 'react';

export default function EtherealBeamsHero() {
  const [beams, setBeams] = useState([]);

  useEffect(() => {
    const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#6366f1'];
    const beamArray = [];
    
    for (let i = 0; i < 40; i++) {
      beamArray.push({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 8}s`,
        animationDuration: `${10 + Math.random() * 8}s`,
        color: colors[Math.floor(Math.random() * colors.length)],
        width: `${1 + Math.random() * 2}px`,
        opacity: 0.15 + Math.random() * 0.35
      });
    }
    
    setBeams(beamArray);
  }, []);

  return (
    <div className="relative w-full h-screen bg-[#0a0f1e] overflow-hidden">
      {/* Animated Beams Background */}
      <div className="absolute inset-0">
        {beams.map((beam) => (
          <div
            key={beam.id}
            className="absolute top-0 h-full animate-beam"
            style={{
              left: beam.left,
              width: beam.width,
              background: `linear-gradient(to bottom, transparent 0%, ${beam.color} 50%, transparent 100%)`,
              opacity: beam.opacity,
              animationDelay: beam.animationDelay,
              animationDuration: beam.animationDuration,
              filter: 'blur(0.5px)',
              boxShadow: `0 0 10px ${beam.color}`
            }}
          />
        ))}
      </div>

      {/* Dark overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0f1e]/50 to-[#0a0f1e]" />
      
      {/* Radial gradient for center focus */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(10,15,30,0.8)_70%)]" />

      {/* Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Main Heading */}
          <h1 className="text-7xl md:text-9xl font-bold text-white tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Octus
            </span>
          </h1>
          
          {/* Subheading */}
          <p className="text-xl md:text-2xl text-gray-300 font-light">
            AI-Powered Project Planning & Team Optimization
          </p>
          
          {/* Description */}
          <p className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto">
            Intelligent risk scoring, velocity-based work distribution, and real-time insights 
            to help your team deliver faster and more effectively.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
            <a
              href="/login"
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full font-semibold text-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105"
            >
              Get Started
            </a>
            <a
              href="#features"
              className="px-8 py-4 bg-transparent text-white rounded-full font-semibold text-lg border-2 border-gray-700 hover:border-gray-500 hover:bg-gray-800/30 transition-all duration-300"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0f1e] to-transparent pointer-events-none" />
    </div>
  );
}
