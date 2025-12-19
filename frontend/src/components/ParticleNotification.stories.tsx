import { useRef, useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import ParticleNotification, {
  PARTICLE_NOTIFICATION_DEFAULTS,
} from "./ParticleNotification";
import { ThemeProvider, useTheme } from "../context/ThemeContext";
import ToggleSwitch from "./ToggleSwitch";
import {
  ArrowsRightLeftIcon,
  ArrowsUpDownIcon,
} from "@heroicons/react/24/outline";

const meta: Meta<typeof ParticleNotification> = {
  title: "Components/ParticleNotification",
  component: ParticleNotification,
  tags: ["autodocs"],
  argTypes: {
    text: { control: "text" },
    showRectangle: {
      control: "boolean",
      description: "Hide/show the pill rectangle without changing layout.",
      table: { category: "Visibility" },
    },
    showText: {
      control: "boolean",
      description: "Hide/show the label without changing layout.",
      table: { category: "Visibility" },
    },
    showDot: {
      control: "boolean",
      description: "Hide/show the green dot without changing layout.",
      table: { category: "Visibility" },
    },
    assembleDuration: {
      control: { type: "range", min: 0.5, max: 10, step: 0.1 },
      description: "Duration of the assembly phase (seconds)",
    },
    displayDuration: {
      control: { type: "range", min: 0.5, max: 10, step: 0.1 },
      description: "Duration to stay assembled (seconds)",
    },
    disperseDuration: {
      control: { type: "range", min: 0.5, max: 10, step: 0.1 },
      description: "Duration of the dispersal phase (seconds)",
    },
    particleBaseSize: {
      control: { type: "range", min: 0.0, max: 5.0, step: 0.1 },
      description: "Base size of particles (logical pixels)",
      table: { category: "Clarity/Smoothing" },
    },
    gridSpacing: {
      control: { type: "range", min: 0, max: 2.0, step: 0.05 },
      description: "Hexagonal grid spacing (density)",
      table: { category: "Clarity/Smoothing" },
    },
    bgSoftness: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.05 },
      description: "Softness of background squares",
      table: { category: "Clarity/Smoothing" },
    },
    textSoftness: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.05 },
      description: "Softness of text",
      table: { category: "Clarity/Smoothing" },
    },
    borderSoftness: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.05 },
      description: "Softness of border dots",
      table: { category: "Clarity/Smoothing" },
    },
    borderDensity: {
      control: { type: "range", min: 0.01, max: 0.3, step: 0.01 },
      description: "Density of border particles",
      table: { category: "Clarity/Smoothing" },
    },
    minFeatherBase: {
      control: { type: "range", min: 0.01, max: 3.0, step: 0.01 },
      description: "Minimum AA blur radius (lower = sharper/thinner text)",
      table: { category: "Clarity/Smoothing" },
    },
    textThickness: {
      control: { type: "range", min: 0.0, max: 1.0, step: 0.01 },
      description:
        "Text weight (thin -> bold), remapped to never vanish. Default 0.42",
      table: { category: "Clarity/Smoothing" },
    },
    isOpen: { control: "boolean", table: { disable: true } },
    onClose: { table: { disable: true } },
  },
};

export default meta;
type Story = StoryObj<typeof ParticleNotification>;

export const Interactive: Story = {
  render: (args) => {
    // We use a key based on the args to force a full remount whenever any arg changes.
    // This satisfies the requirement: "as soon as we change it, everything is redrawn and restarted."
    const key = JSON.stringify({
      t: args.text,
      a: args.assembleDuration,
      d: args.displayDuration,
      x: args.disperseDuration,
      pbs: args.particleBaseSize,
      gs: args.gridSpacing,
      bgs: args.bgSoftness,
      ts: args.textSoftness,
      bs: args.borderSoftness,
      bd: args.borderDensity,
      mfb: args.minFeatherBase,
      tt: args.textThickness,
      sr: args.showRectangle,
      st: args.showText,
      sd: args.showDot,
    });

    return (
      <ThemeProvider>
        <div className="h-screen w-full flex flex-col items-center justify-center text-gray-500 gap-8">
          <p>Particles assemble -&gt; remain visible -&gt; disappear (WebGL)</p>
          <div className="relative w-full h-full flex items-center justify-center">
            <ParticleNotification
              key={key}
              {...args}
              onClose={() => console.log("Animation sequence completed")}
            />
          </div>
        </div>
      </ThemeProvider>
    );
  },
  args: {
    ...PARTICLE_NOTIFICATION_DEFAULTS,
    text: "Notification",
    isOpen: true,
    showRectangle: true,
    showText: true,
    showDot: true,
  },
};

