import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { generateParticles } from "../utils/particles/sampling";
import { useTheme } from "../context/ThemeContext";

export interface ParticleNotificationProps {
  text: string;
  isOpen: boolean;
  onClose: () => void;

  /**
   * Duration of the assembly phase in seconds.
   * Particles fly in and form the notification.
   * @default 3.0
   */
  assembleDuration?: number;

  /**
   * Duration to stay assembled in seconds.
   * Notification is readable during this time.
   * @default 2.0
   */
  displayDuration?: number;

  /**
   * Duration of the dispersal phase in seconds.
   * Particles explode and fade out.
   * @default 3.0
   */
  disperseDuration?: number;

  /**
   * Base size of particles.
   * Controls the visual size of each dot.
   * @default 0.6
   */
  particleBaseSize?: number;

  /**
   * Spacing between particles in the hexagonal grid.
   * Smaller values create denser notifications.
   * @default 0.15
   */
  gridSpacing?: number;

  /**
   * Softness of the background grid particles (0.0 = hard square, 1.0 = soft).
   * @default 0.0
   */
  bgSoftness?: number;

  /**
   * Softness of the text particles (0.0 = sharp, 1.0 = soft).
   * @default 0.0
   */
  textSoftness?: number;

  /**
   * Softness of the border particles (0.0 = sharp, 1.0 = soft).
   * @default 0.3
   */
  borderSoftness?: number;

  /**
   * Minimum feathering base for anti-aliasing.
   * Controls the baseline sharpness. Lower = sharper/thinner text.
   * @default 0.5
   */
  minFeatherBase?: number;

  /**
   * Text thickness/weight control.
   * Slider 0..1 maps thin -> bold without disappearing.
   * @default 0.42
   */
  textThickness?: number;

  /**
   * Density of border particles.
   * Higher = more border dots. Default 0.08.
   */
  borderDensity?: number;

  /**
   * Visibility toggles for Storybook/debug.
   * When false, the layer is hidden without changing layout.
   */
  showRectangle?: boolean;
  showText?: boolean;
  showDot?: boolean;

  /**
   * For testing/story purposes only.
   * Overrides the internal timer and forces the animation to a specific timestamp.
   */
  forcedTime?: number;

  /**
   * Optional target container for the portal.
   * Defaults to document.body.
   */
  portalTarget?: HTMLElement | null;

  /**
   * Optional reference to an existing HTML element to overlap.
   * If provided, particles will be generated to match this element's position and size.
   */
  targetRef?: React.RefObject<HTMLElement>;

  /**
   * Callback fired when the assembly phase is complete.
   * Useful for syncing with other animations (e.g. showing the HTML element).
   */
  onAssemblyComplete?: () => void;

  /**
   * For Storybook/Development: Loop a specific phase of the animation.
   * 1: Assembly (loops 0 -> assembleDuration)
   * 2: Assembled (loops assembleDuration -> explodeStartTime, though effectively static)
   * 3: Dispersal (loops explodeStartTime -> totalDuration)
   */
  loopPhase?: 1 | 2 | 3;

  /**
   * For Storybook/Development: Force a specific theme ("light" | "dark")
   * This overrides the system/provider theme.
   */
  forceTheme?: "light" | "dark";

  /**
   * Callback to receive the total number of particles generated.
   * Useful for performance monitoring or debug displays.
   */
  onParticleCount?: (count: number) => void;
}

export const PARTICLE_NOTIFICATION_DEFAULTS = {
  assembleDuration: 3.0,
  displayDuration: 2.0,
  disperseDuration: 3.0,
  particleBaseSize: 0.5,
  gridSpacing: 0.0,
  bgSoftness: 0.0,
  textSoftness: 0.0,
  borderSoftness: 0.0,
  minFeatherBase: 0.01,
  textThickness: 0.28,
  borderDensity: 0.01,
  showRectangle: true,
  showText: true,
  showDot: true,
} as const;

// SHADERS

