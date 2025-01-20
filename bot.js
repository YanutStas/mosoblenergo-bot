require("dotenv").config();
const express = require("express");
const { Telegraf } = require("telegraf");

// ----- Антиспам кэш -----
const recentErrors = {}; // { [errorText: string]: number } — время (timestamp) последней отправки
// const CACHE_MINUTES = 30;
const CACHE_MINUTES = 10 / 60; // = 0.1666... ~ 10 секунд

/**
 * Проверяем, можно ли отправить эту ошибку (нет ли антиспама)
 * @param {string} errorText
 * @returns {boolean} true, если нужно отправить
 */
function shouldSendError(errorText) {
  const now = Date.now();
  if (!recentErrors[errorText]) {
    // Ещё не отправляли такую ошибку
    return true;
  }
  const lastTime = recentErrors[errorText];
  const diffMinutes = (now - lastTime) / 1000 / 60;
  // Разрешаем снова отправлять, если прошло больше CACHE_MINUTES
  return diffMinutes > CACHE_MINUTES;
}

/**
 * Фиксируем время отправки ошибки (чтобы не спамить повторно)
 * @param {string} errorText
 */
function markErrorSent(errorText) {
  recentErrors[errorText] = Date.now();
}

// -----------------------------------------------

// 1. Считываем токен и список ChatID из .env
const botToken = process.env.BOT_TOKEN;
const chatIdsEnv = process.env.CHAT_IDS;

// Проверяем наличие
if (!botToken) {
  throw new Error("BOT_TOKEN не найден в .env! Добавьте BOT_TOKEN=...");
}
if (!chatIdsEnv) {
  throw new Error(
    "CHAT_IDS не найдены в .env! Добавьте CHAT_IDS=630763354,12345,..."
  );
}

// 2. Превращаем строку в массив чисел
const chatIds = chatIdsEnv
  .split(",")
  .map((id) => id.trim())
  .map((id) => Number(id));

// Инициализируем бота Telegraf
const bot = new Telegraf(botToken);

// Команда /start (чисто для проверки бота)
bot.start((ctx) => {
  ctx.reply(
    "Добрый день! Я бот для уведомлений о сбоях в 1С.\n" +
      "Если 1С упадёт, я пришлю сообщение в этот чат (с антиспам-фильтром)."
  );
});

// Поднимаем Express для /notifyError
const app = express();
app.use(express.json());

