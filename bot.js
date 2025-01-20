require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");

// Импортируем антиспам-логику
const { shouldSendError, markErrorSent } = require("./antispam");

// 1. Считываем токен и список ChatID из .env
const botToken = process.env.BOT_TOKEN;
const chatIdsEnv = process.env.CHAT_IDS;

// Проверяем наличие
if (!botToken) {
  throw new Error("BOT_TOKEN не найден в .env! Добавьте BOT_TOKEN=...");
}
if (!chatIdsEnv) {
  throw new Error(
    "CHAT_IDS не найдены в .env! Добавьте CHAT_IDS=12345,67890..."
  );
}

// Превращаем строку в массив чисел
const chatIds = chatIdsEnv
  .split(",")
  .map((id) => id.trim())
  .map(Number);

// Инициализируем бота
const bot = new Telegraf(botToken);

// Команда /start
bot.start((ctx) => {
  ctx.reply(
    "Добрый день! Я бот для уведомлений о сбоях в 1С.\n" +
      "Если 1С упадёт, я пришлю сообщение в этот чат (с антиспам-фильтром)."
  );
});

// Создаём Express-приложение
const app = express();
app.use(express.json());

// Эндпоинт /notifyError — вызывается при ошибке 1С
app.post("/notifyError", (req, res) => {
  const { message, error } = req.body || {};

  // Формируем текущую дату/время
  const now = new Date();
  const pad = (num) => String(num).padStart(2, "0");
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const formattedTime = `${day}.${month}.${year}, ${hours}:${minutes}:${seconds}`;

  // Извлекаем данные из ошибки
  const requestUrl = error?.config?.url || "Неизвестный URL";
  const method = error?.config?.method?.toUpperCase() || "Неизвестный метод";
  const statusCode = error?.response?.status || "Нет статуса";
  const statusText = error?.response?.statusText || "Нет текста статуса";
  const errorMessage =
    error?.message || error?.response?.data?.message || "Неизвестное сообщение";

  // Формируем сообщение для чата
  const textToSend = `
Ошибка при получении данных из 1С:
- Время: ${formattedTime}
- Запрос: ${requestUrl}
- Метод: ${method}
- Код ошибки: ${error?.code || "Нет кода ошибки"}
- Статус: ${statusCode} (${statusText})
- Сообщение: ${errorMessage}
`.trim();

  // Антиспам-проверка
  if (!shouldSendError(errorMessage)) {
    console.log("Повторная ошибка (антиспам) — не отправляем в Телеграм");
    return res.json({ success: true, skippedByAntiSpam: true });
  }

  // Если антиспам пропустил — шлём во все чаты
  chatIds.forEach((chatId) => {
    bot.telegram.sendMessage(chatId, textToSend).catch((err) => {
      console.error(`Не удалось отправить сообщение в чат ${chatId}:`, err);
    });
  });

  // Запоминаем время отправки
  markErrorSent(errorMessage);

  return res.json({ success: true });
});

// Запускаем бота
bot
  .launch()
  .then(() => {
    console.log("Бот успешно запущен!");
  })
  .catch((err) => {
    console.error("Ошибка при запуске бота:", err);
  });

// Запускаем сервер на порту 3001
app.listen(3001, "0.0.0.0", () => {
  console.log("Bot server listening on port 3001");
});

// Корректная остановка
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
