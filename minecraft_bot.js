const express = require('express');
const mineflayer = require("mineflayer");
const readline = require("readline");
const TelegramBot = require("node-telegram-bot-api");
const keep_alive = require("./keep_alive.js");

const telegramToken = "7761808957:AAHWh_RW1n2YWH87dIWJr6LKZt-StG7NZ3Y"; // Ваш токен Telegram бота
const chatId = "768254793"; // Ваш ID чата

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let chatEnabled = true;
let botInstance = null;

const app = express();
const port = process.env.PORT || 8080; // Используем переменную окружения PORT

// Запускаем сервер Express
app.get('/', (req, res) => {
  res.send('Minecraft Telegram Bot работает!'); // Сообщение при доступе к корневому маршруту
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Сервер запущен на порту ${port}`); // Логируем, что сервер запущен
});

// Функция для подключения к боту Minecraft
function connectBot() {
  botInstance = mineflayer.createBot({
    host: "prdx.so",
    port: 25565,
    username: "MrDanMIX",
    version: "1.21",
  });

  // Обработка сообщений в чате Minecraft
  botInstance.on("chat", (username, message) => {
    if (chatEnabled) {
      console.log(`${username}: ${message}`); // Логируем сообщение
      if (message && username !== botInstance.username) {
        sendMessageToTelegram(`<${username}>: ${message}`); // Отправляем сообщение в Telegram
      }
    }
  });

  // Обработка отключения бота
  botInstance.once("end", () => {
    console.log("Бот отключен, переподключение");
    setTimeout(connectBot, 12000000); // Переподключаем через 12 секунд
  });

  // Чтение ввода с клавиатуры и отправка в чат Minecraft
  rl.on("line", (input) => {
    if (botInstance) {
      botInstance.chat(input); // Отправляем введенное сообщение в чат Minecraft
    } else {
      console.log("Бот не запущен. Пожалуйста, запустите его с помощью команды /start_mc.");
    }
  });
}

// Функция для отправки сообщений в Telegram
function sendMessageToTelegram(message) {
  const telegramBot = new TelegramBot(telegramToken, { polling: true });
  telegramBot.sendMessage(chatId, message)
    .then(() => {
      console.log(`Сообщение отправлено в Telegram: ${message}`); // Логируем успешную отправку
    })
    .catch((err) => {
      console.error(`Ошибка при отправке сообщения в Telegram: ${err.message}`); // Логируем ошибку
    });
}

// Обработка команд от Telegram
function handleTelegramCommands() {
  const telegramBot = new TelegramBot(telegramToken, { polling: true });

  telegramBot.onText(/\/status/, (msg) => {
    const chatId = msg.chat.id;
    if (botInstance) {
      const { x, y, z } = botInstance.entity.position;
      const health = botInstance.health;
      const food = botInstance.food;
      telegramBot.sendMessage(chatId, `Координаты: X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}\nЗдоровье: ${health}\nЕда: ${food}`);
    } else {
      telegramBot.sendMessage(chatId, "Бот Minecraft не запущен. Пожалуйста, запустите его с помощью команды /start_mc.");
    }
  });

  // Команда для запуска бота Minecraft
  telegramBot.onText(/\/start_mc/, (msg) => {
    const chatId = msg.chat.id;
    if (!botInstance) {
      connectBot();
      telegramBot.sendMessage(chatId, "Minecraft бот запущен!"); // Сообщение о запуске бота
    } else {
      telegramBot.sendMessage(chatId, "Minecraft бот уже запущен."); // Сообщение, если бот уже запущен
    }
  });

  // Команда для остановки бота Minecraft
  telegramBot.onText(/\/stop_mc/, (msg) => {
    const chatId = msg.chat.id;
    if (botInstance) {
      botInstance.quit(); // Отключаем бота
      botInstance = null;
      telegramBot.sendMessage(chatId, "Minecraft бот остановлен."); // Сообщение о остановке бота
    } else {
      telegramBot.sendMessage(chatId, "Minecraft бот не запущен."); // Сообщение, если бот не запущен
    }
  });

  telegramBot.onText(/\/chat-on/, (msg) => {
    chatEnabled = true;
    telegramBot.sendMessage(msg.chat.id, "Чат включен."); // Сообщение о включении чата
  });

  telegramBot.onText(/\/chat-off/, (msg) => {
    chatEnabled = false;
    telegramBot.sendMessage(msg.chat.id, "Чат отключен."); // Сообщение о отключении чата
  });

  // Обработка команды /say
  telegramBot.onText(/\/say (.+)/, (msg, match) => {
    const chatId = msg.chat.id;
    const message = match[1]; // Получаем сообщение после команды
    if (botInstance) {
      botInstance.chat(message); // Отправляем сообщение в чат Minecraft
      telegramBot.sendMessage(chatId, `Сообщение отправлено в Minecraft: "${message}"`); // Подтверждение отправки
    } else {
      telegramBot.sendMessage(chatId, "Minecraft бот не запущен. Пожалуйста, запустите его с помощью команды /start_mc.");
    }
  });
}

// Запуск обработки команд Telegram
handleTelegramCommands();
