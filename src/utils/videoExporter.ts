import { CarouselConfig, getRatioDimensions } from "../types";
import { toJpeg } from "html-to-image";
const imageCache = new Map<string, HTMLImageElement>();
export function loadCachedImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) {
    return Promise.resolve(imageCache.get(src)!);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("Ошибка загрузки изображения: " + src));
    img.src = src;
  });
}
export async function exportCarouselToJpg(config: CarouselConfig): Promise<string[]> {
  const images: string[] = [];
  const dims = getRatioDimensions(config.ratio);
  try {
    await document.fonts.ready;
  } catch (e) {
    console.warn("document.fonts.ready failed or unsupported:", e);
  }
  for (let i = 0; i < config.slides.length; i++) {
    const el = document.getElementById(`export-slide-${i}`);
    if (!el) {
      throw new Error(`Слайд для экспорта с ID export-slide-${i} не найден в DOM!`);
    }
    const dataUrl = await toJpeg(el, {
      quality: 0.95,
      width: dims.exportW,
      height: dims.exportH,
      pixelRatio: 1,
      style: {
        position: 'absolute',
        top: '0',
        left: '0',
        margin: '0',
        transform: 'none',
      }
    });
    images.push(dataUrl);
  }
  return images;
}
export async function exportCarouselToMp4(
  config: CarouselConfig,
  progressCallback: (prog: number) => void
): Promise<Blob> {
  const dims = getRatioDimensions(config.ratio);
  const width = dims.exportW;
  const height = dims.exportH;
  const fps = 30;
  try {
    await document.fonts.ready;
  } catch (e) {
    console.warn("document.fonts.ready failed or unsupported:", e);
  }
  const dataUrls = await exportCarouselToJpg(config);
  const slideImages: HTMLImageElement[] = [];
  for (const url of dataUrls) {
    const img = await loadCachedImage(url);
    slideImages.push(img);
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2D context");
  const slideDuration = config.slideDuration || 3;
  const transitionDuration = config.transitionDuration || 0.6;
  const numSlides = config.slides.length;
  const totalDuration = (numSlides * slideDuration) + ((numSlides - 1) * transitionDuration);
  const totalFrames = Math.ceil(totalDuration * fps);
  const stream = canvas.captureStream(fps);
  let options = { mimeType: "video/webm;codecs=vp9,opus" };
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: "video/webm;codecs=vp8,opus" };
  }
  if (!MediaRecorder.isTypeSupported(options.mimeType)) {
    options = { mimeType: "video/webm" };
  }
  const recordedChunks: Blob[] = [];
  const recorder = new MediaRecorder(stream, options);
  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };
  const recordingPromise = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      resolve(blob);
    };
    recorder.onerror = (e) => reject(e);
  });
  recorder.start();
  const startTime = performance.now();
  for (let frameNum = 0; frameNum < totalFrames; frameNum++) {
    const sec = frameNum / fps;
    ctx.clearRect(0, 0, width, height);
    const stageDuration = slideDuration + transitionDuration;
    let slideIdx = Math.floor(sec / stageDuration);
    if (slideIdx >= numSlides) {
      slideIdx = numSlides - 1;
    }
    const stageStart = slideIdx * stageDuration;
    const stageTransitionStart = stageStart + slideDuration;
    if (sec < stageTransitionStart || slideIdx === numSlides - 1) {
      ctx.drawImage(slideImages[slideIdx], 0, 0, width, height);
    } else {
      const localTransSec = sec - stageTransitionStart;
      const progress = Math.min(1, localTransSec / transitionDuration);
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const offsetX1 = -easeProgress * width;
      const offsetX2 = (1 - easeProgress) * width;
      ctx.drawImage(slideImages[slideIdx], offsetX1, 0, width, height);
      ctx.drawImage(slideImages[slideIdx + 1], offsetX2, 0, width, height);
    }
    progressCallback(Math.round((frameNum / totalFrames) * 100));
    const expectedElapsed = (frameNum + 1) * (1000 / fps);
    const actualElapsed = performance.now() - startTime;
    const sleepTime = expectedElapsed - actualElapsed;
    if (sleepTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    } else {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
  recorder.stop();
  return recordingPromise;
}
