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

  const transitionDuration = config.transitionDuration || 0.6;
  const numSlides = config.slides.length;

  // Build per-slide durations array
  const slideDurations: number[] = config.slides.map((slide) => {
    if (!config.useUniformDuration && slide.slideDuration != null) {
      return slide.slideDuration;
    }
    return config.slideDuration || 3;
  });

  // Calculate cumulative segment boundaries
  // Timeline: [slide0_show] [transition0->1] [slide1_show] [transition1->2] [slide2_show] ...
  // segmentStarts[i] = time when slide i starts showing
  // segmentStarts[i] + slideDurations[i] = time when transition from i to i+1 starts
  const segmentStarts: number[] = [];
  let currentTime = 0;
  for (let i = 0; i < numSlides; i++) {
    segmentStarts.push(currentTime);
    currentTime += slideDurations[i];
    if (i < numSlides - 1) {
      currentTime += transitionDuration;
    }
  }
  const totalDuration = currentTime;
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

    // Find which slide/transition we're in using cumulative boundaries
    let slideIdx = numSlides - 1; // default to last slide
    let inTransition = false;
    let transProgress = 0;

    for (let i = 0; i < numSlides; i++) {
      const showEnd = segmentStarts[i] + slideDurations[i];
      if (sec < showEnd) {
        // We're showing slide i
        slideIdx = i;
        inTransition = false;
        break;
      }
      if (i < numSlides - 1) {
        const transEnd = showEnd + transitionDuration;
        if (sec < transEnd) {
          // We're in transition from slide i to slide i+1
          slideIdx = i;
          inTransition = true;
          transProgress = (sec - showEnd) / transitionDuration;
          break;
        }
      }
    }

    if (inTransition && slideIdx < numSlides - 1) {
      const easeProgress = transProgress < 0.5
        ? 2 * transProgress * transProgress
        : 1 - Math.pow(-2 * transProgress + 2, 2) / 2;
      const offsetX1 = -easeProgress * width;
      const offsetX2 = (1 - easeProgress) * width;
      ctx.drawImage(slideImages[slideIdx], offsetX1, 0, width, height);
      ctx.drawImage(slideImages[slideIdx + 1], offsetX2, 0, width, height);
    } else {
      ctx.drawImage(slideImages[slideIdx], 0, 0, width, height);
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
