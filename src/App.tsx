import React, { useState } from "react";
import GameCanvas from "./components/GameCanvas";
import GameUI from "./components/GameUI";
import { setVolume } from "./utils/audio";

export default function App() {
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover" | "victory">("menu");
  const [playerScore, setPlayerScore] = useState(0);
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("normal");
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  const handleStartGame = () => {
    setGameState("playing");
  };

  const toggleMute = () => {
    const newMute = !isAudioMuted;
    setIsAudioMuted(newMute);
    setVolume(newMute ? 0 : 0.5);
  };

  return (
    <div id="game-app-wrapper" className="min-h-screen bg-gradient-to-b from-[#1E1B4B] via-[#0F172A] to-[#020617] flex flex-col items-center justify-between text-slate-100 font-sans p-3 md:p-6 overflow-x-hidden selection:bg-indigo-500 selection:text-white relative">
      
      {/* Star Grid decorative visual background layer */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, #4F46E5 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
      <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-blue-900/10 to-transparent pointer-events-none"></div>

      {/* 1. Header Area with Frosted Glass styling */}
      <header className="w-full max-w-5xl flex justify-between items-center backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-5 py-3 shadow-xl mb-4 select-none relative z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)] border border-white/40 flex items-center justify-center font-bold text-sm">
            🛡️
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-indigo-300 to-white leading-none">
              HERO RANGER: PLATFORMER 2D
            </h1>
            <p className="text-[10px] uppercase tracking-widest text-white/60 font-mono mt-0.5 leading-none">
              Control total en tiempo real
            </p>
          </div>
        </div>

        {/* Audio Mute button controller styled with frosted glass */}
        <button
          onClick={toggleMute}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold uppercase transition-all duration-200 cursor-pointer backdrop-blur-md ${
            isAudioMuted
              ? "bg-red-500/20 border-red-500/40 text-red-300 hover:bg-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)]"
              : "bg-white/10 border-white/20 text-white hover:bg-white/20 hover:border-white/30"
          }`}
        >
          {isAudioMuted ? "🔇 Efectos: SILENCIADO" : "🔊 Efectos: ACTIVADO"}
        </button>
      </header>

      {/* 2. Primary game arena wrapper: styled with frosted shadows */}
      <main className="w-full flex-1 flex items-center justify-center max-w-5xl relative rounded-2xl overflow-hidden border border-white/20 bg-slate-950/70 backdrop-blur-sm shadow-2xl z-20">
        <GameCanvas
          gameState={gameState}
          onStateChange={(state) => setGameState(state)}
          playerScore={playerScore}
          onScoreChange={(score) => setPlayerScore(score)}
          difficulty={difficulty}
          onDifficultyChange={setDifficulty}
        />

        <GameUI
          gameState={gameState}
          onStartGame={handleStartGame}
          playerScore={playerScore}
          difficulty={difficulty}
          onDifficultyChange={(diff) => setDifficulty(diff)}
        />
      </main>

      {/* 3. Footer explaining goals, controls and layout in beautiful frosted boxes */}
      <footer className="w-full max-w-5xl mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px] text-white/75 select-none relative z-30">
        
        {/* Goals detail block */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-1.5 shadow-lg">
          <span className="font-bold text-cyan-400 uppercase tracking-wider font-mono">
            🎯 Objetivo del Juego
          </span>
          <p className="leading-relaxed text-white/70">
            Avanza hacia la derecha esquivando los pinchos y pozos de lava. Derrota a los enemigos con tu espada para recolectar monedas.
          </p>
        </div>

        {/* Pro features card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col gap-1.5 shadow-lg">
          <span className="font-bold text-indigo-300 uppercase tracking-wider font-mono">
            ⚔️ El Enfrentamiento Final
          </span>
          <p className="leading-relaxed text-white/70">
            Al final del nivel (3000m) te espera el <strong className="text-pink-400">Guardián Oscuro</strong>, un jefe con ataques especiales y proyectiles de plasma.
          </p>
        </div>

        {/* Helpful status tips card */}
        <div className="backdrop-blur-xl bg-white/10 border border-indigo-400/20 p-4 rounded-xl flex flex-col gap-1.5 animate-pulse shadow-xl">
          <span className="font-bold text-cyan-300 uppercase tracking-wider font-mono flex items-center gap-1">
            ⚡ Consejo Pro
          </span>
          <p className="leading-relaxed text-cyan-200">
            ¡Usa el <strong className="text-white font-extrabold uppercase">Doble Salto</strong> en el aire para cambiar de trayectoria u optimizar tu puntería al atacar!
          </p>
        </div>

      </footer>
    </div>
  );
}
