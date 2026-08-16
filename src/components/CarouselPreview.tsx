import React, { useState, useEffect, useRef } from "react";
import { Slide, CarouselConfig, PresetThemeId, TextBlock, getRatioDimensions } from "../types";
import { GENRE_PRESETS } from "../presets";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Bold,
  Italic,
  Layout,
  Copy,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Grid3x3,
  X,
  Play,
  Square
} from "lucide-react";
import { getContrastColorForAny } from "../utils/colorExtractor";
import SlideView, { parseRichTokens, RichToken } from "./SlideView";
interface CarouselPreviewProps {
  config: CarouselConfig;
  activeSlideIdx: number;
  setActiveSlideIdx: (idx: number) => void;
  onUpdateSlide: (slideId: string, updatedFields: Partial<Slide>) => void;
  onUpdateConfig: (updatedFields: Partial<CarouselConfig>) => void;
  onAddSlide: () => void;
  onRemoveSlide: (slideId: string) => void;
  onDuplicateSlide: (slideId: string) => void;
  onStartInteraction?: () => void;
  audioBuffer?: ArrayBuffer | null;
  audioStartOffset?: number;
  audioVolume?: number;
}
export default function CarouselPreview({
  config,
  activeSlideIdx,
  setActiveSlideIdx,
  onUpdateSlide,
  onUpdateConfig,
  onAddSlide,
  onRemoveSlide,
  onDuplicateSlide,
  onStartInteraction,
  audioBuffer,
  audioStartOffset = 0,
  audioVolume = 0.8,
}: CarouselPreviewProps) {
  const currentSlide = config.slides[activeSlideIdx];
  const preset = GENRE_PRESETS[config.selectedGenre] || GENRE_PRESETS.romantic;
  const p = config.palette;
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const editInitialHtml = useRef<string>("");
  const [snapLines, setSnapLines] = useState<{ type: "x" | "y"; pos: number }[]>([]);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  // Video preview playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const playbackRaf = useRef<number | null>(null);
  const playbackStart = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const getVideoTimeline = () => {
    const transitionDuration = config.transitionDuration || 0.6;
    const numSlides = config.slides.length;
    const slideDurations = config.slides.map((slide) => {
      if (!config.useUniformDuration && slide.slideDuration != null) return slide.slideDuration;
      return config.slideDuration || 3;
    });
    const segmentStarts: number[] = [];
    let t = 0;
    for (let i = 0; i < numSlides; i++) {
      segmentStarts.push(t);
      t += slideDurations[i];
      if (i < numSlides - 1) t += transitionDuration;
    }
    return { segmentStarts, slideDurations, totalDuration: t, transitionDuration, numSlides };
  };

  const getPlaybackState = (sec: number) => {
    const { segmentStarts, slideDurations, transitionDuration, numSlides } = getVideoTimeline();
    let slideIdx = numSlides - 1;
    let inTransition = false;
    let transProgress = 0;
    for (let i = 0; i < numSlides; i++) {
      const showEnd = segmentStarts[i] + slideDurations[i];
      if (sec < showEnd) { slideIdx = i; inTransition = false; break; }
      if (i < numSlides - 1) {
        const transEnd = showEnd + transitionDuration;
        if (sec < transEnd) { slideIdx = i; inTransition = true; transProgress = (sec - showEnd) / transitionDuration; break; }
      }
    }
    return { slideIdx, inTransition, transProgress };
  };

  const stopPlayback = () => {
    if (playbackRaf.current) cancelAnimationFrame(playbackRaf.current);
    playbackRaf.current = null;
    setIsPlaying(false);
    setPlaybackTime(0);
    if (audioSourceRef.current) {
      try { audioSourceRef.current.stop(); } catch (_) {}
      audioSourceRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  const startPlayback = async () => {
    setSelectedBlockId(null);
    setEditingBlockId(null);
    const { totalDuration } = getVideoTimeline();
    setIsPlaying(true);
    setPlaybackTime(0);
    playbackStart.current = performance.now();

    // Start audio if available
    if (audioBuffer && audioBuffer.byteLength > 0) {
      try {
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        const decoded = await ctx.decodeAudioData(audioBuffer.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        const gain = ctx.createGain();
        gain.gain.value = audioVolume;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(ctx.currentTime, audioStartOffset);
        audioSourceRef.current = source;
      } catch (e) {
        console.warn('Audio playback failed:', e);
      }
    }

    const tick = () => {
      const elapsed = (performance.now() - playbackStart.current) / 1000;
      if (elapsed >= totalDuration) {
        stopPlayback();
        return;
      }
      setPlaybackTime(elapsed);
      const { slideIdx } = getPlaybackState(elapsed);
      setActiveSlideIdx(slideIdx);
      playbackRaf.current = requestAnimationFrame(tick);
    };
    playbackRaf.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    return () => { stopPlayback(); };
  }, []);
  const handleBackgroundPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!currentSlide || !currentSlide.backgroundImage || !e.ctrlKey) return;
    onStartInteraction?.();
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const originalX = currentSlide.backgroundX || 0;
    const originalY = currentSlide.backgroundY || 0;
    const zoom = currentSlide.backgroundZoom || 1;
    const dims = getRatioDimensions(config.ratio);
    const W = dims.previewW;
    const H = dims.previewH;
    const handlePointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const deltaX = moveEv.clientX - startX;
      const deltaY = moveEv.clientY - startY;
      let newX = originalX + (deltaX / zoom);
      let newY = originalY + (deltaY / zoom);
      const limitX = (W * 0.8) / zoom;
      const limitY = (H * 0.8) / zoom;
      newX = Math.max(-limitX, Math.min(limitX, newX));
      newY = Math.max(-limitY, Math.min(limitY, newY));
      onUpdateSlide(currentSlide.id, {
        backgroundX: Math.round(newX * 10) / 10,
        backgroundY: Math.round(newY * 10) / 10,
      });
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
  };
  const [formattingToolbar, setFormattingToolbar] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: "",
  });
  const isLightColor = (color: string | null): boolean => {
    if (!color) return false;
    const hex = color.replace("#", "");
    if (hex.length < 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 140;
  };
  const textToHtml = (text: string, accentColor: string, accentTextColor: string): string => {
    if (!text) return "";
    const tokens = parseRichTokens(text);
    return tokens.map((t) => {
      let styles = "";
      let classList = "";
      const bgColor = t.highlightColor || accentColor;
      const textColor = t.highlightTextColor || accentTextColor;
      if (t.isHighlighted) {
        styles += `background-color: ${bgColor}; color: ${textColor}; box-decoration-break: clone; -webkit-box-decoration-break: clone; `;
        classList += "inline px-1.5 py-0.5 rounded-md mx-0.5 ";
      }
      let wrapperStart = "";
      let wrapperEnd = "";
      if (t.isBold) {
        wrapperStart += "<b>";
        wrapperEnd = "</b>" + wrapperEnd;
      }
      if (t.isItalic) {
        wrapperStart += "<i>";
        wrapperEnd = "</i>" + wrapperEnd;
      }
      if (t.isHighlighted) {
        const dataAttr = t.highlightColor ? `data-color="${t.highlightColor}"` : "";
        return `<span class="${classList.trim()}" style="${styles.trim()}" ${dataAttr}>${wrapperStart}${t.text}${wrapperEnd}</span>`;
      }
      return `${wrapperStart}${t.text}${wrapperEnd}`;
    }).join("");
  };
  const htmlToText = (html: string): string => {
    if (!html) return "";
    const rgbToHex = (rgbStr: string): string => {
      if (rgbStr.startsWith("#")) return rgbStr;
      const match = rgbStr.match(/\d+/g);
      if (!match || match.length < 3) return rgbStr;
      const r = parseInt(match[0]);
      const g = parseInt(match[1]);
      const b = parseInt(match[2]);
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    };
    const doc = document.createElement("div");
    doc.innerHTML = html;
    interface TextRun {
      text: string;
      isBold: boolean;
      isItalic: boolean;
      isHighlighted: boolean;
      highlightColor?: string;
    }
    const runs: TextRun[] = [];
    const traverse = (
      node: Node,
      bold: boolean,
      italic: boolean,
      highlighted: boolean,
      color: string | undefined
    ) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text) {
          runs.push({
            text,
            isBold: bold,
            isItalic: italic,
            isHighlighted: highlighted,
            highlightColor: color,
          });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        const tagName = el.tagName.toUpperCase();
        const isBlock = tagName === "DIV" || tagName === "P" || tagName === "BLOCKQUOTE";
        if (isBlock && runs.length > 0 && !runs[runs.length - 1].text.endsWith("\n")) {
          runs.push({
            text: "\n",
            isBold: false,
            isItalic: false,
            isHighlighted: false,
          });
        }
        if (tagName === "BR") {
          runs.push({
            text: "\n",
            isBold: false,
            isItalic: false,
            isHighlighted: false,
          });
          return;
        }
        let nextBold = bold;
        let nextItalic = italic;
        let nextHighlighted = highlighted;
        let nextColor = color;
        if (tagName === "B" || tagName === "STRONG") {
          nextBold = true;
        } else if (tagName === "I" || tagName === "EM") {
          nextItalic = true;
        } else if (tagName === "SPAN" && (el.style.backgroundColor !== "" || el.classList.contains("inline-block") || el.classList.contains("inline"))) {
          nextHighlighted = true;
          const customColor = el.getAttribute("data-color");
          if (customColor) {
            nextColor = customColor;
          } else if (el.style.backgroundColor) {
            nextColor = rgbToHex(el.style.backgroundColor);
          }
        }
        for (let i = 0; i < el.childNodes.length; i++) {
          traverse(el.childNodes[i], nextBold, nextItalic, nextHighlighted, nextColor);
        }
      }
    };
    for (let i = 0; i < doc.childNodes.length; i++) {
      traverse(doc.childNodes[i], false, false, false, undefined);
    }
    const mergedRuns: TextRun[] = [];
    for (const run of runs) {
      if (mergedRuns.length === 0) {
        mergedRuns.push({ ...run });
      } else {
        const last = mergedRuns[mergedRuns.length - 1];
        if (
          last.isBold === run.isBold &&
          last.isItalic === run.isItalic &&
          last.isHighlighted === run.isHighlighted &&
          last.highlightColor === run.highlightColor
        ) {
          last.text += run.text;
        } else {
          mergedRuns.push({ ...run });
        }
      }
    }
    let result = "";
    for (const run of mergedRuns) {
      let t = run.text;
      if (run.isBold && run.isItalic) {
        t = `***${t}***`;
      } else if (run.isBold) {
        t = `**${t}**`;
      } else if (run.isItalic) {
        t = `*${t}*`;
      }
      if (run.isHighlighted) {
        if (run.highlightColor) {
          t = `==${t}|${run.highlightColor}==`;
        } else {
          t = `==${t}==`;
        }
      }
      result += t;
    }
    return result;
  };
  const handleTextContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      e.preventDefault();
      e.stopPropagation();
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setFormattingToolbar({
        visible: true,
        x: rect.left + rect.width / 2,
        y: rect.top,
        selectedText: selection.toString().trim()
      });
    }
  };
  const handleApplyFormat = (type: "highlight" | "unhighlight" | "bold" | "italic" | "clear", customColor?: string) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    if (selection.toString().trim() === "") return;
    const activeEditableId = editingBlockId ? `editable-div-${editingBlockId}` : null;
    const activeEditable = activeEditableId ? document.getElementById(activeEditableId) : null;
    onStartInteraction?.();
    if (type === "highlight") {
      const colorToUse = customColor || p.accent;
      const textColorToUse = getContrastColorForAny(colorToUse);
      const range = selection.getRangeAt(0);
      const fragment = range.extractContents();
      const span = document.createElement("span");
      span.style.backgroundColor = colorToUse;
      span.style.color = textColorToUse;
      span.style.boxDecorationBreak = "clone";
      (span.style as any).webkitBoxDecorationBreak = "clone";
      span.className = "inline px-1.5 py-0.5 rounded-md mx-0.5";
      span.setAttribute("data-color", colorToUse);
      const bTag = document.createElement("b");
      bTag.appendChild(fragment);
      span.appendChild(bTag);
      range.insertNode(span);
      selection.removeAllRanges();
      const newRange = document.createRange();
      newRange.selectNodeContents(span);
      selection.addRange(newRange);
    } else if (type === "unhighlight") {
      const range = selection.getRangeAt(0);
      const getHighlightSpanAncestor = (node: Node): HTMLElement | null => {
        let curr: Node | null = node;
        while (curr && curr !== activeEditable) {
          if (curr.nodeType === Node.ELEMENT_NODE) {
            const el = curr as HTMLElement;
            if (el.tagName === "SPAN" && (el.hasAttribute("data-color") || el.style.backgroundColor !== "")) {
              return el;
            }
          }
          curr = curr.parentNode;
        }
        return null;
      };
      const isAtStartOfAncestor = (node: Node, offset: number, ancestor: Node): boolean => {
        if (node === ancestor) {
          return offset === 0;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          if (offset > 0) return false;
        } else {
          if (offset > 0) return false;
        }
        let curr = node;
        while (curr && curr !== ancestor) {
          let sib = curr.previousSibling;
          while (sib) {
            if (sib.textContent && sib.textContent.length > 0) {
              return false;
            }
            sib = sib.previousSibling;
          }
          curr = curr.parentNode!;
        }
        return true;
      };
      const isAtEndOfAncestor = (node: Node, offset: number, ancestor: Node): boolean => {
        if (node === ancestor) {
          return offset === ancestor.childNodes.length;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          if (offset < node.textContent!.length) return false;
        } else {
          if (offset < node.childNodes.length) return false;
        }
        let curr = node;
        while (curr && curr !== ancestor) {
          let sib = curr.nextSibling;
          while (sib) {
            if (sib.textContent && sib.textContent.length > 0) {
              return false;
            }
            sib = sib.nextSibling;
          }
          curr = curr.parentNode!;
        }
        return true;
      };
      const startSpan = getHighlightSpanAncestor(range.startContainer);
      if (startSpan && isAtStartOfAncestor(range.startContainer, range.startOffset, startSpan)) {
        range.setStartBefore(startSpan);
      }
      const endSpan = getHighlightSpanAncestor(range.endContainer);
      if (endSpan && isAtEndOfAncestor(range.endContainer, range.endOffset, endSpan)) {
        range.setEndAfter(endSpan);
      }
      const fragment = range.extractContents();
      const removeSpans = (container: Node) => {
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
        const spansToUnwrap: HTMLSpanElement[] = [];
        let node = walker.nextNode();
        while (node) {
          const el = node as HTMLElement;
          if (el.tagName === "SPAN" && (el.hasAttribute("data-color") || el.style.backgroundColor !== "")) {
            spansToUnwrap.push(el as HTMLSpanElement);
          }
          node = walker.nextNode();
        }
        for (let i = spansToUnwrap.length - 1; i >= 0; i--) {
          const span = spansToUnwrap[i];
          const parent = span.parentNode;
          if (parent) {
            while (span.firstChild) {
              parent.insertBefore(span.firstChild, span);
            }
            parent.removeChild(span);
          }
        }
      };
      removeSpans(fragment);
      range.insertNode(fragment);
      const container = activeEditable || document.activeElement;
      if (container) {
        const emptySpans = container.querySelectorAll("span");
        emptySpans.forEach(span => {
          if (span.innerHTML === "" || span.innerHTML === "<br>") {
            span.parentNode?.removeChild(span);
          }
        });
      }
      selection.collapseToEnd();
    } else if (type === "bold") {
      document.execCommand("bold", false);
    } else if (type === "italic") {
      document.execCommand("italic", false);
    } else if (type === "clear") {
      document.execCommand("removeFormat", false);
    }
    if (activeEditable) {
      requestAnimationFrame(() => activeEditable.focus());
    }
    setFormattingToolbar({ visible: false, x: 0, y: 0, selectedText: "" });
  };
  useEffect(() => {
    const resetToolbar = (ev: MouseEvent) => {
      if (ev.button === 2) return; 
      const target = ev.target as HTMLElement;
      if (target.closest(".no-drag") || target.closest("[contenteditable]")) return;
      setFormattingToolbar({ visible: false, x: 0, y: 0, selectedText: "" });
    };
    window.addEventListener("mousedown", resetToolbar);
    return () => window.removeEventListener("mousedown", resetToolbar);
  }, []);
  useEffect(() => {
    const handleSelectionMouseUp = () => {
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim().length > 0) {
          const activeDiv = document.getElementById(`editable-div-${editingBlockId}`);
          if (activeDiv && activeDiv.contains(selection.anchorNode)) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            setFormattingToolbar({
              visible: true,
              x: rect.left + rect.width / 2,
              y: rect.top,
              selectedText: selection.toString().trim()
            });
          }
        }
      }, 50);
    };
    window.addEventListener("mouseup", handleSelectionMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleSelectionMouseUp);
    };
  }, [editingBlockId]);
  const phoneRef = useRef<HTMLDivElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setSelectedBlockId(null);
    setEditingBlockId(null);
  }, [activeSlideIdx]);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedBlockId(null);
        setEditingBlockId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  useEffect(() => {
    const phoneEl = phoneRef.current;
    if (!phoneEl) return;
    let isZooming = false;
    let zoomTimeout: any = null;
    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const slide = config.slides[activeSlideIdx];
      if (!slide || !slide.backgroundImage) return;
      if (!isZooming) {
        isZooming = true;
        onStartInteraction?.();
      }
      clearTimeout(zoomTimeout);
      zoomTimeout = setTimeout(() => {
        isZooming = false;
      }, 800);
      const currentZoom = slide.backgroundZoom || 1;
      const delta = -e.deltaY * 0.003;
      const newZoom = Math.max(0.2, Math.min(5, currentZoom + delta));
      const dims = getRatioDimensions(config.ratio);
      const W = dims.previewW;
      const H = dims.previewH;
      const limitX = (W * 0.8) / newZoom;
      const limitY = (H * 0.8) / newZoom;
      let newX = slide.backgroundX || 0;
      let newY = slide.backgroundY || 0;
      newX = Math.max(-limitX, Math.min(limitX, newX));
      newY = Math.max(-limitY, Math.min(limitY, newY));
      onUpdateSlide(slide.id, {
        backgroundZoom: Math.round(newZoom * 100) / 100,
        backgroundX: Math.round(newX * 10) / 10,
        backgroundY: Math.round(newY * 10) / 10,
      });
    };
    phoneEl.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      phoneEl.removeEventListener("wheel", handleWheel);
      clearTimeout(zoomTimeout);
    };
  }, [activeSlideIdx, config.slides, onUpdateSlide, onStartInteraction]);
  const handlePrev = () => {
    if (activeSlideIdx > 0) {
      setActiveSlideIdx(activeSlideIdx - 1);
    }
  };
  const handleNext = () => {
    if (activeSlideIdx < config.slides.length - 1) {
      setActiveSlideIdx(activeSlideIdx + 1);
    }
  };
  const updateBlock = (blockId: string, updatedFields: Partial<TextBlock>) => {
    if (!currentSlide) return;
    const nextBlocks = currentSlide.blocks.map((block) => {
      if (block.id === blockId) {
        return { ...block, ...updatedFields };
      }
      return block;
    });
    onUpdateSlide(currentSlide.id, { blocks: nextBlocks });
  };
  const handleAddNewBlock = () => {
    if (!currentSlide) return;
    onStartInteraction?.();
    let newY = 40;
    if (currentSlide.blocks.length > 0) {
      const bottomMost = Math.max(...currentSlide.blocks.map(b => b.y + b.height));
      if (bottomMost < 80) {
        newY = Math.round(bottomMost + 3); 
      } else {
        newY = 25; 
      }
    }
    const newBlock: TextBlock = {
      id: `block-${Date.now()}`,
      text: "Просто ==зажмите и перемещайте== текст или дважды кликните",
      x: 10,
      y: newY,
      width: 80,
      height: 18,
      fontSize: 16,
      fontWeight: "normal",
      isItalic: false,
      align: "center",
      hasCardBg: true,
    };
    onUpdateSlide(currentSlide.id, {
      blocks: [...currentSlide.blocks, newBlock]
    });
    setSelectedBlockId(newBlock.id);
  };
  const handleAddChatBlock = (type: "chat_left" | "chat_right") => {
    if (!currentSlide) return;
    onStartInteraction?.();
    const existingChatBlocks = currentSlide.blocks.filter(b => b.blockType === "chat_left" || b.blockType === "chat_right");
    const refBlock = existingChatBlocks[existingChatBlocks.length - 1] || existingChatBlocks[0];
    const fontSize = refBlock ? refBlock.fontSize : 14;
    const width = refBlock ? refBlock.width : 60;
    let newY = 8;
    if (currentSlide.blocks.length > 0) {
      const bottomMost = Math.max(...currentSlide.blocks.map(b => b.y + b.height));
      if (bottomMost < 85) {
        newY = Math.round(bottomMost + 3);
      } else {
        newY = 8; 
      }
    }
    const x = type === "chat_left" ? 8 : (92 - width);
    const newBlock: TextBlock = {
      id: `block-${Date.now()}`,
      text: type === "chat_left" ? "Новое сообщение..." : "Ответное сообщение...",
      x,
      y: newY,
      width,
      height: 8,
      fontSize,
      fontWeight: "normal",
      isItalic: false,
      align: "left",
      hasCardBg: false,
      blockType: type,
      verticalAlign: "center",
    };
    onUpdateSlide(currentSlide.id, {
      blocks: [...currentSlide.blocks, newBlock]
    });
    setSelectedBlockId(newBlock.id);
  };
  const handleDeleteBlock = (blockId: string) => {
    if (!currentSlide) return;
    if (currentSlide.blocks.length <= 1) {
      alert("Слайд должен содержать хотя бы один текстовый блок!");
      return;
    }
    onStartInteraction?.();
    const nextBlocks = currentSlide.blocks.filter((b) => b.id !== blockId);
    onUpdateSlide(currentSlide.id, { blocks: nextBlocks });
    setSelectedBlockId(null);
    setEditingBlockId(null);
  };
  const startEditingBlock = (block: TextBlock) => {
    onStartInteraction?.();
    editInitialHtml.current = textToHtml(block.text, p.accent, p.accentText);
    setEditingBlockId(block.id);
    setSelectedBlockId(block.id);
  };
  const finishEditingBlock = (blockId: string) => {
    const activeDiv = document.getElementById(`editable-div-${blockId}`);
    const plainText = activeDiv ? htmlToText(activeDiv.innerHTML) : "";
    updateBlock(blockId, { text: plainText });
    setEditingBlockId(null);
  };
  const handleBlockPointerDown = (block: TextBlock, e: React.PointerEvent<HTMLDivElement>) => {
    if (editingBlockId === block.id) return;
    setSelectedBlockId(block.id);
    const target = e.target as HTMLElement;
    if (target.closest(".no-drag")) return;
    const phoneElement = phoneRef.current;
    if (!phoneElement) return;
    const rect = phoneElement.getBoundingClientRect();
    const innerWidth = rect.width - 18;
    const innerHeight = rect.height - 18;
    const startX = e.clientX;
    const startY = e.clientY;
    const originalX = block.x;
    const originalY = block.y;
    let hasMoved = false;
    const currentWidth = block.width;
    const currentHeight = block.height;
    const handlePointerMove = (moveEv: PointerEvent) => {
      const distance = Math.sqrt(Math.pow(moveEv.clientX - startX, 2) + Math.pow(moveEv.clientY - startY, 2));
      if (!hasMoved && distance < 3) return; 
      if (!hasMoved) {
        onStartInteraction?.();
      }
      hasMoved = true;
      moveEv.preventDefault();
      const deltaXPercent = ((moveEv.clientX - startX) / innerWidth) * 100;
      const deltaYPercent = ((moveEv.clientY - startY) / innerHeight) * 100;
      let targetX = originalX + deltaXPercent;
      let targetY = originalY + deltaYPercent;
      let snapX: number | null = null;
      let snapY: number | null = null;
      const snapThreshold = 1.8; 
      if (Math.abs((targetX + currentWidth / 2) - 50) < snapThreshold) {
        targetX = 50 - currentWidth / 2;
        snapX = 50;
      }
      if (Math.abs((targetY + currentHeight / 2) - 50) < snapThreshold) {
        targetY = 50 - currentHeight / 2;
        snapY = 50;
      }
      if (currentSlide) {
        const otherBlocks = currentSlide.blocks.filter(b => b.id !== block.id);
        for (const ob of otherBlocks) {
          if (Math.abs(targetX - ob.x) < snapThreshold) {
            targetX = ob.x;
            snapX = ob.x;
          } else if (Math.abs(targetX - (ob.x + ob.width)) < snapThreshold) {
            targetX = ob.x + ob.width;
            snapX = ob.x + ob.width;
          } else if (Math.abs((targetX + currentWidth) - ob.x) < snapThreshold) {
            targetX = ob.x - currentWidth;
            snapX = ob.x;
          } else if (Math.abs((targetX + currentWidth) - (ob.x + ob.width)) < snapThreshold) {
            targetX = ob.x + ob.width - currentWidth;
            snapX = ob.x + ob.width;
          }
          const obCenterX = ob.x + ob.width / 2;
          if (Math.abs((targetX + currentWidth / 2) - obCenterX) < snapThreshold) {
            targetX = obCenterX - currentWidth / 2;
            snapX = obCenterX;
          }
          if (Math.abs(targetY - ob.y) < snapThreshold) {
            targetY = ob.y;
            snapY = ob.y;
          } else if (Math.abs(targetY - (ob.y + ob.height)) < snapThreshold) {
            targetY = ob.y + ob.height;
            snapY = ob.y + ob.height;
          } else if (Math.abs((targetY + currentHeight) - ob.y) < snapThreshold) {
            targetY = ob.y - currentHeight;
            snapY = ob.y;
          } else if (Math.abs((targetY + currentHeight) - (ob.y + ob.height)) < snapThreshold) {
            targetY = ob.y + ob.height - currentHeight;
            snapY = ob.y + ob.height;
          }
          const obCenterY = ob.y + ob.height / 2;
          if (Math.abs((targetY + currentHeight / 2) - obCenterY) < snapThreshold) {
            targetY = obCenterY - currentHeight / 2;
            snapY = obCenterY;
          }
        }
      }
      const finalX = Math.max(0, Math.min(100 - currentWidth, targetX));
      const finalY = Math.max(0, Math.min(100 - currentHeight, targetY));
      const activeGuides: { type: 'x' | 'y'; pos: number }[] = [];
      if (snapX !== null) activeGuides.push({ type: 'x', pos: snapX });
      if (snapY !== null) activeGuides.push({ type: 'y', pos: snapY });
      setSnapLines(activeGuides);
      updateBlock(block.id, {
        x: Math.round(finalX * 10) / 10,
        y: Math.round(finalY * 10) / 10
      });
    };
    const handlePointerUp = () => {
      setSnapLines([]);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
  };
  const handleResizePointerDown = (block: TextBlock, e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    onStartInteraction?.();
    const phoneElement = phoneRef.current;
    if (!phoneElement) return;
    const rect = phoneElement.getBoundingClientRect();
    const innerWidth = rect.width - 18;
    const innerHeight = rect.height - 18;
    const startX = e.clientX;
    const startY = e.clientY;
    const originalWidth = block.width;
    const originalHeight = block.height;
    const handlePointerMove = (moveEv: PointerEvent) => {
      moveEv.preventDefault();
      const deltaXPercent = ((moveEv.clientX - startX) / innerWidth) * 100;
      const deltaYPercent = ((moveEv.clientY - startY) / innerHeight) * 100;
      const finalWidth = Math.max(10, Math.min(100 - block.x, originalWidth + deltaXPercent));
      const finalHeight = Math.max(4, Math.min(100 - block.y, originalHeight + deltaYPercent));
      updateBlock(block.id, {
        width: Math.round(finalWidth),
        height: Math.round(finalHeight)
      });
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", handlePointerUp);
  };
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
    });
  };
  useEffect(() => {
    const globClick = () => setContextMenu(null);
    window.addEventListener("click", globClick);
    return () => window.removeEventListener("click", globClick);
  }, []);
  const handleBgUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      onUpdateSlide(currentSlide.id, {
        backgroundImage: e.target?.result as string,
      });
    };
    reader.readAsDataURL(file);
    setContextMenu(null);
  };
  const selectedBlock = currentSlide?.blocks.find((b) => b.id === selectedBlockId);
  return (
    <div 
      className="flex flex-col items-center justify-center space-y-5 w-full select-none" 
      id="interactive-preview-module"
      onClick={() => {
        setSelectedBlockId(null);
        setEditingBlockId(null);
      }}
    >
      <input
        type="file"
        ref={bgInputRef}
        onChange={(e) => e.target.files && handleBgUpload(e.target.files[0])}
        accept="image/*,video/*" className="hidden" />
      <div
        ref={phoneRef}
        onContextMenu={handleContextMenu}
        onClick={(e) => {
          e.stopPropagation();
          setSelectedBlockId(null);
          setEditingBlockId(null);
        }}
        className="relative bg-black rounded-[46px] shadow-2xl border-[9px] border-zinc-850 overflow-visible"
        style={{ width: '333px', height: `${getRatioDimensions(config.ratio).previewH + 18}px` }}
        id="phone-device-viewport"
      >
        
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-5 bg-zinc-850 rounded-b-[18px] z-40 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-1.5 bg-black rounded-full" />
        </div>
        
        <div
          className="relative overflow-hidden transition-all duration-300 rounded-[35px]"
          style={{
            width: `${getRatioDimensions(config.ratio).previewW}px`,
            height: `${getRatioDimensions(config.ratio).previewH}px`,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          <div
            style={{
              width: `${getRatioDimensions(config.ratio).exportW}px`,
              height: `${getRatioDimensions(config.ratio).exportH}px`,
              transform: `scale(${getRatioDimensions(config.ratio).previewW / getRatioDimensions(config.ratio).exportW})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            <SlideView
              slide={currentSlide}
              config={config}
              width={getRatioDimensions(config.ratio).exportW}
              height={getRatioDimensions(config.ratio).exportH}
              selectedBlockId={selectedBlockId}
              editingBlockId={editingBlockId}
              editInitialHtml={editInitialHtml.current}
              onBlockPointerDown={handleBlockPointerDown}
              onBlockDoubleClick={startEditingBlock}
              onBlockClick={(block, e) => {
                setSelectedBlockId(block.id);
              }}
              onResizePointerDown={handleResizePointerDown}
              onBackgroundPointerDown={handleBackgroundPointerDown}
              onTextContextMenu={handleTextContextMenu}
              onEditableBlur={(blockId, e) => {
                const relatedTarget = e.relatedTarget as HTMLElement | null;
                if (relatedTarget?.closest?.('.formatting-toolbar-btn')) return;
                if (formattingToolbar.visible) return;
                finishEditingBlock(blockId);
              }}
              onEditableKeyDown={(blockId, e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
                e.stopPropagation();
              }}
            />
          </div>
          
          {snapLines.map((line, idx) => (
            <div
              key={idx}
              className="absolute pointer-events-none z-50 transition-all duration-75"
              style={{
                left: line.type === "x" ? `${line.pos}%` : 0,
                top: line.type === "y" ? `${line.pos}%` : 0,
                width: line.type === "x" ? "1.5px" : "100%",
                height: line.type === "y" ? "1.5px" : "100%",
                borderStyle: line.type === "x" ? "none none none dashed" : "dashed none none none",
                borderWidth: line.type === "x" ? "0 0 0 1.5px" : "1.5px 0 0 0",
                borderColor: "#A78BFA"
              }}
            />
          ))}
          
          {config.showGrid && (
            <div className="absolute inset-0 pointer-events-none z-[35]">
              
              {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((pos) => (
                <div key={`vl-${pos}`} className="absolute top-0 h-full" style={{ left: `${pos}%`, width: '1px', borderLeft: pos === 50 ? '1px dashed rgba(139,92,246,0.35)' : '1px dashed rgba(139,92,246,0.12)' }} />
              ))}
              
              {[12.5, 25, 37.5, 50, 62.5, 75, 87.5].map((pos) => (
                <div key={`hl-${pos}`} className="absolute left-0 w-full" style={{ top: `${pos}%`, height: '1px', borderTop: pos === 50 ? '1px dashed rgba(139,92,246,0.35)' : '1px dashed rgba(139,92,246,0.12)' }} />
              ))}
            </div>
          )}
          

          {/* Video preview transition overlay */}
          {isPlaying && (() => {
            const dims = getRatioDimensions(config.ratio);
            const previewW = dims.previewW;
            const scale = previewW / dims.exportW;
            const pb = getPlaybackState(playbackTime);
            const { totalDuration } = getVideoTimeline();
            const progress = Math.min(playbackTime / totalDuration, 1);
            if (pb.inTransition && pb.slideIdx < config.slides.length - 1) {
              const easeProgress = pb.transProgress < 0.5
                ? 2 * pb.transProgress * pb.transProgress
                : 1 - Math.pow(-2 * pb.transProgress + 2, 2) / 2;
              return (
                <div className="absolute inset-0 z-[45] overflow-hidden rounded-[35px] pointer-events-none">
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: `${dims.exportW}px`, height: `${dims.exportH}px`,
                    transform: `scale(${scale}) translateX(${-easeProgress * dims.exportW}px)`,
                    transformOrigin: 'top left',
                  }}>
                    <SlideView slide={config.slides[pb.slideIdx]} config={config} width={dims.exportW} height={dims.exportH} isExporting={true} />
                  </div>
                  <div style={{
                    position: 'absolute', top: 0, left: 0,
                    width: `${dims.exportW}px`, height: `${dims.exportH}px`,
                    transform: `scale(${scale}) translateX(${(1 - easeProgress) * dims.exportW}px)`,
                    transformOrigin: 'top left',
                  }}>
                    <SlideView slide={config.slides[pb.slideIdx + 1]} config={config} width={dims.exportW} height={dims.exportH} isExporting={true} />
                  </div>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30 z-50">
                    <div className="h-full bg-emerald-500 transition-none" style={{ width: `${progress * 100}%` }} />
                  </div>
                </div>
              );
            }
            return (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30 z-[45] rounded-b-[35px] overflow-hidden pointer-events-none">
                <div className="h-full bg-emerald-500 transition-none" style={{ width: `${progress * 100}%` }} />
              </div>
            );
          })()}

        </div>
      </div>
      
      {selectedBlock && !editingBlockId && (() => {
        const phoneEl = phoneRef.current;
        if (!phoneEl) return null;
        const phoneRect = phoneEl.getBoundingClientRect();
        const bLeft = phoneRect.left + (selectedBlock.x / 100) * (phoneRect.width - 18) + 9;
        const bTop = phoneRect.top + (selectedBlock.y / 100) * (phoneRect.height - 18) + 9;
        const bWidth = (selectedBlock.width / 100) * (phoneRect.width - 18);
        const toolbarX = bLeft + bWidth / 2;
        const toolbarY = bTop - 14;
        const isChatBlock = selectedBlock.blockType === "chat_left" || selectedBlock.blockType === "chat_right";
        return (
          <div
            className="fixed z-[9999] flex flex-col items-center gap-1.5 no-drag select-none"
            style={{
              top: `${toolbarY}px`,
              left: `${toolbarX}px`,
              transform: "translate(-50%, -100%)",
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 px-2 py-1.5 rounded-xl shadow-2xl flex items-center gap-1.5 text-white">
              <select
                value={selectedBlock.blockType || "default"}
                onChange={(e) => {
                  onStartInteraction?.();
                  const newType = e.target.value as "default" | "chat_left" | "chat_right";
                  if (newType === "chat_left" || newType === "chat_right") {
                    const existingChat = currentSlide.blocks.filter(b => b.id !== selectedBlock.id && (b.blockType === "chat_left" || b.blockType === "chat_right"));
                    const refBlock = existingChat[existingChat.length - 1] || existingChat[0];
                    const width = refBlock ? refBlock.width : 60;
                    const fontSize = refBlock ? refBlock.fontSize : 14;
                    const x = newType === "chat_left" ? 8 : (92 - width);
                    updateBlock(selectedBlock.id, {
                      blockType: newType,
                      hasCardBg: false,
                      align: "left",
                      height: 8,
                      width,
                      fontSize,
                      x,
                    });
                  } else {
                    updateBlock(selectedBlock.id, {
                      blockType: "default",
                      hasCardBg: true,
                      align: "center",
                      height: 18,
                      width: 80,
                      x: 10,
                    });
                  }
                }}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 py-0.5 px-1 rounded font-bold text-[10px] cursor-pointer"
              >
                <option value="default">📝 Текст</option>
                <option value="chat_left">💬 Чат ←</option>
                <option value="chat_right">💬 Чат →</option>
              </select>
              <div className="w-[1px] h-3.5 bg-zinc-800" />
              <button onClick={() => { onStartInteraction?.(); updateBlock(selectedBlock.id, { fontSize: Math.max(10, selectedBlock.fontSize - 1) }); }} className="px-1 hover:bg-zinc-850 text-zinc-300 hover:text-white rounded text-[10px] font-bold cursor-pointer">A-</button>
              <span className="text-[10px] font-mono font-bold w-4 text-center">{selectedBlock.fontSize}</span>
              <button onClick={() => { onStartInteraction?.(); updateBlock(selectedBlock.id, { fontSize: Math.min(48, selectedBlock.fontSize + 1) }); }} className="px-1 hover:bg-zinc-850 text-zinc-300 hover:text-white rounded text-[10px] font-bold cursor-pointer">A+</button>
              <div className="w-[1px] h-3.5 bg-zinc-800" />
              <button onClick={() => { onStartInteraction?.(); updateBlock(selectedBlock.id, { fontWeight: selectedBlock.fontWeight === "bold" ? "normal" : "bold" }); }} className={`p-1 rounded cursor-pointer ${selectedBlock.fontWeight === "bold" ? "bg-violet-950 text-violet-400" : "hover:bg-zinc-850 text-zinc-400 hover:text-white"}`}><Bold className="w-3 h-3" /></button>
              <button onClick={() => { onStartInteraction?.(); updateBlock(selectedBlock.id, { isItalic: !selectedBlock.isItalic }); }} className={`p-1 rounded cursor-pointer ${selectedBlock.isItalic ? "bg-violet-950 text-violet-400" : "hover:bg-zinc-850 text-zinc-400 hover:text-white"}`}><Italic className="w-3 h-3" /></button>
              <div className="w-[1px] h-3.5 bg-zinc-800" />
              
              <button onClick={() => { onStartInteraction?.(); updateBlock(selectedBlock.id, { align: 'left' }); }} className={`p-1 rounded cursor-pointer ${selectedBlock.align === 'left' ? 'bg-sky-950 text-sky-400' : 'hover:bg-zinc-850 text-zinc-400 hover:text-white'}`} title="По левому краю"><AlignLeft className="w-3 h-3" /></button>
              <button onClick={() => { onStartInteraction?.(); updateBlock(selectedBlock.id, { align: 'center' }); }} className={`p-1 rounded cursor-pointer ${selectedBlock.align === 'center' ? 'bg-sky-950 text-sky-400' : 'hover:bg-zinc-850 text-zinc-400 hover:text-white'}`} title="По центру"><AlignCenter className="w-3 h-3" /></button>
              <button onClick={() => { onStartInteraction?.(); updateBlock(selectedBlock.id, { align: 'right' }); }} className={`p-1 rounded cursor-pointer ${selectedBlock.align === 'right' ? 'bg-sky-950 text-sky-400' : 'hover:bg-zinc-850 text-zinc-400 hover:text-white'}`} title="По правому краю"><AlignRight className="w-3 h-3" /></button>
              <button onClick={() => { onStartInteraction?.(); updateBlock(selectedBlock.id, { align: 'justify' }); }} className={`p-1 rounded cursor-pointer ${selectedBlock.align === 'justify' ? 'bg-sky-950 text-sky-400' : 'hover:bg-zinc-850 text-zinc-400 hover:text-white'}`} title="По ширине"><AlignJustify className="w-3 h-3" /></button>
              <div className="w-[1px] h-3.5 bg-zinc-800" />
              <button disabled={isChatBlock} onClick={() => { onStartInteraction?.(); updateBlock(selectedBlock.id, { hasCardBg: !selectedBlock.hasCardBg }); }} className={`p-1 rounded cursor-pointer ${selectedBlock.hasCardBg ? "bg-emerald-950 text-emerald-400" : "hover:bg-zinc-850 text-zinc-400 hover:text-white"} disabled:opacity-20`}><Layout className="w-3 h-3" /></button>
              <div className="w-[1px] h-3.5 bg-zinc-800" />
              <button onClick={() => { onStartInteraction?.(); handleDeleteBlock(selectedBlock.id); }} className="p-1 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 rounded cursor-pointer" title="Удалить блок"><Trash2 className="w-3 h-3" /></button>
              <div className="w-[1px] h-3.5 bg-zinc-800" />
              <button onClick={() => { setSelectedBlockId(null); setEditingBlockId(null); }} className="p-1 hover:bg-zinc-850 text-zinc-400 hover:text-white rounded cursor-pointer" title="Снять выделение"><X className="w-3 h-3" /></button>
            </div>
            {selectedBlock.hasCardBg && !isChatBlock && (
              <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-800 px-3 py-1.5 rounded-lg shadow-2xl flex items-center gap-3 text-white">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-zinc-400 font-bold whitespace-nowrap">Прозр.</span>
                  <input type="range" min="0" max="100" step="5" value={selectedBlock.cardBgOpacity ?? 78} onMouseDown={onStartInteraction} onTouchStart={onStartInteraction} onChange={(e) => updateBlock(selectedBlock.id, { cardBgOpacity: parseInt(e.target.value) })} className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-violet-500" />
                  <span className="text-[9px] font-mono text-zinc-400 w-6 text-right">{selectedBlock.cardBgOpacity ?? 78}%</span>
                </div>
                <div className="w-[1px] h-3 bg-zinc-800" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-zinc-400 font-bold whitespace-nowrap">Скругл.</span>
                  <input type="range" min="0" max="30" step="1" value={selectedBlock.cardBgRadius ?? 14} onMouseDown={onStartInteraction} onTouchStart={onStartInteraction} onChange={(e) => updateBlock(selectedBlock.id, { cardBgRadius: parseInt(e.target.value) })} className="w-16 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                  <span className="text-[9px] font-mono text-zinc-400 w-5 text-right">{selectedBlock.cardBgRadius ?? 14}</span>
                </div>
              </div>
            )}
          </div>
        );
      })()}
      
      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
        {config.ratio === '9:16' && (
          <button
            onClick={(e) => { e.stopPropagation(); isPlaying ? stopPlayback() : startPlayback(); }}
            className={`p-2 border rounded-xl transition cursor-pointer ${
              isPlaying
                ? 'bg-rose-950/50 border-rose-700 text-rose-400 hover:bg-rose-900/50'
                : 'bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-800/50 text-emerald-400'
            }`}
            title={isPlaying ? 'Остановить предпросмотр' : 'Предпросмотр видео'}
          >
            {isPlaying ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
        )}
        <button
          onClick={handlePrev}
          disabled={activeSlideIdx === 0}
          className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl disabled:opacity-35 transition pointer-events-auto cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {currentSlide?.blocks.some(b => b.blockType === "chat_left" || b.blockType === "chat_right") ? (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddChatBlock("chat_left");
              }}
              className="px-2 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold text-[10px] rounded-lg cursor-pointer transition-all active:scale-95"
              title="Добавить левое сообщение"
            >
              💬 Слева
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddChatBlock("chat_right");
              }}
              className="px-2 py-1.5 bg-emerald-950/30 hover:bg-emerald-900/35 border border-emerald-900 text-emerald-400 font-bold text-[10px] rounded-lg cursor-pointer transition-all active:scale-95"
              title="Добавить правое сообщение"
            >
              💬 Справа
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAddNewBlock();
              }}
              className="px-1.5 py-1.5 bg-zinc-900/50 hover:bg-zinc-850/50 border border-zinc-850 text-zinc-400 hover:text-zinc-300 font-bold text-[10px] rounded-lg cursor-pointer transition-all active:scale-95"
              title="Добавить обычный текстовый блок"
            >
              ➕ Текст
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddNewBlock();
            }}
            className="px-3 py-1.5 bg-violet-950/50 hover:bg-violet-900/50 text-violet-400 border border-violet-800 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            Добавить блок
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateConfig({ showGrid: !config.showGrid });
          }}
          className={`p-2 border rounded-xl transition cursor-pointer ${
            config.showGrid
              ? 'bg-violet-950/50 border-violet-700 text-violet-400'
              : 'bg-zinc-900 hover:bg-zinc-850 border-zinc-800 text-zinc-400 hover:text-white'
          }`}
          title={config.showGrid ? 'Скрыть сетку' : 'Показать сетку'}
        >
          <Grid3x3 className="w-4 h-4" />
        </button>
        <button
          onClick={handleNext}
          disabled={activeSlideIdx === config.slides.length - 1}
          className="p-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white rounded-xl disabled:opacity-35 transition pointer-events-auto cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      
      <div className="w-[333px] space-y-2 select-none pt-2" id="horizontal-slides-ribbon" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center px-1">
          <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Слайды карусели</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddSlide}
              className="text-[10px] font-bold bg-violet-950/50 hover:bg-violet-900/50 text-violet-400 border border-violet-800/40 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
        <div className="flex gap-2.5 pb-2 overflow-x-auto carousel-slide-strip" style={{ maxWidth: '100%' }}>
          {config.slides.map((s, idx) => {
            const isActive = activeSlideIdx === idx;
            const slideBg = s.bgColor || p.bg;
            const bgStyle = s.backgroundImage ? `url(${s.backgroundImage})` : undefined;
            return (
              <div
                key={s.id}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", idx.toString());
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  const fromIdx = parseInt(e.dataTransfer.getData("text/plain"));
                  if (isNaN(fromIdx)) return;
                  if (fromIdx !== idx) {
                    const updatedSlides = [...config.slides];
                    const [removed] = updatedSlides.splice(fromIdx, 1);
                    updatedSlides.splice(idx, 0, removed);
                    onUpdateConfig({ slides: updatedSlides });
                    setActiveSlideIdx(idx);
                  }
                }}
                onClick={() => setActiveSlideIdx(idx)}
                className={`relative flex-shrink-0 w-20 aspect-[9/16] rounded-xl border-2 transition-all cursor-pointer group flex flex-col justify-between overflow-hidden ${
                  isActive ? "border-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.3)] bg-violet-950/20" : "border-zinc-800 bg-zinc-950/50 hover:border-zinc-700"
                }`}
                style={{
                  backgroundColor: slideBg,
                  backgroundImage: bgStyle,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                
                <div className="absolute inset-0 bg-black/45 group-hover:bg-black/25 transition-colors pointer-events-none z-10" />
                
                <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
                  {s.blocks?.map((b) => {
                    let minBg = b.hasCardBg ? p.cardBg : "transparent";
                    if (b.blockType === "chat_left") {
                      minBg = isLightColor(s.bgColor || p.bg) ? "rgba(255, 255, 255, 0.9)" : "rgba(33, 46, 51, 0.9)";
                    } else if (b.blockType === "chat_right") {
                      minBg = isLightColor(s.bgColor || p.bg) ? "rgba(225, 255, 196, 0.9)" : "rgba(0, 92, 75, 0.9)";
                    }
                    return (
                      <div
                        key={b.id}
                        className="absolute rounded-[2px]"
                        style={{
                          left: `${b.x}%`,
                          top: `${b.y}%`,
                          width: `${b.width}%`,
                          height: `${b.height}%`,
                          backgroundColor: minBg,
                          borderLeft: (b.hasCardBg && config.selectedGenre === "thriller" && b.blockType === "default") ? "1px solid #DE2F2F" : undefined,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        
                        <div className="w-[80%] h-[2px] bg-zinc-400/50 rounded-full" />
                      </div>
                    );
                  })}
                </div>
                
                <div className="relative z-20 p-1 flex justify-between items-center bg-black/30 backdrop-blur-xs">
                  <span className="text-[10px] font-black text-white">{idx + 1}</span>
                  {config.slides.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveSlide(s.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 bg-black/50 hover:bg-rose-950 text-zinc-400 hover:text-rose-400 rounded transition-opacity"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
                
                <div className="relative z-10 p-1 bg-black/35 backdrop-blur-xs flex justify-between items-center text-[8px] text-zinc-300">
                  <span className="font-mono">{s.blocks?.length || 0}бл</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateSlide(s.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-zinc-850 rounded text-zinc-400 hover:text-white transition-opacity"
                  >
                    <Copy className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {contextMenu && (
        <div
          className="fixed bg-zinc-900 border border-zinc-800 text-zinc-200 py-2 rounded-2xl w-56 shadow-2xl z-50 flex flex-col font-sans select-none animate-fade-in text-xs"
          style={{
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 pb-1 border-b border-zinc-800">
            <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Оформление слайда</span>
          </div>
          <button
            onClick={() => bgInputRef.current?.click()}
            className="px-3 py-1.5 hover:bg-zinc-800 text-left flex items-center gap-2 cursor-pointer transition-colors"
          >
            Загрузить картинку фона
          </button>
          {currentSlide?.backgroundImage && (
            <button
              onClick={() => {
                onUpdateSlide(currentSlide.id, { backgroundImage: null });
                setContextMenu(null);
              }}
              className="px-3 py-1.5 hover:bg-zinc-800 text-left flex items-center gap-2 text-rose-400 transition-colors"
            >
              Удалить фон слайда
            </button>
          )}
          <div className="h-[1px] bg-zinc-800 my-1" />
          <div className="px-3 py-1 flex items-center justify-between">
            <span className="text-zinc-400">Цвет фона слайда:</span>
            <input
              type="color"
              value={currentSlide?.bgColor || p.bg}
              onChange={(e) => {
                onUpdateSlide(currentSlide.id, { bgColor: e.target.value });
              }}
              className="w-5 h-5 rounded cursor-pointer border-0 p-0 overflow-hidden bg-transparent"
            />
          </div>
          <div className="h-[1px] bg-zinc-800 my-1" />
          <button
            onClick={() => {
              onAddSlide();
              setContextMenu(null);
            }}
            className="px-3 py-2 hover:bg-zinc-800 text-left flex items-center gap-2 text-emerald-400 transition-colors"
          >
            Добавить новый слайд
          </button>
          <button
            onClick={() => {
              onDuplicateSlide(currentSlide.id);
              setContextMenu(null);
            }}
            className="px-3 py-2 hover:bg-zinc-800 text-left flex items-center gap-2 text-violet-400 transition-colors"
          >
            <Copy className="w-3.5 h-3.5 inline" /> Продублировать слайд
          </button>
        </div>
      )}
      
      {formattingToolbar.visible && (
        <div
          className="fixed bg-zinc-900 border border-zinc-800 text-white rounded-xl shadow-2xl py-1.5 px-2 z-[9999] flex items-center gap-1.5 font-sans text-xs animate-fade-in no-drag select-none formatting-toolbar-btn"
          style={{
            top: `${formattingToolbar.y - 45}px`,
            left: `${formattingToolbar.x}px`,
            transform: "translateX(-50%)",
          }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.preventDefault()}
        >
          
          <button
            onClick={() => handleApplyFormat("highlight")}
            className="w-4 h-4 rounded-full border-2 border-violet-400 hover:scale-125 transition-transform cursor-pointer flex items-center justify-center"
            style={{ backgroundColor: p.accent }}
            title="Выделить цветом темы"
          >
            <Sparkles className="w-2.5 h-2.5 text-white/80" />
          </button>
          
          <div className="flex items-center gap-1">
            {[
              { name: "желтый", value: "#FCD34D" },
              { name: "зеленый", value: "#34D399" },
              { name: "розовый", value: "#F472B6" },
              { name: "красный", value: "#F87171" },
              { name: "голубой", value: "#60A5FA" },
            ].map((col) => (
              <button
                key={col.value}
                onClick={() => handleApplyFormat("highlight", col.value)}
                className="w-3.5 h-3.5 rounded-full border border-zinc-700 hover:scale-125 transition-transform cursor-pointer"
                style={{ backgroundColor: col.value }}
                title={`Выделить ${col.name} цветом`}
              />
            ))}
            
            <label className="w-3.5 h-3.5 rounded-full border border-zinc-700 hover:scale-125 transition-transform cursor-pointer flex items-center justify-center bg-zinc-800 text-[8px] font-bold text-zinc-400 relative overflow-hidden" title="Свой цвет">
              <span>+</span>
              <input
                type="color"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => handleApplyFormat("highlight", e.target.value)}
              />
            </label>
          </div>
          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
          <button
            onClick={() => handleApplyFormat("bold")}
            className="p-1 rounded hover:bg-zinc-800 text-[10px] transition-colors cursor-pointer"
          >
            <Bold className="w-3 h-3" />
          </button>
          <button
            onClick={() => handleApplyFormat("italic")}
            className="p-1 rounded hover:bg-zinc-800 text-[10px] transition-colors cursor-pointer"
          >
            <Italic className="w-3 h-3" />
          </button>
          <div className="w-[1px] h-4 bg-zinc-800 mx-1" />
          <button
            onClick={() => handleApplyFormat("unhighlight")}
            className="p-1 rounded hover:bg-rose-900/50 text-zinc-400 hover:text-rose-400 text-[10px] transition-colors cursor-pointer"
            title="Снять выделение"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