export const ThreeStates: Story = {
  render: (args, { globals }) => {
    const selectedTheme =
      globals && (globals as Record<string, unknown>).theme === "dark"
        ? "dark"
        : "light";

    const StoryContent = () => {
      // 1. Initial State (Assembly Phase) - e.g. 1.0s
      // 2. Middle State (Fully Assembled) - e.g. 4.0s (after assembly, before disperse)
      // 3. Final State (Dispersal Phase) - e.g. 6.0s (after explode start)

      // Calculate timestamps based on args
      const assembleDuration = args.assembleDuration || 3.0;
      const displayDuration = args.displayDuration || 2.0;
      const tMiddle = assembleDuration + displayDuration * 0.5; // mid-display

      // Refs for containers
      const ref1 = useRef<HTMLDivElement>(null);
      const ref2 = useRef<HTMLDivElement>(null);
      // Use state for the portal target to ensure re-render when the node changes (e.g. toggling modes)
      const [portalNode2, setPortalNode2] = useState<HTMLElement | null>(null);
      const ref3 = useRef<HTMLDivElement>(null);

      // State for particle count
      const [particleCount, setParticleCount] = useState<number>(0);

      // Comparison Mode State
      const [isCompareMode, setIsCompareMode] = useState(true);
      const [isVertical, setIsVertical] = useState(false);
      const [sliderValue, setSliderValue] = useState(50);
      const [isDragging, setIsDragging] = useState(false);
      const sliderContainerRef = useRef<HTMLDivElement>(null);
      const { resolvedTheme, setTheme } = useTheme();

      useEffect(() => {
        setTheme(selectedTheme === "dark" ? "dark" : "light");
      }, [selectedTheme, setTheme]);

      // Force re-render after mount to ensure refs are ready
      const [mounted, setMounted] = useState(false);
      useEffect(() => {
        setMounted(true);
      }, []);

      // Drag Logic
      useEffect(() => {
        const handleMove = (e: MouseEvent | TouchEvent) => {
          if (!isDragging || !sliderContainerRef.current) return;

          let clientX, clientY;
          if ("touches" in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
          } else {
            clientX = (e as MouseEvent).clientX;
            clientY = (e as MouseEvent).clientY;
          }

          const rect = sliderContainerRef.current.getBoundingClientRect();

          if (isVertical) {
            const y = clientY - rect.top;
            const percentage = Math.max(
              0,
              Math.min(100, (y / rect.height) * 100)
            );
            setSliderValue(percentage);
          } else {
            const x = clientX - rect.left;
            const percentage = Math.max(
              0,
              Math.min(100, (x / rect.width) * 100)
            );
            setSliderValue(percentage);
          }
        };

        const handleUp = () => {
          setIsDragging(false);
        };

        if (isDragging) {
          window.addEventListener("mousemove", handleMove);
          window.addEventListener("mouseup", handleUp);
          window.addEventListener("touchmove", handleMove, { passive: false });
          window.addEventListener("touchend", handleUp);
        }

        return () => {
          window.removeEventListener("mousemove", handleMove);
          window.removeEventListener("mouseup", handleUp);
          window.removeEventListener("touchmove", handleMove);
          window.removeEventListener("touchend", handleUp);
        };
      }, [isDragging]);

      // We use a key based on the args to force a full remount whenever any arg changes.
      // This satisfies the requirement: "as soon as we change it, everything is redrawn and restarted."
      const key = JSON.stringify({
        t: args.text,
        a: args.assembleDuration,
        d: args.displayDuration,
        x: args.disperseDuration,
        pbs: args.particleBaseSize,
        gs: args.gridSpacing,
        sr: args.showRectangle,
        st: args.showText,
        sd: args.showDot,
      });

      const palette =
        resolvedTheme === "dark"
          ? { bg: "#0f172a", text: "#ffffff", border: "#1f2937" }
          : { bg: "#f8fafc", text: "#000000", border: "#cbd5e1" };

      const HTMLCard = (
        <div
          className={`flex h-[64px] w-[280px] items-center justify-center gap-3 rounded-[20px] border select-none ${
            args.showRectangle
              ? "shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
              : "shadow-none"
          }`}
          style={{
            background: args.showRectangle ? palette.bg : "transparent",
            borderColor: args.showRectangle ? palette.border : "transparent",
            color: palette.text,
          }}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full bg-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.7)] ${
              args.showDot ? "" : "opacity-0"
            }`}
            aria-hidden={!args.showDot}
          />
          <span
            className={`font-bold tracking-[0.01em] ${
              args.showText ? "" : "opacity-0"
            }`}
            aria-hidden={!args.showText}
            style={{ color: palette.text }}
          >
            {args.text}
          </span>
        </div>
      );

      return (
        <div className="h-screen w-full flex flex-col gap-3 bg-white dark:bg-gray-800 p-4 transition-colors overflow-hidden">
          {/* Row 1: Initial (Plays Assembly) */}
          <div
            ref={ref1}
            className="relative flex-1 min-h-0 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50"
          >
            <div className="absolute top-2 left-2 text-gray-900 dark:text-white text-xs z-50 bg-white/50 dark:bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
              Phase 1: Assembly (Looping)
            </div>
            {mounted && ref1.current && (
              <ParticleNotification
                key={`${key}-1`}
                {...args}
                isOpen={true}
                loopPhase={1} // Loop assembly
                // In dark mode story, force dark theme if parent is dark
                // But storybook handles toggling class 'dark'.
                // Ideally we detect it, but for simplicity let's rely on useTheme context working.
                // However, since we saw text was gray, it implies context might be failing.
                // Let's FORCE theme based on the class if possible, or just add a control?
                // Actually, the best way for the story is to just let the user toggle it via controls if needed.
                // But the user said "in dark mode... text is not white".
                // We'll update the wrapper to be explicit.
                onClose={() => {}}
                portalTarget={ref1.current}
              />
            )}
          </div>

          {/* Row 2: Middle (Static Freeze) */}
          <div
            ref={ref2}
            className="relative border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50 flex flex-col"
          >
            <div className="absolute top-0 left-0 right-0 h-10 z-50 flex items-center justify-between px-2">
              <div className="text-gray-900 dark:text-white text-xs bg-white/50 dark:bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                Phase 2: Assembled (Static Freeze at t={tMiddle.toFixed(1)}s) •{" "}
                {particleCount > 0
                  ? `${particleCount.toLocaleString()} particles`
                  : "Calculating..."}
              </div>
              <div className="flex items-center gap-2 bg-white/50 dark:bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                {isCompareMode && (
                  <button
                    onClick={() => setIsVertical(!isVertical)}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-700 dark:text-gray-300 transition-colors"
                    title={
                      isVertical ? "Switch to Horizontal" : "Switch to Vertical"
                    }
                  >
                    {isVertical ? (
                      <ArrowsRightLeftIcon className="w-4 h-4" />
                    ) : (
                      <ArrowsUpDownIcon className="w-4 h-4" />
                    )}
                  </button>
                )}
                <span className="text-xs text-gray-900 dark:text-white font-medium">
                  Compare
                </span>
                <ToggleSwitch
                  checked={isCompareMode}
                  onChange={setIsCompareMode}
                />
              </div>
            </div>

            {isCompareMode ? (
              // COMPARE VIEW
              <div
                ref={sliderContainerRef}
                className={`relative w-full flex-1 min-h-[200px] flex items-center justify-center touch-none select-none bg-gray-50 dark:bg-gray-800 ${
                  isVertical ? "cursor-ns-resize" : "cursor-ew-resize"
                }`}
                onMouseDown={() => setIsDragging(true)}
                onTouchStart={() => setIsDragging(true)}
              >
                {/* Labels */}
                <div className="absolute inset-0 pointer-events-none z-30">
                  <span
                    className={`absolute text-xs font-bold text-white/90 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm border border-white/20 ${
                      isVertical
                        ? "top-12 left-1/2 -translate-x-1/2"
                        : "top-12 left-4"
                    }`}
                  >
                    WebGL
                  </span>
                  <span
                    className={`absolute text-xs font-bold text-white/90 bg-black/40 px-2 py-0.5 rounded backdrop-blur-sm border border-white/20 ${
                      isVertical
                        ? "bottom-4 left-1/2 -translate-x-1/2"
                        : "top-12 right-4"
                    }`}
                  >
                    HTML
                  </span>
                </div>

                {/* HTML Reference (Background) */}
                <div
                  className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  style={{
                    clipPath: isVertical
                      ? `inset(${sliderValue}% 0 0 0)`
                      : `inset(0 0 0 ${sliderValue}%)`,
                  }}
                >
                  {HTMLCard}
                </div>

                {/* WebGL Version (Foreground) */}
                <div
                  ref={setPortalNode2}
                  className="absolute inset-0 z-10 pointer-events-none"
                  style={{
                    clipPath: isVertical
                      ? `inset(0 0 ${100 - sliderValue}% 0)`
                      : `inset(0 ${100 - sliderValue}% 0 0)`,
                  }}
                />
                {/* Portal Target Content */}
                {mounted && portalNode2 && (
                  <ParticleNotification
                    key={`${key}-2-compare`}
                    {...args}
                    isOpen={true}
                    forcedTime={tMiddle}
                    onClose={() => {}}
                    portalTarget={portalNode2}
                    onParticleCount={setParticleCount}
                  />
                )}

                {/* Slider Handle */}
                <div
                  className={`absolute z-20 flex items-center justify-center group ${
                    isVertical
                      ? "left-0 right-0 h-12 -mt-6 cursor-ns-resize"
                      : "top-0 bottom-0 w-12 -ml-6 cursor-ew-resize"
                  }`}
                  style={
                    isVertical
                      ? { top: `${sliderValue}%` }
                      : { left: `${sliderValue}%` }
                  }
                >
                  <div
                    className={`${
                      isVertical ? "h-0.5 w-full" : "w-0.5 h-full"
                    } bg-blue-500 pointer-events-none`}
                  />
                  <div
                    className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-gray-700 rounded-full shadow-lg flex items-center justify-center text-blue-500 border border-gray-200 dark:border-gray-600 transition-opacity duration-200 ${
                      isDragging
                        ? "opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    }`}
                  >
                    {isVertical ? (
                      <ArrowsUpDownIcon className="w-4 h-4" />
                    ) : (
                      <ArrowsRightLeftIcon className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>
            ) : (
              // SPLIT VIEW
              <div className="flex flex-col gap-4 p-6 items-center pt-12">
                <div className="flex w-full flex-col items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.08em] text-gray-600 dark:text-gray-300">
                    WebGL version
                  </span>
                  <div
                    ref={setPortalNode2}
                    className="relative flex h-[100px] w-full items-center justify-center overflow-hidden rounded-xl"
                  >
                    {mounted && portalNode2 && (
                      <ParticleNotification
                        key={`${key}-2-split`}
                        {...args}
                        isOpen={true}
                        forcedTime={tMiddle}
                        onClose={() => {}}
                        portalTarget={portalNode2}
                        onParticleCount={setParticleCount}
                      />
                    )}
                  </div>
                </div>
                <div className="flex w-full flex-col items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.08em] text-gray-600 dark:text-gray-300">
                    HTML reference
                  </span>
                  <div className="flex w-full justify-center pointer-events-none">
                    {HTMLCard}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Row 3: Final (Animated) */}
          <div
            ref={ref3}
            className="relative flex-1 min-h-0 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700/50"
          >
            <div className="absolute top-2 left-2 text-gray-900 dark:text-white text-xs z-50 bg-white/50 dark:bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
              Phase 3: Dispersal (Looping)
            </div>
            {mounted && ref3.current && (
              <ParticleNotification
                key={`${key}-3`}
                {...args}
                isOpen={true}
                loopPhase={3} // Loop dispersal
                onClose={() => {}}
                portalTarget={ref3.current}
              />
            )}
          </div>
        </div>
      );
    };

    return (
      <ThemeProvider>
        <StoryContent />
      </ThemeProvider>
    );
  },
  args: {
    ...PARTICLE_NOTIFICATION_DEFAULTS,
    text: "Notification",
    isOpen: true,
    showRectangle: true,
    showText: true,
    showDot: true,
  },
};
