import React, { useState, useEffect } from "react";
import { TextBlock, ColorPalette, PresetThemeId, UserTemplate, CarouselConfig, Slide } from "../types";
import { LayoutTemplate, Save, Trash2, X } from "lucide-react";
interface SlideTemplate {
  id: string;
  name: string;
  icon: string;
  blocks: Omit<TextBlock, "id">[];
}
const SLIDE_TEMPLATES: SlideTemplate[] = [
  {
    id: "caption_styled",
    name: "Вкусная подпись",
    icon: "✨",
    blocks: [
      {
        text: "Напишите сюда свой текст с ==выделением== или **жирным**",
        x: 8,
        y: 55,
        width: 84,
        height: 22,
        fontSize: 18,
        fontWeight: "bold",
        isItalic: false,
        align: "center",
        hasCardBg: true,
        cardBgOpacity: 75,
        cardBgRadius: 18,
        verticalAlign: "center",
      },
    ],
  },
  {
    id: "book_excerpt",
    name: "Отрывок книги",
    icon: "📖",
    blocks: [
      {
        text: "«Вставьте сюда отрывок из книги. Он займёт практически весь слайд — с минимальными отступами по краям. Идеально для длинных цитат, атмосферных фрагментов или завораживающих диалогов, которые затягивают читателя в историю...»",
        x: 4,
        y: 4,
        width: 92,
        height: 92,
        fontSize: 16,
        fontWeight: "normal",
        isItalic: false,
        align: "left",
        hasCardBg: true,
        cardBgOpacity: 70,
        cardBgRadius: 14,
        verticalAlign: "center",
      },
    ],
  },
  {
    id: "chat_conversation",
    name: "Переписка",
    icon: "💬",
    blocks: [
      {
        text: "Ты дома?",
        x: 8, y: 8, width: 60, height: 8, fontSize: 14,
        fontWeight: "normal", isItalic: false, align: "left",
        hasCardBg: false, blockType: "chat_left", verticalAlign: "center",
      },
      {
        text: "Да, а что случилось?",
        x: 27, y: 22, width: 65, height: 8, fontSize: 14,
        fontWeight: "normal", isItalic: false, align: "left",
        hasCardBg: false, blockType: "chat_right", verticalAlign: "center",
      },
      {
        text: "Нужно поговорить. Это важно.",
        x: 8, y: 36, width: 70, height: 8, fontSize: 14,
        fontWeight: "normal", isItalic: false, align: "left",
        hasCardBg: false, blockType: "chat_left", verticalAlign: "center",
      },
      {
        text: "Ты меня пугаешь...",
        x: 32, y: 50, width: 60, height: 8, fontSize: 14,
        fontWeight: "normal", isItalic: false, align: "left",
        hasCardBg: false, blockType: "chat_right", verticalAlign: "center",
      },
      {
        text: "Просто приезжай. Пожалуйста.",
        x: 8, y: 64, width: 70, height: 8, fontSize: 14,
        fontWeight: "normal", isItalic: false, align: "left",
        hasCardBg: false, blockType: "chat_left", verticalAlign: "center",
      },
    ],
  },
  {
    id: "title_text",
    name: "Заголовок + текст",
    icon: "📋",
    blocks: [
      {
        text: "Заголовок вашего ==слайда==",
        x: 8, y: 18, width: 84, height: 16, fontSize: 22,
        fontWeight: "bold", isItalic: false, align: "center",
        hasCardBg: true, cardBgOpacity: 80, cardBgRadius: 16,
        verticalAlign: "center",
      },
      {
        text: "Здесь размещается основной текст слайда. Опишите ключевую мысль, добавьте интригу или раскройте важный момент вашей истории.",
        x: 8, y: 40, width: 84, height: 30, fontSize: 15,
        fontWeight: "normal", isItalic: false, align: "center",
        hasCardBg: true, cardBgOpacity: 70, cardBgRadius: 14,
        verticalAlign: "center",
      },
    ],
  },
];
const USER_TEMPLATES_KEY = "booktok_user_templates";
function loadUserTemplates(): UserTemplate[] {
  try {
    const raw = localStorage.getItem(USER_TEMPLATES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to load user templates:", e);
  }
  return [];
}
function saveUserTemplates(templates: UserTemplate[]) {
  try {
    localStorage.setItem(USER_TEMPLATES_KEY, JSON.stringify(templates));
  } catch (e) {
    console.error("Failed to save user templates:", e);
    alert("Не удалось сохранить шаблон. Возможно, превышен лимит хранилища. Попробуйте удалить старые шаблоны или сохранить шаблон без фона.");
  }
}
interface SlideTemplatesProps {
  onApplyTemplate: (blocks: TextBlock[]) => void;
  onApplyUserTemplate: (template: UserTemplate) => void;
  config: CarouselConfig;
  currentSlide: Slide;
  onStartInteraction?: () => void;
}
export default function SlideTemplates({ onApplyTemplate, onApplyUserTemplate, config, currentSlide, onStartInteraction }: SlideTemplatesProps) {
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [saveWithBg, setSaveWithBg] = useState(true);
  useEffect(() => {
    const load = async () => {
      if (window.electron?.loadUserTemplates) {
        const res = await window.electron.loadUserTemplates();
        if (res.success && res.templates) {
          setUserTemplates(res.templates);
        }
      } else {
        setUserTemplates(loadUserTemplates());
      }
      setIsLoaded(true);
    };
    load();
  }, []);
  useEffect(() => {
    if (!isLoaded) return;
    if (window.electron?.saveUserTemplates) {
      window.electron.saveUserTemplates(userTemplates).catch(e => {
        console.error("Failed to save templates to file:", e);
      });
    } else {
      saveUserTemplates(userTemplates);
    }
  }, [userTemplates, isLoaded]);
  const handleApply = (template: SlideTemplate) => {
    const blocks: TextBlock[] = template.blocks.map((b, idx) => ({
      ...b,
      id: `block-${Date.now()}-${idx}`,
    }));
    onApplyTemplate(blocks);
  };
  const handleSaveCurrentAsTemplate = () => {
    if (!saveTemplateName.trim()) return;
    onStartInteraction?.();
    const newTemplate: UserTemplate = {
      id: `user-tpl-${Date.now()}`,
      name: saveTemplateName.trim(),
      createdAt: Date.now(),
      blocks: currentSlide.blocks.map(b => ({ ...b })),
      palette: { ...config.palette },
      selectedGenre: config.selectedGenre,
      backgroundImage: saveWithBg ? currentSlide.backgroundImage : null,
      backgroundOpacity: currentSlide.backgroundOpacity,
      bgColor: currentSlide.bgColor,
      customFontFamily: config.customFontFamily,
    };
    setUserTemplates(prev => [newTemplate, ...prev]);
    setSaveTemplateName("");
    setSaveWithBg(true);
    setShowSaveModal(false);
  };
  const handleDeleteUserTemplate = (id: string) => {
    setUserTemplates(prev => prev.filter(t => t.id !== id));
  };
  return (
    <div className="space-y-4" id="slide-templates-panel">
      
      <button
        onClick={() => setShowSaveModal(true)}
        className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-950/50 to-emerald-900/30 border border-emerald-800/50 hover:border-emerald-600/50 text-emerald-400 hover:text-emerald-300 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.97]"
      >
        <Save className="w-3.5 h-3.5" />
        Сохранить слайд как шаблон
      </button>
      
      {showSaveModal && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white">Сохранить шаблон</span>
            <button
              onClick={() => setShowSaveModal(false)}
              className="p-1 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <input
            type="text"
            value={saveTemplateName}
            onChange={(e) => setSaveTemplateName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveCurrentAsTemplate()}
            placeholder="Название шаблона..."
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-200 py-2 px-2.5 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600"
            autoFocus
          />
          {currentSlide?.backgroundImage && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveWithBg}
                onChange={(e) => setSaveWithBg(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <span className="text-[10px] text-zinc-400 font-bold">Сохранить фоновое изображение</span>
            </label>
          )}
          <button
            onClick={handleSaveCurrentAsTemplate}
            disabled={!saveTemplateName.trim()}
            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-all cursor-pointer disabled:opacity-40 disabled:cursor-default"
          >
            Сохранить
          </button>
        </div>
      )}
      
      {userTemplates.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
              Мои шаблоны
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {userTemplates.map((tpl) => (
              <div
                key={tpl.id}
                className="relative group cursor-pointer transition-all"
              >
                <button
                  onClick={() => onApplyUserTemplate(tpl)}
                  className="w-full text-left"
                >
                  <div className="bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl p-2 transition-all hover:bg-zinc-900/80 active:scale-[0.97]">
                    
                    <div
                      className="w-full aspect-[9/16] bg-zinc-950 rounded-lg mb-2 relative overflow-hidden border border-zinc-800/50"
                      style={{
                        backgroundColor: tpl.palette.bg,
                        backgroundImage: tpl.backgroundImage ? `url(${tpl.backgroundImage})` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {tpl.blocks.map((b, idx) => (
                        <div
                          key={idx}
                          className="absolute"
                          style={{
                            left: `${b.x}%`,
                            top: `${b.y}%`,
                            width: `${b.width}%`,
                            height: `${b.height}%`,
                            backgroundColor: b.hasCardBg ? tpl.palette.cardBg : "rgba(255,255,255,0.08)",
                            borderRadius: "4px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 8%",
                          }}
                        >
                          <div className="space-y-[2px] w-full">
                            <div className="h-[2px] rounded-full mx-auto" style={{ width: "60%", backgroundColor: "rgba(139,92,246,0.4)" }} />
                            <div className="h-[2px] rounded-full mx-auto" style={{ width: "40%", backgroundColor: "rgba(255,255,255,0.15)" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5 justify-center">
                      <span className="text-[10px] font-bold text-emerald-400/80 group-hover:text-emerald-300 transition-colors truncate">
                        {tpl.name}
                      </span>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteUserTemplate(tpl.id);
                  }}
                  className="absolute top-1 right-1 p-1 bg-black/70 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-10"
                  title="Удалить шаблон"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <LayoutTemplate className="w-4 h-4 text-violet-400" />
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
            Шаблоны слайдов
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {SLIDE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => handleApply(tpl)}
              className="w-full group cursor-pointer transition-all"
            >
              <div className="bg-zinc-900 border border-zinc-800 hover:border-violet-500/50 rounded-xl p-2 transition-all hover:bg-zinc-900/80 active:scale-[0.97]">
                
                <div
                  className="w-full aspect-[9/16] bg-zinc-950 rounded-lg mb-2 relative overflow-hidden border border-zinc-800/50"
                >
                  {tpl.blocks.map((b, idx) => {
                    const isChatLeft = b.blockType === "chat_left";
                    const isChatRight = b.blockType === "chat_right";
                    const isChat = isChatLeft || isChatRight;
                    let bg = "rgba(255,255,255,0.08)";
                    if (isChatLeft) bg = "rgba(33, 46, 51, 0.9)";
                    else if (isChatRight) bg = "rgba(0, 92, 75, 0.9)";
                    let borderRadius = b.hasCardBg ? "4px" : "2px";
                    if (isChatLeft) borderRadius = "6px 6px 6px 0px";
                    else if (isChatRight) borderRadius = "6px 6px 0px 6px";
                    return (
                      <div
                        key={idx}
                        className="absolute"
                        style={{
                          left: `${b.x}%`,
                          top: `${b.y}%`,
                          width: `${b.width}%`,
                          height: `${b.height}%`,
                          backgroundColor: bg,
                          borderRadius,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: isChat ? "flex-start" : "center",
                          padding: "0 8%",
                        }}
                      >
                        <div className="space-y-[2px] w-full">
                          <div
                            className="h-[2px] rounded-full"
                            style={{
                              width: isChat ? "70%" : "60%",
                              backgroundColor: isChat ? "rgba(255,255,255,0.35)" : "rgba(139,92,246,0.4)",
                              margin: isChat ? "0" : "0 auto",
                            }}
                          />
                          {!isChat && (
                            <div
                              className="h-[2px] rounded-full mx-auto"
                              style={{ width: "40%", backgroundColor: "rgba(255,255,255,0.15)" }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-1.5 justify-center">
                  <span className="text-sm">{tpl.icon}</span>
                  <span className="text-[10px] font-bold text-zinc-400 group-hover:text-zinc-200 transition-colors">
                    {tpl.name}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
