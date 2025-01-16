require("dotenv").config(); // Подключаем dotenv в самом начале
const { Telegraf } = require("telegraf");

// Читаем токен из .env
const botToken = process.env.BOT_TOKEN;

if (!botToken) {
  throw new Error(
    "BOT_TOKEN не найден в .env! Проверьте, что .env существует и там прописан BOT_TOKEN="
  );
}

// Инициализируем бота
const bot = new Telegraf(botToken);

// Обработчик команды /start
bot.start((ctx) => {
  ctx.reply("Привет! Я бот МосОблЭнерго для мониторинга 1С.");
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

// Корректная остановка бота при SIGINT/SIGTERM
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
