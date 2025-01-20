// const { Telegraf } = require("telegraf");
// const fs = require("fs");
// const path = require("path");

// // Путь к файлу, где храним подписки
// const subscribersFilePath = path.join(__dirname, "subscribers.json");

// // Функция чтения подписчиков из файла
// function loadSubscribers() {
//   if (!fs.existsSync(subscribersFilePath)) {
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

// // Загружаем подписчиков при старте
// let subscribers = loadSubscribers();

// /**
//  * Создаём и настраиваем бот Telegraf
//  * @param {string} botToken – токен бота
//  */
// function createBot(botToken) {
//   // Инициализируем бота
//   const bot = new Telegraf(botToken);

//   // /start
//   bot.start((ctx) => {
//     ctx.reply(
//       "Привет! Я бот МосОблЭнерго для мониторинга 1С.\nНапиши /subscribe, чтобы подписаться на уведомления."
//     );
//   });

//   // /subscribe
//   bot.command("subscribe", (ctx) => {
//     const chatId = ctx.chat.id;
//     if (!subscribers.includes(chatId)) {
//       subscribers.push(chatId);
//       saveSubscribers(subscribers);
//       ctx.reply("Отлично! Теперь ты в списке подписчиков.");
//     } else {
//       ctx.reply("Ты уже подписан, дружище!");
//     }
//   });

//   // /unsubscribe
//   bot.command("unsubscribe", (ctx) => {
//     const chatId = ctx.chat.id;
//     if (subscribers.includes(chatId)) {
//       subscribers = subscribers.filter((id) => id !== chatId);
//       saveSubscribers(subscribers);
//       ctx.reply("Ты отписался. Теперь не будешь получать оповещения.");
//     } else {
//       ctx.reply("Тебя нет в списке подписчиков, так что и отписываться не от чего.");
//     }
//   });

//   // /listsubs (для дебага)
//   bot.command("listsubs", (ctx) => {
//     ctx.reply(
//       `Сейчас подписаны: ${subscribers.length} чат(ов):\n${subscribers.join(", ")}`
//     );
//   });

//   return bot;
// }

// /**
//  * Уведомляем всех подписчиков
//  * @param {Telegraf} bot – объект бота
//  * @param {string} message – текст сообщения
//  */
// function notifyAll(bot, message) {
//   subscribers.forEach((chatId) => {
//     bot.telegram.sendMessage(chatId, message);
//   });
// }

// module.exports = {
//   createBot,
//   notifyAll
// };
