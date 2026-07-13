import React, { useState, useRef, useEffect, useCallback } from "react";
import JSZip from "jszip";
import { CarouselConfig, Slide, PresetThemeId, ColorPalette, TextBlock, getRatioDimensions, UserTemplate } from "./types";
import { GENRE_PRESETS, injectGenreFont, injectCustomGoogleFont } from "./presets";
import { exportCarouselToJpg, exportCarouselToMp4 } from "./utils/videoExporter";
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
  FileCode
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
      const videoBlob = await exportCarouselToMp4(configRef.current, (p) => setMp4Progress(p));
      if (window.electron) {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          const saveRes = await window.electron!.saveVideo(base64data);
          if (saveRes.success) {
            showStatusNotification(`✅ Видеоролик MP4 успешно смонтирован и сохранен в: ${saveRes.filePath}`);
          } else if (saveRes.error !== 'Cancelled') {
            alert(`Ошибка при транскодировании видео: ${saveRes.error}`);
          }
          setExportingMp4(false);
        };
        reader.readAsDataURL(videoBlob);
      } else {
        const url = URL.createObjectURL(videoBlob);
        const link = document.createElement("a");
        link.download = "TikTok_book_carousel.webm";
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showStatusNotification("✅ Видеоролик (WebM) успешно смонтирован и скачан!");
        setExportingMp4(false);
      }
    } catch (err) {
      console.error(err);
      alert("Произошел технический сбой при экспорте видео.");
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
      bgColor: null,
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
                    {window.electron ? "Скачать MP4 видео" : "Скачать WebM видео"}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </header>
      
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[minmax(0,4fr)_minmax(0,5fr)_minmax(0,2.5fr)] gap-8 items-start">
        
        <div className="space-y-6">
          
          <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-5 space-y-4" id="slide-customizer-card">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-405 tracking-wider font-sans">Настройки медиа</span>
                <h3 className="font-bold text-white text-sm mt-0.5 font-sans">Фон активного слайда</h3>
              </div>
              <Sliders className="w-4 h-4 text-zinc-500" />
            </div>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => bgFileInputRef.current?.click()}
                  className="p-3 bg-zinc-950 border border-dashed border-zinc-800 hover:border-violet-500/50 rounded-xl text-center space-y-1.5 group cursor-pointer transition-all"
                >
                  <Upload className="w-4 h-4 mx-auto text-zinc-500 group-hover:text-violet-400" />
                  <span className="block text-[10px] font-bold text-zinc-300 font-sans">Загрузить фоновое фото</span>
                </button>
                <div className="bg-zinc-950 border border-zinc-850 rounded-xl p-3 flex flex-col justify-center items-center text-center">
                  {currentSlide?.backgroundImage ? (
                    <div className="relative group w-12 aspect-[1/1.5] rounded border border-zinc-800 overflow-hidden">
                      <img
                        referrerPolicy="no-referrer"
                        src={currentSlide.backgroundImage}
                        alt="Bg Mini"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleUpdateSlide(currentSlide.id, { backgroundImage: null })}
                        className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-500 font-extrabold text-[9px] transition-opacity"
                      >
                        Удалить
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-500 font-medium font-sans">Заливка фоновым цветом</span>
                  )}
                </div>
              </div>
              
              {currentSlide?.backgroundImage && (
                <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                  <span className="text-[10px] text-zinc-400 font-bold whitespace-nowrap font-sans">Прозрачность фото</span>
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
                  <span className="text-[10px] font-mono text-zinc-400 w-8 text-right font-sans">{currentSlide.backgroundOpacity ?? 100}%</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3.5 space-y-2.5" id="presets-selector-box">
            <h3 className="font-bold text-zinc-200 text-xs flex items-center gap-1.5 uppercase tracking-wider font-sans">
              <BookOpen className="w-4 h-4 text-violet-400" /> Тема макета
            </h3>
            
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
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 py-2 px-2.5 rounded-lg font-bold text-xs focus:outline-none focus:ring-1 focus:ring-violet-600 hover:border-zinc-700 transition cursor-pointer"
            >
              {Object.values(GENRE_PRESETS).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="bg-zinc-900 border border-zinc-850 rounded-xl p-3.5 space-y-2.5" id="font-selector-box">
            <h3 className="font-bold text-zinc-200 text-xs flex items-center gap-1.5 uppercase tracking-wider font-sans">
              <Type className="w-4 h-4 text-violet-400" /> Шрифт текста
            </h3>
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
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 py-2 px-2.5 rounded-lg font-bold text-xs focus:outline-none focus:ring-1 focus:ring-violet-600 hover:border-zinc-700 transition cursor-pointer"
            >
              <option value="">Шрифт темы (По умолчанию)</option>
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Playfair Display">Playfair Display</option>
              <option value="EB Garamond">EB Garamond</option>
              <option value="Cormorant Garamond">Cormorant Garamond</option>
              <option value="Cinzel">Cinzel</option>
              <option value="Alegreya Sans SC">Alegreya Sans SC</option>
              <option value="Orbitron">Orbitron</option>
              <option value="Space Grotesk">Space Grotesk</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
              <option value="Outfit">Outfit</option>
              <option value="Nunito">Nunito</option>
              <option value="Poppins">Poppins</option>
              <option value="Lora">Lora</option>
              <option value="Merriweather">Merriweather</option>
              <option value="Fira Sans">Fira Sans</option>
              <option value="Caveat">Caveat (Рукописный)</option>
              <option value="Pacifico">Pacifico (Курсивный)</option>
            </select>
          </div>
          
          <ColorPicker
            palette={config.palette}
            onChangePalette={(p) => setConfig((prev) => ({ ...prev, palette: p }))}
            backgroundImage={currentSlide?.backgroundImage}
            onStartInteraction={pushHistoryCheckpoint}
          />
          
          <div className="bg-zinc-900 border border-zinc-850 rounded-2xl p-5 space-y-4" id="format-and-settings-card">
            
            <div className="space-y-2">
              <h3 className="font-bold text-white text-sm flex items-center gap-2 font-sans">
                <Camera className="w-4 h-4 text-violet-400" /> Формат публикации
              </h3>
              <div className="grid grid-cols-2 gap-2 font-sans">
                <button
                  onClick={() => {
                    pushHistoryCheckpoint();
                    setConfig((prev) => ({ ...prev, ratio: '3:4' as const }));
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    config.ratio === '3:4'
                      ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/30'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  📷 Карусель 3:4
                </button>
                <button
                  onClick={() => {
                    pushHistoryCheckpoint();
                    setConfig((prev) => ({ ...prev, ratio: '9:16' as const }));
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    config.ratio === '9:16'
                      ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-900/30'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  🎬 Видео 9:16
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 font-sans">
                {config.ratio === '3:4' ? '1080×1440 — фото-карусель TikTok' : '1080×1920 — вертикальное видео TikTok'}
              </p>
            </div>
            
            {config.ratio === '9:16' && (
              <>
                <div className="border-t border-zinc-800/80 pt-4">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2 font-sans mb-3">
                    <Clock className="w-4 h-4 text-emerald-500" /> {window.electron ? "Тайминги MP4 видео" : "Тайминги WebM видео"}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 font-sans">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-zinc-400">Показ слайда</span>
                        <span className="font-bold text-emerald-400">{config.slideDuration}s</span>
                      </div>
                      <input
                        type="range" min="1" max="7" step="0.5"
                        value={config.slideDuration}
                        onMouseDown={pushHistoryCheckpoint}
                        onTouchStart={pushHistoryCheckpoint}
                        onChange={(e) => setConfig((prev) => ({ ...prev, slideDuration: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[11px] mb-1.5">
                        <span className="text-zinc-400">Перелистывание</span>
                        <span className="font-bold text-emerald-400">{config.transitionDuration}s</span>
                      </div>
                      <input
                        type="range" min="0.2" max="1.5" step="0.1"
                        value={config.transitionDuration}
                        onMouseDown={pushHistoryCheckpoint}
                        onTouchStart={pushHistoryCheckpoint}
                        onChange={(e) => setConfig((prev) => ({ ...prev, transitionDuration: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
            
            <div className="space-y-3 font-sans pt-1 border-t border-zinc-800/80">
              
              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
                  {config.showTiktokHud ? <Eye className="w-3.5 h-3.5 text-indigo-400" /> : <EyeOff className="w-3.5 h-3.5 text-zinc-500" />}
                  Водяные знаки TikTok
                </span>
                <button
                  onClick={() => {
                    pushHistoryCheckpoint();
                    setConfig((prev) => ({ ...prev, showTiktokHud: !prev.showTiktokHud }));
                  }}
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                    config.showTiktokHud ? "bg-indigo-600" : "bg-zinc-800"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      config.showTiktokHud ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 font-sans border-t border-zinc-800/80 pt-3">
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
                  className={`w-10 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                    currentSlide?.swipeHintText ? "bg-emerald-600" : "bg-zinc-800"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform ${
                      currentSlide?.swipeHintText ? "translate-x-4" : "translate-x-0"
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
                  className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 py-1.5 px-2.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 hover:border-zinc-700 transition"
                  placeholder="Текст надписи..."
                />
              )}
            </div>
            
            <div className="space-y-2 font-sans border-t border-zinc-800/80 pt-3.5">
              <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-1.5">
                <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                Резервная копия проекта (JSON)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportProject}
                  className="py-1.5 px-2 bg-zinc-950 hover:bg-zinc-800/50 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Download className="w-3.5 h-3.5 text-zinc-500" />
                  Экспорт
                </button>
                <button
                  onClick={() => projectFileInputRef.current?.click()}
                  className="py-1.5 px-2 bg-zinc-950 hover:bg-zinc-800/50 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-[10px] rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Upload className="w-3.5 h-3.5 text-zinc-500" />
                  Импорт
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
        
        <div className="hidden lg:block">
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