// Эндпоинт для уведомления об ошибке 1С
app.post("/notifyError", (req, res) => {
  const { message } = req.body || {};

  // Текущее время в удобном формате
  const now = new Date();
  const pad = (num) => String(num).padStart(2, "0");
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  const formattedTime = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}.${ms}`;

  // Если в body пришло message, используем его, иначе — "Неизвестная ошибка".
  const errorText = message || "Неизвестная ошибка.";

  // Формируем сообщение для Телеграм
  const textToSend =
    `Ошибка в 1С:\n` + `Время: ${formattedTime}\n` + `Описание: ${errorText}`;

  // ---- Антиспам-проверка ----
  if (!shouldSendError(errorText)) {
    console.log("Повторная ошибка (антиспам) — не отправляем в Телеграм");
    return res.json({ success: true, skippedByAntiSpam: true });
  }

  // Рассылаем сообщение всем ChatID из массива
  chatIds.forEach((id) => {
    bot.telegram.sendMessage(id, textToSend).catch((err) => {
      console.error(`Не удалось отправить сообщение в чат ${id}:`, err);
    });
  });

  // Отмечаем, что мы отправили эту ошибку (запоминаем время)
  markErrorSent(errorText);

  // Возвращаем ответ
  return res.json({ success: true });
});

// Запуск бота
bot
  .launch()
  .then(() => {
    console.log("Бот успешно запущен!");
  })
  .catch((err) => {
    console.error("Ошибка при запуске бота:", err);
  });

// Слушаем порт 3001
app.listen(3001, "0.0.0.0", () => {
  console.log("Bot server listening on port 3001");
});

// Корректная остановка
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));

// require("dotenv").config();
// const express = require("express");
// const { Telegraf } = require("telegraf");

// // 1. Считываем токен и список ChatID из .env
// const botToken = process.env.BOT_TOKEN;
// const chatIdsEnv = process.env.CHAT_IDS;

// // Проверяем наличие
// if (!botToken) {
//   throw new Error("BOT_TOKEN не найден в .env! Добавьте BOT_TOKEN=...");
// }
// if (!chatIdsEnv) {
//   throw new Error(
//     "CHAT_IDS не найдены в .env! Добавьте CHAT_IDS=630763354,12345,..."
//   );
// }

// // 2. Превращаем строку в массив чисел
// // Например, "630763354,111111111" → ["630763354","111111111"] → [630763354,111111111]
// const chatIds = chatIdsEnv
//   .split(",")
//   .map((id) => id.trim())
//   .map((id) => Number(id));

// // Инициализируем бота Telegraf
// const bot = new Telegraf(botToken);

// // Команда /start (чисто для проверки живости)
// bot.start((ctx) => {
//   ctx.reply(
//     "Добрый день! Я бот для уведомлений о сбоях в 1С.\nПадение 1С будет автоматически зафиксировано и прислано в этот чат."
//   );
// });

// // Поднимаем Express для /notifyError
// const app = express();
// app.use(express.json());

// // Эндпоинт для уведомления об ошибке 1С
// app.post("/notifyError", (req, res) => {
//   // Что угодно прилетит в body.message — бэкенд там напишет "502 Bad Gateway"
//   // или "Timeout connecting to 1C" и т.д.
//   const { message } = req.body || {};

//   // Получаем дату в удобном формате: DD.MM.YYYY HH:mm:ss
//   const now = new Date();
//   const pad = (num) => String(num).padStart(2, "0"); // вспомогательная функция для нуля впереди
//   const day = pad(now.getDate());
//   const month = pad(now.getMonth() + 1);
//   const year = now.getFullYear();
//   const hours = pad(now.getHours());
//   const minutes = pad(now.getMinutes());
//   const seconds = pad(now.getSeconds());
//   const ms = String(now.getMilliseconds()).padStart(3, "0"); // чтобы и миллисекунды показать

//   const formattedTime = `${day}.${month}.${year} ${hours}:${minutes}:${seconds}.${ms}`;

//   // Собираем более формальный текст
//   const textToSend = message
//     ? `Ошибка в 1С:\nВремя: ${formattedTime}\nОписание: ${message}`
//     : `Ошибка в 1С:\nВремя: ${formattedTime}\nОписание: Неизвестная ошибка.`;

//   // Рассылаем сообщение всем ChatID из массива
//   chatIds.forEach((id) => {
//     bot.telegram.sendMessage(id, textToSend).catch((err) => {
//       console.error(`Не удалось отправить сообщение в чат ${id}:`, err);
//     });
//   });

//   // Возвращаем ответ
//   return res.json({ success: true });
// });

// // Запуск бота
// bot
//   .launch()
//   .then(() => {
//     console.log("Бот успешно запущен!");
//   })
//   .catch((err) => {
//     console.error("Ошибка при запуске бота:", err);
//   });

// // Слушаем порт 3001
// app.listen(3001, "0.0.0.0", () => {
//   console.log("Bot server listening on port 3001");
// });

// // Корректная остановка
// process.once("SIGINT", () => bot.stop("SIGINT"));
// process.once("SIGTERM", () => bot.stop("SIGTERM"));

// require("dotenv").config();
// const express = require("express");
// const { Telegraf } = require("telegraf");

// const botToken = process.env.BOT_TOKEN;
// const chatId = process.env.MY_CHAT_ID; // ← Жёстко прописали

// if (!botToken) {
//   throw new Error("BOT_TOKEN не найден в .env!");
// }
// if (!chatId) {
//   throw new Error("MY_CHAT_ID не задан в .env!");
// }

// // Инициализируем бота
// const bot = new Telegraf(botToken);

// // (Можно оставить /start для теста)
// bot.start((ctx) => ctx.reply("Привет, я бот для уведомлений о падении 1С!"));

// // Поднимаем Express
// const app = express();
// app.use(express.json());

// // Эндпоинт для уведомления об ошибке 1С
// app.post("/notifyError", (req, res) => {
//   const { message } = req.body || {};
//   // Рассылаем в один жёстко прописанный chatId
//   bot.telegram.sendMessage(chatId, message || "Ошибка в 1С!");
//   res.json({ success: true });
// });

// // Запуск бота
// bot.launch().then(() => {
//   console.log("Бот успешно запущен!");
// });

// // Слушаем порт 3001
// app.listen(3001, "0.0.0.0", () => {
//   console.log("Bot server listening on port 3001");
// });

// // Остановка
// process.once("SIGINT", () => bot.stop("SIGINT"));
// process.once("SIGTERM", () => bot.stop("SIGTERM"));

// require("dotenv").config();
// const { Telegraf } = require("telegraf");
// const fs = require("fs");
// const path = require("path");
// const express = require("express"); // Подключаем express для HTTP-эндпоинтов
// const app = express();
// app.use(express.json());

// // Читаем токен из .env
// const botToken = process.env.BOT_TOKEN;
// if (!botToken) {
//   throw new Error(
//     "BOT_TOKEN не найден в .env! Проверьте, что .env существует и там прописан BOT_TOKEN="
//   );
// }

// // Путь к файлу, где храним подписки
// const subscribersFilePath = path.join(__dirname, "subscribers.json");

// // Функция чтения подписчиков из файла
// function loadSubscribers() {
//   if (!fs.existsSync(subscribersFilePath)) {
//     // Файла нет — возвращаем пустой массив
//     return [];
//   }
//   try {
//     const data = fs.readFileSync(subscribersFilePath, "utf-8");
//     return JSON.parse(data);
//   } catch (err) {
//     console.error("Ошибка чтения файла подписчиков:", err);
//     return [];
//   }
// }

// // Функция сохранения подписчиков в файл
// function saveSubscribers(subscribers) {
//   try {
//     fs.writeFileSync(
//       subscribersFilePath,
//       JSON.stringify(subscribers, null, 2),
//       "utf-8"
//     );
//   } catch (err) {
//     console.error("Ошибка сохранения файла подписчиков:", err);
//   }
// }

// // Грузим подписчиков при старте бота
// let subscribers = loadSubscribers();

// // Инициализируем бота
// const bot = new Telegraf(botToken);

// // Обработчик команды /start
// bot.start((ctx) => {
//   ctx.reply(
//     "Привет! Я бот МосОблЭнерго для мониторинга 1С.\nНапиши /subscribe, чтобы подписаться на уведомления."
//   );
// });

// // Команда /subscribe
// bot.command("subscribe", (ctx) => {
//   const chatId = ctx.chat.id;
//   if (!subscribers.includes(chatId)) {
//     subscribers.push(chatId);
//     saveSubscribers(subscribers); // Сохраняем сразу
//     ctx.reply("Отлично! Теперь ты в списке подписчиков.");
//   } else {
//     ctx.reply("Ты уже подписан, дружище!");
//   }
// });

// // Команда /unsubscribe
// bot.command("unsubscribe", (ctx) => {
//   const chatId = ctx.chat.id;
//   if (subscribers.includes(chatId)) {
//     subscribers = subscribers.filter((id) => id !== chatId);
//     saveSubscribers(subscribers); // Сохраняем изменения
//     ctx.reply("Ты отписался. Теперь не будешь получать оповещения.");
//   } else {
//     ctx.reply(
//       "Тебя нет в списке подписчиков, так что и отписываться не от чего."
//     );
//   }
// });

// // (Опционально) Команда /listsubs — для дебага
// bot.command("listsubs", (ctx) => {
//   ctx.reply(
//     `Сейчас подписаны: ${subscribers.length} чат(ов):\n${subscribers.join(
//       ", "
//     )}`
//   );
// });

// // Эндпоинт для уведомления об ошибке 1С (бэкенд будет стучаться сюда)
// // POST http://5.35.9.42:3001/notifyError (или http://127.0.0.1:3001/notifyError, если локально)
// app.post("/notifyError", (req, res) => {
//   const { message } = req.body;
//   // Рассылаем всем подписчикам
//   subscribers.forEach((chatId) => {
//     bot.telegram.sendMessage(chatId, message || "Произошла ошибка в 1С!");
//   });
//   res.status(200).json({ success: true });
// });

// // Запускаем бота
// bot
//   .launch()
//   .then(() => {
//     console.log("Бот успешно запущен!");
//   })
//   .catch((err) => {
//     console.error("Ошибка при запуске бота:", err);
//   });

// // Запускаем http-сервер на порту 3001
// app.listen(3001, () => {
//   console.log("Bot server listening on port 3001");
// });

// // Корректная остановка бота при SIGINT/SIGTERM
// process.once("SIGINT", () => bot.stop("SIGINT"));
// process.once("SIGTERM", () => bot.stop("SIGTERM"));

// require("dotenv").config();
// const { Telegraf } = require("telegraf");
// const fs = require("fs");
// const path = require("path");

// // Читаем токен из .env
// const botToken = process.env.BOT_TOKEN;
// if (!botToken) {
//   throw new Error(
//     "BOT_TOKEN не найден в .env! Проверьте, что .env существует и там прописан BOT_TOKEN="
//   );
// }

// // Путь к файлу, где храним подписки
// const subscribersFilePath = path.join(__dirname, "subscribers.json");

// // Функция чтения подписчиков из файла
// function loadSubscribers() {
//   if (!fs.existsSync(subscribersFilePath)) {
//     // Файла нет — возвращаем пустой массив
//     return [];
//   }
//   try {
//     const data = fs.readFileSync(subscribersFilePath, "utf-8");
//     return JSON.parse(data);
//   } catch (err) {
//     console.error("Ошибка чтения файла подписчиков:", err);
//     return [];
//   }
// }

// // Функция сохранения подписчиков в файл
// function saveSubscribers(subscribers) {
//   try {
//     fs.writeFileSync(
//       subscribersFilePath,
//       JSON.stringify(subscribers, null, 2),
//       "utf-8"
//     );
//   } catch (err) {
//     console.error("Ошибка сохранения файла подписчиков:", err);
//   }
// }

// // Грузим подписчиков при старте бота
// let subscribers = loadSubscribers();

// // Инициализируем бота
// const bot = new Telegraf(botToken);

// // Обработчик команды /start
// bot.start((ctx) => {
//   ctx.reply(
//     "Привет! Я бот МосОблЭнерго для мониторинга 1С.\nНапиши /subscribe, чтобы подписаться на уведомления."
//   );
// });

// // Команда /subscribe
// bot.command("subscribe", (ctx) => {
//   const chatId = ctx.chat.id;
//   if (!subscribers.includes(chatId)) {
//     subscribers.push(chatId);
//     saveSubscribers(subscribers); // Сохраняем сразу
//     ctx.reply("Отлично! Теперь ты в списке подписчиков.");
//   } else {
//     ctx.reply("Ты уже подписан, дружище!");
//   }
// });

// // Команда /unsubscribe
// bot.command("unsubscribe", (ctx) => {
//   const chatId = ctx.chat.id;
//   if (subscribers.includes(chatId)) {
//     subscribers = subscribers.filter((id) => id !== chatId);
//     saveSubscribers(subscribers); // Сохраняем изменения
//     ctx.reply("Ты отписался. Теперь не будешь получать оповещения.");
//   } else {
//     ctx.reply(
//       "Тебя нет в списке подписчиков, так что и отписываться не от чего."
//     );
//   }
// });

// // (Опционально) /listsubs — для дебага
// bot.command("listsubs", (ctx) => {
//   ctx.reply(
//     `Сейчас подписаны: ${subscribers.length} чат(ов):\n${subscribers.join(
//       ", "
//     )}`
//   );
// });

// // Запускаем бота
// bot
//   .launch()
//   .then(() => console.log("Бот успешно запущен!"))
//   .catch((err) => console.error("Ошибка при запуске бота:", err));

// // Корректная остановка бота при SIGINT/SIGTERM
// process.once("SIGINT", () => bot.stop("SIGINT"));
// process.once("SIGTERM", () => bot.stop("SIGTERM"));

// require("dotenv").config();
// const { Telegraf } = require("telegraf");

// // Читаем токен из .env
// const botToken = process.env.BOT_TOKEN;

// if (!botToken) {
//   throw new Error(
//     "BOT_TOKEN не найден в .env! Проверьте, что .env существует и там прописан BOT_TOKEN="
//   );
// }

// // Инициализируем бота
// const bot = new Telegraf(botToken);

// // Обработчик команды /start
// bot.start((ctx) => {
//   ctx.reply("Привет! Я бот МосОблЭнерго для мониторинга 1С.");
// });

// // Запускаем бота
// bot
//   .launch()
//   .then(() => {
//     console.log("Бот успешно запущен!");
//   })
//   .catch((err) => {
//     console.error("Ошибка при запуске бота:", err);
//   });

// // Корректная остановка бота при SIGINT/SIGTERM
// process.once("SIGINT", () => bot.stop("SIGINT"));
// process.once("SIGTERM", () => bot.stop("SIGTERM"));
