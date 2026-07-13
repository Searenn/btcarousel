import React from "react";
import { Slide, CarouselConfig, TextBlock } from "../types";
import { GENRE_PRESETS } from "../presets";
import { getContrastColorForAny, isLightColor } from "../utils/colorExtractor";
import { Heart, MessageCircle, Bookmark } from "lucide-react";
export interface RichToken {
  text: string;
  isHighlighted: boolean;
  isBold: boolean;
  isItalic: boolean;
  highlightColor?: string;
  highlightTextColor?: string;
}
export function parseRichTokens(text: string): RichToken[] {
  const tokens: RichToken[] = [];
  if (!text) return tokens;
  const parts = text.split(/(==.*?==|\*\*.*?\*\*|\*.*?\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("==") && part.endsWith("==")) {
      const inner = part.slice(2, -2);
      const pipeIndex = inner.lastIndexOf("|");
      let tokenText = inner;
      let highlightColor: string | undefined;
      let highlightTextColor: string | undefined;
      if (pipeIndex !== -1) {
        tokenText = inner.slice(0, pipeIndex);
        highlightColor = inner.slice(pipeIndex + 1).trim();
        if (highlightColor) {
          highlightTextColor = getContrastColorForAny(highlightColor);
        }
      }
      let isBold = false;
      let isItalic = false;
      if (tokenText.startsWith("***") && tokenText.endsWith("***")) {
        isBold = true;
        isItalic = true;
        tokenText = tokenText.slice(3, -3);
      } else if (tokenText.startsWith("**") && tokenText.endsWith("**")) {
        isBold = true;
        tokenText = tokenText.slice(2, -2);
      } else if (tokenText.startsWith("*") && tokenText.endsWith("*")) {
        isItalic = true;
        tokenText = tokenText.slice(1, -1);
      }
      tokens.push({
        text: tokenText,
        isHighlighted: true,
        isBold,
        isItalic,
        highlightColor,
        highlightTextColor,
      });
    } else if (part.startsWith("**") && part.endsWith("**")) {
      tokens.push({
        text: part.slice(2, -2),
        isHighlighted: false,
        isBold: true,
        isItalic: false,
      });
    } else if (part.startsWith("*") && part.endsWith("*")) {
      tokens.push({
        text: part.slice(1, -1),
        isHighlighted: false,
        isBold: false,
        isItalic: true,
      });
    } else {
      tokens.push({
        text: part,
        isHighlighted: false,
        isBold: false,
        isItalic: false,
      });
    }
  }
  return tokens;
}
interface SlideViewProps {
  slide: Slide;
  config: CarouselConfig;
  width?: number; 
  height?: number; 
  isExporting?: boolean;
  selectedBlockId?: string | null;
  editingBlockId?: string | null;
  editInitialHtml?: string;
  onBlockPointerDown?: (block: TextBlock, e: React.PointerEvent<HTMLDivElement>) => void;
  onBlockDoubleClick?: (block: TextBlock, e: React.MouseEvent<HTMLDivElement>) => void;
  onBlockClick?: (block: TextBlock, e: React.MouseEvent<HTMLDivElement>) => void;
  onResizePointerDown?: (block: TextBlock, e: React.PointerEvent<HTMLDivElement>) => void;
  onBackgroundPointerDown?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onTextContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onEditableBlur?: (blockId: string, e: React.FocusEvent<HTMLDivElement>) => void;
  onEditableKeyDown?: (blockId: string, e: React.KeyboardEvent<HTMLDivElement>) => void;
}
export default function SlideView({
  slide,
  config,
  width = 1080,
  height = 1920,
  isExporting = false,
  selectedBlockId = null,
  editingBlockId = null,
  editInitialHtml = "",
  onBlockPointerDown,
  onBlockDoubleClick,
  onBlockClick,
  onResizePointerDown,
  onBackgroundPointerDown,
  onTextContextMenu,
  onEditableBlur,
  onEditableKeyDown,
}: SlideViewProps) {
  const preset = GENRE_PRESETS[config.selectedGenre] || GENRE_PRESETS.romantic;
  const p = config.palette;
  const s = width / 315;
  const renderFormattedText = (text: string) => {
    if (!text.trim()) {
      return <span className="opacity-40 italic">Пустой блок. Нажмите дважды для редактирования.</span>;
    }
    const tokens = parseRichTokens(text);
    return tokens.map((t, idx) => {
      let content: React.ReactNode = t.text;
      if (t.isBold) {
        content = <strong className="font-bold">{content}</strong>;
      }
      if (t.isItalic) {
        content = <em className="italic">{content}</em>;
      }
      if (t.isHighlighted) {
        return (
          <span
            key={idx}
            className="inline transition-all"
            style={{
              backgroundColor: t.highlightColor || p.accent,
              color: t.highlightTextColor || p.accentText,
              boxDecorationBreak: "clone",
              WebkitBoxDecorationBreak: "clone",
              borderRadius: "0.286em",
              padding: "0.143em 0.428em",
              margin: "0 0.143em",
            }}
          >
            {content}
          </span>
        );
      }
      return <span key={idx}>{content}</span>;
    });
  };
  return (
    <div
      className={`w-full h-full relative overflow-hidden transition-all duration-300 select-none ${preset.styles?.letterSpacing || ""}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        fontFamily: config.customFontFamily || preset.fontFamily,
        backgroundColor: slide?.bgColor || p.bg,
        boxSizing: "border-box",
        textRendering: "geometricPrecision",
      }}
    >
      
      {slide?.backgroundImage && (
        <div
          onPointerDown={onBackgroundPointerDown}
          className="absolute inset-0 select-none"
          style={{
            backgroundImage: `url(${slide.backgroundImage})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: `scale(${slide.backgroundZoom || 1}) translate(${(slide.backgroundX || 0) * s}px, ${(slide.backgroundY || 0) * s}px)`,
            transformOrigin: "center center",
            cursor: isExporting ? "default" : "all-scroll",
            pointerEvents: isExporting ? "none" : "auto",
            opacity: (slide.backgroundOpacity ?? 100) / 100,
          }}
        />
      )}
      
      {config.selectedGenre === "gold_magic" && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            top: `${16 * s}px`,
            left: `${16 * s}px`,
            right: `${16 * s}px`,
            bottom: `${16 * s}px`,
            border: `${2 * s}px solid rgba(197,160,89,0.35)`,
            borderRadius: `${16 * s}px`,
            boxSizing: "border-box",
          }}
        >
          <div
            className="absolute"
            style={{
              top: `${4 * s}px`,
              left: `${4 * s}px`,
              right: `${4 * s}px`,
              bottom: `${4 * s}px`,
              border: `${1 * s}px solid rgba(197,160,89,0.7)`,
              boxSizing: "border-box",
            }}
          />
        </div>
      )}
      {config.selectedGenre === "noble_emerald" && (
        <div
          className="absolute pointer-events-none z-10"
          style={{
            top: `${20 * s}px`,
            left: `${20 * s}px`,
            right: `${20 * s}px`,
            bottom: `${20 * s}px`,
            border: `${1 * s}px solid rgba(212,175,55,0.2)`,
            borderRadius: `${8 * s}px`,
            boxSizing: "border-box",
          }}
        />
      )}
      
      {slide?.blocks.map((block) => {
        const isSelected = !isExporting && selectedBlockId === block.id;
        const isEditing = !isExporting && editingBlockId === block.id;
        let localBg = block.hasCardBg ? p.cardBg : "transparent";
        const blockRadius = block.cardBgRadius ?? 14;
        let localBorderRadius = config.selectedGenre === "thriller" ? "0px" : `${blockRadius * s}px`;
        let localBorderLeft = (block.hasCardBg && config.selectedGenre === "thriller") 
          ? `${4 * s}px solid #DE2F2F` 
          : undefined;
        const isLightBg = isLightColor(slide?.bgColor || p.bg);
        let localColor = p.text;
        let paddingVertical = block.hasCardBg ? 12 * s : 4 * s;
        let paddingHorizontal = block.hasCardBg ? 12 * s : 4 * s;
        const isChatMode = block.blockType === "chat_left" || block.blockType === "chat_right";
        if (block.hasCardBg && block.cardBgOpacity !== undefined && !isChatMode) {
          const opacityVal = block.cardBgOpacity / 100;
          const rgbaMatch = localBg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
          if (rgbaMatch) {
            localBg = `rgba(${rgbaMatch[1]}, ${rgbaMatch[2]}, ${rgbaMatch[3]}, ${opacityVal})`;
          }
        }
        if (block.blockType === "chat_left") {
          localBg = isLightBg ? "#FFFFFF" : "rgba(33, 46, 51, 0.95)";
          localColor = isLightBg ? "#1F1F21" : "#EAEAEA";
          localBorderRadius = `${16 * s}px ${16 * s}px ${16 * s}px 0px`;
          localBorderLeft = undefined;
          paddingVertical = 10 * s;
          paddingHorizontal = 14 * s;
        } else if (block.blockType === "chat_right") {
          localBg = isLightBg ? "#E1FFC4" : "#005C4B";
          localColor = isLightBg ? "#202C33" : "#F3F4F6";
          localBorderRadius = `${16 * s}px ${16 * s}px 0px ${16 * s}px`;
          localBorderLeft = undefined;
          paddingVertical = 10 * s;
          paddingHorizontal = 14 * s;
        }
        const computedFont = isChatMode
          ? "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          : (config.customFontFamily || preset.fontFamily);
        return (
          <div
            key={block.id}
            onPointerDown={(e) => {
              if (isExporting || !onBlockPointerDown) return;
              e.stopPropagation();
              onBlockPointerDown(block, e);
            }}
            onDoubleClick={(e) => {
              if (isExporting || !onBlockDoubleClick) return;
              e.stopPropagation();
              onBlockDoubleClick(block, e);
            }}
            onClick={(e) => {
              if (isExporting || !onBlockClick) return;
              e.stopPropagation();
              onBlockClick(block, e);
            }}
            className={`absolute transition-colors duration-150 flex flex-col select-none group ${
              isExporting
                ? ""
                : isSelected
                ? "ring-2 ring-violet-500/80 shadow-2xl z-30 cursor-grab active:cursor-grabbing"
                : "hover:ring-1 hover:ring-violet-500/40 hover:bg-violet-500/5 z-20 cursor-text"
            }`}
            style={{
              left: `${block.x}%`,
              top: `${block.y}%`,
              width: isExporting ? `${block.width}%` : `calc(${block.width}% + 0.6%)`,
              height: isChatMode ? "auto" : `${block.height}%`,
              minHeight: undefined,
              fontFamily: computedFont,
              backgroundColor: localBg,
              borderRadius: localBorderRadius,
              borderLeft: localBorderLeft,
              paddingTop: `${paddingVertical}px`,
              paddingBottom: `${paddingVertical}px`,
              paddingLeft: `${paddingHorizontal}px`,
              paddingRight: `${paddingHorizontal}px`,
              boxSizing: "border-box",
              overflow: isChatMode ? "visible" : "hidden",
              justifyContent: block.verticalAlign === "top" ? "flex-start" : block.verticalAlign === "bottom" ? "flex-end" : "center",
            }}
          >
            
            {block.blockType === "chat_left" && (
              <div
                className="absolute bottom-0 pointer-events-none no-drag"
                style={{
                  left: `${-10 * s}px`,
                  width: `${11 * s}px`,
                  height: `${16 * s}px`,
                  color: localBg,
                }}
              >
                <svg width={Math.ceil(11 * s)} height={Math.ceil(16 * s)} viewBox="0 0 11 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 16 L0 16 C4 15, 9 10, 11 0 Z" fill="currentColor" />
                </svg>
              </div>
            )}
            {block.blockType === "chat_right" && (
              <div
                className="absolute bottom-0 pointer-events-none no-drag"
                style={{
                  right: `${-10 * s}px`,
                  width: `${11 * s}px`,
                  height: `${16 * s}px`,
                  color: localBg,
                }}
              >
                <svg width={Math.ceil(11 * s)} height={Math.ceil(16 * s)} viewBox="0 0 11 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 16 L11 16 C7 15, 2 10, 0 0 Z" fill="currentColor" />
                </svg>
              </div>
            )}
            
            <div
              className="w-full flex flex-col"
              style={{
                height: isChatMode ? "auto" : "100%",
                overflow: isChatMode ? "visible" : "hidden",
                fontSize: `${block.fontSize * s}px`,
                fontWeight: block.fontWeight === "bold" || block.fontWeight === "black" ? "bold" : "normal",
                fontStyle: block.isItalic ? "italic" : "normal",
                color: localColor,
                textAlign: block.align,
                lineHeight: "1.35",
                boxSizing: "border-box",
                whiteSpace: "pre-wrap",
                justifyContent: block.verticalAlign === "top" ? "flex-start" : block.verticalAlign === "bottom" ? "flex-end" : "center",
              }}
            >
              {isEditing ? (
                <div
                  key={`editable-${block.id}`}
                  id={`editable-div-${block.id}`}
                  contentEditable={true}
                  suppressContentEditableWarning={true}
                  ref={(el) => {
                    if (el && !el.dataset.initialized) {
                      el.innerHTML = editInitialHtml;
                      el.dataset.initialized = "true";
                      requestAnimationFrame(() => {
                        el.focus();
                        const sel = window.getSelection();
                        if (sel) {
                          sel.selectAllChildren(el);
                          sel.collapseToEnd();
                        }
                      });
                    }
                  }}
                  onBlur={(e) => {
                    if (onEditableBlur) onEditableBlur(block.id, e);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (onEditableKeyDown) onEditableKeyDown(block.id, e);
                  }}
                  onContextMenu={onTextContextMenu}
                  className="w-full bg-transparent border-none outline-none overflow-hidden block focus:ring-0 focus:outline-none cursor-text"
                  style={{
                    fontFamily: computedFont,
                    fontSize: `${block.fontSize * s}px`,
                    fontWeight: block.fontWeight === "bold" || block.fontWeight === "black" ? "bold" : "normal",
                    fontStyle: block.isItalic ? "italic" : "normal",
                    color: localColor,
                    textAlign: block.align,
                    lineHeight: "1.35",
                    userSelect: "text",
                    whiteSpace: "pre-wrap",
                  }}
                />
              ) : (
                <div key={`static-${block.id}`} className="w-full cursor-text">
                  {renderFormattedText(block.text)}
                </div>
              )}
            </div>
            
            {!isExporting && !isEditing && (
              <div
                onPointerDown={(e) => {
                  if (!onResizePointerDown) return;
                  e.stopPropagation();
                  e.preventDefault();
                  onResizePointerDown(block, e);
                }}
                className={`absolute bottom-0 right-0 w-6 h-6 bg-zinc-900/95 border border-zinc-700/80 hover:bg-violet-600 hover:border-violet-450 rounded-br-xl rounded-tl-lg cursor-se-resize z-40 flex items-center justify-center no-drag shadow-lg transition-all ${
                  isSelected ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100"
                }`}
                style={{
                  width: `${24 * s / 3.428}px`,
                  height: `${24 * s / 3.428}px`,
                }}
                title="Тяните для изменения размера"
              >
                <div
                  className="border-r-2 border-b-2 border-zinc-400 group-hover:border-white"
                  style={{
                    width: `${8 * s / 3.428}px`,
                    height: `${8 * s / 3.428}px`,
                  }}
                />
              </div>
            )}
            
            {!isExporting && isSelected && (
              <div
                className="absolute px-1.5 py-0.5 bg-violet-600 text-white font-bold rounded flex items-center gap-1 shadow pointer-events-none font-sans uppercase"
                style={{
                  bottom: `-${24 * s / 3.428}px`,
                  left: 0,
                  fontSize: `${9 * s / 3.428}px`,
                  gap: `${4 * s / 3.428}px`,
                  padding: `${2 * s / 3.428}px ${6 * s / 3.428}px`,
                }}
              >
                <span>Блок</span>
                <span className="opacity-70 font-mono text-[8px]" style={{ fontSize: `${8 * s / 3.428}px` }}>{block.fontSize}px</span>
              </div>
            )}
          </div>
        );
      })}
      
      {slide?.swipeHintText && (
        <div
          className="text-center absolute inset-x-0 font-bold tracking-widest opacity-35 select-none font-sans pointer-events-none"
          style={{
            bottom: `${16 * s}px`,
            fontSize: `${9 * s}px`,
            color: p.text,
          }}
        >
          {slide.swipeHintText}
        </div>
      )}
      
      {config.showTiktokHud && (
        <>
          <div
            className="absolute flex flex-col items-center z-40 text-white select-none pointer-events-none"
            style={{
              right: `${8 * s}px`,
              bottom: `${80 * s}px`,
              gap: `${16 * s}px`,
            }}
          >
            <div className="flex flex-col items-center">
              <div
                className="bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-rose-500"
                style={{ width: `${36 * s}px`, height: `${36 * s}px` }}
              >
                <Heart style={{ width: `${18 * s}px`, height: `${18 * s}px` }} className="fill-current" />
              </div>
              <span className="font-bold shadow-sm font-sans" style={{ fontSize: `${9 * s}px`, marginTop: `${2 * s}px` }}>82K</span>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white"
                style={{ width: `${36 * s}px`, height: `${36 * s}px` }}
              >
                <MessageCircle style={{ width: `${18 * s}px`, height: `${18 * s}px` }} />
              </div>
              <span className="font-bold shadow-sm font-sans" style={{ fontSize: `${9 * s}px`, marginTop: `${2 * s}px` }}>491</span>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-amber-400"
                style={{ width: `${36 * s}px`, height: `${36 * s}px` }}
              >
                <Bookmark style={{ width: `${18 * s}px`, height: `${18 * s}px` }} className="fill-current" />
              </div>
              <span className="font-bold shadow-sm font-sans" style={{ fontSize: `${9 * s}px`, marginTop: `${2 * s}px` }}>12K</span>
            </div>
          </div>
          <div
            className="absolute text-white select-none z-40 drop-shadow flex flex-col items-start font-sans pointer-events-none"
            style={{
              left: `${24 * s}px`,
              bottom: `${64 * s}px`,
              gap: `${2 * s}px`,
            }}
          >
            <span className="font-bold" style={{ fontSize: `${10 * s}px` }}>@книжный_автор</span>
            <span className="text-zinc-300 font-medium" style={{ fontSize: `${8 * s}px` }}>Оформление: {preset.name}</span>
          </div>
        </>
      )}
    </div>
  );
}
