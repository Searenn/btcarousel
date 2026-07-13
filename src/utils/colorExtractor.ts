import { ColorPalette } from "../types";
interface RGB {
  r: number;
  g: number;
  b: number;
}
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) => {
    const hex = Math.max(0, Math.min(255, c)).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 128, g: 128, b: 128 };
}
function colorDistance(c1: RGB, c2: RGB): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) + Math.pow(c1.g - c2.g, 2) + Math.pow(c1.b - c2.b, 2)
  );
}
export function isLightColor(hex: string): boolean {
  const rgb = hexToRgb(hex);
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 150; 
}
export function getContrastColor(hex: string): string {
  return isLightColor(hex) ? "#0F172A" : "#F8FAFC";
}
export function getContrastColorForAny(color: string): string {
  let hex = color.trim().toLowerCase();
  const namedColors: Record<string, string> = {
    white: "#ffffff",
    black: "#000000",
    red: "#ff0000",
    green: "#008000",
    blue: "#0000ff",
    yellow: "#ffff00",
    orange: "#ffa500",
    purple: "#800080",
    pink: "#ffc0cb",
    cyan: "#00ffff",
    magenta: "#ff00ff",
    lime: "#00ff00",
    gray: "#808080",
    grey: "#808080",
    silver: "#c0c0c0",
    gold: "#ffd700",
    violet: "#ee82ee",
    indigo: "#4b0082",
    brown: "#a52a2a",
    maroon: "#800000",
    olive: "#808000",
    teal: "#008080",
    navy: "#000080",
  };
  if (namedColors[hex]) {
    hex = namedColors[hex];
  }
  if (hex.startsWith("#")) {
    const cleanHex = hex.replace("#", "");
    let r = 0, g = 0, b = 0;
    if (cleanHex.length === 3) {
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else if (cleanHex.length === 6) {
      r = parseInt(cleanHex.substring(0, 2), 16);
      g = parseInt(cleanHex.substring(2, 4), 16);
      b = parseInt(cleanHex.substring(4, 6), 16);
    }
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? "#0F172A" : "#F8FAFC";
  }
  const rgbMatch = hex.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1]);
    const g = parseInt(rgbMatch[2]);
    const b = parseInt(rgbMatch[3]);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? "#0F172A" : "#F8FAFC";
  }
  return "#F8FAFC"; 
}
export function extractColorsFromImage(imageSrc: string): Promise<ColorPalette> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Could not get 2d context");
        }
        canvas.width = 40;
        canvas.height = 40;
        ctx.drawImage(img, 0, 0, 40, 40);
        const imgData = ctx.getImageData(0, 0, 40, 40).data;
        const colors: RGB[] = [];
        for (let i = 0; i < imgData.length; i += 8) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];
          if (a > 200) {
            colors.push({ r, g, b });
          }
        }
        const clusters: { center: RGB; count: number }[] = [];
        colors.forEach((color) => {
          let found = false;
          for (const cluster of clusters) {
            if (colorDistance(color, cluster.center) < 45) { 
              cluster.center.r = Math.round((cluster.center.r * cluster.count + color.r) / (cluster.count + 1));
              cluster.center.g = Math.round((cluster.center.g * cluster.count + color.g) / (cluster.count + 1));
              cluster.center.b = Math.round((cluster.center.b * cluster.count + color.b) / (cluster.count + 1));
              cluster.count++;
              found = true;
              break;
            }
          }
          if (!found) {
            clusters.push({ center: color, count: 1 });
          }
        });
        clusters.sort((a, b) => b.count - a.count);
        if (clusters.length === 0) {
          throw new Error("No colors detected");
        }
        const domColor = clusters[0].center;
        const bgHex = rgbToHex(domColor.r, domColor.g, domColor.b);
        let accentCluster = clusters[0];
        let maxSaturation = -1;
        for (let i = 1; i < Math.min(clusters.length, 6); i++) {
          const c = clusters[i].center;
          const maxChan = Math.max(c.r, c.g, c.b);
          const minChan = Math.min(c.r, c.g, c.b);
          const saturation = maxChan - minChan;
          const distToBg = colorDistance(c, domColor);
          if (saturation > maxSaturation && distToBg > 60 && maxChan > 50 && minChan < 220) {
            maxSaturation = saturation;
            accentCluster = clusters[i];
          }
        }
        let accentHex = "";
        if (accentCluster === clusters[0] && clusters.length > 1) {
          const secondColor = clusters[1].center;
          accentHex = rgbToHex(secondColor.r, secondColor.g, secondColor.b);
        } else {
          accentHex = rgbToHex(accentCluster.center.r, accentCluster.center.g, accentCluster.center.b);
        }
        if (colorDistance(hexToRgb(bgHex), hexToRgb(accentHex)) < 50) {
          accentHex = "#E598A4"; 
        }
        const isBgLight = isLightColor(bgHex);
        const textHex = isBgLight ? "#111827" : "#F9FAFB";
        const accentTextHex = isLightColor(accentHex) ? "#0F172A" : "#FFFFFF";
        const bgRgb = hexToRgb(bgHex);
        const cardBgHex = isBgLight 
          ? `rgba(255, 255, 255, 0.82)`
          : `rgba(${Math.max(10, bgRgb.r - 10)}, ${Math.max(10, bgRgb.g - 10)}, ${Math.max(10, bgRgb.b - 10)}, 0.78)`;
        resolve({
          bg: bgHex,
          text: textHex,
          accent: accentHex,
          accentText: accentTextHex,
          cardBg: cardBgHex
        });
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = (e) => reject(new Error("Failed to load image for extraction"));
    img.src = imageSrc;
  });
}