const VS_SOURCE = `
precision highp float;

attribute vec2 a_target;   // Target position (Solid UI)
attribute vec2 a_start;    // Start position (Swarm top)
attribute vec2 a_control;  // Control point for Bezier
attribute vec2 a_velocity; // Velocity for explosion
attribute vec4 a_color;
attribute float a_size;
attribute float a_delay;
attribute float a_type;    // 0.0 = bg, 1.0 = text, 2.0 = border

uniform float u_time;      // Global animation time
uniform float u_ratio;     // Pixel ratio
uniform vec2 u_resolution; // Viewport resolution

uniform float u_assemble_time; // End of assembly phase
uniform float u_explode_start_time; // Start of explosion phase

varying vec4 v_color;
varying float v_size_px;   // Passed to fragment for pixel-perfect AA
varying float v_type;

// Cubic Bezier helper
vec2 bezier(vec2 p0, vec2 p1, vec2 p2, float t) {
    float invT = 1.0 - t;
    return invT * invT * p0 + 2.0 * invT * t * p1 + t * t * p2;
}

// Ease out cubic
float easeOut(float t) {
    return 1.0 - pow(1.0 - t, 3.0);
}

void main() {
    vec2 pos = a_target;
    float pointSize = a_size;
    float alpha = a_color.a;

    // PHASE 1: ASSEMBLAGE (0.0 to u_assemble_time)
    if (u_time < u_assemble_time) {
        // Staggered start based on delay
        float t = smoothstep(0.0 + a_delay * 0.5, 1.2 + a_delay * 0.5, u_time);
        float easedT = easeOut(t);

        pos = bezier(a_start, a_control, a_target, easedT);
        pointSize *= smoothstep(0.0, 0.2, t);
    }

    // PHASE 3: DISINTEGRATION (> u_explode_start_time)
    if (u_time > u_explode_start_time) {
        float explodeTime = u_time - u_explode_start_time;

        pos += a_velocity * explodeTime * 20.0;
        pos.y += 200.0 * explodeTime * explodeTime; // Gravity

        alpha *= smoothstep(2.0, 0.0, explodeTime);
    }

    // Convert to Clip Space
    // pos is in pixels relative to center of viewport
    // u_resolution is width, height
    // We adjust y to flip coordinate system (WebGL is bottom-up, we often think top-down, but here we centered everything)
    vec2 zeroToOne = (pos + (u_resolution / 2.0)) / u_resolution;
    vec2 clipSpace = (zeroToOne * 2.0) - 1.0;

    // Flip Y because standard web coords are top-left 0,0, but we calculated positions based on center 0,0
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

    float finalSize = pointSize * u_ratio;
    gl_PointSize = max(1.0, finalSize);

    v_size_px = finalSize;
    v_color = vec4(a_color.rgb, alpha);
    v_type = a_type;
}
`;

