/** CSS pixels and device pixel ratio for Add to Home Screen splash images. */
const SPLASH_DEVICES = [
  [430, 932, 3],
  [402, 874, 3],
  [440, 956, 3],
  [393, 852, 3],
  [390, 844, 3],
  [428, 926, 3],
  [375, 812, 3],
  [414, 896, 3],
  [414, 896, 2],
  [375, 667, 2],
  [768, 1024, 2],
  [834, 1194, 2],
  [1024, 1366, 2],
];

export function splashStartupImages() {
  const images = [];
  for (const [cssW, cssH, ratio] of SPLASH_DEVICES) {
    for (const orientation of ["portrait", "landscape"]) {
      const deviceW = orientation === "portrait" ? cssW : cssH;
      const deviceH = orientation === "portrait" ? cssH : cssW;
      const width = deviceW * ratio;
      const height = deviceH * ratio;
      images.push({
        url: `/splash/${width}x${height}.png`,
        width,
        height,
        media: `screen and (device-width: ${deviceW}px) and (device-height: ${deviceH}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})`,
      });
    }
  }
  return images;
}
