import React from "react";
import { motion } from "motion/react";
import { playSound } from "../utils/audio";

interface GameUIProps {
  gameState: "menu" | "playing" | "gameover" | "victory";
  onStartGame: () => void;
  playerScore: number;
  difficulty: "easy" | "normal" | "hard";
  onDifficultyChange: (diff: "easy" | "normal" | "hard") => void;
}

export default function GameUI({
  gameState,
  onStartGame,
  playerScore,
  difficulty,
  onDifficultyChange,
}: GameUIProps) {
  if (gameState === "playing") return null;

  const handleStartWithSound = () => {
    playSound("jump");
    onStartGame();
  };

  return (
    <div className="absolute inset-0 bg-slate-950/35 backdrop-blur-md flex flex-col items-center justify-center p-4 z-40 overflow-y-auto">
      {/* 1. START MENU */}
      {gameState === "menu" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="max-w-xl w-full text-center backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 relative z-50"
        >
          {/* Game Branded Title */}
          <div>
            <motion.div
              initial={{ y: -10 }}
              animate={{ y: 0 }}
              transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
              className="text-4xl md:text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-450 via-white to-blue-400 font-sans uppercase filter drop-shadow-[0_2px_10px_rgba(34,211,238,0.3)]"
            >
              AVENTURA DE PLATAFORMAS
            </motion.div>
            <p className="text-white/80 text-sm mt-2 font-mono tracking-wide">
              Domina las físicas, esquiva obstáculos y derrota al Guardián Oscuro
            </p>
          </div>

          <hr className="w-full border-white/10" />

          {/* Difficulty Select */}
          <div className="w-full flex flex-col gap-2">
            <span className="text-xs font-bold text-white/70 uppercase tracking-widest font-mono text-left">
              Seleccionar Dificultad:
            </span>
            <div className="grid grid-cols-3 gap-3">
              {(["easy", "normal", "hard"] as const).map((diff) => {
                const label = diff === "easy" ? "Fácil" : diff === "normal" ? "Normal" : "Difícil";
                const desc =
                  diff === "easy"
                    ? "Menos daño recibido"
                    : diff === "normal"
                    ? "Equilibrio estándar"
                    : "Peligro: ¡Máximo daño!";
                
                const isSelected = difficulty === diff;

                return (
                  <button
                    key={diff}
                    type="button"
                    onClick={() => {
                      playSound("coin");
                      onDifficultyChange(diff);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all cursor-pointer active:scale-95 duration-100 ${
                      isSelected
                        ? "bg-white/20 border-white text-white shadow-xl shadow-cyan-500/10"
                        : "bg-white/5 border-white/10 hover:bg-white/10 text-white/50"
                    }`}
                  >
                    <span className={`font-bold font-mono text-sm ${isSelected ? "text-cyan-300" : "text-slate-200"}`}>
                      {label}
                    </span>
                    <span className="text-[10px] text-white/60 mt-1 font-sans text-center leading-tight">
                      {desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Guidelines on Controls */}
          <div className="w-full backdrop-blur-md bg-white/5 p-4 rounded-2xl border border-white/10 text-left">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 font-mono">
              📥 Instrucciones de juego (Teclado):
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-4 text-xs font-mono text-white/70">
              <div className="flex items-center gap-1.5">
                <kbd className="bg-white/20 border border-white/30 px-1.5 py-0.5 rounded text-white text-[10px]">A / D</kbd>
                <span>Mover Izquierda / Derecha</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="bg-white/20 border border-white/30 px-1.5 py-0.5 rounded text-white text-[10px]">Shift</kbd>
                <span>Mantener para CORRER</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="bg-white/20 border border-white/30 px-1.5 py-0.5 rounded text-white text-[10px]">Espacio / W</kbd>
                <span>Saltar (Soporta doble salto)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <kbd className="bg-white/20 border border-white/30 px-1.5 py-0.5 rounded text-white text-[10px]">J / X / F</kbd>
                <span>⚔️ Ataque de Espada</span>
              </div>
            </div>
          </div>

          {/* Trigger button */}
          <button
            type="button"
            onClick={handleStartWithSound}
            className="w-full py-4 px-6 bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 rounded-2xl font-black font-mono uppercase text-slate-950 tracking-widest text-base hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-cyan-400/20"
          >
            🕹️ ¡Iniciar Juego!
          </button>
        </motion.div>
      )}

      {/* 2. GAME OVER / DEFEAT SCREEN */}
      {gameState === "gameover" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md w-full text-center backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 relative z-50"
        >
          {/* Skeletal skull indicator */}
          <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-3xl shadow-xl">
            💀
          </div>

          <div>
            <h2 className="text-3xl font-black text-red-400 font-sans tracking-tight uppercase">
              FIN DEL JUEGO
            </h2>
            <p className="text-white/80 font-mono text-sm mt-1">
              Tu salud ha llegado a cero. ¡Pero los héroes nunca se rinden!
            </p>
          </div>

          <div className="w-full backdrop-blur-md bg-white/5 p-4 rounded-xl border border-white/10 flex justify-between items-center">
            <span className="text-white/60 font-mono text-xs uppercase font-bold text-left">
              Puntuación Final:
            </span>
            <span className="text-yellow-400 font-mono text-2xl font-black tracking-widest">
              {playerScore}
            </span>
          </div>

          {/* Handy Tip box */}
          <div className="text-left w-full text-white/70 text-xs italic backdrop-blur-md bg-white/5 p-4 rounded-xl border border-white/10">
            <strong className="text-cyan-300 font-sans block mb-1">💡 Consejo útil:</strong>
            {difficulty === "hard"
              ? "Usa el ataque de espada justo cuando el enemigo se acerque para empujarlo (retroceso) antes de que te golpee."
              : "La lava quita salud muy rápido. Usa las plataformas móviles con paciencia y salta alto con los trampolines amarillos."}
          </div>

          <button
            type="button"
            onClick={handleStartWithSound}
            className="w-full py-3.5 bg-red-500 hover:bg-red-400 active:bg-red-600 text-white rounded-xl font-bold font-mono uppercase tracking-widest text-sm transition-all cursor-pointer shadow-lg active:scale-[0.98]"
          >
            🔄 Reintentar Desafío
          </button>
        </motion.div>
      )}

      {/* 3. VICTORY SCREEN */}
      {gameState === "victory" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-lg w-full text-center backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 relative z-50"
        >
          {/* Crown */}
          <div className="w-20 h-20 rounded-full bg-yellow-500/10 border-2 border-yellow-400 flex items-center justify-center text-4xl shadow-lg relative animate-bounce">
            👑
          </div>

          <div>
            <h2 className="text-3xl md:text-4xl font-black text-yellow-400 font-sans tracking-tight uppercase">
              ¡VICTORIA ABSOLUTA!
            </h2>
            <p className="text-white/80 font-mono text-sm mt-1.5">
              Has vencido al imponente Guardián Oscuro y salvado las plataformas de la destrucción sideral.
            </p>
          </div>

          <div className="w-full grid grid-cols-2 gap-3">
            <div className="backdrop-blur-md bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col items-center">
              <span className="text-[10px] font-bold text-white/60 uppercase font-mono">
                Puntuación Acumulada
              </span>
              <span className="text-yellow-450 text-2xl font-black font-mono mt-1">
                {playerScore}
              </span>
            </div>
            <div className="backdrop-blur-md bg-white/5 p-3 rounded-2xl border border-white/10 flex flex-col items-center">
              <span className="text-[10px] font-bold text-white/60 uppercase font-mono">
                Dificultad Superada
              </span>
              <span className="text-green-400 text-sm font-black font-mono mt-2.5 uppercase tracking-wider">
                {difficulty === "easy" ? "Fácil" : difficulty === "normal" ? "Normal" : "Difícil"}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartWithSound}
            className="w-full py-3.5 bg-gradient-to-r from-yellow-450 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 rounded-xl font-bold font-mono uppercase tracking-widest text-sm transition-all cursor-pointer shadow-lg active:scale-[0.98] border border-yellow-300"
          >
            🎮 Jugar de Nuevo
          </button>
        </motion.div>
      )}
    </div>
  );
}
