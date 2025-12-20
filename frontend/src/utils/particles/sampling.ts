import { hexToRgb, isInsideRoundedRect, randomRange, dist } from "./geometry";

export interface ParticleData {
  positions: Float32Array; // [targetX, targetY, startX, startY, controlX, controlY, velocityX, velocityY]
  colors: Float32Array; // [r, g, b, a]
  sizes: Float32Array; // [size]
  delays: Float32Array; // [delay]
  types: Float32Array; // [type] 0=soft, 1=hard
  vertexCount: number;
  layoutBounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  iconCenter: { x: number; y: number } | null;
}

// Configuration Constants
const MIN_NOTIFICATION_W = 280; // Minimum width
const NOTIFICATION_H = 64;
const RADIUS = 20;
const ACCENT_COLOR = "#22c55e"; // Softer green accent
const PADDING_X = 40; // Horizontal padding inside the pill

export interface ParticleOptions {
  particleBaseSize?: number;
  gridSpacing?: number;
  borderDensity?: number;
  showRectangle?: boolean;
  showText?: boolean;
  showDot?: boolean;
  layout?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const generateParticles = (
  viewportW: number,
  viewportH: number,
  text: string,
  theme: "light" | "dark",
  options: ParticleOptions = {}
): ParticleData => {
  const {
    particleBaseSize = 1.6, // Base size of a particle in logical pixels
    gridSpacing = 0.55, // Balanced fill density
    borderDensity = 0.08, // Distance between border particles
    showRectangle = true,
    showText = true,
    showDot = true,
    layout,
  } = options;

  // Use gridSpacing in adaptive calculation if provided (as a scalar multiplier)
  const spacingMultiplier = gridSpacing > 0.05 ? gridSpacing / 0.55 : 1.0;

  const particles: number[] = []; // [tx, ty, sx, sy, cx, cy, vx, vy]
  const colors: number[] = [];
  const sizes: number[] = [];
  const delays: number[] = [];
  const types: number[] = [];

  // Theme configuration
  const themeColors =
    theme === "dark"
      ? { bg: "#0f172a", text: "#ffffff", border: "#1f2937" } // darker pill for contrast
      : { bg: "#f8fafc", text: "#000000", border: "#cbd5e1" }; // light pill with soft border

  // Position logic
  let centerX = 0;
  let centerY = 0;
  let overrideWidth = 0;
  let overrideHeight = 0;

  if (layout) {
    // Use provided layout (already relative to viewport center)
    centerX = layout.x;
    centerY = layout.y;
    overrideWidth = layout.width;
    overrideHeight = layout.height;
  } else {
    // Default: Position at the bottom of the screen
    // Positive Y is down in WebGL clip space conversion logic used in shader
    // If viewportH is small (e.g. < 400), we assume we are in a storybook cell and want to center vertically.
    centerY = viewportH * 0.5 - 100;
    if (viewportH < 400) {
      centerY = 0;
    }
  }

  // Helpers to add a particle
  const addParticle = (
    tx: number,
    ty: number,
    color: [number, number, number],
    alpha: number,
    size: number,
    type: "bg" | "text" | "border"
  ) => {
    // Target Position
    particles.push(tx, ty);

    // Start Position (Swarm from top, wide spread)
    const sx = randomRange(-viewportW * 0.5, viewportW * 0.5);
    const sy = -viewportH / 2 - randomRange(50, 400); // Start ABOVE the screen
    particles.push(sx, sy);

    // Control Point for Bezier Curve (Chaotic path)
    const cx = randomRange(-viewportW, viewportW);
    const cy = randomRange(-viewportH * 0.5, viewportH * 0.5);
    particles.push(cx, cy);

    // Explode Velocity (Disintegration)
    const angle = Math.atan2(ty - centerY, tx - centerX);
    const speed = randomRange(4, 12); // Faster explosion
    const vx = Math.cos(angle) * speed + randomRange(-2, 2);
    let vy = Math.sin(angle) * speed + randomRange(-2, 2);

    // Gravity bias for explosion
    vy -= randomRange(5, 15); // Initial upward kick before gravity takes over in shader
    particles.push(vx, vy);

    // Color
    colors.push(color[0], color[1], color[2], alpha);

    // Size
    sizes.push(size);

    // Type encoding:
    // 0.0 = bg (grid)
    // 1.0 = text
    // 2.0 = border
    let typeVal = 0.0;
    if (type === "text") typeVal = 1.0;
    else if (type === "border") typeVal = 2.0;

    types.push(typeVal);

    // Delay
    const delayBase = type === "text" ? 0.2 : 0.0;
    delays.push(delayBase + randomRange(0, 1.2));
  };

  const bgRgb = hexToRgb(themeColors.bg);
  const borderRgb = hexToRgb(themeColors.border);

  // Calculate layout and measure text
  let textData: Uint8ClampedArray | null = null;
  const scale = 5;
  const fontPx = viewportW <= 768 ? 14 : 12;
  let NOTIFICATION_W = overrideWidth || MIN_NOTIFICATION_W;
  const NOTIFICATION_H_ACTUAL = overrideHeight || NOTIFICATION_H;

  // We use the variables left/top/right/bottom for the particle generation bounds
  let left = centerX - NOTIFICATION_W / 2;
  let top = centerY - NOTIFICATION_H_ACTUAL / 2;
  let right = left + NOTIFICATION_W;
  let bottom = top + NOTIFICATION_H_ACTUAL;

  // Setup canvas for text measurement and generation
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let iconCenterX = 0;
  let iconCenterY = 0;
  let hasIconCenter = false;

  if (ctx) {
    // 1. Measure Text to Determine Width
    // Match HTML reference: 12px bold Inter with slight tracking and a slight vertical offset
    ctx.font = `700 ${
      fontPx * scale
    }px "Roboto", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const textWidth = ctx.measureText(text).width;
    // Green dot sizing: 8.75px diameter (4.375px radius) to mirror HTML dot
    const dotSolidR = 4.375 * scale;
    const iconVisualSize = dotSolidR * 2;
    const spacing = 12 * scale; // gap-3 in HTML

    // Calculate Dynamic Width if not overridden
    if (!overrideWidth) {
      const contentWidthUnscaled =
        (iconVisualSize + spacing + textWidth) / scale;
      const calculatedW = Math.max(
        MIN_NOTIFICATION_W,
        contentWidthUnscaled + PADDING_X * 2
      );
      NOTIFICATION_W = calculatedW;
    }

    // Update Geometry based on final width
    left = centerX - NOTIFICATION_W / 2;
    top = centerY - NOTIFICATION_H_ACTUAL / 2;
    right = left + NOTIFICATION_W;
    bottom = top + NOTIFICATION_H_ACTUAL;

    // 2. Resize Canvas
    canvas.width = NOTIFICATION_W * scale;
    canvas.height = NOTIFICATION_H_ACTUAL * scale;

    // 3. Draw Content
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Re-set font after resize
    ctx.font = `700 ${
      fontPx * scale
    }px "Roboto", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    const totalContentWidth = iconVisualSize + spacing + textWidth;
    // We center the content within the notification pill
    const startX = (canvas.width - totalContentWidth) / 2;
    const textCenterY = (NOTIFICATION_H_ACTUAL / 2) * scale;
    // Slight downward offset to align visual ascenders with HTML rendering
    const textYOffset = 0.2 * scale;
    // Nudge text left to match HTML centering
    const textXOffset = -3 * scale;

    // Draw Icon (Circle) - matches HTML: 7.5px dot with 12px glow shadow
    const iconX = startX + dotSolidR; // Center at solid dot radius (not glow)
    const iconY = textCenterY;

    if (showDot) {
      // Glow matching reference: shadow-[0_0_12px_rgba(34,197,94,0.7)]
      // CSS box-shadow 12px blur ≈ radius extending ~12px from edge
      // We reduce the alpha significantly because overlapping particles accumulate opacity
      const glowOuterR = dotSolidR + 12 * scale; // Glow extension matches blur radius
      const gradient = ctx.createRadialGradient(
        iconX,
        iconY,
        dotSolidR, // Start glow from edge of solid dot
        iconX,
        iconY,
        glowOuterR
      );
      // Non-linear falloff to simulate Gaussian blur better than linear
      gradient.addColorStop(0, "rgba(34, 197, 94, 0.12)"); // Further reduced from 0.25
      gradient.addColorStop(0.4, "rgba(34, 197, 94, 0.03)");
      gradient.addColorStop(1, "rgba(34, 197, 94, 0.0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(iconX, iconY, glowOuterR, 0, Math.PI * 2);
      ctx.fill();

      // Solid dot
      ctx.fillStyle = ACCENT_COLOR;
      ctx.beginPath();
      ctx.arc(iconX, iconY, dotSolidR, 0, Math.PI * 2);
      ctx.fill();

      iconCenterX = left + iconX / scale;
      iconCenterY = top + iconY / scale;
      hasIconCenter = true;
    }

    // Draw Text
    if (showText) {
      ctx.fillStyle = themeColors.text;
      const textX = startX + iconVisualSize + spacing + textXOffset;
      ctx.fillText(text, textX, textCenterY + textYOffset);
    }

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    textData = imgData.data;
  }

  // 1. LIQUID-SOLID FILL: Adaptive Hexagonal Grid

  // --- ADAPTIVE SAMPLING CONFIGURATION ---
  // Core (Rectangles): Larger particles for performance/bulk
  // Corners (Arcs): Smaller particles for smooth curvature
  // We reduce the minimum size to ensure we don't force oversized particles that overshoot the bounds
  const coreParticleSize = Math.max(particleBaseSize * 3.5, 2.0);
  const coreStep = coreParticleSize * 0.45 * spacingMultiplier;

  const cornerParticleSize = Math.max(particleBaseSize * 2.0, 1.2);
  const cornerStep = cornerParticleSize * 0.35 * spacingMultiplier;

  // Geometric Insets:
  // To ensure the *visual* edge of the particles aligns with the logical bounds (64px height),
  // we must inset the particle centers by half their size.
  // Otherwise, a particle at y=0 with radius=1.5 draws pixels up to y=-1.5.
  const bgInset = coreParticleSize * 0.5;
  const cornerInset = cornerParticleSize * 0.5;

  const fillArea = (
    xStart: number,
    xEnd: number,
    yStart: number,
    yEnd: number,
    pSize: number,
    step: number,
    checkBounds: boolean
  ) => {
    // Fill the specified rectangular region
    for (let y = yStart; y <= yEnd; y += step) {
      const isOddRow = Math.floor((y - yStart) / step) % 2 === 1;
      const xOffset = isOddRow ? step / 2 : 0;

      for (let x = xStart; x <= xEnd; x += step) {
        const px = x + xOffset;

        if (checkBounds) {
          if (
            isInsideRoundedRect(
              px,
              y,
              left + cornerInset, // Adjust bounds check for inset
              top + cornerInset,
              NOTIFICATION_W - cornerInset * 2,
              NOTIFICATION_H_ACTUAL - cornerInset * 2,
              RADIUS - cornerInset // Adjust radius for inset
            )
          ) {
            addParticle(px, y, bgRgb, 1.0, pSize, "bg");
          }
        } else {
          // Direct add for safe rectangular zones
          addParticle(px, y, bgRgb, 1.0, pSize, "bg");
        }
      }
    }
  };

  if (showRectangle) {
    // ZONE 1: CORE RECTANGLE (Center Block)
    // Covers full height between the rounded corners horizontally
    fillArea(
      left + RADIUS,
      right - RADIUS,
      top + bgInset,
      bottom - bgInset,
      coreParticleSize,
      coreStep,
      false // Safe zone
    );

    // ZONE 2: LEFT WING (Vertical Rect between corners)
    fillArea(
      left + bgInset,
      left + RADIUS,
      top + RADIUS,
      bottom - RADIUS,
      coreParticleSize,
      coreStep,
      false // Safe zone
    );

    // ZONE 3: RIGHT WING (Vertical Rect between corners)
    fillArea(
      right - RADIUS,
      right - bgInset,
      top + RADIUS,
      bottom - RADIUS,
      coreParticleSize,
      coreStep,
      false // Safe zone
    );

    // ZONE 4: CORNERS (Detailed Sampling)
    // Top-Left
    fillArea(
      left + cornerInset,
      left + RADIUS,
      top + cornerInset,
      top + RADIUS,
      cornerParticleSize,
      cornerStep,
      true
    );

    // Top-Right
    fillArea(
      right - RADIUS,
      right - cornerInset,
      top + cornerInset,
      top + RADIUS,
      cornerParticleSize,
      cornerStep,
      true
    );

    // Bottom-Left
    fillArea(
      left + cornerInset,
      left + RADIUS,
      bottom - RADIUS,
      bottom - cornerInset,
      cornerParticleSize,
      cornerStep,
      true
    );

    // Bottom-Right
    fillArea(
      right - RADIUS,
      right - cornerInset,
      bottom - RADIUS,
      bottom - cornerInset,
      cornerParticleSize,
      cornerStep,
      true
    );

    // 2. VECTOR EDGE INJECTION: Precise Perimeter Tracing
    const edgeColor = theme === "light" ? borderRgb : bgRgb;

    // Calculate average border particle size to determine inset
    const avgBorderPSize = particleBaseSize * 1.5;
    const borderInset = avgBorderPSize * 0.5;

    const traceLine = (x1: number, y1: number, x2: number, y2: number) => {
      const d = dist(x1, y1, x2, y2);
      const steps = d / borderDensity;
      const dx = (x2 - x1) / steps;
      const dy = (y2 - y1) / steps;

      for (let i = 0; i <= steps; i++) {
        // Micro-variation in size (±8%) to break the "string of pearls" artifact
        // This creates a smoother organic edge without adding more particles
        const sizeVariation = randomRange(0.92, 1.08);

        addParticle(
          x1 + dx * i,
          y1 + dy * i,
          edgeColor,
          1.0,
          particleBaseSize * 1.5 * sizeVariation,
          "border"
        );
      }
    };

    // Top & Bottom
    // Inset y-positions so the outer edge of the particles aligns with 'top'/'bottom'
    traceLine(
      left + RADIUS,
      top + borderInset,
      right - RADIUS,
      top + borderInset
    );
    traceLine(
      left + RADIUS,
      bottom - borderInset,
      right - RADIUS,
      bottom - borderInset
    );

    // Left & Right (if height allows)
    if (NOTIFICATION_H_ACTUAL - 2 * RADIUS > 0) {
      traceLine(
        left + borderInset,
        top + RADIUS,
        left + borderInset,
        bottom - RADIUS
      );
      traceLine(
        right - borderInset,
        top + RADIUS,
        right - borderInset,
        bottom - RADIUS
      );
    }

    // Corners (Arc Tracing)
    const traceArc = (
      cx: number,
      cy: number,
      startAngle: number,
      endAngle: number
    ) => {
      // Reduce tracing radius so the outer edge of particles touches the original RADIUS
      const traceR = RADIUS - borderInset;
      const arcLen = Math.abs(endAngle - startAngle) * traceR;
      const steps = Math.ceil(arcLen / borderDensity);
      const stepAngle = (endAngle - startAngle) / steps;

      for (let i = 0; i <= steps; i++) {
        const theta = startAngle + stepAngle * i;
        const px = cx + Math.cos(theta) * traceR;
        const py = cy + Math.sin(theta) * traceR;

        // Same micro-variation for corners
        const sizeVariation = randomRange(0.92, 1.08);

        addParticle(
          px,
          py,
          edgeColor,
          1.0,
          particleBaseSize * 1.6 * sizeVariation,
          "border"
        );
      }
    };

    traceArc(left + RADIUS, top + RADIUS, Math.PI, Math.PI * 1.5);
    traceArc(right - RADIUS, top + RADIUS, Math.PI * 1.5, Math.PI * 2.0);
    traceArc(right - RADIUS, bottom - RADIUS, 0, Math.PI * 0.5);
    traceArc(left + RADIUS, bottom - RADIUS, Math.PI * 0.5, Math.PI);
  }

  // 3. TEXT & ICON SAMPLING (Generate Particles)
  if (textData && ctx && (showText || showDot)) {
    // Lock dot and glow particles to the provided base size to mirror HTML
    const textSize = Math.max(0.5, particleBaseSize);

    // Denser sampling for crisper text reproduction
    const sampleStep = Math.max(0.75, scale * textSize * 0.38);

    for (let y = 0; y < canvas.height; y += sampleStep) {
      for (let x = 0; x < canvas.width; x += sampleStep) {
        const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;
        const a = textData[index + 3];

        if (a > 5) {
          // Lower threshold to capture anti-aliasing
          const r = textData[index];
          const g = textData[index + 1];
          const b = textData[index + 2];

          const wx = left + x / scale;
          const wy = top + y / scale;

          const pColor: [number, number, number] = [r / 255, g / 255, b / 255];
          const finalAlpha = a / 255;

          // Identify green pixels (dot + glow) separately so we don't recolor the core
          const isGreen =
            pColor[1] > pColor[0] + 0.1 && pColor[1] > pColor[2] + 0.1;
          const isGreenGlow = isGreen && finalAlpha < 0.85;

          // FORCE WHITE for non-green (text) particles to prevent subpixel AA artifacts (yellow/blue fringes)
          if (!isGreen) {
            const textRgb =
              theme === "dark" ? [1.0, 1.0, 1.0] : [0.0, 0.0, 0.0];
            pColor[0] = textRgb[0];
            pColor[1] = textRgb[1];
            pColor[2] = textRgb[2];
          }

          // Keep dot and glow particle size equal to particleBaseSize; jitter only the glow for spread
          const pSize = textSize;

          let finalX = wx;
          let finalY = wy;

          if (isGreenGlow) {
            // Jitter position to break the hexagonal/grid patterns in the glow
            // This creates a much smoother, natural fog effect
            const jitter = textSize * 0.6;
            finalX += randomRange(-jitter, jitter);
            finalY += randomRange(-jitter, jitter);
          }

          if (isGreen && hasIconCenter) {
            const dirX = finalX - iconCenterX;
            const dirY = finalY - iconCenterY;
            const len = Math.sqrt(dirX * dirX + dirY * dirY);
            if (len > 0.0001) {
              const inset = textSize * 0.5;
              const factor = Math.max(len - inset, 0) / len;
              finalX = iconCenterX + dirX * factor;
              finalY = iconCenterY + dirY * factor;
            }
          }

          addParticle(finalX, finalY, pColor, finalAlpha, pSize, "text");
        }
      }
    }
  }

  const layoutBounds = {
    left,
    top,
    width: NOTIFICATION_W,
    height: NOTIFICATION_H_ACTUAL,
  };

  const iconCenter = hasIconCenter
    ? {
        x: iconCenterX,
        y: iconCenterY,
      }
    : null;

  return {
    positions: new Float32Array(particles),
    colors: new Float32Array(colors),
    sizes: new Float32Array(sizes),
    delays: new Float32Array(delays),
    types: new Float32Array(types),
    vertexCount: sizes.length,
    layoutBounds,
    iconCenter,
  };
};
