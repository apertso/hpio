// Random float between min and max

export const randomRange = (min: number, max: number): number => {

  return min + Math.random() * (max - min);

};



// Convert hex color to normalized vec3 [r,g,b] 0-1

export const hexToRgb = (hex: string): [number, number, number] => {

  const bigint = parseInt(hex.replace("#", ""), 16);

  const r = (bigint >> 16) & 255;

  const g = (bigint >> 8) & 255;

  const b = bigint & 255;

  return [r / 255, g / 255, b / 255];

};



// Distance between two points

export const dist = (

  x1: number,

  y1: number,

  x2: number,

  y2: number

): number => {

  const dx = x1 - x2;

  const dy = y1 - y2;

  return Math.sqrt(dx * dx + dy * dy);

};



// Check if point is inside a rounded rectangle (SDF logic)

export const isInsideRoundedRect = (

  x: number,

  y: number,

  rectX: number,

  rectY: number,

  rectW: number,

  rectH: number,

  radius: number

): boolean => {

  // Translate point to rect center

  const px = x - (rectX + rectW / 2);

  const py = y - (rectY + rectH / 2);



  // Calculate absolute distance from center

  const ax = Math.abs(px);

  const ay = Math.abs(py);



  // Half extents (minus radius)

  const hx = rectW / 2 - radius;

  const hy = rectH / 2 - radius;



  // SDF calculation

  const qx = ax - hx;

  const qy = ay - hy;



  const distance =

    Math.min(Math.max(qx, qy), 0.0) +

    Math.sqrt(

      Math.max(qx, 0.0) * Math.max(qx, 0.0) +

        Math.max(qy, 0.0) * Math.max(qy, 0.0)

    ) -

    radius;



  return distance <= 0;

};


