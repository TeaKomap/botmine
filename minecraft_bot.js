const mineflayer = require("mineflayer");
const readline = require("readline");
const TelegramBot = require("node-telegram-bot-api");
const keep_alive = require("./keep_alive.js");

// Ваш токен Telegram бота и ID чата
const telegramToken = "7761808957:AAHWh_RW1n2YWH87dIWJr6LKZt-StG7NZ3Y";
const chatId = "768254793";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Переменные для управления состоянием
let chatEnabled = true;
let botInstance = null;

// Создаем экземпляр бота Telegram с Long Polling
const telegramBot = new TelegramBot(telegramToken, {
  polling: {
    interval: 3000,   // Интервал между запросами (3 секунды)
    autoStart: true,  // Автоматический старт polling
    params: {
      timeout: 10   // Тайм-аут запроса (10 секунд)
    }
  }
});

// Функция для отправки сообщений в Telegram
function sendMessageToTelegram(message) {
  telegramBot
    .sendMessage(chatId, message)
    .then(() => {
      console.log(`Сообщение отправлено в Telegram: ${message}`);
    })
    .catch((err) => {
      console.error(`Ошибка при отправке сообщения в Telegram: ${err.message}`);
    });
}

// Функция для обновления чата
function updateChat(logMessage) {
  console.log(logMessage); // Логируем сообщение в консоль
  sendMessageToTelegram(logMessage); // Отправляем сообщение в Telegram
}

// Функция для подключения бота
function connectBot() {
  botInstance = mineflayer.createBot({
    host: "prdx.so",
    port: 25565,
    username: "MrDanMIX",
    version: "1.21",
  });

  // Обработка сообщений в чате Minecraft
  botInstance.on("message", (message) => {
    const parsedMessage = parseMessage(message);
    const logMessage = `
[${parsedMessage.chatType}] ${parsedMessage.playerName}: ${parsedMessage.playerMessage}`;

    updateChat(logMessage); // Логируем парсированное сообщение
  });

  // Обработка отключения бота
  botInstance.once("end", () => {
    console.log("Бот отключен, переподключение через 120 секунд.");
    setTimeout(connectBot, 120000); // Переподключение через 120 секунд
    botInstance = null; // Устанавливаем botInstance в null, чтобы избежать конфликтов
  });

  // Чтение ввода с клавиатуры и отправка в чат Minecraft
  rl.on("line", (input) => {
    if (botInstance) {
      botInstance.chat(input);
    } else {
      console.log("Бот не запущен.");
    }
  });

  console.log("Бот подключен к Minecraft!");
}

// Функция для парсинга сообщений
function parseMessage(message) {
  try {
    console.log('Исходное сообщение:', JSON.stringify(message, null, 2)); // Логируем все сообщение

    if (!message.json) {
      console.warn('Нет json в сообщении:', JSON.stringify(message, null, 2));
      return {
        chatType: 'Неизвестно',
        playerName: 'Неизвестно',
        playerMessage: 'Неизвестно',
      };
    }

    // Обработка сообщений о присоединении и выходе игроков
    if (message.json.translate === "multiplayer.player.joined") {
      const playerName = message.json.with?.[0]?.text || 'Неизвестно';
      return {
        chatType: 'System',
        playerName: playerName,
        playerMessage: 'Игрок присоединился в игру',
      };
    }

    if (message.json.translate === "multiplayer.player.left") {
      const playerName = message.json.with?.[0]?.text || 'Неизвестно';
      return {
        chatType: 'System',
        playerName: playerName,
        playerMessage: 'Игрок вышел из игры',
      };
    }

    const extra = message.json.extra || [];
    console.log('Объект extra:', JSON.stringify(extra, null, 2)); // Логируем extra для анализа

    // Определяем тип чата (G |, D |, L |)
    const prefix = extra.find((item) => item.color && item.text);
    const messageType =
 prefix?.text || 'Unknown';
    let chatType = 'Неизвестно';
    if (messageType === 'D |') chatType = 'Discord';
    if (messageType === 'G |') chatType = 'Global';
    if (messageType === 'L |') chatType = 'Local';

    // Функция для рекурсивного извлечения текста ника
    function extractNick(extraArray) {
      let playerName = '';
      extraArray.forEach(item => {
        if (item.text && item.color === 'gray') {
          playerName += item.text.trim();  // Собираем имя игрока
        }
        // Рекурсивный вызов для вложенных объектов
        if (item.extra) {
          playerName += extractNick(item.extra);
        }
      });
      return playerName;
    }

    const playerName = extractNick(extra) || 'Неизвестно';
    console.log('Ник игрока:', playerName); // Логируем ник игрока

    // Игнорируем элементы с пустыми значениями (например, {"": " "})
    const messageParts = extra.filter((item) => item[""] !== undefined);
    console.log('Текстовые объекты (игнорируем пустые):', JSON.stringify(messageParts, null, 2)); // Логируем текстовые части

    // Извлекаем последний элемент, который содержит текст
    const playerMessage = messageParts.length > 0 ? messageParts[messageParts.length - 1][""]?.trim() : 'Неизвестно';

    return {
      chatType,
      playerName,
      playerMessage,
    };
  } catch (error) {
    console.error('Ошибка парсинга сообщения:', error.message);
    console.error('Детали сообщения:', JSON.stringify(message, null, 2));
    return {
      chatType: 'Ошибка',
      playerName: 'Ошибка',
      playerMessage: 'Ошибка',
    };
  }
}

