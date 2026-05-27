import React, { useEffect, useRef, useState } from "react";
import { Camera, Coin, Enemy, Hazard, Particle, Platform, Player } from "../types";
import { playSound } from "../utils/audio";

interface GameCanvasProps {
  gameState: "menu" | "playing" | "gameover" | "victory";
  onStateChange: (state: "menu" | "playing" | "gameover" | "victory") => void;
  playerScore: number;
  onScoreChange: (score: number) => void;
  difficulty: "easy" | "normal" | "hard";
  onDifficultyChange: (difficulty: "easy" | "normal" | "hard") => void;
}

// Level configuration constants
const LEVEL_WIDTH = 3600;
const LEVEL_HEIGHT = 650;
const GRAVITY = 0.5;
const FRICTION = 0.82;

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
}

export default function GameCanvas({
  gameState,
  onStateChange,
  playerScore,
  onScoreChange,
  difficulty,
  onDifficultyChange,
}: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Keyboard controls tracking
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Core entities refs (to handle smooth tick rates inside the canvas loop)
  const playerRef = useRef<Player>({
    x: 100,
    y: 350,
    vx: 0,
    vy: 0,
    width: 32,
    height: 48,
    health: 100,
    maxHealth: 100,
    isGrounded: false,
    facingRight: true,
    isAttacking: false,
    attackTimer: 0,
    attackCooldown: 0,
    damageCooldown: 0,
    isRunning: false,
    score: 0,
    deaths: 0,
  });

  const [localHealth, setLocalHealth] = useState(100);
  const [bossHealth, setBossHealth] = useState<number | null>(null);
  const [bossMaxHealth, setBossMaxHealth] = useState<number>(300);
  const [lives, setLives] = useState(1); // Track deaths
  const [isPaused, setIsPaused] = useState(false);

  const enemiesRef = useRef<Enemy[]>([]);
  const platformsRef = useRef<Platform[]>([]);
  const hazardsRef = useRef<Hazard[]>([]);
  const coinsRef = useRef<Coin[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);

  // Camera settings
  const cameraRef = useRef<Camera>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
  });

  // Lava offset for animation
  const lavaAnimRef = useRef(0);

  // Jump tracking
  const jumpCount = useRef(0);
  const maxJumps = 2; // Double jump!

  // Check state and trigger sound/vibe on game loading
  useEffect(() => {
    if (gameState === "playing") {
      resetGame();
      setIsPaused(false);
    }
  }, [gameState, difficulty]);

  // Handle window resizing
  const [dimensions, setDimensions] = useState({ width: 1000, height: 500 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth } = containerRef.current;
        // Keep standard height around 480px to 550px
        const height = Math.min(window.innerHeight - 250, 520);
        setDimensions({
          width: Math.max(700, clientWidth),
          height: Math.max(400, height),
        });
      }
    };

    handleResize();
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // Setup level elements
  const initLevel = () => {
    // 1. Setup Platforms
    const platforms: Platform[] = [
      // Floor sections (some gaps for spikes/lava)
      { x: 0, y: 550, width: 600, height: 100, type: "normal", color: "#2d3748" },
      { x: 750, y: 550, width: 400, height: 100, type: "normal", color: "#2d3748" },
      { x: 1300, y: 550, width: 600, height: 100, type: "normal", color: "#2d3748" },
      { x: 2050, y: 550, width: 350, height: 100, type: "normal", color: "#2d3748" },
      // Boss arena ground (very large flat area at the end)
      { x: 2550, y: 550, width: 1100, height: 100, type: "normal", color: "#1a202c" },

      // Introductory Floating Platforms
      { x: 250, y: 430, width: 140, height: 20, type: "normal", color: "#4a5568" },
      { x: 450, y: 340, width: 120, height: 20, type: "normal", color: "#4a5568" },

      // Bouncy mushroom spring platform over first lava gap
      { x: 670, y: 520, width: 50, height: 15, type: "bouncy", bouncyPower: 12, color: "#e53e3e" },

      // Dangerous gap platforms
      { x: 820, y: 420, width: 120, height: 20, type: "normal", color: "#4a5568" },
      { x: 1000, y: 330, width: 120, height: 20, type: "normal", color: "#4a5568" },
      
      // Moving platform in the second gap
      {
        x: 1180,
        y: 440,
        width: 130,
        height: 18,
        type: "moving",
        vx: 1.5,
        rangeX: [1150, 1290],
        originalX: 1180,
        color: "#319795",
      },

      // Mid-level tower ascending platform
      { x: 1450, y: 440, width: 150, height: 20, type: "normal", color: "#4a5568" },
      { x: 1650, y: 340, width: 150, height: 20, type: "normal", color: "#4a5568" },
      { x: 1500, y: 240, width: 220, height: 20, type: "normal", color: "#4a5568" },

      // Bouncy platform to jump onto high floating sections
      { x: 1850, y: 520, width: 50, height: 15, type: "bouncy", bouncyPower: 14, color: "#ed8936" },
      { x: 1840, y: 280, width: 100, height: 20, type: "normal", color: "#4a5568" },

      // moving platform over the lava pit before Boss Arena
      {
        x: 2100,
        y: 350,
        width: 140,
        height: 18,
        type: "moving",
        vx: 2,
        rangeX: [1980, 2450],
        originalX: 2100,
        color: "#319795",
      },

      { x: 2450, y: 420, width: 100, height: 20, type: "normal", color: "#4c51bf" },
    ];

    // Adjust parameters depending on difficulty
    const dmgMultiplier = difficulty === "easy" ? 0.6 : difficulty === "hard" ? 1.5 : 1.0;

    // 2. Setup Hazards (spikes on the ground, massive lava pits)
    const hazards: Hazard[] = [
      // Spike traps on floor
      { x: 380, y: 535, width: 60, height: 15, type: "spikes", color: "#a0aec0" },
      { x: 1500, y: 535, width: 120, height: 15, type: "spikes", color: "#a0aec0" },

      // Lava Pit 1 (Gap between floor 1 and 2)
      { x: 600, y: 565, width: 150, height: 85, type: "lava", color: "#f56565" },
      // Lava Pit 2 (Gap between floor 2 and 3)
      { x: 1150, y: 565, width: 150, height: 85, type: "lava", color: "#f56565" },
      // Lava Pit 3 (Gap between floor 3 and 4)
      { x: 1900, y: 565, width: 150, height: 85, type: "lava", color: "#f56565" },
      { x: 2400, y: 565, width: 150, height: 85, type: "lava", color: "#f56565" },
    ];

    // 3. Setup Patrol Enemies
    const enemies: Enemy[] = [
      // Intro Slugs
      {
        id: "slug_1",
        type: "slug",
        x: 350,
        y: 518,
        vx: 1.0,
        vy: 0,
        width: 32,
        height: 32,
        health: 30,
        maxHealth: 30,
        startX: 300,
        patrolRange: 150,
        facingRight: true,
        damageCooldown: 0,
        attackCooldown: 0,
        color: "#48bb78",
        isAggro: false,
        shakeTimer: 0,
      },
      {
        id: "slug_2",
        type: "slug",
        x: 500,
        y: 308,
        vx: 0.8,
        vy: 0,
        width: 32,
        height: 32,
        health: 30,
        maxHealth: 30,
        startX: 450,
        patrolRange: 110,
        facingRight: true,
        damageCooldown: 0,
        attackCooldown: 0,
        color: "#48bb78",
        isAggro: false,
        shakeTimer: 0,
      },

      // Knights (Smarter, patrol bigger areas, alert on close proximity)
      {
        id: "knight_1",
        type: "knight",
        x: 850,
        y: 502,
        vx: 1.4,
        vy: 0,
        width: 36,
        height: 48,
        health: 60,
        maxHealth: 60,
        startX: 780,
        patrolRange: 280,
        facingRight: true,
        damageCooldown: 0,
        attackCooldown: 0,
        color: "#4299e1",
        isAggro: false,
        shakeTimer: 0,
      },
      {
        id: "knight_2",
        type: "knight",
        x: 1680,
        y: 192,
        vx: 1.5,
        vy: 0,
        width: 36,
        height: 48,
        health: 70,
        maxHealth: 70,
        startX: 1520,
        patrolRange: 180,
        facingRight: true,
        damageCooldown: 0,
        attackCooldown: 0,
        color: "#4299e1",
        isAggro: false,
        shakeTimer: 0,
      },

      // Giant BOSS enemy (at the deep end of the level)
      {
        id: "boss_final",
        type: "boss",
        x: 3000,
        y: 450,
        vx: 1.2,
        vy: 0,
        width: 64,
        height: 96,
        health: difficulty === "easy" ? 200 : difficulty === "hard" ? 400 : 300,
        maxHealth: difficulty === "easy" ? 200 : difficulty === "hard" ? 400 : 300,
        startX: 2750,
        patrolRange: 600,
        facingRight: false,
        damageCooldown: 0,
        attackCooldown: 0,
        color: "#9f7aea", // Regal dark-purple boss
        isAggro: true,
        shakeTimer: 0,
      },
    ];

    // 4. Setup Coins to collect
    const coins: Coin[] = [];
    const coinPlacements = [
      // Introduction
      { x: 280, y: 380 }, { x: 320, y: 360 }, { x: 360, y: 380 },
      // First Gap jump
      { x: 620, y: 460 }, { x: 670, y: 410 }, { x: 720, y: 460 },
      // Above tower platforms
      { x: 880, y: 380 }, { x: 1060, y: 280 },
      // Moving Platforms track
      { x: 1200, y: 350 }, { x: 1245, y: 350 }, { x: 1290, y: 350 },
      // Climb sections
      { x: 1520, y: 400 }, { x: 1720, y: 300 },
      // Highest top platform
      { x: 1550, y: 180 }, { x: 1610, y: 180 }, { x: 1670, y: 180 },
      // Jump towards boss
      { x: 1890, y: 220 }, { x: 2150, y: 280 }, { x: 2250, y: 280 },
    ];

    coinPlacements.forEach((cp, index) => {
      coins.push({
        x: cp.x,
        y: cp.y,
        radius: 8,
        isCollected: false,
        bobOffset: index * 0.5,
      });
    });

    setBossMaxHealth(difficulty === "easy" ? 200 : difficulty === "hard" ? 400 : 300);
    setBossHealth(null); // Wait until player meets boss to show bar

    platformsRef.current = platforms;
    hazardsRef.current = hazards;
    enemiesRef.current = enemies;
    coinsRef.current = coins;
    projectilesRef.current = [];
    particlesRef.current = [];
  };

  const resetGame = () => {
    playerRef.current = {
      x: 100,
      y: 350,
      vx: 0,
      vy: 0,
      width: 32,
      height: 48,
      health: 100,
      maxHealth: 100,
      isGrounded: false,
      facingRight: true,
      isAttacking: false,
      attackTimer: 0,
      attackCooldown: 0,
      damageCooldown: 0,
      isRunning: false,
      score: 0,
      deaths: 0,
    };
    jumpCount.current = 0;
    cameraRef.current = { x: 0, y: 0, targetX: 0, targetY: 0 };
    initLevel();
    setLocalHealth(100);
    onScoreChange(0);
  };

  // Particle creator Helper
  const spawnParticles = (
    x: number,
    y: number,
    color: string,
    count: number,
    speedFactor: number = 3,
    size: number = 3
  ) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.5 + Math.random() * 0.9) * speedFactor;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (Math.random() * 1.5), // fly up slightly
        size: (0.6 + Math.random() * 0.8) * size,
        color,
        alpha: 1,
        life: 0,
        maxLife: 20 + Math.floor(Math.random() * 30),
      });
    }
  };

  // Keyboard Event Binds
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[e.key] = true;
      keysRef.current[key] = true;

      // Handle Instant Actions like Jump
      if (gameState === "playing") {
        const player = playerRef.current;
        if (e.key === " " || key === "w" || e.key === "ArrowUp") {
          e.preventDefault();
          triggerJump();
        }
        if (key === "j" || key === "x" || key === "f") {
          e.preventDefault();
          triggerAttack();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[e.key] = false;
      keysRef.current[key] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState]);

  // Handle Touch/Virtual Click Actions
  const triggerJump = () => {
    const player = playerRef.current;
    if (gameState !== "playing") return;

    if (player.isGrounded) {
      player.vy = -11.5;
      player.isGrounded = false;
      jumpCount.current = 1;
      playSound("jump");
      spawnParticles(player.x + player.width / 2, player.y + player.height, "#e2e8f0", 8, 2);
    } else if (jumpCount.current < maxJumps) {
      // Double Jump!
      player.vy = -10.5;
      jumpCount.current++;
      playSound("jump");
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, "#93c5fd", 12, 3, 4);
    }
  };

  const triggerAttack = () => {
    const player = playerRef.current;
    if (gameState !== "playing" || player.attackCooldown > 0) return;

    player.isAttacking = true;
    player.attackTimer = 10; // active for 10 frames
    player.attackCooldown = 22; // ticks cooldown
    playSound("hit");

    // Attack splash checks
    const attackRange = 75;
    const attackHeight = 60;
    const attackX = player.facingRight ? player.x + player.width : player.x - attackRange;
    const attackY = player.y + player.height / 2 - attackHeight / 2;

    // Spark dash particles
    spawnParticles(
      player.facingRight ? player.x + player.width + 10 : player.x - 10,
      player.y + player.height / 2,
      "#38bdf8",
      6,
      4
    );

    // Hit enemies
    enemiesRef.current.forEach((enemy) => {
      if (enemy.health <= 0) return;

      // Check damage box overlaps
      const inRangeX = enemy.x + enemy.width > attackX && enemy.x < attackX + attackRange;
      const inRangeY = enemy.y + enemy.height > attackY && enemy.y < attackY + attackHeight;

      if (inRangeX && inRangeY) {
        // We hit the enemy!
        const isBoss = enemy.type === "boss";
        const enemyDmg = 25; // standard light hits
        enemy.health -= enemyDmg;
        enemy.shakeTimer = 8; // Flash shake
        
        // Spawn sparks
        spawnParticles(
          enemy.x + enemy.width / 2,
          enemy.y + enemy.height / 2,
          isBoss ? "#c084fc" : "#f472b6",
          15,
          isBoss ? 5 : 3,
          5
        );

        if (isBoss) {
          playSound("bossHit");
          setBossHealth(Math.max(0, enemy.health));
        } else {
          playSound("hit");
        }

        // Apply knockback to enemy
        const kbDir = player.facingRight ? 4 : -4;
        enemy.vx = kbDir;

        // Bounce player slightly in mid-air if attacking enemy
        if (!player.isGrounded) {
          player.vy = -3.5;
        }

        // Enemy defeat check
        if (enemy.health <= 0) {
          spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, enemy.color, 25, 6, 6);
          
          if (isBoss) {
            playSound("win");
            onStateChange("victory");
          } else {
            playSound("coin");
            onScoreChange(playerScore + 100);
            player.score += 100;
          }
        }
      }
    });
  };

  // Main Canvas Loop
  useEffect(() => {
    let animId: number;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameTick = () => {
      if (gameState === "playing" && !isPaused) {
        updatePhysics();
      }
      renderGame(ctx);
      animId = requestAnimationFrame(gameTick);
    };

    animId = requestAnimationFrame(gameTick);
    return () => cancelAnimationFrame(animId);
  }, [gameState, playerScore, dimensions, difficulty, isPaused]);

  // Main Physics update subroutines
  const updatePhysics = () => {
    const player = playerRef.current;
    lavaAnimRef.current += 0.05;

    // 1. Cooldown Tickers
    if (player.attackTimer > 0) player.attackTimer--;
    else player.isAttacking = false;

    if (player.attackCooldown > 0) player.attackCooldown--;
    if (player.damageCooldown > 0) player.damageCooldown--;

    // 2. Determine Running State & Speed values
    // Check key inputs (A/D or Arrows)
    let moveDir = 0;
    if (keysRef.current["a"] || keysRef.current["ArrowLeft"]) {
      moveDir = -1;
      player.facingRight = false;
    } else if (keysRef.current["d"] || keysRef.current["ArrowRight"]) {
      moveDir = 1;
      player.facingRight = true;
    }

    const isSprintKey = keysRef.current["Shift"];
    player.isRunning = isSprintKey && moveDir !== 0;

    // Acceleration & Limits
    const accel = player.isRunning ? 0.8 : 0.45;
    const maxSpeed = player.isRunning ? 6.5 : 4.0;

    if (moveDir !== 0) {
      player.vx += moveDir * accel;
      // Cap horizontal speed safely
      if (Math.abs(player.vx) > maxSpeed) {
        player.vx = Math.sign(player.vx) * maxSpeed;
      }

      // Spawn subtle dust trail
      if (player.isGrounded && Math.random() < (player.isRunning ? 0.35 : 0.1)) {
        particlesRef.current.push({
          x: player.x + (player.facingRight ? 4 : player.width - 4),
          y: player.y + player.height,
          vx: -player.vx * 0.3 + (Math.random() - 0.5) * 0.5,
          vy: -Math.random() * 1.5,
          size: 2 + Math.random() * 3,
          color: "#cbd5e1",
          alpha: 0.7,
          life: 0,
          maxLife: 15,
        });
      }
    } else {
      // Natural surface friction
      player.vx *= FRICTION;
      if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    // Apply gravity
    player.vy += GRAVITY;

    // Horizontal positioning
    player.x += player.vx;

    // Left boundary cap
    if (player.x < 0) {
      player.x = 0;
      player.vx = 0;
    }
    // Right boundary cap
    if (player.x > LEVEL_WIDTH - player.width) {
      player.x = LEVEL_WIDTH - player.width;
      player.vx = 0;
    }

    // Horizontal collision check - with Platforms
    platformsRef.current.forEach((platform) => {
      // Bouncy and moving platforms are also solid on surface, but let's check basic solid top and side logic
      const isOverlappingX = player.x + player.width > platform.x && player.x < platform.x + platform.width;
      const isOverlappingY = player.y + player.height > platform.y && player.y < platform.y + platform.height;

      if (isOverlappingX && isOverlappingY) {
        // Resolve horizontal collision (push player back)
        if (player.vx > 0 && player.x + player.width - player.vx <= platform.x) {
          player.x = platform.x - player.width;
          player.vx = 0;
        } else if (player.vx < 0 && player.x - player.vx >= platform.x + platform.width) {
          player.x = platform.x + platform.width;
          player.vx = 0;
        }
      }
    });

    // Vertical positioning
    player.y += player.vy;
    player.isGrounded = false;

    // Vertical collision with Platforms
    platformsRef.current.forEach((platform) => {
      const isOverlappingX = player.x + player.width > platform.x && player.x < platform.x + platform.width;
      const isOverlappingY = player.y + player.height > platform.y && player.y < platform.y + platform.height;

      if (isOverlappingX && isOverlappingY) {
        // Falling down on platform top
        if (player.vy > 0 && player.y + player.height - player.vy <= platform.y + 4) {
          player.y = platform.y - player.height;
          player.vy = 0;
          player.isGrounded = true;
          jumpCount.current = 0;

          // Special platform interactions!
          if (platform.type === "bouncy") {
            player.vy = -(platform.bouncyPower || 11.0);
            player.isGrounded = false;
            playSound("jump");
            spawnParticles(platform.x + platform.width / 2, platform.y, "#fbbf24", 15, 3, 5);
          } else if (platform.type === "moving" && platform.vx) {
            // Carry player along with platform movement velocity
            player.x += platform.vx;
          }
        }
        // Jumping up and hitting platform roof
        else if (player.vy < 0 && player.y - player.vy >= platform.y + platform.height - 4) {
          player.y = platform.y + platform.height;
          player.vy = 0.5; // stop upward impulse
        }
      }
    });

    // Void out of bounds check
    if (player.y > LEVEL_HEIGHT) {
      handlePlayerDamage(100, "pit"); // Instant death in abyss
    }

    // 3. Coins Collection
    coinsRef.current.forEach((coin) => {
      if (coin.isCollected) return;

      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;
      const distance = Math.hypot(px - coin.x, py - coin.y);

      if (distance < coin.radius + 18) {
        coin.isCollected = true;
        playSound("coin");
        onScoreChange(playerScore + 50);
        player.score += 50;
        spawnParticles(coin.x, coin.y, "#fbbf24", 12, 2.5, 4.5);
      }
    });

    // 4. Moving platforms update
    platformsRef.current.forEach((plat) => {
      if (plat.type === "moving" && plat.vx && plat.rangeX && plat.originalX !== undefined) {
        plat.x += plat.vx;
        if (plat.x < plat.rangeX[0]) {
          plat.x = plat.rangeX[0];
          plat.vx = -plat.vx;
        } else if (plat.x > plat.rangeX[1]) {
          plat.x = plat.rangeX[1];
          plat.vx = -plat.vx;
        }
      }
    });

    // 5. Hazards Contact
    hazardsRef.current.forEach((hazard) => {
      const isOverlappingX = player.x + player.width > hazard.x && player.x < hazard.x + hazard.width;
      const isOverlappingY = player.y + player.height > hazard.y && player.y < hazard.y + hazard.height;

      if (isOverlappingX && isOverlappingY) {
        if (hazard.type === "spikes") {
          // Spike triggers high knockback
          handlePlayerDamage(difficulty === "easy" ? 15 : difficulty === "hard" ? 35 : 24, "hazard", -Math.sign(player.vx) * 5);
        } else if (hazard.type === "lava") {
          // Melt continuously
          handlePlayerDamage(difficulty === "easy" ? 1.5 : difficulty === "hard" ? 4.0 : 2.5, "lava", 0, -5);
        }
      }
    });

    // 6. Enemies logic
    const playerMidX = player.x + player.width / 2;
    const playerMidY = player.y + player.height / 2;

    enemiesRef.current.forEach((enemy) => {
      if (enemy.health <= 0) return;

      // Update timers
      if (enemy.damageCooldown > 0) enemy.damageCooldown--;
      if (enemy.shakeTimer > 0) enemy.shakeTimer--;
      if (enemy.attackCooldown > 0) enemy.attackCooldown--;

      // Render boss indicators & Aggro logic
      if (enemy.type === "boss") {
        const distToBoss = Math.abs(playerMidX - (enemy.x + enemy.width / 2));
        if (distToBoss < 700) {
          // Activate boss health bar!
          if (bossHealth === null) {
            setBossHealth(enemy.health);
          }
        }
      }

      // Check Proximity Alert for Knights
      if (enemy.type === "knight") {
        const dx = Math.abs(playerMidX - (enemy.x + enemy.width / 2));
        const dy = Math.abs(playerMidY - (enemy.y + enemy.height / 2));
        if (dx < 200 && dy < 120) {
          // Charge player!
          enemy.isAggro = true;
          // Speed up slightly towards player direction
          const chaseSpeed = 2.2;
          const chaseDir = playerMidX > enemy.x ? 1 : -1;
          enemy.vx = chaseDir * chaseSpeed;
          enemy.facingRight = chaseDir > 0;
        } else {
          enemy.isAggro = false;
        }
      }

      // Default Patrol Movement
      if (!enemy.isAggro && enemy.type !== "boss") {
        enemy.x += enemy.vx;
        if (enemy.x < enemy.startX) {
          enemy.x = enemy.startX;
          enemy.vx = -enemy.vx;
          enemy.facingRight = true;
        } else if (enemy.x > enemy.startX + enemy.patrolRange) {
          enemy.x = enemy.startX + enemy.patrolRange;
          enemy.vx = -enemy.vx;
          enemy.facingRight = false;
        }
      }

      // Boss complex attack routine!
      if (enemy.type === "boss") {
        enemy.x += enemy.vx;
        // Restrict boss within boss arena boundaries
        if (enemy.x < 2600) {
          enemy.x = 2600;
          enemy.vx = -enemy.vx;
          enemy.facingRight = true;
        } else if (enemy.x > LEVEL_WIDTH - enemy.width - 50) {
          enemy.x = LEVEL_WIDTH - enemy.width - 50;
          enemy.vx = -enemy.vx;
          enemy.facingRight = false;
        }

        // Periodic Attack cooldown logic
        if (enemy.attackCooldown <= 0) {
          // Pick a random special move
          const randAttack = Math.random();
          if (randAttack < 0.4) {
            // Charge dash!
            enemy.vx = enemy.facingRight ? 12 : -12;
            enemy.attackCooldown = 150; // frames
            spawnParticles(enemy.x + enemy.width / 2, enemy.y + enemy.height, "#c084fc", 15, 4);
          } else if (randAttack < 0.75) {
            // Fire plasma projectiles!
            playSound("shoot");
            const angle = Math.atan2(playerMidY - (enemy.y + 40), playerMidX - enemy.x);
            projectilesRef.current.push({
              x: enemy.facingRight ? enemy.x + enemy.width : enemy.x,
              y: enemy.y + 40,
              vx: Math.cos(angle) * 6,
              vy: Math.sin(angle) * 6,
              radius: 12,
              color: "#f43f5e",
            });
            enemy.attackCooldown = 120;
          } else {
            // Jump slam shockwave!
            enemy.vy = -10;
            enemy.attackCooldown = 180;
          }
        }

        // Boss simple vertical physics for jumping
        enemy.y += enemy.vy;
        if (enemy.y < 454) {
          enemy.vy += GRAVITY;
        } else {
          // Landed!
          if (enemy.vy > 0) {
            // Shockwave impactparticles!
            spawnParticles(enemy.x + enemy.width / 2, 550, "#a78bfa", 25, 5, 6);
            playSound("bossHit");
            // Jump triggers projectiles to shock player
            projectilesRef.current.push({ x: enemy.x - 30, y: 535, vx: -5, vy: 0, radius: 10, color: "#f43f5e" });
            projectilesRef.current.push({ x: enemy.x + enemy.width + 30, y: 535, vx: 5, vy: 0, radius: 10, color: "#f43f5e" });
          }
          enemy.y = 454;
          enemy.vy = 0;
          // Resume slow pacing speed if charging completed
          if (Math.abs(enemy.vx) > 3) {
            enemy.vx = enemy.facingRight ? 1.4 : -1.4;
          }
        }
      }

      // Check Player - Enemy Collision
      const isOverlappingPlayer =
        player.x + player.width > enemy.x &&
        player.x < enemy.x + enemy.width &&
        player.y + player.height > enemy.y &&
        player.y < enemy.y + enemy.height;

      if (isOverlappingPlayer && enemy.id !== "defeated") {
        const damage = enemy.type === "boss" ? 35 : enemy.type === "knight" ? 22 : 10;
        const pushDir = playerMidX > (enemy.x + enemy.width / 2) ? 6 : -6;
        handlePlayerDamage(
          difficulty === "easy" ? damage * 0.6 : difficulty === "hard" ? damage * 1.5 : damage,
          "enemy",
          pushDir
        );
      }
    });

    // 7. Update Boss projectiles
    projectilesRef.current.forEach((proj, idx) => {
      proj.x += proj.vx;
      proj.y += proj.vy;

      // Spark particles along projectile tail
      if (Math.random() < 0.4) {
        particlesRef.current.push({
          x: proj.x,
          y: proj.y,
          vx: -proj.vx * 0.2 + (Math.random() - 0.5),
          vy: (Math.random() - 0.5) * 2,
          size: 2 + Math.random() * 2,
          color: proj.color,
          alpha: 0.8,
          life: 0,
          maxLife: 12,
        });
      }

      // Collide with player
      const px = player.x + player.width / 2;
      const py = player.y + player.height / 2;
      const dist = Math.hypot(px - proj.x, py - proj.y);

      if (dist < proj.radius + 15) {
        handlePlayerDamage(difficulty === "easy" ? 12 : difficulty === "hard" ? 30 : 20, "projectile", Math.sign(proj.vx) * 5);
        // remove projectle
        projectilesRef.current.splice(idx, 1);
        return;
      }

      // Remove offscreen
      if (proj.x < 0 || proj.x > LEVEL_WIDTH || proj.y > LEVEL_HEIGHT) {
        projectilesRef.current.splice(idx, 1);
      }
    });

    // 8. Particles dynamics
    particlesRef.current.forEach((p, index) => {
      p.x += p.vx;
      p.y += p.vy;
      p.life++;
      p.alpha = 1 - p.life / p.maxLife;

      // Gravity on bigger sparks
      if (p.color !== "#fbbf24") {
        p.vy += 0.05;
      }

      if (p.life >= p.maxLife) {
        particlesRef.current.splice(index, 1);
      }
    });

    // 9. Camera Following with smooth lerp
    // Centering camera x relative to player
    cameraRef.current.targetX = player.x - dimensions.width / 2 + player.width / 2;
    // Cap camera scroll limits
    if (cameraRef.current.targetX < 0) cameraRef.current.targetX = 0;
    if (cameraRef.current.targetX > LEVEL_WIDTH - dimensions.width) {
      cameraRef.current.targetX = LEVEL_WIDTH - dimensions.width;
    }

    cameraRef.current.x += (cameraRef.current.targetX - cameraRef.current.x) * 0.1;
  };

  // Inflict damage to Player correctly
  const handlePlayerDamage = (amt: number, source: "lava" | "spikes" | "enemy" | "hazard" | "projectile" | "pit", knockX = 0, knockY = 0) => {
    const player = playerRef.current;
    if (gameState !== "playing") return;

    if (source === "pit") {
      player.health = 0;
      setLocalHealth(0);
      setLives((prev) => prev + 1);
      playSound("lose");
      onStateChange("gameover");
      return;
    }

    if (player.damageCooldown > 0) return;

    // Apply exact damage (bypass for obstacles: hazards/lava)
    if (source !== "hazard" && source !== "lava") {
      player.health -= amt;
      player.damageCooldown = 60; // 1 second flash
    } else {
      player.damageCooldown = 20; // brief recovery flash for obstacles (no health loss)
    }

    playSound("hurt");
    setLocalHealth(Math.max(0, player.health));

    // Sparks when hit
    spawnParticles(player.x + player.width / 2, player.y + player.height / 2, "#ef4444", 20, 4, 4);

    // Bounce pushback knockbacks
    if (knockX !== 0) player.vx = knockX;
    if (knockY !== 0) player.vy = knockY;
    else if (player.isGrounded) player.vy = -4.5; // little pop

    if (player.health <= 0) {
      // Trigger game over!
      spawnParticles(player.x + player.width / 2, player.y + player.height / 2, "#dc2626", 40, 7, 7);
      setLives((prev) => prev + 1);
      playSound("lose");
      onStateChange("gameover");
    }
  };

  // Rendering graphics pipelines
  const renderGame = (ctx: CanvasRenderingContext2D) => {
    const scrollX = cameraRef.current.x;

    // Clear Screen
    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // 1. DRAW PARALLAX BACKGROUND
    // Layer A - Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, dimensions.height);
    skyGrad.addColorStop(0, "#0f172a"); // Velvet Charcoal Dark Blue
    skyGrad.addColorStop(1, "#1e1b4b"); // Cosmic Violet deeps
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Save context and apply dynamic vertical translation to lock ground (LEVEL_HEIGHT) to the bottom of the canvas
    const translateY = dimensions.height - LEVEL_HEIGHT;
    ctx.save();
    ctx.translate(0, translateY);

    // Render little twinkling background stars (tied to cameras scroll)
    ctx.fillStyle = "rgba(255, 255, 255, 0.65)";
    for (let i = 0; i < 40; i++) {
       const starX = (indexToStarSeed(i) * 3200 - scrollX * 0.15 + 3200) % LEVEL_WIDTH;
       if (starX >= 0 && starX <= dimensions.width) {
         const starY = (indexToStarSeed(i + 40) * 350) + 20;
         const radius = Math.abs(Math.sin((Date.now() / 300) + i)) * 1.5 + 0.5;
         ctx.beginPath();
         ctx.arc(starX, starY, radius, 0, Math.PI * 2);
         ctx.fill();
       }
    }

    // Layer B - Far silhouettes (parallax 0.3)
    ctx.fillStyle = "rgba(15, 23, 42, 0.4)";
    for (let i = 50; i < LEVEL_WIDTH; i += 300) {
      const xPos = i - scrollX * 0.3;
      ctx.beginPath();
      ctx.moveTo(xPos, LEVEL_HEIGHT);
      ctx.lineTo(xPos + 150, LEVEL_HEIGHT - 210);
      ctx.lineTo(xPos + 300, LEVEL_HEIGHT);
      ctx.closePath();
      ctx.fill();
    }

    // Layer C - Nearby silhouettes/Towers (parallax 0.6)
    ctx.fillStyle = "rgba(17, 24, 39, 0.6)";
    for (let i = 20; i < LEVEL_WIDTH; i += 450) {
      const xPos = i - scrollX * 0.6;
      ctx.fillRect(xPos, LEVEL_HEIGHT - 150, 180, 150);
      // castle towers top spikes
      ctx.beginPath();
      ctx.moveTo(xPos, LEVEL_HEIGHT - 150);
      ctx.lineTo(xPos + 90, LEVEL_HEIGHT - 200);
      ctx.lineTo(xPos + 180, LEVEL_HEIGHT - 150);
      ctx.closePath();
      ctx.fill();
    }

    // 2. DRAW HAZARDS (Lava pools animated waves & Spikes drawn BEFORE main platforms)
    hazardsRef.current.forEach((hazard) => {
      const hDrawX = hazard.x - scrollX;
      if (hDrawX + hazard.width < 0 || hDrawX > dimensions.width) return; // culling

      if (hazard.type === "lava") {
        // Lava Pool
        const lavaGrad = ctx.createLinearGradient(0, hazard.y, 0, LEVEL_HEIGHT);
        lavaGrad.addColorStop(0, "#ef4444"); // Bright neon red
        lavaGrad.addColorStop(0.5, "#d97706"); // Lava orange
        lavaGrad.addColorStop(1, "#7f1d1d"); // Deep magma
        ctx.fillStyle = lavaGrad;

        // Draw animated wavy pool top edge
        ctx.beginPath();
        ctx.moveTo(hDrawX, hazard.y);
        for (let xOffset = 0; xOffset <= hazard.width; xOffset += 10) {
          const waveY = hazard.y + Math.sin(lavaAnimRef.current + (hazard.x + xOffset) * 0.05) * 5;
          ctx.lineTo(hDrawX + xOffset, waveY);
        }
        ctx.lineTo(hDrawX + hazard.width, LEVEL_HEIGHT);
        ctx.lineTo(hDrawX, LEVEL_HEIGHT);
        ctx.closePath();
        ctx.fill();

        // Draw active glowing lava bubble circles popping
        ctx.fillStyle = "rgba(251, 146, 60, 0.7)";
        for (let b = 0; b < hazard.width / 40; b++) {
          const bX = hDrawX + ((hazard.x * 2 + b * 220) % (hazard.width - 20)) + 10;
          const bubbleHeight = (Date.now() / 15 + b * 50) % 50;
          ctx.beginPath();
          ctx.arc(bX, hazard.y + 15 - bubbleHeight, 3 + (b % 4), 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (hazard.type === "spikes") {
        // Draw spiked rows
        ctx.fillStyle = hazard.color;
        const spikeWidth = 15;
        const spikeCount = Math.floor(hazard.width / spikeWidth);

        for (let s = 0; s < spikeCount; s++) {
          const sX = hDrawX + s * spikeWidth;
          ctx.beginPath();
          ctx.moveTo(sX, hazard.y + hazard.height);
          ctx.lineTo(sX + spikeWidth / 2, hazard.y);
          ctx.lineTo(sX + spikeWidth, hazard.y + hazard.height);
          ctx.closePath();
          ctx.fill();

          // Spark gleam tip outline
          ctx.strokeStyle = "#cbd5e1";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(sX, hazard.y + hazard.height);
          ctx.lineTo(sX + spikeWidth / 2, hazard.y);
          ctx.lineTo(sX + spikeWidth, hazard.y + hazard.height);
          ctx.stroke();
        }
      }
    });

    // 3. DRAW COINS
    coinsRef.current.forEach((coin) => {
      if (coin.isCollected) return;
      const coinDrawX = coin.x - scrollX;
      if (coinDrawX + coin.radius < 0 || coinDrawX - coin.radius > dimensions.width) return;

      // Floating sine wave offset bobbing
      const bobY = coin.y + Math.sin(Date.now() * 0.007 + coin.bobOffset) * 5;

      // Outer gold glowing halo
      ctx.fillStyle = "rgba(251, 191, 36, 0.25)";
      ctx.beginPath();
      ctx.arc(coinDrawX, bobY, coin.radius + 3, 0, Math.PI * 2);
      ctx.fill();

      // Core metal circle
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(coinDrawX, bobY, coin.radius, 0, Math.PI * 2);
      ctx.fill();

      // Shiny center
      ctx.fillStyle = "#fef08a";
      ctx.beginPath();
      ctx.arc(coinDrawX - 2, bobY - 2, coin.radius - 4, 0, Math.PI * 2);
      ctx.fill();

      // Lettering indicator "C" or "$" mark in coin
      ctx.fillStyle = "#d97706";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("¢", coinDrawX, bobY);
    });

    // 4. DRAW ENEMY PROJECTILES
    projectilesRef.current.forEach((proj) => {
      const projX = proj.x - scrollX;
      ctx.fillStyle = "rgba(244, 63, 94, 0.3)";
      ctx.beginPath();
      ctx.arc(projX, proj.y, proj.radius + 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(projX, proj.y, proj.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(projX - 3, proj.y - 3, proj.radius / 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // 5. DRAW PLATFORMS
    platformsRef.current.forEach((plat) => {
      const platDrawX = plat.x - scrollX;
      if (platDrawX + plat.width < 0 || platDrawX > dimensions.width) return;

      if (plat.type === "normal") {
        // Draw solid normal concrete block
        ctx.fillStyle = plat.color;
        ctx.fillRect(platDrawX, plat.y, plat.width, plat.height);

        // Draw elegant mossy grassy top edge
        ctx.fillStyle = "#10b981"; // mossy green
        ctx.fillRect(platDrawX, plat.y, plat.width, 6);

        // Draw standard texture strokes for architectural detail
        ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let strokeX = 30; strokeX < plat.width; strokeX += 50) {
          ctx.moveTo(platDrawX + strokeX, plat.y + 6);
          ctx.lineTo(platDrawX + strokeX, plat.y + plat.height);
          ctx.moveTo(platDrawX + strokeX, plat.y + 6);
          ctx.lineTo(platDrawX + strokeX - 8, plat.y + 16);
        }
        ctx.stroke();
      } else if (plat.type === "bouncy") {
        // Trampolines/Spring boards
        ctx.fillStyle = "#4a5568";
        ctx.fillRect(platDrawX, plat.y + 6, plat.width, plat.height - 6);

        // Super spring orange action mat
        ctx.fillStyle = plat.color;
        ctx.fillRect(platDrawX, plat.y, plat.width, 8);

        // Spring coils texture
        ctx.strokeStyle = "#cbd5e1";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(platDrawX + 10, plat.y + 8);
        ctx.lineTo(platDrawX + 15, plat.y + 14);
        ctx.lineTo(platDrawX + 10, plat.y + 20);

        ctx.moveTo(platDrawX + plat.width - 10, plat.y + 8);
        ctx.lineTo(platDrawX + plat.width - 15, plat.y + 14);
        ctx.lineTo(platDrawX + plat.width - 10, plat.y + 20);
        ctx.stroke();
      } else if (plat.type === "moving") {
        // Futuristic floating hover platforms
        ctx.fillStyle = plat.color;
        ctx.fillRect(platDrawX, plat.y, plat.width, plat.height);

        // Glowing metal rims
        ctx.fillStyle = "#22d3ee";
        ctx.fillRect(platDrawX, plat.y, 4, plat.height);
        ctx.fillRect(platDrawX + plat.width - 4, plat.y, 4, plat.height);

        // Mechanical core line
        ctx.strokeStyle = "#1a202c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(platDrawX + 10, plat.y + plat.height / 2);
        ctx.lineTo(platDrawX + plat.width - 10, plat.y + plat.height / 2);
        ctx.stroke();
      }
    });

    // 6. DRAW ENEMIES
    enemiesRef.current.forEach((enemy) => {
      if (enemy.health <= 0) return;
      const enemyDrawX = enemy.x - scrollX;
      if (enemyDrawX + enemy.width < 0 || enemyDrawX > dimensions.width) return;

      ctx.save();
      // Apply slight shake when hit
      if (enemy.shakeTimer > 0) {
        ctx.translate((Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6);
      }

      // Render Enemy Types
      if (enemy.type === "slug") {
        // Slow Slug Render
        ctx.fillStyle = enemy.color;
        // slug blob custom shape
        ctx.beginPath();
        ctx.ellipse(
          enemyDrawX + enemy.width / 2,
          enemy.y + enemy.height - 12,
          enemy.width / 2,
          12,
          0,
          0,
          Math.PI * 2
        );
        ctx.fill();

        // Little dynamic antenna spikes
        ctx.strokeStyle = enemy.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        const antennaOffset = enemy.facingRight ? 8 : -8;
        ctx.moveTo(enemyDrawX + enemy.width / 2 + antennaOffset, enemy.y + enemy.height / 2);
        ctx.lineTo(enemyDrawX + enemy.width / 2 + antennaOffset * 1.5, enemy.y);
        ctx.stroke();

        // Tiny eye dot
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(
          enemyDrawX + enemy.width / 2 + (enemy.facingRight ? 10 : -10),
          enemy.y + enemy.height - 15,
          4,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.fillStyle = "#000000";
        ctx.beginPath();
        ctx.arc(
          enemyDrawX + enemy.width / 2 + (enemy.facingRight ? 11 : -11),
          enemy.y + enemy.height - 15,
          2,
          0,
          Math.PI * 2
        );
        ctx.fill();
      } else if (enemy.type === "knight") {
        // Elite Aggressive Knight Render
        ctx.fillStyle = enemy.color;
        // Draw primary armor torso
        ctx.fillRect(enemyDrawX, enemy.y, enemy.width, enemy.height);

        // Knight iron helm grid visor
        ctx.fillStyle = "#1e293b";
        ctx.fillRect(enemyDrawX + (enemy.facingRight ? 16 : 4), enemy.y + 6, 16, 10);

        // Visor glow red eye slot
        ctx.fillStyle = enemy.isAggro ? "#ef4444" : "#eab308";
        ctx.fillRect(enemyDrawX + (enemy.facingRight ? 22 : 6), enemy.y + 10, 8, 3);

        // Sword shield or dynamic arms
        ctx.fillStyle = "#94a3b8"; // Steel weapon plates
        ctx.fillRect(enemyDrawX + (enemy.facingRight ? -4 : enemy.width), enemy.y + 20, 8, 16);
      } else if (enemy.type === "boss") {
        // GIANT REGAL BOSS DRAGON SHIELD KNIGHT
        // Outer pulsing outline shadow for final boss glow
        const glowRadius = Math.abs(Math.sin(Date.now() * 0.005)) * 10 + 2;
        ctx.shadowColor = "rgba(167, 139, 250, 0.75)";
        ctx.shadowBlur = glowRadius;

        // Draw primary boss body block
        ctx.fillStyle = enemy.color;
        ctx.fillRect(enemyDrawX, enemy.y, enemy.width, enemy.height);
        ctx.shadowBlur = 0; // reset effects config

        // Gold detailing armour crown spikes
        ctx.fillStyle = "#eab308";
        ctx.beginPath();
        ctx.moveTo(enemyDrawX, enemy.y);
        ctx.lineTo(enemyDrawX + 16, enemy.y - 12);
        ctx.lineTo(enemyDrawX + 32, enemy.y);
        ctx.lineTo(enemyDrawX + 48, enemy.y - 12);
        ctx.lineTo(enemyDrawX + 64, enemy.y);
        ctx.closePath();
        ctx.fill();

        // Massive terrifying glowing single red eye slit
        ctx.fillStyle = "#111827";
        ctx.fillRect(enemyDrawX + 10, enemy.y + 20, 44, 15);
        ctx.fillStyle = "#ff0000";
        const eyeOffset = Math.sin(Date.now() * 0.004) * 15; // sweeping laser visor effect!
        ctx.fillRect(enemyDrawX + 28 + eyeOffset, enemy.y + 25, 10, 5);

        // Heavy dark shield detailing on chest
        ctx.strokeStyle = "#ea580c";
        ctx.lineWidth = 3;
        ctx.strokeRect(enemyDrawX + 14, enemy.y + 44, 36, 40);

        // Boss massive energy weapon saber glows
        ctx.fillStyle = "#ea580c";
        const attCdAnim = enemy.attackCooldown;
        const weaponOffset = enemy.facingRight ? enemy.width - 5 : -15;
        if (attCdAnim > 0 && attCdAnim < 20) {
          // swinging forward swing!
          ctx.fillRect(enemyDrawX + weaponOffset - 20, enemy.y + 30, 50, 20);
        } else {
          // resting state pointing down
          ctx.fillRect(enemyDrawX + weaponOffset, enemy.y + 45, 15, 45);
        }
      }

      // Draw health overlay above normal enemies if damaged
      if (enemy.health < enemy.maxHealth && enemy.health > 0) {
        const hpPercent = enemy.health / enemy.maxHealth;
        ctx.fillStyle = "#ef4444";
        ctx.fillRect(enemyDrawX, enemy.y - 10, enemy.width, 4);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(enemyDrawX, enemy.y - 10, enemy.width * hpPercent, 4);
      }

      ctx.restore();
    });

    // 7. DRAW PARTICLES
    particlesRef.current.forEach((p) => {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - scrollX, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 8. DRAW PLAYER CHARACTER (Mofusand Shark Suit Kitty!)
    const player = playerRef.current;
    const pDrawX = player.x - scrollX;
    const pCenterX = pDrawX + player.width / 2;
    const pCenterY = player.y + player.height / 2;

    ctx.save();

    // Damage Flash Opacity Sequence
    if (player.damageCooldown > 0) {
      if (Math.floor(player.damageCooldown / 4) % 2 === 0) {
        ctx.globalAlpha = 0.3;
      }
    }

    const direction = player.facingRight ? 1 : -1;

    // A. DRAW SHARK COSTUME FIN / TAIL (on back)
    ctx.fillStyle = "#64748b"; // Sleek shark blue-grey
    if (player.facingRight) {
      // Tail fin at left side
      ctx.beginPath();
      ctx.moveTo(pDrawX + 4, player.y + 32);
      ctx.quadraticCurveTo(pDrawX - 8, player.y + 28, pDrawX - 12, player.y + 36);
      ctx.quadraticCurveTo(pDrawX - 6, player.y + 38, pDrawX + 4, player.y + 40);
      ctx.fill();

      // Dorsal Fin at left upper back
      ctx.beginPath();
      ctx.moveTo(pDrawX + 6, player.y + 16);
      ctx.quadraticCurveTo(pDrawX - 10, player.y + 14, pDrawX - 2, player.y + 24);
      ctx.fill();
    } else {
      // Tail fin at right side
      ctx.beginPath();
      ctx.moveTo(pDrawX + player.width - 4, player.y + 32);
      ctx.quadraticCurveTo(pDrawX + player.width + 8, player.y + 28, pDrawX + player.width + 12, player.y + 36);
      ctx.quadraticCurveTo(pDrawX + player.width + 6, player.y + 38, pDrawX + player.width - 4, player.y + 40);
      ctx.fill();

      // Dorsal Fin at right upper back
      ctx.beginPath();
      ctx.moveTo(pDrawX + player.width - 6, player.y + 16);
      ctx.quadraticCurveTo(pDrawX + player.width + 10, player.y + 14, pDrawX + player.width + 2, player.y + 24);
      ctx.fill();
    }

    // B. MAIN SHARK SUIT BODY & HEAD
    // Round body
    ctx.beginPath();
    ctx.arc(pCenterX, player.y + 30, 16, 0, Math.PI * 2);
    ctx.fill();

    // Round head
    ctx.beginPath();
    ctx.arc(pCenterX, player.y + 17, 18, 0, Math.PI * 2);
    ctx.fill();

    // White underbelly of shark suit
    ctx.fillStyle = "#f1f5f9"; // Soft white
    ctx.beginPath();
    const bellyYOffset = player.y + 34;
    const bellyXOffset = pCenterX + direction * 4;
    ctx.arc(bellyXOffset, bellyYOffset, 10, 0, Math.PI * 2);
    ctx.fill();

    // C. SHARK EXOPHOTIC FACE HOOD CUTOUT (The mouth opening)
    // Cutout center
    const cutCX = pCenterX + direction * 5;
    const cutCY = player.y + 16;
    const cutRX = 13;
    const cutRY = 11;

    // Fill face cutout with chubby cream cat fur
    ctx.fillStyle = "#fafaf9"; // Warm soft kitten white
    ctx.beginPath();
    ctx.ellipse(cutCX, cutCY, cutRX, cutRY, 0, 0, Math.PI * 2);
    ctx.fill();

    // Shark inner black shadow surrounding teeth
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cutCX, cutCY, cutRX, cutRY, 0, 0, Math.PI * 2);
    ctx.stroke();

    // D. SHARK TEETH (Felt triangles around face opening!)
    ctx.fillStyle = "#ffffff";
    const teethCount = 8;
    for (let i = 0; i < teethCount; i++) {
      const angle = (i / (teethCount - 1)) * Math.PI * 2;
      const tx = cutCX + Math.cos(angle) * cutRX;
      const ty = cutCY + Math.sin(angle) * cutRY;
      // pointing slightly inwards
      const tipX = cutCX + Math.cos(angle) * (cutRX - 3);
      const tipY = cutCY + Math.sin(angle) * (cutRY - 3);

      ctx.beginPath();
      ctx.moveTo(tx - 2, ty - 2);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(tx + 2, ty + 2);
      ctx.closePath();
      ctx.fill();
    }

    // E. THE CAT FACE INSIDE
    // Kitty small ears peeking slightly inside the cutout
    ctx.fillStyle = "#fda4af"; // Soft pastel pink ear lobes
    // Ear 1 and 2
    ctx.beginPath();
    ctx.moveTo(cutCX - 8, cutCY - 6);
    ctx.lineTo(cutCX - 11, cutCY - 13);
    ctx.lineTo(cutCX - 3, cutCY - 9);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cutCX + 3, cutCY - 9);
    ctx.lineTo(cutCX + 11, cutCY - 13);
    ctx.lineTo(cutCX + 8, cutCY - 6);
    ctx.fill();

    // Shiny expressive feline eyes (Chubby black balls with dual white specular highlights)
    const eyeY = cutCY - 1;
    const leftEyeX = cutCX - 6 + (direction * 0.5);
    const rightEyeX = cutCX + 3 + (direction * 0.5);

    // Draw left eye
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(leftEyeX, eyeY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Gleams
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(leftEyeX - 0.8, eyeY - 0.8, 0.8, 0, Math.PI * 2);
    ctx.arc(leftEyeX + 0.8, eyeY + 0.8, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Draw right eye
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(rightEyeX, eyeY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Gleams
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(rightEyeX - 0.8, eyeY - 0.8, 0.8, 0, Math.PI * 2);
    ctx.arc(rightEyeX + 0.8, eyeY + 0.8, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Rosy blushing cheeks
    ctx.fillStyle = "rgba(251, 113, 133, 0.5)"; // Blush pink
    ctx.beginPath();
    ctx.arc(leftEyeX - 3, eyeY + 3.5, 3.5, 0, Math.PI * 2);
    ctx.arc(rightEyeX + 3, eyeY + 3.5, 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Tiny pink nose and "w" mouth
    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.moveTo(cutCX - 0.8, cutCY + 1.2);
    ctx.lineTo(cutCX + 0.8, cutCY + 1.2);
    ctx.lineTo(cutCX, cutCY + 2.2);
    ctx.closePath();
    ctx.fill();

    // Mofusand cute tiny whiskers (= •ᆺ• =)
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    // Left side whiskers
    const whiskerStartX = cutCX - 9;
    ctx.beginPath();
    ctx.moveTo(whiskerStartX, cutCY + 1.5);
    ctx.lineTo(whiskerStartX - 6, cutCY + 0.5);
    ctx.moveTo(whiskerStartX, cutCY + 3);
    ctx.lineTo(whiskerStartX - 7, cutCY + 3);
    ctx.stroke();

    // Right side whiskers
    const whiskerEndX = cutCX + 9;
    ctx.beginPath();
    ctx.moveTo(whiskerEndX, cutCY + 1.5);
    ctx.lineTo(whiskerEndX + 6, cutCY + 0.5);
    ctx.moveTo(whiskerEndX, cutCY + 3);
    ctx.lineTo(whiskerEndX + 7, cutCY + 3);
    ctx.stroke();

    // F. CHUBBY WHITE PAWS WALKING (FEET)
    let leftPawOffset = 0;
    let rightPawOffset = 0;
    const bottomY = player.y + player.height;

    if (!player.isGrounded) {
      leftPawOffset = -3;
      rightPawOffset = -1;
    } else if (Math.abs(player.vx) > 0.1) {
      // Walking swing
      const wSwing = Math.sin(Date.now() * 0.015) * 4;
      leftPawOffset = wSwing;
      rightPawOffset = -wSwing;
    }

    // Left paw
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(pCenterX - 6 + leftPawOffset, bottomY - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#cbd5e1";
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Right paw
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(pCenterX + 6 + rightPawOffset, bottomY - 3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // G. WEAPON ATTACK VISUALIZATION (Cute Taiyaki / Blue Tuna weapon!)
    if (player.isAttacking && player.attackTimer > 0) {
      const slashArcRadius = 45;
      const angleSweep = Math.PI * 0.7; // sweep range arc
      const facingSign = player.facingRight ? 1 : -1;

      // Base translation anchor
      const attackCX = pDrawX + (player.facingRight ? player.width + 5 : -5);
      const attackCY = player.y + player.height / 2;

      // Render glowing aura swing trail with a warm gold & pink (Taiyaki style/sparkles)
      const swordGrad = ctx.createRadialGradient(
        attackCX,
        attackCY,
        10,
        attackCX,
        attackCY,
        slashArcRadius
      );
      swordGrad.addColorStop(0, "rgba(253, 164, 175, 0.9)"); // Pastel Pink
      swordGrad.addColorStop(0.5, "rgba(251, 113, 133, 0.4)"); // Rose petal aura
      swordGrad.addColorStop(1, "rgba(255, 255, 255, 0.0)");

      ctx.fillStyle = swordGrad;
      ctx.beginPath();
      ctx.moveTo(attackCX, attackCY);
      // Sweep angle relative to direction
      const startW = player.facingRight ? -angleSweep / 2 : Math.PI - angleSweep / 2;
      const endW = player.facingRight ? angleSweep / 2 : Math.PI + angleSweep / 2;
      ctx.arc(attackCX, attackCY, slashArcRadius, startW, endW, false);
      ctx.closePath();
      ctx.fill();

      // Sharp glowing pastel fish spine line
      ctx.strokeStyle = "#fda4af";
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.arc(attackCX, attackCY, slashArcRadius - 3, startW, endW, false);
      ctx.stroke();

      // draw cute little flying star sparks!
      ctx.fillStyle = "#fef08a";
      for (let j = 0; j < 3; j++) {
        const sparkAngle = startW + (j * (endW - startW)) / 3;
        const sparkX = attackCX + Math.cos(sparkAngle) * (slashArcRadius - 5);
        const sparkY = attackCY + Math.sin(sparkAngle) * (slashArcRadius - 5);
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // Idle backpack pouch: tuna fish pocket item!
      // Carrying a cute blue fish pouch strapped to its back!
      ctx.save();
      const pouchX = player.facingRight ? pDrawX + 1 : pDrawX + player.width - 9;
      const pouchY = player.y + 24;
      // draw sweet blue fish pouch
      ctx.fillStyle = "#38bdf8"; // tuna sky-blue
      ctx.beginPath();
      ctx.ellipse(pouchX + 4, pouchY + 5, 6, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // tail of fish
      ctx.beginPath();
      ctx.moveTo(pouchX + (player.facingRight ? -1 : 9), pouchY + 5);
      ctx.lineTo(pouchX + (player.facingRight ? -4 : 12), pouchY + 2);
      ctx.lineTo(pouchX + (player.facingRight ? -4 : 12), pouchY + 8);
      ctx.closePath();
      ctx.fill();
      // yellow strap
      ctx.strokeStyle = "#eab308";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pCenterX - (direction * 3), player.y + 25, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore(); // restore player custom layout save
    ctx.restore(); // restore dynamic vertical translation save
  };

  // Quick mathematical pseudo-random number generator for star parallax seeds
  const indexToStarSeed = (index: number) => {
    const x = Math.sin(index + 29381.182) * 9999;
    return x - Math.floor(x);
  };

  return (
    <div className="flex flex-col items-center bg-transparent overflow-hidden w-full relative select-none">
      {/* Dynamic HUD Area */}
      <div className="w-full max-w-5xl px-4 py-4 flex flex-wrap justify-between items-center text-white z-10 gap-2 select-none">
        
        {/* Lives & Score indicators */}
        <div className="flex items-center gap-4">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-5 py-2.5 flex flex-col justify-center shadow-xl">
            <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Puntos Obtenidos</span>
            <span className="text-xl font-black text-cyan-400 tracking-tighter leading-none">{playerScore} PTS</span>
          </div>

          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-5 py-2.5 flex flex-col justify-center shadow-xl">
            <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Derrotas</span>
            <span className="text-xl font-black text-pink-500 tracking-tighter leading-none">{lives - 1}</span>
          </div>
        </div>

        {/* Dynamic Boss health tracker bar display during battle */}
        {bossHealth !== null && (
          <div className="flex-1 max-w-sm backdrop-blur-xl bg-white/10 border border-white/20 px-4 py-2.5 rounded-2xl shadow-xl flex flex-col justify-center">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-widest text-pink-400 font-black animate-pulse font-mono">
                👹 Guardián Oscuro
              </span>
              <span className="text-[10px] font-mono font-bold text-white/85">
                {bossHealth} / {bossMaxHealth} HP
              </span>
            </div>
            <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-amber-400 transition-all duration-100"
                style={{ width: `${(bossHealth / bossMaxHealth) * 100}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Difficulty badge and Pause Button */}
        <div className="flex gap-2">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 flex flex-col justify-center shadow-xl">
            <span className="text-[9px] uppercase tracking-widest text-white/40 font-bold">Dificultad</span>
            <span className="text-xs font-mono font-black text-indigo-300 tracking-widest uppercase">
              {difficulty === "easy" ? "Fácil" : difficulty === "normal" ? "Normal" : "Difícil"}
            </span>
          </div>

          {gameState === "playing" && (
            <button
              onClick={() => {
                playSound("coin");
                setIsPaused(!isPaused);
              }}
              className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-4 py-2.5 flex items-center justify-center gap-2 shadow-xl hover:bg-white/20 hover:border-white/35 active:scale-95 duration-100 cursor-pointer"
            >
              <span className="text-sm">{isPaused ? "▶️" : "⏸️"}</span>
              <span className="text-xs font-black uppercase font-mono tracking-wider">
                {isPaused ? "Reanudar" : "Pausa"}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas Frame */}
      <div
        ref={containerRef}
        className="w-full max-w-5xl flex justify-center bg-slate-900/45 backdrop-blur-sm relative border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        <canvas
          ref={canvasRef}
          width={dimensions.width}
          height={dimensions.height}
          className="block outline-none cursor-crosshair max-w-full"
          onClick={() => triggerAttack()}
        />

        {/* Pause Overlay with Difficulty Selector */}
        {isPaused && (
          <div className="absolute inset-0 z-50 backdrop-blur-md bg-slate-950/60 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full backdrop-blur-xl bg-white/10 border border-white/20 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6 relative animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-cyan-500/10 border-2 border-cyan-400 flex items-center justify-center text-3xl shadow-lg relative animate-pulse">
                🐱
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-black text-cyan-300 font-sans tracking-tight uppercase">
                  Juego Pausado
                </h2>
                <p className="text-white/70 font-mono text-xs mt-1 text-center">
                  Mofusand Kitten está tomando un pequeño descanso.
                </p>
              </div>

              <hr className="w-full border-white/10" />

              {/* Pause Difficulty Selection */}
              <div className="w-full flex flex-col gap-2">
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest font-mono text-left">
                  Cambiar Dificultad en tiempo real:
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(["easy", "normal", "hard"] as const).map((diff) => {
                    const label = diff === "easy" ? "Fácil" : diff === "normal" ? "Normal" : "Difícil";
                    const isSelected = difficulty === diff;
                    return (
                      <button
                        key={diff}
                        type="button"
                        onClick={() => {
                          playSound("coin");
                          onDifficultyChange?.(diff);
                        }}
                        className={`py-2 px-1 text-center rounded-xl border font-bold font-mono text-xs transition-all cursor-pointer active:scale-95 duration-100 ${
                          isSelected
                            ? "bg-white/25 border-white text-white shadow-xl"
                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <hr className="w-full border-white/10" />

              <button
                type="button"
                onClick={() => {
                  playSound("coin");
                  setIsPaused(false);
                }}
                className="w-full py-3 bg-gradient-to-r from-cyan-400 to-indigo-400 text-slate-950 rounded-2xl font-black font-mono uppercase tracking-widest text-sm hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-lg shadow-cyan-400/20"
              >
                🎮 Reanudar Partida
              </button>
            </div>
          </div>
        )}

        {/* Health Bar Hud Overlay (Anchored on top corner) */}
        {gameState === "playing" && (
          <div className="absolute top-4 left-4 right-4 md:right-auto md:w-80 backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl pointer-events-none select-none">
            {/* Visual Icon Avatar */}
            <div className="w-8 h-8 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)] border border-white/40 flex items-center justify-center font-bold text-lg select-none">
              ❤️
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-white/60 font-bold font-mono">
                <span>Tu Salud (HÉROE)</span>
                <span className={localHealth < 30 ? "text-red-400 tracking-wider animate-bounce" : "text-cyan-400"}>
                  {Math.floor(localHealth)}%
                </span>
              </div>
              <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-75 ${
                    localHealth < 35
                      ? "bg-gradient-to-r from-red-500 to-orange-400 animate-pulse"
                      : "bg-gradient-to-r from-cyan-400 to-blue-500"
                  }`}
                  style={{ width: `${localHealth}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* On-Screen Controls bar styled like futuristic action pads */}
      {gameState === "playing" && (
        <div className="w-full max-w-5xl px-6 py-4 flex flex-col md:flex-row gap-4 justify-between items-center backdrop-blur-xl bg-white/5 border-t border-white/10 mt-2 select-none rounded-b-2xl">
          <div className="flex gap-2 items-center px-4 py-2 rounded-xl backdrop-blur-md bg-white/5 border border-white/10 font-mono text-[10px] text-white/60">
            <span className="font-bold text-cyan-400">TECLADO:</span>
            <span className="bg-white/10 border border-white/20 px-1.5 py-0.5 rounded text-white">A/D</span> Mover
            <span className="bg-white/10 border border-white/20 px-1.5 py-0.5 rounded text-white">Espacio</span> Saltar
            <span className="bg-white/10 border border-white/20 px-1.5 py-0.5 rounded text-white">Shift</span> Correr
            <span className="bg-white/10 border border-white/20 px-1.5 py-0.5 rounded text-white">J/F</span> Atacar
          </div>

          {/* Virtual Buttons Row */}
          <div className="flex flex-wrap items-center gap-4 select-none">
            {/* Movement Controls Cluster */}
            <div className="flex gap-3">
              {/* Left walk */}
              <button
                id="vbtn-left"
                onTouchStart={() => { keysRef.current["a"] = true; }}
                onTouchEnd={() => { keysRef.current["a"] = false; }}
                onMouseDown={() => { keysRef.current["a"] = true; }}
                onMouseUp={() => { keysRef.current["a"] = false; }}
                onMouseLeave={() => { keysRef.current["a"] = false; }}
                className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center text-white text-md active:scale-95 duration-100 shadow-xl cursor-pointer hover:bg-white/25 hover:border-white/40"
              >
                ◀
              </button>

              {/* Right walk */}
              <button
                id="vbtn-right"
                onTouchStart={() => { keysRef.current["d"] = true; }}
                onTouchEnd={() => { keysRef.current["d"] = false; }}
                onMouseDown={() => { keysRef.current["d"] = true; }}
                onMouseUp={() => { keysRef.current["d"] = false; }}
                onMouseLeave={() => { keysRef.current["d"] = false; }}
                className="w-14 h-14 rounded-full backdrop-blur-xl bg-white/5 border border-white/10 flex items-center justify-center text-white text-md active:scale-95 duration-100 shadow-xl cursor-pointer hover:bg-white/25 hover:border-white/40"
              >
                ▶
              </button>
            </div>

            <div className="w-[1px] h-10 bg-white/20 hidden md:block"></div>

            {/* Run Toggle Button */}
            <button
              id="vbtn-run"
              onClick={() => {
                keysRef.current["Shift"] = !keysRef.current["Shift"];
              }}
              className={`px-4 h-14 rounded-full backdrop-blur-xl border flex flex-col items-center justify-center transition-all shadow-xl cursor-pointer active:scale-95 duration-75 ${
                keysRef.current["Shift"]
                  ? "bg-amber-500/30 border-amber-400 text-amber-300 animate-pulse"
                  : "bg-white/5 border-white/10 text-white/50 hover:bg-white/10"
              }`}
            >
              <span className="text-[10px] font-black uppercase font-mono leading-none">🏃 Correr</span>
              <span className="text-[8px] opacity-75 mt-1 font-mono leading-none">
                {keysRef.current["Shift"] ? "ON" : "OFF"}
              </span>
            </button>

            {/* Attack Action Button */}
            <button
              id="vbtn-attack"
              onClick={() => triggerAttack()}
              className="w-20 h-20 rounded-full backdrop-blur-xl bg-cyan-400/20 border border-cyan-400/40 flex items-center justify-center text-cyan-400 font-extrabold text-[11px] uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.2)] active:scale-95 duration-100 cursor-pointer hover:bg-cyan-400 hover:text-slate-900 transition-all"
            >
              ⚔️ Atacar
            </button>

            {/* Jump Action Button */}
            <button
              id="vbtn-jump"
              onClick={() => triggerJump()}
              className="w-24 h-24 rounded-full backdrop-blur-xl bg-white/15 border border-white/25 flex items-center justify-center text-white font-extrabold text-sm uppercase tracking-widest shadow-xl active:scale-95 duration-100 cursor-pointer hover:bg-white hover:text-slate-950 transition-all"
            >
              Saltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