const FS_SOURCE = `
precision highp float;
varying vec4 v_color;
varying float v_size_px;
varying float v_type; // 0.0 = bg, 1.0 = text, 2.0 = border

uniform float u_bg_softness;
uniform float u_text_softness;
uniform float u_border_softness;
uniform float u_min_feather_base;
uniform float u_text_thickness;

void main() {
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord); // Default to circle distance

    // --- RENDERING CONFIGURATION ---
    // Background (v_type < 0.5): HARD SQUARE (usually)
    // Text (0.5 < v_type < 1.5): CRISP CIRCLE (usually)
    // Border (v_type > 1.5): SMOOTH CIRCLE (usually)

    float effectiveShape = 1.0; // Default to square
    float effectiveSoftness = 0.0;

    if (v_type > 1.5) {
        // BORDER
        effectiveShape = 0.0; // Circle
        effectiveSoftness = u_border_softness;
    } else if (v_type > 0.5) {
        // TEXT
        effectiveShape = 0.0; // Circle
        effectiveSoftness = u_text_softness;
    } else {
        // BACKGROUND
        effectiveShape = 1.0; // Square
        effectiveSoftness = u_bg_softness;
    }

    // Green Dot Exception: Force smooth circle for the GLOW (low alpha), keep CORE (high alpha) sharp
    // This fixes the "mesh" look of the shadow while keeping the dot crisp
    if (v_color.g > v_color.r + 0.1 && v_color.g > v_color.b + 0.1) {
        // It's green
        if (v_color.a < 0.8) {
             // It's the shadow/glow -> Make it soft
             effectiveShape = 0.0;
             effectiveSoftness = 1.0;
        }
    }

    // --- SHAPE DISTANCE CALCULATION ---
    if (effectiveShape > 0.5) {
        // Square: Use Chebyshev distance (max of x, y)
        dist = max(abs(coord.x), abs(coord.y));
    }

    // --- ALPHA / AA CALCULATION ---
    float alpha = 1.0;
    // Base feathering derived from uniform (was previously hardcoded)
    float baseFeather = u_min_feather_base / max(v_size_px, 1.0);

    // Hard Edge Optimization (Solid Fill) - ONLY for Background Squares
    if (effectiveShape > 0.5 && effectiveSoftness < 0.01) {
        if (dist > 0.51) discard;
        alpha = 1.0;
    } else {
        // Smoothstep AA
        float edge = 0.5;
        float softnessFeather = effectiveSoftness * 0.45;

        // Special tuning for Text so the slider behaves like weight, not opacity
        if (v_type > 0.5 && v_type < 1.5) {
             float thickness = clamp(u_text_thickness, 0.0, 1.0);
             // Remap to a stable radius range so text never disappears
             // Allow slightly larger max radius (0.6) for bolder, whiter text at max thickness
             float mappedEdge = mix(0.32, 0.6, thickness);
             float mappedFeatherScale = mix(0.8, 1.1, thickness);

             edge = mappedEdge;
             baseFeather *= mappedFeatherScale;
        }

        // Base anti-aliasing width
        float feather = baseFeather + softnessFeather;

        feather = clamp(feather, 0.001, 0.49);
        edge = max(edge, 0.02); // Guard against vanishing text
        alpha = 1.0 - smoothstep(edge - feather, edge, dist);
    }

    if (alpha < 0.02) discard;
    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
}
`;

