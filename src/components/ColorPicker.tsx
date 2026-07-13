import React, { useState } from "react";
import { ColorPalette } from "../types";
import { Sparkles, RefreshCw, Palette } from "lucide-react";
import { extractColorsFromImage, getContrastColor } from "../utils/colorExtractor";
interface ColorPickerProps {
  palette: ColorPalette;
  onChangePalette: (palette: ColorPalette) => void;
  backgroundImage: string | null;
  onStartInteraction?: () => void;
}
const SHIELD_COLORS = [
  {
    name: "Роза",
    palette: { bg: "#FAF0F2", text: "#3D2229", accent: "#E598A4", accentText: "#FFFFFF", cardBg: "rgba(255, 255, 255, 0.75)" }
  },
  {
    name: "Нуар",
    palette: { bg: "#0D0D12", text: "#F3F4F6", accent: "#FFE600", accentText: "#0F172A", cardBg: "rgba(18, 18, 24, 0.85)" }
  },
  {
    name: "Золото",
    palette: { bg: "#0F1115", text: "#E5E7EB", accent: "#C5A059", accentText: "#0F1115", cardBg: "rgba(20, 24, 33, 0.65)" }
  },
  {
    name: "Зелень",
    palette: { bg: "#152C22", text: "#F9FAF7", accent: "#E5C270", accentText: "#152C22", cardBg: "rgba(15, 28, 24, 0.8)" }
  },
  {
    name: "Фиолет",
    palette: { bg: "#070B19", text: "#E2E8F0", accent: "#B794F4", accentText: "#070B19", cardBg: "rgba(15, 23, 42, 0.70)" }
  },
  {
    name: "Моно",
    palette: { bg: "#1C1D21", text: "#EAEAEA", accent: "#3B82F6", accentText: "#FFFFFF", cardBg: "rgba(28, 29, 33, 0.80)" }
  }
];
export default function ColorPicker({ palette, onChangePalette, backgroundImage, onStartInteraction }: ColorPickerProps) {
  const [extracting, setExtracting] = useState(false);
  const handleExtract = async () => {
    if (!backgroundImage) return;
    onStartInteraction?.();
    setExtracting(true);
    try {
      const extracted = await extractColorsFromImage(backgroundImage);
      onChangePalette(extracted);
    } catch (err: any) {
      console.error(err);
    } finally {
      setExtracting(false);
    }
  };
  const handleColorChange = (key: keyof ColorPalette, value: string) => {
    const updated = { ...palette, [key]: value };
    if (key === "accent") {
      updated.accentText = getContrastColor(value);
    }
    if (key === "bg") {
      updated.text = getContrastColor(value);
    }
    onChangePalette(updated);
  };
  return (
    <div className="p-4 space-y-4" id="dark-color-picker">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-zinc-200 text-xs flex items-center gap-1.5 uppercase tracking-wider">
          <Palette className="w-3.5 h-3.5 text-violet-400" /> Цвета макета
        </h3>
        {backgroundImage && (
          <button
            onClick={() => {
              onStartInteraction?.();
              handleExtract();
            }}
            disabled={extracting}
            className="py-1 px-2.5 bg-violet-950/50 hover:bg-violet-900/55 text-violet-300 font-bold text-[10px] rounded-lg border border-violet-900/60 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40"
          >
            {extracting ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Sparkles className="w-3 h-3 text-violet-400" />
            )}
            {extracting ? "..." : "Автоподбор"}
          </button>
        )}
      </div>
      
      <div className="grid grid-cols-4 gap-1.5">
        
        <div className="flex flex-col items-center gap-1 bg-zinc-950 px-1.5 py-1 rounded-lg border border-zinc-900">
          <input
            type="color"
            value={palette.bg.startsWith("rgba") ? "#ffffff" : palette.bg}
            onMouseDown={onStartInteraction}
            onTouchStart={onStartInteraction}
            onChange={(e) => handleColorChange("bg", e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
          />
          <span className="text-[7.5px] font-bold text-zinc-500 uppercase">Фон</span>
        </div>
        
        <div className="flex flex-col items-center gap-1 bg-zinc-950 px-1.5 py-1 rounded-lg border border-zinc-900">
          <input
            type="color"
            value={palette.text}
            onMouseDown={onStartInteraction}
            onTouchStart={onStartInteraction}
            onChange={(e) => handleColorChange("text", e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
          />
          <span className="text-[7.5px] font-bold text-zinc-500 uppercase">Текст</span>
        </div>
        
        <div className="flex flex-col items-center gap-1 bg-zinc-950 px-1.5 py-1 rounded-lg border border-zinc-900">
          <input
            type="color"
            value={palette.accent}
            onMouseDown={onStartInteraction}
            onTouchStart={onStartInteraction}
            onChange={(e) => handleColorChange("accent", e.target.value)}
            className="w-5 h-5 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
          />
          <span className="text-[7.5px] font-bold text-zinc-500 uppercase">Акцент</span>
        </div>
        
        <div className="flex flex-col items-center gap-1 bg-zinc-950 px-1.5 py-1 rounded-lg border border-zinc-900 relative">
          <details className="w-full flex flex-col items-center">
            <summary className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center cursor-pointer list-none select-none text-[7px] font-black text-zinc-400 hover:text-white mx-auto">
              GLAS
            </summary>
            <div className="absolute right-0 bottom-full mb-1 p-1.5 bg-zinc-950 border border-zinc-800 text-[9px] rounded-lg shadow-2xl z-40 flex flex-col gap-1 w-28">
              <button
                onClick={() => {
                  onStartInteraction?.();
                  handleColorChange("cardBg", "rgba(0,0,0,0.85)");
                }}
                className="p-1 hover:bg-zinc-800 text-left text-[8px] rounded"
              >
                Темная (85%)
              </button>
              <button
                onClick={() => {
                  onStartInteraction?.();
                  handleColorChange("cardBg", "rgba(255,255,255,0.75)");
                }}
                className="p-1 hover:bg-zinc-800 text-left text-[8px] rounded"
              >
                Светлая (75%)
              </button>
              <button
                onClick={() => {
                  onStartInteraction?.();
                  handleColorChange("cardBg", "rgba(0,0,0,0.5)");
                }}
                className="p-1 hover:bg-zinc-800 text-left text-[8px] rounded"
              >
                Черная полупрозр.
              </button>
              <button
                onClick={() => {
                  onStartInteraction?.();
                  handleColorChange("cardBg", "rgba(255,255,255,0.2)");
                }}
                className="p-1 hover:bg-zinc-800 text-left text-[8px] rounded"
              >
                Белая полупрозр.
              </button>
            </div>
          </details>
          <span className="text-[7.5px] font-bold text-zinc-500 uppercase leading-none mt-[2px]">Плашка</span>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 items-center bg-zinc-950/40 p-1.5 rounded-lg border border-zinc-850/40">
        <span className="text-[8px] font-black text-zinc-500 uppercase tracking-wide mr-1 select-none">Готовые:</span>
        <div className="flex flex-wrap gap-1">
          {SHIELD_COLORS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                onStartInteraction?.();
                onChangePalette(p.palette);
              }}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-950 hover:bg-zinc-800 text-[8px] text-zinc-400 hover:text-white font-medium border border-zinc-850 cursor-pointer transition-colors"
            >
              <span>{p.name}</span>
              <div className="flex gap-0.5">
                <span className="w-1.5 h-1.5 rounded-full border border-zinc-800" style={{ backgroundColor: p.palette.bg }} />
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.palette.accent }} />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