// Функция для отправки сообщений в Telegram
function sendMessageToTelegram(message) {
  telegramBot
    .sendMessage(chatId, message)
    .then(() => {
      console.log(`Сообщение отправлено в Telegram: ${message}`);
    })
    .catch((err) => {
      console.error(`Ошибка при отправке сообщения в Telegram: ${err.message}`);
    });
}

// Функция для обработки команд от Telegram
function handleTelegramCommands() {
  telegramBot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    if (botInstance) {
      const { x, y, z } = botInstance.entity.position;
      const health = botInstance.health;
      const food = botInstance.food;
      telegramBot.sendMessage(
        chatId,
        `Координаты: X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}\nЗдоровье: ${health}\nЕда: ${food}`,
      );
    } else {
      telegramBot.sendMessage(chatId, "Minecraft бот не запущен. Пожалуйста, запустите его с помощью команды /start_mc.");
    }
  });

  // Команда для запуска бота Minecraft
  telegramBot.onText(/\/start_mc/, (msg) => {
    const chatId = msg.chat.id;
    if (!botInstance) {
      connectBot();
      telegramBot.sendMessage(chatId, "Minecraft бот запущен!");
    } else {
      telegramBot.sendMessage(chatId, "Minecraft бот уже запущен.");
    }
  });

  // Команда для остановки бота Minecraft
  telegramBot.onText(/\/stop_mc/, (msg) => {
    const chatId = msg.chat.id;
    if (botInstance) {
      botInstance.quit(); // Отключаем бота
      botInstance = null; // Устанавливаем botInstance в null
      telegramBot.sendMessage(chatId, "Minecraft бот остановлен.");
    } else {
      telegramBot.sendMessage(chatId, "Minecraft бот не запущен.");
    }
  });

  telegramBot.onText(/\/chat-on/, (msg) => {
    chatEnabled = true;
    telegramBot.sendMessage(msg.chat.id, "Чат включен.");
  });

  telegramBot.onText(/\/chat-off/, (msg) => {
    chatEnabled = false;
    telegramBot.sendMessage(msg.chat.id, "Чат отключен.");
  });

  // Обработка команды /say
  telegramBot.onText(/\/say (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const message = match[1]; // Получаем сообщение после команды
    if (botInstance) {
      botInstance.chat(message); // Отправляем сообщение в чат Minecraft
      telegramBot.sendMessage(chatId, `Сообщение отправлено в Minecraft: "${message}"`);
    } else {
      telegramBot.sendMessage(chatId, "Minecraft бот не запущен. Пожалуйста, запустите его с помощью команды /start_mc.");
    }
  });
}

// Запуск обработки команд Telegram
handleTelegramCommands();


