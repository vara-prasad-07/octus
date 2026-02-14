import { useEffect, useRef } from "react";

const colors = {
  50: "#f8f7f5",
  100: "#e6e1d7",
  200: "#c8b4a0",
  300: "#a89080",
  400: "#8a7060",
  500: "#6b5545",
  600: "#544237",
  700: "#3c4237",
  800: "#2a2e26",
  900: "#1a1d18",
};

export default function HeroSection() {
  const gradientRef = useRef(null);

  useEffect(() => {
    // Animate words with delays
    const words = document.querySelectorAll(".word");
    words.forEach((word) => {
      const delay = parseInt(word.getAttribute("data-delay") || "0", 10);
      word.style.animationDelay = `${delay}ms`;
    });

    // Animate grid lines
    const gridLines = document.querySelectorAll(".grid-line");
    gridLines.forEach((line) => {
      const delay = line.style.animationDelay || "0s";
      line.style.strokeDasharray = "1000";
      line.style.strokeDashoffset = "1000";
      line.style.animation = `grid-draw 2s ease-out forwards ${delay}`;
    });

    // Animate dots
    const dots = document.querySelectorAll(".detail-dot");
    dots.forEach((dot) => {
      const delay = dot.style.animationDelay || "0s";
      dot.style.animation = `pulse-glow 2s ease-out forwards ${delay}`;
    });

    // Animate corner elements
    const corners = document.querySelectorAll(".corner-element");
    corners.forEach((corner) => {
      const delay = corner.style.animationDelay || "0s";
      corner.style.animation = `word-appear 1s ease-out forwards ${delay}`;
    });

    // Mouse gradient
    const gradient = gradientRef.current;
    
    function onMouseMove(e) {
      if (gradient) {
        gradient.style.left = e.clientX - 192 + "px";
        gradient.style.top = e.clientY - 192 + "px";
        gradient.style.opacity = "1";
      }
    }
    
    function onMouseLeave() {
      if (gradient) gradient.style.opacity = "0";
    }
    
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    // Click ripple effect
    function onClick(e) {
      const ripple = document.createElement("div");
      ripple.style.position = "fixed";
      ripple.style.left = e.clientX + "px";
      ripple.style.top = e.clientY + "px";
      ripple.style.width = "4px";
      ripple.style.height = "4px";
      ripple.style.background = "rgba(200, 180, 160, 0.6)";
      ripple.style.borderRadius = "50%";
      ripple.style.transform = "translate(-50%, -50%)";
      ripple.style.pointerEvents = "none";
      ripple.style.animation = "pulse-glow 1s ease-out forwards";
      document.body.appendChild(ripple);
      setTimeout(() => ripple.remove(), 1000);
    }
    document.addEventListener("click", onClick);

    // Floating elements
    const floatingElements = document.querySelectorAll(".floating-element");
    floatingElements.forEach((el, index) => {
      setTimeout(() => {
        el.style.animationPlayState = "running";
      }, 5000 + index * 200);
    });

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1d18] via-black to-[#2a2e26] text-[#e6e1d7] overflow-hidden relative w-full">
      <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path
              d="M 60 0 L 0 0 0 60"
              fill="none"
              stroke="rgba(200,180,160,0.08)"
              strokeWidth="0.5"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <line x1="0" y1="20%" x2="100%" y2="20%" className="grid-line" style={{ animationDelay: "0.5s" }} />
        <line x1="0" y1="80%" x2="100%" y2="80%" className="grid-line" style={{ animationDelay: "1s" }} />
        <line x1="20%" y1="0" x2="20%" y2="100%" className="grid-line" style={{ animationDelay: "1.5s" }} />
        <line x1="80%" y1="0" x2="80%" y2="100%" className="grid-line" style={{ animationDelay: "2s" }} />
        <line
          x1="50%"
          y1="0"
          x2="50%"
          y2="100%"
          className="grid-line"
          style={{ animationDelay: "2.5s", opacity: 0.05 }}
        />
        <line
          x1="0"
          y1="50%"
          x2="100%"
          y2="50%"
          className="grid-line"
          style={{ animationDelay: "3s", opacity: 0.05 }}
        />
        <circle cx="20%" cy="20%" r="2" className="detail-dot" style={{ animationDelay: "3s" }} />
        <circle cx="80%" cy="20%" r="2" className="detail-dot" style={{ animationDelay: "3.2s" }} />
        <circle cx="20%" cy="80%" r="2" className="detail-dot" style={{ animationDelay: "3.4s" }} />
        <circle cx="80%" cy="80%" r="2" className="detail-dot" style={{ animationDelay: "3.6s" }} />
        <circle cx="50%" cy="50%" r="1.5" className="detail-dot" style={{ animationDelay: "4s" }} />
      </svg>

      {/* Corner elements */}
      <div className="corner-element top-8 left-8" style={{ animationDelay: "4s" }}>
        <div
          className="absolute top-0 left-0 w-2 h-2 opacity-30"
          style={{ background: colors[200] }}
        ></div>
      </div>
      <div className="corner-element top-8 right-8" style={{ animationDelay: "4.2s" }}>
        <div
          className="absolute top-0 right-0 w-2 h-2 opacity-30"
          style={{ background: colors[200] }}
        ></div>
      </div>
      <div className="corner-element bottom-8 left-8" style={{ animationDelay: "4.4s" }}>
        <div
          className="absolute bottom-0 left-0 w-2 h-2 opacity-30"
          style={{ background: colors[200] }}
        ></div>
      </div>
      <div className="corner-element bottom-8 right-8" style={{ animationDelay: "4.6s" }}>
        <div
          className="absolute bottom-0 right-0 w-2 h-2 opacity-30"
          style={{ background: colors[200] }}
        ></div>
      </div>

      {/* Floating elements */}
      <div className="floating-element" style={{ top: "25%", left: "15%", animationDelay: "5s" }}></div>
      <div className="floating-element" style={{ top: "60%", left: "85%", animationDelay: "5.5s" }}></div>
      <div className="floating-element" style={{ top: "40%", left: "10%", animationDelay: "6s" }}></div>
      <div className="floating-element" style={{ top: "75%", left: "90%", animationDelay: "6.5s" }}></div>

      <div className="relative z-10 min-h-screen flex flex-col justify-between items-center px-8 py-12 md:px-16 md:py-20">
        {/* Top tagline */}
        <div className="text-center">
          <h2
            className="text-xs md:text-sm font-mono font-light uppercase tracking-[0.2em] opacity-80"
            style={{ color: colors[200] }}
          >
            <span className="word" data-delay="0">Welcome</span>{" "}
            <span className="word" data-delay="200">to</span>{" "}
            <span className="word" data-delay="400"><b>Octus</b></span>{" "}
            <span className="word" data-delay="600">— </span>{" "}
            <span className="word" data-delay="800">Powering</span>{" "}
            <span className="word" data-delay="1000">your</span>{" "}
            <span className="word" data-delay="1200">project</span>{" "}
            <span className="word" data-delay="1400">success.</span>
          </h2>
          <div
            className="mt-4 w-16 h-px opacity-30 mx-auto"
            style={{
              background: `linear-gradient(to right, transparent, ${colors[200]}, transparent)`,
            }}
          ></div>
        </div>

        {/* Main headline */}
        <div className="text-center max-w-5xl mx-auto relative">
          <h1
            className="text-3xl md:text-5xl lg:text-6xl font-extralight leading-tight tracking-tight"
            style={{ color: colors[50] }}
          >
            <div className="mb-4 md:mb-6">
              <span className="word" data-delay="1600">Supercharge</span>{" "}
              <span className="word" data-delay="1750">your</span>{" "}
              <span className="word" data-delay="1900">productivity</span>{" "}
              <span className="word" data-delay="2050">with</span>{" "}
              <span className="word" data-delay="2200">AI-driven</span>{" "}
              <span className="word" data-delay="2350">planning.</span>
            </div>
            <div
              className="text-2xl md:text-3xl lg:text-4xl font-thin leading-relaxed"
              style={{ color: colors[200] }}
            >
              <span className="word" data-delay="2600">Intelligent</span>{" "}
              <span className="word" data-delay="2750">risk</span>{" "}
              <span className="word" data-delay="2900">scoring,</span>{" "}
              <span className="word" data-delay="3050">velocity-based</span>{" "}
              <span className="word" data-delay="3200">work</span>{" "}
              <span className="word" data-delay="3350">distribution,</span>{" "}
              <span className="word" data-delay="3500">and</span>{" "}
              <span className="word" data-delay="3650">real-time</span>{" "}
              <span className="word" data-delay="3800">insights</span>{" "}
              <span className="word" data-delay="3950">for</span>{" "}
              <span className="word" data-delay="4100">modern</span>{" "}
              <span className="word" data-delay="4250">teams.</span>
            </div>
          </h1>
          <div
            className="absolute -left-8 top-1/2 w-4 h-px opacity-20"
            style={{
              background: colors[200],
              animation: "word-appear 1s ease-out forwards",
              animationDelay: "3.5s",
            }}
          ></div>
          <div
            className="absolute -right-8 top-1/2 w-4 h-px opacity-20"
            style={{
              background: colors[200],
              animation: "word-appear 1s ease-out forwards",
              animationDelay: "3.7s",
            }}
          ></div>
        </div>

        {/* Bottom tagline */}
        <div className="text-center">
          <div
            className="mb-4 w-16 h-px opacity-30 mx-auto"
            style={{
              background: `linear-gradient(to right, transparent, ${colors[200]}, transparent)`,
            }}
          ></div>
          <h2
            className="text-xs md:text-sm font-mono font-light uppercase tracking-[0.2em] opacity-80"
            style={{ color: colors[200] }}
          >
            <span className="word" data-delay="4400">Real-time</span>{" "}
            <span className="word" data-delay="4550">analytics,</span>{" "}
            <span className="word" data-delay="4700">seamless</span>{" "}
            <span className="word" data-delay="4850">Firebase</span>{" "}
            <span className="word" data-delay="5000">integration,</span>{" "}
            <span className="word" data-delay="5150">enterprise-grade</span>{" "}
            <span className="word" data-delay="5300">security.</span>
          </h2>
          <div
            className="mt-6 flex justify-center space-x-4 opacity-0"
            style={{
              animation: "word-appear 1s ease-out forwards",
              animationDelay: "5.5s",
            }}
          >
            <a
              href="/login"
              className="px-8 py-3 bg-gradient-to-r from-[#8a7060] to-[#6b5545] text-[#f8f7f5] rounded-full font-medium hover:from-[#a89080] hover:to-[#8a7060] transition-all duration-300 shadow-lg"
            >
              Get Started
            </a>
            <a
              href="#features"
              className="px-8 py-3 bg-transparent text-[#e6e1d7] rounded-full font-medium border-2 border-[#544237] hover:border-[#8a7060] hover:bg-[#2a2e26] transition-all duration-300"
            >
              Learn More
            </a>
          </div>
        </div>
      </div>

      <div
        id="mouse-gradient"
        ref={gradientRef}
        className="fixed pointer-events-none w-96 h-96 rounded-full blur-3xl transition-all duration-500 ease-out opacity-0"
        style={{
          background: `radial-gradient(circle, ${colors[500]}0D 0%, transparent 100%)`,
        }}
      ></div>
    </div>
  );
}
