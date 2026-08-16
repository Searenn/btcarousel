import React, { useState, useRef, useEffect, useCallback } from "react";
import JSZip from "jszip";
import { CarouselConfig, Slide, PresetThemeId, ColorPalette, TextBlock, getRatioDimensions, UserTemplate } from "./types";
import { GENRE_PRESETS, injectGenreFont, injectCustomGoogleFont } from "./presets";
import { exportCarouselToJpg, exportCarouselToMp4, checkVideoCodecSupport, AudioOptions } from "./utils/videoExporter";
import ColorPicker from "./components/ColorPicker";
import CarouselPreview from "./components/CarouselPreview";
import SlideView from "./components/SlideView";
import SlideTemplates from "./components/SlideTemplates";
import {
  Upload,
  Download,
  Film,
  Plus,
  Trash2,
  BookOpen,
  Loader2,
  CheckCircle,
  Clock,
  Settings,
  Image as ImageIcon,
  Sliders,
  Sparkles,
  HelpCircle,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  Copy,
  Type,
  Camera,
  FileCode,
  Music2,
  Volume2,
  X
} from "lucide-react";
const INITIAL_SLIDES: Slide[] = [
  {
    id: "slide-1",
    swipeHintText: "ЛИСТАЙ ВЛЕВО / ВПРАВО 👉",
    blocks: [
      {
        id: "s1-b1",
        text: "Она согласилась на фиктивный брак с ==опасным главой мафии==...",
        x: 8,
        y: 20,
        width: 84,
        height: 20,
        fontSize: 20,
        fontWeight: "bold",
        isItalic: false,
        align: "center",
        hasCardBg: true,
      },
      {
        id: "s1-b2",
        text: "Чтобы спасти младшего брата от голода. Но были два правила: никогда не смотреть ему в глаза и не входить в его кабинет ночью.",
        x: 8,
        y: 46,
        width: 84,
        height: 26,
        fontSize: 15,
        fontWeight: "normal",
        isItalic: false,
        align: "center",
        hasCardBg: true,
      }
    ],
    backgroundImage: null,
    bgColor: null,
  },
  {
    id: "slide-2",
    blocks: [
      {
        id: "s2-b1",
        text: "Но в первую же ночь она нарушила ==оба правила==",
        x: 8,
        y: 22,
        width: 84,
        height: 18,
        fontSize: 20,
        fontWeight: "bold",
        isItalic: false,
        align: "center",
        hasCardBg: true,
      },
      {
        id: "s2-b2",
        text: "За дверью кабинета она обнаружила не архивы банды... а коллекцию волшебных сказок, которые он молча писал по ночам.",
        x: 8,
        y: 46,
        width: 84,
        height: 26,
        fontSize: 15,
        fontWeight: "normal",
        isItalic: false,
        align: "center",
        hasCardBg: true,
      }
    ],
    backgroundImage: null,
    bgColor: null,
  },
  {
    id: "slide-3",
    blocks: [
      {
        id: "s3-b1",
        text: "Его тайна раскрыта. И теперь он говорит: =='Цена молчания — твоя верность'==...",
        x: 8,
        y: 20,
        width: 84,
        height: 18,
        fontSize: 20,
        fontWeight: "bold",
        isItalic: false,
        align: "center",
        hasCardBg: true,
      },
      {
        id: "s3-b2",
        text: "Потрясающая история отношений, покорившая миллионы читателей BookTok. Оформить предзаказ можно уже сегодня!",
        x: 8,
        y: 44,
        width: 84,
        height: 24,
        fontSize: 15,
        fontWeight: "normal",
        isItalic: false,
        align: "center",
        hasCardBg: true,
      }
    ],
    backgroundImage: null,
    bgColor: null,
  },
];
const loadInitialConfig = (): CarouselConfig => {
  const saved = localStorage.getItem("booktok_carousel_config");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
        return {
          slides: parsed.slides,
          palette: parsed.palette || GENRE_PRESETS.romantic.defaultPalette,
          selectedGenre: parsed.selectedGenre || "romantic",
          slideDuration: parsed.slideDuration ?? 3,
          transitionDuration: parsed.transitionDuration ?? 0.6,
          useUniformDuration: parsed.useUniformDuration ?? true,
          ratio: (parsed.ratio === '3:4' ? '3:4' : '9:16') as '9:16' | '3:4',
          showTiktokHud: parsed.showTiktokHud ?? true,
          showGrid: parsed.showGrid ?? false,
          customFontFamily: parsed.customFontFamily,
        };
      }
    } catch (e) {
      console.error("Failed to parse saved config from localStorage:", e);
    }
  }
  return {
    slides: INITIAL_SLIDES,
    palette: GENRE_PRESETS.romantic.defaultPalette,
    selectedGenre: "romantic",
    slideDuration: 3,
    transitionDuration: 0.6,
    useUniformDuration: true,
    ratio: "9:16",
    showTiktokHud: true,
    showGrid: false,
  };
};
export default function App() {
  const [config, setConfig] = useState<CarouselConfig>(loadInitialConfig);
  const [isConfigLoaded, setIsConfigLoaded] = useState(false);
  const [past, setPast] = useState<CarouselConfig[]>([]);
  const [future, setFuture] = useState<CarouselConfig[]>([]);
  useEffect(() => {
    const load = async () => {
      if (window.electron?.loadCarouselConfig) {
        try {
          const res = await window.electron.loadCarouselConfig();
          if (res.success && res.config) {
            setConfig(res.config);
          }
        } catch (e) {
          console.error("Failed to load config from file:", e);
        }
      }
      setIsConfigLoaded(true);
    };
    load();
  }, []);
  const configRef = useRef<CarouselConfig>(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    if (!isConfigLoaded) return;
    if (window.electron?.saveCarouselConfig) {
      window.electron.saveCarouselConfig(config).catch((e) => {
        console.error("Failed to save config to file:", e);
      });
    } else {
      try {
        localStorage.setItem("booktok_carousel_config", JSON.stringify(config));
      } catch (e) {
        console.warn("Не удалось сохранить конфигурацию в localStorage:", e);
      }
    }
  }, [config, isConfigLoaded]);
  const pushHistoryCheckpoint = useCallback(() => {
    const currentConfig = configRef.current;
    setPast((prevPast) => {
      if (prevPast.length > 0 && JSON.stringify(prevPast[prevPast.length - 1]) === JSON.stringify(currentConfig)) {
        return prevPast;
      }
      return [...prevPast, currentConfig].slice(-20);
    });
    setFuture([]);
  }, []);
  const undo = useCallback(() => {
    setPast((prevPast) => {
      if (prevPast.length === 0) return prevPast;
      const newPast = [...prevPast];
      const previousState = newPast.pop()!;
      setFuture((prevFuture) => [configRef.current, ...prevFuture].slice(0, 20));
      setConfig(previousState);
      return newPast;
    });
  }, []);
  const redo = useCallback(() => {
    setFuture((prevFuture) => {
      if (prevFuture.length === 0) return prevFuture;
      const newFuture = [...prevFuture];
      const nextState = newFuture.shift()!;
      setPast((prevPast) => [...prevPast, configRef.current].slice(-20));
      setConfig(nextState);
      return newFuture;
    });
  }, []);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isZ = e.key.toLowerCase() === "z";
      const isY = e.key.toLowerCase() === "y";
      if (e.ctrlKey || e.metaKey) {
        if (isZ) {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        } else if (isY) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo]);
  const [activeSlideIdx, setActiveSlideIdx] = useState<number>(0);
  const [exportingJpg, setExportingJpg] = useState(false);
  const [exportingMp4, setExportingMp4] = useState(false);
  const [mp4Progress, setMp4Progress] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<ArrayBuffer | null>(null);
  const [audioStartOffset, setAudioStartOffset] = useState(0);
  const [audioVolume, setAudioVolume] = useState(0.8);
  const currentSlide = config.slides[activeSlideIdx];
  useEffect(() => {
    const currentPreset = GENRE_PRESETS[config.selectedGenre];
    if (currentPreset) {
      injectGenreFont(currentPreset);
    }
    if (config.customFontFamily) {
      injectCustomGoogleFont(config.customFontFamily);
    }
  }, [config.selectedGenre, config.customFontFamily]);
  const showStatusNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => {
      setSuccessMessage(null);
    }, 5000);
  };
  const handleUpdateSlide = (slideId: string, updatedFields: Partial<Slide>) => {
    setConfig((prev) => ({
      ...prev,
      slides: prev.slides.map((s) => (s.id === slideId ? { ...s, ...updatedFields } : s)),
    }));
  };
  const handleAddSlide = () => {
    pushHistoryCheckpoint();
    if (config.slides.length >= 12) {
      alert("Максимальное рекомендуемое удержание в TikTok — до 12 слайдов.");
      return;
    }
    const newId = `slide-${Date.now()}`;
    const newSlide: Slide = {
      id: newId,
      blocks: [
        {
          id: `block-title-${Date.now()}`,
          text: "Новый интригующий ==крючок== слайда...",
          x: 8,
          y: 25,
          width: 84,
          height: 18,
          fontSize: 20,
          fontWeight: "bold",
          isItalic: false,
          align: "center",
          hasCardBg: true,
        },
        {
          id: `block-body-${Date.now()}`,
          text: "Короткая зацепка читателя с контекстом вашей книги.",
          x: 8,
          y: 48,
          width: 84,
          height: 24,
          fontSize: 15,
          fontWeight: "normal",
          isItalic: false,
          align: "center",
          hasCardBg: true,
        }
      ],
      backgroundImage: null,
      bgColor: null,
    };
    setConfig((prev) => ({
      ...prev,
      slides: [...prev.slides, newSlide],
    }));
    setActiveSlideIdx(config.slides.length); 
    showStatusNotification("➕ Добавлен новый пустой слайд!");
  };
  const handleRemoveSlide = (slideId: string) => {
    pushHistoryCheckpoint();
    if (config.slides.length <= 1) {
      alert("Карусель должна содержать хотя бы один слайд!");
      return;
    }
    const idxToRemove = config.slides.findIndex((s) => s.id === slideId);
    let newActiveIdx = activeSlideIdx;
    if (idxToRemove === activeSlideIdx) {
      newActiveIdx = Math.max(0, activeSlideIdx - 1);
    } else if (idxToRemove < activeSlideIdx) {
      newActiveIdx = activeSlideIdx - 1;
    }
    setConfig((prev) => ({
      ...prev,
      slides: prev.slides.filter((s) => s.id !== slideId),
    }));
    setActiveSlideIdx(newActiveIdx);
    showStatusNotification("🗑️ Слайд успешно удален.");
  };
  const handleDuplicateSlide = (slideId: string) => {
    pushHistoryCheckpoint();
    const slideToDuplicate = config.slides.find((s) => s.id === slideId);
    if (!slideToDuplicate) return;
    const newSlideId = `slide-${Date.now()}`;
    const duplicatedBlocks = slideToDuplicate.blocks.map((b) => ({
      ...b,
      id: `block-${Math.random().toString(36).substr(2, 9)}`,
    }));
    const newSlide: Slide = {
      ...slideToDuplicate,
      id: newSlideId,
      blocks: duplicatedBlocks,
    };
    const currentIdx = config.slides.findIndex((s) => s.id === slideId);
    const updatedSlides = [...config.slides];
    updatedSlides.splice(currentIdx + 1, 0, newSlide);
    setConfig((prev) => ({
      ...prev,
      slides: updatedSlides,
    }));
    setActiveSlideIdx(currentIdx + 1);
    showStatusNotification("📋 Слайд успешно продублирован!");
  };
  const handleBackgroundUpload = (file: File) => {
    pushHistoryCheckpoint();
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      handleUpdateSlide(currentSlide.id, {
        backgroundImage: dataUrl,
      });
      showStatusNotification("🌅 Фоновое изображение успешно загружено на текущий слайд!");
    };
    reader.readAsDataURL(file);
  };
  const handleExportProject = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `booktok_project_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showStatusNotification("📥 Конфигурация проекта успешно экспортирована!");
    } catch (e) {
      console.error("Failed to export project config:", e);
      alert("Не удалось экспортировать файл проекта.");
    }
  };
  const handleImportProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
          pushHistoryCheckpoint();
          setConfig({
            slides: parsed.slides,
            palette: parsed.palette || config.palette,
            selectedGenre: parsed.selectedGenre || config.selectedGenre,
            slideDuration: parsed.slideDuration ?? config.slideDuration,
            transitionDuration: parsed.transitionDuration ?? config.transitionDuration,
            useUniformDuration: parsed.useUniformDuration ?? true,
            ratio: parsed.ratio === '3:4' ? '3:4' : '9:16',
            showTiktokHud: parsed.showTiktokHud ?? config.showTiktokHud,
            showGrid: parsed.showGrid ?? config.showGrid,
            customFontFamily: parsed.customFontFamily,
          });
          showStatusNotification("📤 Проект успешно импортирован из файла!");
        } else {
          alert("Неверный формат файла проекта: отсутствует массив слайдов.");
        }
      } catch (err) {
        console.error("Failed to parse project file:", err);
        alert("Не удалось прочитать файл проекта. Убедитесь, что это корректный JSON файл.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };
  const handleExportJpg = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    setExportingJpg(true);
    try {
      const dataUrls = await exportCarouselToJpg(configRef.current);
      if (window.electron) {
        const saveRes = await window.electron.saveImagesDialog(dataUrls);
        if (saveRes.success) {
          showStatusNotification(`✅ Слайды успешно сохранены в папку: ${saveRes.dirPath}`);
        } else if (saveRes.error !== 'Cancelled') {
          alert(`Ошибка при сохранении картинок: ${saveRes.error}`);
        }
      } else {
        const zip = new JSZip();
        for (let i = 0; i < dataUrls.length; i++) {
          const res = await fetch(dataUrls[i]);
          const blob = await res.blob();
          zip.file(`slide_${i + 1}.jpg`, blob);
        }
        const zipBlob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(zipBlob);
        const link = document.createElement("a");
        link.download = "TikTok_book_slides.zip";
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showStatusNotification("✅ Все слайды успешно упакованы в ZIP-архив и скачаны!");
      }
    } catch (err) {
      console.error(err);
      alert("Не удалось сохранить слайды. Проверьте правильность загруженных изображений.");
    } finally {
      setExportingJpg(false);
    }
  };
  const handleExportMp4 = async () => {
    await new Promise((resolve) => setTimeout(resolve, 100));
    setExportingMp4(true);
    setMp4Progress(0);
    try {
      const audioOpts: AudioOptions | null = audioBuffer ? { audioBuffer: audioBuffer.slice(0), startOffset: audioStartOffset, volume: audioVolume } : null;
      const result = await exportCarouselToMp4(configRef.current, (p) => setMp4Progress(p), audioOpts);
      if (window.electron) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          const saveRes = await window.electron!.saveVideo(base64data);
          if (saveRes.success) {
            showStatusNotification(`✅ Видеоролик MP4 успешно смонтирован и сохранен в: ${saveRes.filePath}`);
          } else if (saveRes.error !== 'Cancelled') {
            alert(`Ошибка при сохранении видео: ${saveRes.error}`);
          }
          setExportingMp4(false);
        };
        reader.readAsDataURL(result.blob);
      } else {
        const url = URL.createObjectURL(result.blob);
        const link = document.createElement("a");
        link.download = "TikTok_book_carousel.mp4";
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showStatusNotification("✅ Видеоролик MP4 успешно смонтирован и скачан!");
        setExportingMp4(false);
      }
    } catch (err: any) {
      console.error(err);
      if (err?.message === "MP4_CODEC_UNSUPPORTED") {
        alert("⚠️ Ваш браузер не поддерживает запись видео в формате MP4 (H.264).\n\nЧто делать:\n• Используйте Google Chrome или Microsoft Edge (версия 121+) на Windows или macOS\n• Firefox и Safari пока не поддерживают запись MP4 через MediaRecorder\n• В десктоп-приложении этот кодек всегда доступен");
      } else {
        alert("Произошел технический сбой при экспорте видео.");
      }
      setExportingMp4(false);
    }
  };
  const moveSlide = (index: number, direction: "up" | "down") => {
    pushHistoryCheckpoint();
    const newSlides = [...config.slides];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newSlides.length) return;
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;
    setConfig((prev) => ({ ...prev, slides: newSlides }));
    setActiveSlideIdx(targetIdx);
    showStatusNotification("🔄 Порядок слайдов изменен.");
  };
  const handleApplyTemplate = (blocks: TextBlock[]) => {
    pushHistoryCheckpoint();
    if (config.slides.length >= 12) {
      alert("Максимальное рекомендуемое удержание в TikTok — до 12 слайдов.");
      return;
    }
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      blocks,
      backgroundImage: null,
      bgColor: null,
    };
    setConfig((prev) => ({
      ...prev,
      slides: [...prev.slides, newSlide],
    }));
    setActiveSlideIdx(config.slides.length);
    showStatusNotification("📋 Создан слайд из шаблона!");
  };
  const handleApplyUserTemplate = (template: UserTemplate) => {
    pushHistoryCheckpoint();
    if (config.slides.length >= 12) {
      alert("Максимальное рекомендуемое удержание в TikTok — до 12 слайдов.");
      return;
    }
    const newBlocks = template.blocks.map((b, idx) => ({
      ...b,
      id: `block-${Date.now()}-${idx}`,
    }));
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      blocks: newBlocks,
      backgroundImage: template.backgroundImage || null,
      backgroundOpacity: template.backgroundOpacity,
      bgColor: template.bgColor || null,
    };
    setConfig((prev) => ({
      ...prev,
      slides: [...prev.slides, newSlide],
      palette: template.palette,
      selectedGenre: template.selectedGenre,
      customFontFamily: template.customFontFamily,
    }));
    setActiveSlideIdx(config.slides.length);
    showStatusNotification(`📋 Создан слайд из шаблона \"${template.name}\"!`);
  };
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased font-sans" id="booktok-studio-root">
      
      {window.electron && (
        <div 
          className="h-8 w-full bg-zinc-950 flex-shrink-0 select-none border-b border-zinc-900/30" 
          style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        />
      )}
      
      <input
        type="file"
        ref={bgFileInputRef}
        onChange={(e) => e.target.files && handleBackgroundUpload(e.target.files[0])}
        accept="image/*,video/*" className="hidden" />
      <div id="export-container" style={{ position: "fixed", top: "-9999px", left: "-9999px", pointerEvents: "none" }}>
        {config.slides.map((slide, idx) => {
          const dims = getRatioDimensions(config.ratio);
          return (
            <div
              key={slide.id}
              id={`export-slide-${idx}`}
              style={{
                width: `${dims.exportW}px`,
                height: `${dims.exportH}px`,
                position: "relative",
                overflow: "hidden",
              }}
            >
              <SlideView slide={slide} config={config} width={dims.exportW} height={dims.exportH} isExporting={true} />
            </div>
          );
        })}
      </div>
      
      <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-900/40">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-white text-md tracking-wider uppercase">BookTok Carousel</h1>
                <span className="bg-zinc-800 text-zinc-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest">PRO</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 font-sans">
            <button
              onClick={handleExportJpg}
              disabled={exportingJpg || exportingMp4}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
            >
              {exportingJpg ? <Loader2 className="w-4 h-4 animate-spin text-indigo-400" /> : <Download className="w-4 h-4 text-zinc-400" />}
              Скачать слайды JPG
            </button>
            {config.ratio === '9:16' && (
              <button
                onClick={handleExportMp4}
                disabled={exportingJpg || exportingMp4}
                className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-40"
              >
                {exportingMp4 ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Монтируем {mp4Progress}%
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    Скачать MP4 видео
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,2.5fr)] gap-8 items-start">
        
        <div className="bg-zinc-900/50 border border-zinc-850 rounded-2xl flex flex-col divide-y divide-zinc-800/50 shadow-xl overflow-hidden">
          
          <div className="p-4 space-y-3" id="slide-customizer-card">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-405 tracking-wider font-sans">Настройки медиа</span>
                <h3 className="font-bold text-white text-sm font-sans flex items-center gap-2">Фон слайда</h3>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => bgFileInputRef.current?.click()}
                  className="p-1.5 bg-zinc-800 hover:bg-violet-600 rounded-md text-zinc-300 hover:text-white transition-colors cursor-pointer group"
                  title="Загрузить фото"
                >
                  <Upload className="w-4 h-4" />
                </button>
                {currentSlide?.backgroundImage && (
                  <button
                    onClick={() => handleUpdateSlide(currentSlide.id, { backgroundImage: null })}
                    className="p-1.5 bg-zinc-800 hover:bg-rose-600 rounded-md text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    title="Удалить фото"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {currentSlide?.backgroundImage && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-[10px] text-zinc-400 font-bold whitespace-nowrap font-sans">Прозрачность ({currentSlide.backgroundOpacity ?? 100}%)</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={currentSlide.backgroundOpacity ?? 100}
                  onMouseDown={pushHistoryCheckpoint}
                  onTouchStart={pushHistoryCheckpoint}
                  onChange={(e) => handleUpdateSlide(currentSlide.id, { backgroundOpacity: parseInt(e.target.value) })}
                  className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                />
              </div>
            )}
          </div>
          
          <div className="p-4 space-y-4" id="typography-and-theme">
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 whitespace-nowrap">
                <BookOpen className="w-3.5 h-3.5 text-violet-400" /> Тема
              </span>
              <select
                value={config.selectedGenre}
                onChange={(e) => {
                  pushHistoryCheckpoint();
                  const presetId = e.target.value as PresetThemeId;
                  const preset = GENRE_PRESETS[presetId];
                  setConfig((prev) => ({
                    ...prev,
                    selectedGenre: presetId,
                    palette: preset.defaultPalette,
                  }));
                  showStatusNotification(`🎨 Установлена тема "${preset.name}"`);
                }}
                className="flex-1 bg-transparent border-0 text-zinc-200 text-right font-bold text-xs focus:ring-0 cursor-pointer outline-none max-w-[150px] truncate"
                style={{ textAlignLast: "right" }}
              >
                {Object.values(GENRE_PRESETS).map((p) => (
                  <option key={p.id} value={p.id} className="bg-zinc-900 text-left">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center justify-between gap-4">
              <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 whitespace-nowrap">
                <Type className="w-3.5 h-3.5 text-violet-400" /> Шрифт
              </span>
              <select
                value={config.customFontFamily || ""}
                onChange={(e) => {
                  pushHistoryCheckpoint();
                  const font = e.target.value;
                  setConfig((prev) => ({
                    ...prev,
                    customFontFamily: font || undefined,
                  }));
                  if (font) {
                    showStatusNotification(`✍️ Выбран шрифт: ${font}`);
                  } else {
                    showStatusNotification(`✍️ Сброшено на шрифт темы`);
                  }
                }}
                className="flex-1 bg-transparent border-0 text-zinc-200 text-right font-bold text-xs focus:ring-0 cursor-pointer outline-none max-w-[150px] truncate"
                style={{ textAlignLast: "right" }}
              >
                <option value="" className="bg-zinc-900 text-left">По умолчанию</option>
                <option value="Inter" className="bg-zinc-900 text-left">Inter</option>
                <option value="Roboto" className="bg-zinc-900 text-left">Roboto</option>
                <option value="Montserrat" className="bg-zinc-900 text-left">Montserrat</option>
                <option value="Playfair Display" className="bg-zinc-900 text-left">Playfair Display</option>
                <option value="EB Garamond" className="bg-zinc-900 text-left">EB Garamond</option>
                <option value="Cormorant Garamond" className="bg-zinc-900 text-left">Cormorant Garamond</option>
                <option value="Cinzel" className="bg-zinc-900 text-left">Cinzel</option>
                <option value="Alegreya Sans SC" className="bg-zinc-900 text-left">Alegreya Sans SC</option>
                <option value="Orbitron" className="bg-zinc-900 text-left">Orbitron</option>
                <option value="Space Grotesk" className="bg-zinc-900 text-left">Space Grotesk</option>
                <option value="JetBrains Mono" className="bg-zinc-900 text-left">JetBrains Mono</option>
                <option value="Outfit" className="bg-zinc-900 text-left">Outfit</option>
                <option value="Nunito" className="bg-zinc-900 text-left">Nunito</option>
                <option value="Poppins" className="bg-zinc-900 text-left">Poppins</option>
                <option value="Lora" className="bg-zinc-900 text-left">Lora</option>
                <option value="Merriweather" className="bg-zinc-900 text-left">Merriweather</option>
                <option value="Fira Sans" className="bg-zinc-900 text-left">Fira Sans</option>
                <option value="Caveat" className="bg-zinc-900 text-left">Caveat (Рукописный)</option>
                <option value="Pacifico" className="bg-zinc-900 text-left">Pacifico (Курсивный)</option>
              </select>
            </div>
          </div>
          
          <ColorPicker
            palette={config.palette}
            onChangePalette={(p) => setConfig((prev) => ({ ...prev, palette: p }))}
            backgroundImage={currentSlide?.backgroundImage}
            onStartInteraction={pushHistoryCheckpoint}
          />
          
          <div className="p-4 space-y-4" id="format-and-settings-card">
            
            <div className="space-y-2.5">
              <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-violet-400" /> Формат публикации
              </span>
              <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800/50">
                <button
                  onClick={() => {
                    pushHistoryCheckpoint();
                    setConfig((prev) => ({ ...prev, ratio: '3:4' as const }));
                  }}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    config.ratio === '3:4'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  📷 3:4 (Карусель)
                </button>
                <button
                  onClick={() => {
                    pushHistoryCheckpoint();
                    setConfig((prev) => ({ ...prev, ratio: '9:16' as const }));
                  }}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                    config.ratio === '9:16'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  🎬 9:16 (Видео)
                </button>
              </div>
            </div>
            
            {config.ratio === '9:16' && (
              <div className="space-y-2 pt-2 border-t border-zinc-800/40">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" /> Тайминги MP4
                </span>
                <div className="flex flex-col gap-2">
                  {/* Uniform duration toggle */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.useUniformDuration}
                      onChange={() => {
                        pushHistoryCheckpoint();
                        setConfig((prev) => ({ ...prev, useUniformDuration: !prev.useUniformDuration }));
                      }}
                      className="w-3.5 h-3.5 accent-emerald-500 cursor-pointer"
                    />
                    <span className="text-[10px] text-zinc-400 font-bold">Для всех одинаково</span>
                  </label>
                  
                  {config.useUniformDuration ? (
                    /* Single slider for all slides */
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-500 w-20">Показ ({config.slideDuration}s)</span>
                      <input
                        type="range" min="1" max="7" step="0.5"
                        value={config.slideDuration}
                        onMouseDown={pushHistoryCheckpoint}
                        onTouchStart={pushHistoryCheckpoint}
                        onChange={(e) => setConfig((prev) => ({ ...prev, slideDuration: parseFloat(e.target.value) }))}
                        className="flex-1 h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  ) : (
                    /* Per-slide duration sliders */
                    <div className="flex flex-col gap-1.5 max-h-[140px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139,92,246,0.3) transparent' }}>
                      {config.slides.map((slide, idx) => {
                        const dur = slide.slideDuration ?? config.slideDuration;
                        return (
                          <div key={slide.id} className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold w-5 text-center flex-shrink-0 ${activeSlideIdx === idx ? 'text-violet-400' : 'text-zinc-500'}`}>{idx + 1}</span>
                            <input
                              type="range" min="1" max="7" step="0.5"
                              value={dur}
                              onMouseDown={pushHistoryCheckpoint}
                              onTouchStart={pushHistoryCheckpoint}
                              onChange={(e) => handleUpdateSlide(slide.id, { slideDuration: parseFloat(e.target.value) })}
                              className="flex-1 h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                            <span className="text-[9px] font-mono text-zinc-500 w-6 text-right flex-shrink-0">{dur}s</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-500 w-20">Смена ({config.transitionDuration}s)</span>
                    <input
                      type="range" min="0.2" max="1.5" step="0.1"
                      value={config.transitionDuration}
                      onMouseDown={pushHistoryCheckpoint}
                      onTouchStart={pushHistoryCheckpoint}
                      onChange={(e) => setConfig((prev) => ({ ...prev, transitionDuration: parseFloat(e.target.value) }))}
                      className="flex-1 h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
              </div>
              
              {/* Audio track */}
              <div className="pt-2 border-t border-zinc-800/30">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                    <Music2 className="w-3.5 h-3.5 text-amber-400" /> Аудио
                  </span>
                  {audioFile ? (
                    <button
                      onClick={() => { setAudioFile(null); setAudioBuffer(null); setAudioStartOffset(0); }}
                      className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Удалить аудио"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <button
                      onClick={() => audioFileInputRef.current?.click()}
                      className="text-[9px] font-bold text-amber-400/70 hover:text-amber-300 transition-colors cursor-pointer"
                    >
                      + Добавить
                    </button>
                  )}
                </div>
                <input
                  ref={audioFileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setAudioFile(file);
                    setAudioStartOffset(0);
                    file.arrayBuffer().then((buf) => setAudioBuffer(buf));
                    e.target.value = '';
                  }}
                />
                {audioFile && (
                  <div className="mt-1.5 space-y-1.5">
                    <div className="text-[9px] text-zinc-500 truncate" title={audioFile.name}>🎵 {audioFile.name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-zinc-500 w-16 flex-shrink-0">Начало ({audioStartOffset}s)</span>
                      <input
                        type="range" min="0" max="120" step="1"
                        value={audioStartOffset}
                        onChange={(e) => setAudioStartOffset(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                      <input
                        type="range" min="0" max="1" step="0.05"
                        value={audioVolume}
                        onChange={(e) => setAudioVolume(parseFloat(e.target.value))}
                        className="flex-1 h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-amber-500"
                      />
                      <span className="text-[9px] text-zinc-500 w-7 text-right flex-shrink-0">{Math.round(audioVolume * 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}
            
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
              <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                {config.showTiktokHud ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
                Водяные знаки TikTok
              </span>
              <button
                onClick={() => {
                  pushHistoryCheckpoint();
                  setConfig((prev) => ({ ...prev, showTiktokHud: !prev.showTiktokHud }));
                }}
                className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                  config.showTiktokHud ? "bg-indigo-600" : "bg-zinc-800"
                }`}
              >
                <div
                  className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                    config.showTiktokHud ? "translate-x-3.5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-zinc-800/40">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                  Надпись на слайде {activeSlideIdx + 1}
                </span>
                <button
                  onClick={() => {
                    pushHistoryCheckpoint();
                    const slide = config.slides[activeSlideIdx];
                    if (slide.swipeHintText) {
                      handleUpdateSlide(slide.id, { swipeHintText: null });
                    } else {
                      handleUpdateSlide(slide.id, { swipeHintText: "ЛИСТАЙ ВЛЕВО / ВПРАВО 👉" });
                    }
                  }}
                  className={`w-8 h-4.5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    currentSlide?.swipeHintText ? "bg-emerald-600" : "bg-zinc-800"
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      currentSlide?.swipeHintText ? "translate-x-3.5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              {currentSlide?.swipeHintText && (
                <input
                  type="text"
                  value={currentSlide.swipeHintText}
                  onChange={(e) => handleUpdateSlide(currentSlide.id, { swipeHintText: e.target.value })}
                  onFocus={pushHistoryCheckpoint}
                  className="w-full bg-zinc-950 border border-zinc-800/50 text-zinc-200 py-1.5 px-2.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 hover:border-zinc-700 transition"
                  placeholder="Текст надписи..."
                />
              )}
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/40">
              <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                Проект
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportProject}
                  className="py-1 px-2 bg-zinc-800 hover:bg-violet-600 rounded-md text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                >
                  <Download className="w-3.5 h-3.5" /> Экспорт
                </button>
                <button
                  onClick={() => projectFileInputRef.current?.click()}
                  className="py-1 px-2 bg-zinc-800 hover:bg-violet-600 rounded-md text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[10px]"
                >
                  <Upload className="w-3.5 h-3.5" /> Импорт
                </button>
                <input
                  type="file"
                  ref={projectFileInputRef}
                  onChange={handleImportProject}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center">
          <CarouselPreview
            config={config}
            activeSlideIdx={activeSlideIdx}
            setActiveSlideIdx={setActiveSlideIdx}
            onUpdateSlide={handleUpdateSlide}
            onUpdateConfig={(fields) => setConfig((prev) => ({ ...prev, ...fields }))}
            onAddSlide={handleAddSlide}
            onRemoveSlide={handleRemoveSlide}
            onDuplicateSlide={handleDuplicateSlide}
            onStartInteraction={pushHistoryCheckpoint}
          />
        </div>
        
        <div className="w-full">
          <SlideTemplates
            onApplyTemplate={handleApplyTemplate}
            onApplyUserTemplate={handleApplyUserTemplate}
            config={config}
            currentSlide={currentSlide}
            onStartInteraction={pushHistoryCheckpoint}
          />
        </div>
      </main>
      
      {exportingMp4 && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in font-sans">
          <div className="bg-zinc-900 border border-zinc-850 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center space-y-6 m-4 relative overflow-hidden">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-violet-500 animate-spin" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">Генерация БукТок ролика</h3>
              <p className="text-xs text-zinc-400 mt-1">Отрисовка всех кадров и наложение сглаженного перелистывания...</p>
            </div>
            <div className="space-y-1.5">
              <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full rounded-full transition-all duration-150"
                  style={{ width: `${mp4Progress}%` }}
                />
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400 flex justify-end">{mp4Progress}% из 100%</span>
            </div>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="fixed bottom-6 right-6 max-w-sm w-full bg-zinc-900 border border-zinc-800 text-white p-4 rounded-2xl shadow-2xl z-50 flex items-start gap-3.5 animate-slide-in font-sans">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-zinc-200 font-semibold leading-relaxed">{successMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
}
