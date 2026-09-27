export const LOGO_DOTS = 12;
export const LOGO_DOT_R = 1.65;
export const LOGO_RING_R = 10;
export const LOGO_VIEW = 32;

/** Same ring the Logo component draws. Coordinates are rounded so server and client match. */
export function logoDots() {
  return Array.from({ length: LOGO_DOTS }, (_, i) => {
    const angle = (i / LOGO_DOTS) * Math.PI * 2 - Math.PI / 2;
    return {
      cx: Number((16 + Math.cos(angle) * LOGO_RING_R).toFixed(3)),
      cy: Number((16 + Math.sin(angle) * LOGO_RING_R).toFixed(3)),
      r: LOGO_DOT_R,
    };
  });
}

export function logoMarkSvg({ color = "#ffffff", background = "#000000" } = {}) {
  const circles = logoDots()
    .map((dot) => `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${color}"/>`)
    .join("");
  const plate = background ? `<rect width="32" height="32" fill="${background}"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${plate}${circles}</svg>`;
}
