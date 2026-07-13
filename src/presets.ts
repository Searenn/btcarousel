import { StylePreset, PresetThemeId } from "./types";
export const GENRE_PRESETS: Record<PresetThemeId, StylePreset> = {
  romantic: {
    id: "romantic",
    name: "Романтическая роза",
    fontFamily: "'Playfair Display', serif",
    fontImportUrl: "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap",
    description: "Мягкие пастельные тона, изящная антиква, чувствительные розово-сливовые акценты. Идеально для любовных романов и Young Adult.",
    defaultPalette: {
      bg: "#FAF0F2",
      text: "#3D2229",
      accent: "#E598A4",
      accentText: "#FFFFFF",
      cardBg: "rgba(255, 255, 255, 0.78)",
    },
    styles: {
      letterSpacing: "tracking-normal",
      borderStyle: "rounded-3xl border border-rose-100/50",
    }
  },
  thriller: {
    id: "thriller",
    name: "Мрачный Триллер / Нуар",
    fontFamily: "'Alegreya Sans SC', sans-serif",
    fontImportUrl: "https://fonts.googleapis.com/css2?family=Alegreya+Sans+SC:wght@700;900&family=Montserrat:wght@400;700;900&display=swap",
    description: "Мрачная атмосфера, высокий контраст, сигнально-красный или маркерный неоново-желтый цвет для привлечения внимания.",
    defaultPalette: {
      bg: "#0A0A0A",
      text: "#F3F4F6",
      accent: "#DE2F2F",
      accentText: "#FFFFFF",
      cardBg: "rgba(18, 18, 18, 0.88)",
    },
    styles: {
      letterSpacing: "tracking-tight",
      borderStyle: "rounded-none border-l-4 border-red-600",
    }
  },
  gold_magic: {
    id: "gold_magic",
    name: "Величественное золото",
    fontFamily: "'Cinzel', serif",
    fontImportUrl: "https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;900&family=Cormorant+Garamond:ital,wght@0,500;1,500&display=swap",
    description: "Загадочные глубокие цвета космоса и магии, благородные золотые акценты, величественные исторические шрифты.",
    defaultPalette: {
      bg: "#0B0C10",
      text: "#E5E7EB",
      accent: "#C5A059",
      accentText: "#0F1115",
      cardBg: "rgba(20, 24, 33, 0.65)",
    },
    styles: {
      letterSpacing: "tracking-wider",
      borderStyle: "rounded-lg border border-yellow-600/30",
    }
  },
  noble_emerald: {
    id: "noble_emerald",
    name: "Благородный изумруд",
    fontFamily: "'EB Garamond', serif",
    fontImportUrl: "https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,600;1,400&display=swap",
    description: "Глубокие винные или изумрудные тона, эстетика старой бумаги, мягкий матовый шик. Стиль классических глубоких произведений.",
    defaultPalette: {
      bg: "#182C25",
      text: "#FBF8F3",
      accent: "#D4AF37",
      accentText: "#182C25",
      cardBg: "rgba(15, 28, 24, 0.8)",
    },
    styles: {
      letterSpacing: "tracking-normal",
      borderStyle: "rounded-2xl border-b-2 border-amber-600/40",
    }
  },
  minimal_dark: {
    id: "minimal_dark",
    name: "Минималистичный лонгрид",
    fontFamily: "'JetBrains Mono', monospace",
    fontImportUrl: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&display=swap",
    description: "Чистый стиль, высокая плотность текста, техническая эстетика, отлично читается.",
    defaultPalette: {
      bg: "#121214",
      text: "#E4E4E7",
      accent: "#3B82F6",
      accentText: "#FFFFFF",
      cardBg: "rgba(24, 24, 27, 0.85)",
    },
    styles: {
      letterSpacing: "tracking-tight",
      borderStyle: "rounded-xl border border-zinc-700/50",
    }
  },
  bright_accent: {
    id: "bright_accent",
    name: "Яркий инфо-стиль",
    fontFamily: "'Inter', sans-serif",
    fontImportUrl: "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap",
    description: "Максимальный контраст, яркие маркеры, чистая современная верстка. Создано для списков, фактов и тезисов книг-инструкций.",
    defaultPalette: {
      bg: "#F8FAFC",
      text: "#0F172A",
      accent: "#2563EB",
      accentText: "#FFFFFF",
      cardBg: "rgba(255, 255, 255, 0.9)",
    },
    styles: {
      letterSpacing: "tracking-tight",
      borderStyle: "rounded-xl border border-slate-200 shadow-sm",
    }
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Киберпанк Неон",
    fontFamily: "'Orbitron', sans-serif",
    fontImportUrl: "https://fonts.googleapis.com/css2?family=Orbitron:wght@600;800;900&display=swap",
    description: "Футуристическая атмосфера с неоново-розовыми акцентами и темно-фиолетовой основой.",
    defaultPalette: {
      bg: "#0A0118",
      text: "#1FF3FF",
      accent: "#FF007F",
      accentText: "#FFFFFF",
      cardBg: "rgba(10, 1, 24, 0.82)",
    },
    styles: {
      letterSpacing: "tracking-widest",
      borderStyle: "rounded-md border border-fuchsia-500/40",
    }
  },
  cosmic_indigo: {
    id: "cosmic_indigo",
    name: "Глубокий космос",
    fontFamily: "'Space Grotesk', sans-serif",
    fontImportUrl: "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap",
    description: "Мягкий темный индиго и яркие звездные желто-бирюзовые акценты. Подходит для фантастики и космических опер.",
    defaultPalette: {
      bg: "#03001e",
      text: "#ecf0f1",
      accent: "#f1c40f",
      accentText: "#03001e",
      cardBg: "rgba(12, 12, 36, 0.72)",
    },
    styles: {
      letterSpacing: "tracking-tight",
      borderStyle: "rounded-2xl border border-indigo-500/25",
    }
  },
  vintage_parchment: {
    id: "vintage_parchment",
    name: "Винтажный пергамент",
    fontFamily: "'Cormorant Garamond', serif",
    fontImportUrl: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,600&display=swap",
    description: "Атмосфера старой бумаги, выцветших чернил и классического романа.",
    defaultPalette: {
      bg: "#F2EBE1",
      text: "#2C251E",
      accent: "#9E2A2B",
      accentText: "#F2EBE1",
      cardBg: "rgba(242, 235, 225, 0.85)",
    },
    styles: {
      letterSpacing: "tracking-normal",
      borderStyle: "rounded-sm border border-amber-900/10",
    }
  },
  sunset_orange: {
    id: "sunset_orange",
    name: "Яркий закат",
    fontFamily: "'Outfit', sans-serif",
    fontImportUrl: "https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800&display=swap",
    description: "Сочные оранжевые закатные тона и белый стильный текст. Отлично подходит для динамичных приключений.",
    defaultPalette: {
      bg: "#100007",
      text: "#FFFFFF",
      accent: "#FF6B35",
      accentText: "#FFFFFF",
      cardBg: "rgba(16, 0, 7, 0.8)",
    },
    styles: {
      letterSpacing: "tracking-tight",
      borderStyle: "rounded-3xl border border-orange-500/20",
    }
  }
};
export function injectGenreFont(preset: StylePreset) {
  const fontId = `genre-font-${preset.id}`;
  if (document.getElementById(fontId)) return;
  const link = document.createElement("link");
  link.id = fontId;
  link.rel = "stylesheet";
  link.href = preset.fontImportUrl;
  document.head.appendChild(link);
}
export function injectCustomGoogleFont(fontFamilyName: string) {
  const sanitized = fontFamilyName.replace(/['"]/g, "").trim();
  const fontId = `custom-google-font-${sanitized.toLowerCase().replace(/\s+/g, "-")}`;
  if (document.getElementById(fontId)) return;
  const urlFontName = sanitized.replace(/\s+/g, "+");
  const link = document.createElement("link");
  link.id = fontId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${urlFontName}:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,300;1,400;1,500;1,600;1,700;1,800&display=swap`;
  document.head.appendChild(link);
}
