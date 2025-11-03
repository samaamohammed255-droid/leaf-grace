import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface Raindrop {
  id: number;
  x: number;
  y: number;
  speed: number;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
}

export const StressDodger = () => {
  const [gameState, setGameState] = useState<"start" | "playing" | "gameover">("start");
  const [leafPosition, setLeafPosition] = useState(50); // percentage
  const [raindrops, setRaindrops] = useState<Raindrop[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [timeAlive, setTimeAlive] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastDropTimeRef = useRef<number>(0);
  const nextDropIdRef = useRef(0);
  const nextRippleIdRef = useRef(0);
  const startTimeRef = useRef<number>(0);

  const LEAF_SIZE = 60;
  const RAINDROP_SIZE = 30;
  const BASE_DROP_INTERVAL = 1500; // ms between drops at start
  const BASE_SPEED = 1;
  const MIN_DROP_INTERVAL = 400; // fastest drop rate
  
  // Calculate difficulty multiplier based on time alive
  const getDifficultyMultiplier = () => {
    // Difficulty increases every 5 seconds
    return Math.min(1 + (timeAlive / 10), 3); // Max 3x difficulty
  }
  
  const getCurrentDropInterval = () => {
    const multiplier = getDifficultyMultiplier();
    return Math.max(MIN_DROP_INTERVAL, BASE_DROP_INTERVAL / multiplier);
  }
  
  const getCurrentSpeed = () => {
    const multiplier = getDifficultyMultiplier();
    return BASE_SPEED * multiplier;
  }

  // Handle mouse/touch movement
  const handleMove = (clientX: number) => {
    if (!gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    setLeafPosition(Math.max(5, Math.min(95, x)));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && gameState === "playing") {
      handleMove(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gameState === "playing" && e.touches.length > 0) {
      e.preventDefault();
      handleMove(e.touches[0].clientX);
    }
  };

  // Check collision between leaf and raindrop
  const checkCollision = (drop: Raindrop) => {
    if (!gameAreaRef.current) return false;
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    const leafX = (leafPosition / 100) * rect.width;
    const leafY = rect.height - 80; // leaf bottom position
    
    const dropX = (drop.x / 100) * rect.width;
    const dropY = drop.y;
    
    const distance = Math.sqrt(
      Math.pow(leafX - dropX, 2) + Math.pow(leafY - dropY, 2)
    );
    
    return distance < (LEAF_SIZE / 2 + RAINDROP_SIZE / 2);
  };

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameLoop = (timestamp: number) => {
      // Update timer
      if (startTimeRef.current === 0) {
        startTimeRef.current = timestamp;
      }
      const elapsed = timestamp - startTimeRef.current;
      setTimeAlive(Math.floor(elapsed / 1000));

      // Spawn new raindrops (difficulty increases over time)
      const currentDropInterval = getCurrentDropInterval();
      if (timestamp - lastDropTimeRef.current > currentDropInterval) {
        const baseSpeed = getCurrentSpeed();
        const newDrop: Raindrop = {
          id: nextDropIdRef.current++,
          x: Math.random() * 90 + 5, // 5% to 95%
          y: -50,
          speed: baseSpeed + Math.random() * 0.5, // random speed variation
        };
        setRaindrops(prev => [...prev, newDrop]);
        lastDropTimeRef.current = timestamp;
      }

      // Update raindrop positions and check collisions
      setRaindrops(prev => {
        const updated = prev.map(drop => ({
          ...drop,
          y: drop.y + drop.speed * 2,
        })).filter(drop => {
          if (drop.y > window.innerHeight) return false;
          
          if (checkCollision(drop)) {
            // Create ripple effect
            if (gameAreaRef.current) {
              const rect = gameAreaRef.current.getBoundingClientRect();
              setRipples(ripples => [...ripples, {
                id: nextRippleIdRef.current++,
                x: (drop.x / 100) * rect.width,
                y: drop.y,
              }]);
            }
            setGameState("gameover");
            return false;
          }
          
          return true;
        });
        
        return updated;
      });

      if (gameState === "playing") {
        animationFrameRef.current = requestAnimationFrame(gameLoop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [gameState, leafPosition]);

  // Clean up ripples after animation
  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples([]);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [ripples]);

  const startGame = () => {
    setGameState("playing");
    setRaindrops([]);
    setRipples([]);
    setTimeAlive(0);
    setLeafPosition(50);
    startTimeRef.current = 0;
    lastDropTimeRef.current = 0;
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-background to-accent/30">
      {/* Start Screen */}
      {gameState === "start" && (
        <div className="absolute inset-0 flex items-center justify-center z-20 animate-fade-in">
          <Card className="p-8 max-w-md mx-4 text-center bg-card/95 backdrop-blur-sm shadow-[var(--shadow-calm)]">
            <h1 className="text-4xl font-bold text-primary mb-4 animate-float">
              🍃 Stress Dodger
            </h1>
            <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
              Find your calm. Move the leaf to avoid the gentle rain. 
              <br />
              <span className="text-sm">Drag with mouse or finger</span>
            </p>
            <Button 
              onClick={startGame}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-all duration-300 shadow-[var(--shadow-float)] rounded-full px-8"
            >
              Begin Journey
            </Button>
          </Card>
        </div>
      )}

      {/* Game Over Screen */}
      {gameState === "gameover" && (
        <div className="absolute inset-0 flex items-center justify-center z-20 animate-fade-in">
          <Card className="p-8 max-w-md mx-4 text-center bg-card/95 backdrop-blur-sm shadow-[var(--shadow-calm)]">
            <h2 className="text-3xl font-bold text-primary mb-4">
              Take a breath 🌊
            </h2>
            <p className="text-muted-foreground mb-2 text-lg">
              You stayed calm for
            </p>
            <p className="text-5xl font-bold text-secondary mb-6">
              {timeAlive}s
            </p>
            <p className="text-sm text-muted-foreground mb-6 italic">
              "Every moment of peace is a victory"
            </p>
            <Button 
              onClick={startGame}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-all duration-300 shadow-[var(--shadow-float)] rounded-full px-8"
            >
              Try Again
            </Button>
          </Card>
        </div>
      )}

      {/* Game Area */}
      <div 
        ref={gameAreaRef}
        className="relative w-full h-full cursor-none"
        onMouseDown={() => setIsDragging(true)}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        onTouchStart={() => setIsDragging(true)}
        onTouchEnd={() => setIsDragging(false)}
      >
        {/* Timer Display */}
        {gameState === "playing" && (
          <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
            <Card className="px-6 py-3 bg-card/80 backdrop-blur-sm shadow-[var(--shadow-float)]">
              <p className="text-sm text-muted-foreground">Time Survived</p>
              <p className="text-3xl font-bold text-primary">{timeAlive}s</p>
            </Card>
          </div>
        )}

        {/* Raindrops */}
        {raindrops.map(drop => (
          <div
            key={drop.id}
            className="absolute rounded-full bg-gradient-to-b from-secondary/60 to-accent/80 backdrop-blur-sm shadow-[var(--shadow-float)]"
            style={{
              left: `${drop.x}%`,
              top: `${drop.y}px`,
              width: `${RAINDROP_SIZE}px`,
              height: `${RAINDROP_SIZE}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="absolute inset-1 rounded-full bg-white/30" />
          </div>
        ))}

        {/* Ripples */}
        {ripples.map(ripple => (
          <div
            key={ripple.id}
            className="absolute rounded-full border-4 border-secondary/50 animate-ripple"
            style={{
              left: `${ripple.x}px`,
              top: `${ripple.y}px`,
              width: "60px",
              height: "60px",
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {/* Leaf (Player) */}
        {gameState === "playing" && (
          <div
            className="absolute bottom-20 transition-transform duration-100 ease-out"
            style={{
              left: `${leafPosition}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="relative w-16 h-16 animate-float">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-primary-glow shadow-[var(--shadow-glow)] animate-pulse-glow" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/90 to-primary-glow/90" />
              <div className="absolute inset-0 flex items-center justify-center text-3xl">
                🍃
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