const ParticleNotification: React.FC<ParticleNotificationProps> = ({
  text,
  isOpen,
  onClose,
  assembleDuration = PARTICLE_NOTIFICATION_DEFAULTS.assembleDuration,
  displayDuration = PARTICLE_NOTIFICATION_DEFAULTS.displayDuration,
  disperseDuration = PARTICLE_NOTIFICATION_DEFAULTS.disperseDuration,
  particleBaseSize = PARTICLE_NOTIFICATION_DEFAULTS.particleBaseSize, // Lighter to match HTML 12px/700
  gridSpacing = PARTICLE_NOTIFICATION_DEFAULTS.gridSpacing,
  bgSoftness = PARTICLE_NOTIFICATION_DEFAULTS.bgSoftness,
  textSoftness = PARTICLE_NOTIFICATION_DEFAULTS.textSoftness,
  borderSoftness = PARTICLE_NOTIFICATION_DEFAULTS.borderSoftness,
  minFeatherBase = PARTICLE_NOTIFICATION_DEFAULTS.minFeatherBase, // Sharper edges, thinner strokes
  textThickness = PARTICLE_NOTIFICATION_DEFAULTS.textThickness, // Further lighten to match HTML
  borderDensity = PARTICLE_NOTIFICATION_DEFAULTS.borderDensity,
  showRectangle = PARTICLE_NOTIFICATION_DEFAULTS.showRectangle,
  showText = PARTICLE_NOTIFICATION_DEFAULTS.showText,
  showDot = PARTICLE_NOTIFICATION_DEFAULTS.showDot,
  forcedTime,
  portalTarget,
  loopPhase,
  forceTheme,
  onParticleCount,
  targetRef,
  onAssemblyComplete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reqRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const { resolvedTheme } = useTheme();

  // State to control mounting of canvas
  const [isActive, setIsActive] = useState(false);

  // Ref to track if assembly completion has been fired
  const assemblyCompleteFired = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setIsActive(true);
      assemblyCompleteFired.current = false;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      powerPreference: "high-performance",
      premultipliedAlpha: false,
    });

    if (!gl) return;

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Compile Shaders
    const createShader = (type: number, source: string) => {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);

      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, VS_SOURCE);
    const fs = createShader(gl.FRAGMENT_SHADER, FS_SOURCE);

    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    // Data Generation
    // 2. Generate particles
    const pixelRatio = Math.max(window.devicePixelRatio || 1, 2);

    let layoutOverride = undefined;
    if (targetRef && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      // Convert DOM rect to canvas-centered coordinates
      // Canvas is fixed inset-0, so it matches viewport 1:1 in CSS pixels
      // Center of canvas is (window.innerWidth / 2, window.innerHeight / 2)
      // Particle system 0,0 is center of canvas.
      // Y is positive down (in our logic inside generateParticles)

      const viewportCenterX = window.innerWidth / 2;
      const viewportCenterY = window.innerHeight / 2;

      layoutOverride = {
        x: rect.left + rect.width / 2 - viewportCenterX,
        y: rect.top + rect.height / 2 - viewportCenterY,
        width: rect.width,
        height: rect.height,
      };
    }

    // Use currentTheme instead of resolvedTheme
    const { positions, colors, sizes, delays, types, vertexCount } =
      generateParticles(
        canvas.width / pixelRatio, // Use actual canvas logical width
        canvas.height / pixelRatio, // Use actual canvas logical height
        text,
        (forceTheme || resolvedTheme || "light") as "light" | "dark",
        {
          particleBaseSize,
          gridSpacing,
          borderDensity,
          showRectangle,
          showText,
          showDot,
          layout: layoutOverride,
        }
      );

    // Report particle count if callback is provided
    if (onParticleCount) {
      onParticleCount(vertexCount);
    }

    // Buffer Helper
    const createBuffer = (
      data: Float32Array,
      attribName: string,
      size: number
    ) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(program, attribName);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(loc);
      return buffer;
    };

    // Position is interleaved in generateParticles: [tx, ty, sx, sy, cx, cy, vx, vy]
    const posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    const FSIZE = positions.BYTES_PER_ELEMENT;
    const STRIDE = 8 * FSIZE;

    const bindAttrib = (name: string, count: number, offset: number) => {
      const loc = gl.getAttribLocation(program, name);
      gl.vertexAttribPointer(
        loc,
        count,
        gl.FLOAT,
        false,
        STRIDE,
        offset * FSIZE
      );
      gl.enableVertexAttribArray(loc);
    };

    bindAttrib("a_target", 2, 0);
    bindAttrib("a_start", 2, 2);
    bindAttrib("a_control", 2, 4);
    bindAttrib("a_velocity", 2, 6);

    // Individual buffers
    createBuffer(colors, "a_color", 4);
    createBuffer(sizes, "a_size", 1);
    createBuffer(delays, "a_delay", 1);
    createBuffer(types, "a_type", 1);

    // Uniforms
    const uTime = gl.getUniformLocation(program, "u_time");
    const uRes = gl.getUniformLocation(program, "u_resolution");
    const uRatio = gl.getUniformLocation(program, "u_ratio");
    const uAssembleTime = gl.getUniformLocation(program, "u_assemble_time");
    const uExplodeStartTime = gl.getUniformLocation(
      program,
      "u_explode_start_time"
    );

    const u_bg_softness = gl.getUniformLocation(program, "u_bg_softness");
    const u_text_softness = gl.getUniformLocation(program, "u_text_softness");
    const u_border_softness = gl.getUniformLocation(
      program,
      "u_border_softness"
    );
    const u_min_feather_base = gl.getUniformLocation(
      program,
      "u_min_feather_base"
    );
    const u_text_thickness = gl.getUniformLocation(program, "u_text_thickness");

    // Render Loop
    startTimeRef.current = performance.now();
    const explodeStartTime = assembleDuration + displayDuration;
    const totalDuration = explodeStartTime + disperseDuration;

    const render = (time: number) => {
      // Use the container's dimensions if portalTarget is provided, otherwise window
      const container = portalTarget || window;
      const displayWidth =
        container instanceof Window
          ? container.innerWidth
          : container.clientWidth;
      const displayHeight =
        container instanceof Window
          ? container.innerHeight
          : container.clientHeight;

      const pixelRatio = Math.max(window.devicePixelRatio || 1, 2);

      if (
        canvas.width !== displayWidth * pixelRatio ||
        canvas.height !== displayHeight * pixelRatio
      ) {
        canvas.width = displayWidth * pixelRatio;
        canvas.height = displayHeight * pixelRatio;
        gl.viewport(0, 0, canvas.width, canvas.height);
      }

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // If forcedTime is provided, use it instead of elapsed time
      let elapsed =
        forcedTime !== undefined
          ? forcedTime
          : (time - startTimeRef.current) / 1000;

      // Handle Loop Logic
      if (loopPhase === 1) {
        // Loop Phase 1: 0 -> assembleDuration
        elapsed = elapsed % assembleDuration;
      } else if (loopPhase === 3) {
        // Loop Phase 3: explodeStartTime -> totalDuration
        const phaseDuration = disperseDuration;
        elapsed = explodeStartTime + (elapsed % phaseDuration);
      }

      // Force update viewport if needed (handle resize)
      gl.viewport(0, 0, canvas.width, canvas.height);

      gl.uniform1f(uTime, elapsed);
      gl.uniform2f(uRes, canvas.width / pixelRatio, canvas.height / pixelRatio);
      gl.uniform1f(uRatio, pixelRatio);
      gl.uniform1f(uAssembleTime, assembleDuration);
      gl.uniform1f(uExplodeStartTime, explodeStartTime);

      // Use explicit props or default values for each type
      gl.uniform1f(u_bg_softness, bgSoftness);
      gl.uniform1f(u_text_softness, textSoftness);
      gl.uniform1f(u_border_softness, borderSoftness);
      gl.uniform1f(u_min_feather_base, minFeatherBase);
      gl.uniform1f(u_text_thickness, textThickness);

      gl.drawArrays(gl.POINTS, 0, vertexCount);

      // Auto-close logic (only if not forced and not looping)
      if (forcedTime === undefined && !loopPhase && elapsed > totalDuration) {
        setIsActive(false);
        onClose();
        return;
      }

      // Fire assembly completion event
      if (
        !assemblyCompleteFired.current &&
        onAssemblyComplete &&
        elapsed >= assembleDuration
      ) {
        assemblyCompleteFired.current = true;
        onAssemblyComplete();
      }

      reqRef.current = requestAnimationFrame(render);
    };

    reqRef.current = requestAnimationFrame(render);

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current);
    };
  }, [
    isActive,
    text,
    resolvedTheme,
    onClose,
    assembleDuration,
    displayDuration,
    disperseDuration,
    particleBaseSize,
    gridSpacing,
    bgSoftness,
    textSoftness,
    borderSoftness,
    minFeatherBase,
    textThickness,
    showRectangle,
    showText,
    showDot,
    forcedTime,
    portalTarget,
    loopPhase,
    forceTheme,
    borderDensity,
    onAssemblyComplete,
    onParticleCount,
    targetRef,
  ]);

  if (!isActive) return null;

  return ReactDOM.createPortal(
    <div
      className={`inset-0 pointer-events-none z-[9999] ${
        portalTarget ? "absolute" : "fixed"
      }`}
      style={{ width: "100%", height: "100%" }}
    >
      <canvas
        ref={canvasRef}
        className="inset-0"
        style={{ width: "100%", height: "100%" }}
      />
    </div>,
    portalTarget || document.body
  );
};

export default ParticleNotification;
