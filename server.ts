import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Нам больше не нужно принудительно городить ESM-деривативы, так как esbuild скомпилирует этот код в CJS.
// Если в рантайме __dirname отсутствует (что бывает в чистом ESM), мы можем изящно подстраховаться:
const currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Инициализация Gemini API с учетом требований User-Agent и SDK @google/genai
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Эндпоинт для генерации вовлекающих текстов (хуков) для каруселей тиктока
  app.post("/api/generate-hooks", async (req, res) => {
    try {
      const { title, genre, description } = req.body;

      if (!title || !genre) {
        return res.status(400).json({ error: "Title and genre are required" });
      }

      const prompt = `
  Вы — эксперт по маркетингу книг в TikTok (BookTok). Ваша цель — создать сценарии для каруселей (carousel) из 2-3 слайдов, которые заставят читателя мгновенно захотеть купить книгу "${title}" (жанр: ${genre}).
  Описание книги: ${description || "Сюжет не указан, придумайте яркие интригующие детали на основе названия и жанра"}

  Пожалуйста, предложите 2-3 совершенно разных варианта каруселей. Каждый вариант должен состоять строго из 3 слайдов:
  1. Слайд 1 (Хук/Крючок): Короткая, шокирующая или супер-эмоциональная фраза, которая заставит человека остановиться при пролистывании ленты.
  2. Слайд 2 (Интрига/Контекст): Раскрытие конфликта, горячая цитата (можно придумать в духе жанра), мем, или драматическая тропа (например: "от ненависти до любви", "он — опасный мафиози").
  3. Слайд 3 (Кульминация + Призыв): Шокирующий обрыв на самом интересном или призыв к чтению (Call To Action).

  Ответьте СТРОГО в формате JSON. Не пишите никаких других слов до или после JSON.
  JSON должен иметь следующую структуру:
  {
    "variants": [
      {
        "id": 1,
        "style": "Концептуальный / Романтичный / Тревожный",
        "slides": [
          {
            "hook": "Текст Хука для первого слайда",
            "body": "Дополнительный цепляющий короткий текст"
          },
          {
            "hook": "Текст для второго слайда",
            "body": "Главная интрига или троп"
          },
          {
            "hook": "Текст для третьего слайда",
            "body": "Призыв к действию: Читайте в книге..."
          }
        ]
      }
    ]
  }
  `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const text = response.text || "";
      // Извлечем чистый JSON, если модель вернула markdown c блоками кода
      let cleanJson = text.trim();
      if (cleanJson.startsWith("```")) {
        cleanJson = cleanJson.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
      }

      const data = JSON.parse(cleanJson);
      res.json(data);
    } catch (error: any) {
      console.error("Gemini Hook Generation Error:", error);
      res.status(500).json({ error: error?.message || "Internal Server Error" });
    }
  });

  // Vite middleware для разработки (под капотом функции, поэтому в CJS компилируется без проблем)
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Для продакшена обслуживаем статические файлы из папки dist
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start fullstack server:", err);
});
