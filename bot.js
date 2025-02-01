const { default: axios } = require("axios");
const { Bot, Keyboard, InlineKeyboard } = require("grammy");
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);

// Path to users.json file
const usersFilePath = path.join(__dirname, 'json', 'users.json');

// Create json directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, 'json'))) {
  fs.mkdirSync(path.join(__dirname, 'json'));
}

// Function to read users data
function readUsers() {
  try {
    // Create users.json if it doesn't exist
    if (!fs.existsSync(usersFilePath)) {
      fs.writeFileSync(usersFilePath, '{}');
    }
    const data = fs.readFileSync(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading users data:', error);
    return {};
  }
}

// Function to write users data
function writeUsers(users) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
}

// Function to check if user is registered
function isUserRegistered(userId) {
  try {
    const users = readUsers();
    return Boolean(users[userId] && users[userId].step === registrationSteps.completed);
  } catch (error) {
    console.error('Error checking user registration:', error);
    return false;
  }
}

// Function to update user data
function updateUser(userId, data) {
  const users = readUsers();
  users[userId] = { ...users[userId], ...data };
  writeUsers(users);
}

// Simulated database (replace with actual database in production)
const services = {
  "УЗИ": [
    { name: "Клиника А", price: 100000, location: "ул. Примерная, 1", contact: "+998 90 123 45 67" },
    { name: "Клиника Б", price: 120000, location: "ул. Образцовая, 2", contact: "+998 90 234 56 78" },
    { name: "Клиника В", price: 90000, location: "ул. Тестовая, 3", contact: "+998 90 345 67 89" },
  ],
  "Анализ крови": [
    { name: "Лаборатория X", price: 50000, location: "пр. Медицинский, 10", contact: "+998 90 987 65 43" },
    { name: "Лаборатория Y", price: 60000, location: "ул. Здоровья, 5", contact: "+998 90 876 54 32" },
  ],
};

const districts = ["Chilanzar", "Yunusabad", "Mirabad", "Yakkasaray", "Shaykhantaur", "Almazar", "Sergeli", "Bektemir", "Mirzo Ulugbek", "Uchtepa"];

let userLanguage = {};

const registrationSteps = {
  phone: "phone",
  location: "location",
  completed: "completed"
};

const messages = {
  ru: {
    welcome: "Добро пожаловать в TibXizmat Bot! Выберите действие:",
    selectDistrict: "Выберите район:",
    districtSelected: "Вы выбрали район {district}. Теперь введите название медицинской услуги:",
    serviceNotFound: "Извините, информация о данной услуге не найдена.",
    helpMessage: `
Доступные команды:
/start - Запуск бота
/help - Справка по доступным командам
/price [название_услуги] - Получение текущей цены
/catalog - Получение цен от дешевых к дорогим и локации
/language - Изменить язык
    `,
    languageChanged: "Язык изменен на русский.",
    unknownCommand: "Извините, я не понимаю эту команду. Используйте /help для списка доступных команд.",
    chooseLanguage: "Выберите язык / Tilni tanlang:",
  },
  uz: {
    welcome: "TibXizmat Botga xush kelibsiz! Harakatni tanlang:",
    selectDistrict: "Tumanni tanlang:",
    districtSelected: "Siz {district} tumanni tanladingiz. Endi tibbiy xizmat nomini kiriting:",
    serviceNotFound: "Kechirasiz, bu xizmat haqida ma'lumot topilmadi.",
    helpMessage: `
Mavjud buyruqlar:
/start - Botni ishga tushirish
/help - Mavjud buyruqlar bo'yicha yordam
/price [xizmat_nomi] - Joriy narxni olish
/catalog - Arzondan qimmatgacha narxlar va joylashuv ma'lumotlarini olish
/language - Tilni o'zgartirish
    `,
    languageChanged: "Til o'zbekchaga o'zgartirildi.",
    unknownCommand: "Kechirasiz, men bu buyruqni tushunmayman. Mavjud buyruqlar ro'yxati uchun /help dan foydalaning.",
    chooseLanguage: "Выберите язык / Tilni tanlang:",
  }
};

function getMessage(ctx, key) {
  const lang = userLanguage[ctx.from.id] || 'ru';
  return messages[lang][key];
}

// Asosiy menu funksiyasi
function showMainMenu(ctx) {
  const keyboard = new Keyboard()
    .text(getMessage(ctx, "selectDistrict"))
    .text("/catalog")
    .row()
    .text("/help")
    .text("/language")
    .resized();
  
  return ctx.reply(getMessage(ctx, "welcome"), { reply_markup: keyboard });
}

bot.command("start", async (ctx) => {
  const users = readUsers();
  const userId = ctx.from.id.toString();

  // Avval foydalanuvchi ro'yxatdan o'tganligini tekshirish
  if (isUserRegistered(userId)) {
    const keyboard = new Keyboard()
      .text(getMessage(ctx, "selectDistrict"))
      .text("/catalog")
      .row()
      .text("/help")
      .text("/language")
      .resized();
    await ctx.reply(getMessage(ctx, "welcome"), { reply_markup: keyboard });
    return; // Funksiyadan chiqish
  }

  // Agar foydalanuvchi ro'yxatdan o'tmagan bo'lsa
  const userData = users[userId] || {};
  
  // Faqat boshlang'ich ro'yxatdan o'tish holati uchun
  if (!userData.step) {
    updateUser(userId, { step: registrationSteps.phone });
    const keyboard = new Keyboard()
      .requestContact("Share your phone number")
      .resized();
    await ctx.reply("Please share your phone number:", { reply_markup: keyboard });
  }
  // Agar ro'yxatdan o'tish jarayonida bo'lsa, hech narsa qilmaslik
});

bot.command("language", async (ctx) => {
  const keyboard = new InlineKeyboard()
    .text("Русский", "lang_ru")
    .text("O'zbek", "lang_uz");
  
  await ctx.reply(getMessage(ctx, "chooseLanguage"), {
    reply_markup: keyboard
  });
});

bot.callbackQuery(/^lang_/, async (ctx) => {
  const lang = ctx.callbackQuery.data.split('_')[1];
  userLanguage[ctx.from.id] = lang;
  await ctx.answerCallbackQuery();
  await ctx.reply(getMessage(ctx, "languageChanged"));
});

bot.hears(getMessage({from:{id:0}}, "selectDistrict"), async (ctx) => {
  const keyboard = Keyboard.from(districts.map(district => [district])).resized();
  await ctx.reply(getMessage(ctx, "selectDistrict"), { reply_markup: keyboard });
});

districts.forEach(district => {
  bot.hears(district, async (ctx) => {
    await ctx.reply(getMessage(ctx, "districtSelected").replace("{district}", district));
  });
});

bot.command("help", (ctx) => {
  ctx.reply(getMessage(ctx, "helpMessage"));
});

bot.command("price", async (ctx) => {
  const service = ctx.message.text.split(" ").slice(1).join(" ");
  if (!service || !services[service]) {
    return ctx.reply(getMessage(ctx, "serviceNotFound"));
  }
  
  const serviceInfo = services[service].map(clinic => 
    `${clinic.name}: ${clinic.price} сум\nАдрес: ${clinic.location}\nКонтакт: ${clinic.contact}`
  ).join("\n\n");
  
  await ctx.reply(`Цены на ${service}:\n\n${serviceInfo}`);
});

bot.command("catalog", async (ctx) => {
  let catalog = Object.entries(services).flatMap(([service, clinics]) => 
    clinics.map(clinic => ({ service, ...clinic }))
  );
  
  catalog.sort((a, b) => a.price - b.price);
  
  const catalogInfo = catalog.map(item => 
    `${item.service} - ${item.name}: ${item.price} сум\nАдрес: ${item.location}\nКонтакт: ${item.contact}`
  ).join("\n\n");
  
  await ctx.reply(`Каталог услуг (от дешевых к дорогим):\n\n${catalogInfo}`);
});

bot.on("message", async (ctx) => {
  const users = readUsers();
  const userId = ctx.from.id.toString();
  const userData = users[userId] || {};

  if (!isUserRegistered(userId)) {
    if (ctx.message.contact && userData.step === registrationSteps.phone) {
      updateUser(userId, {
        phone: ctx.message.contact.phone_number,
        step: registrationSteps.location
      });
      const keyboard = new Keyboard()
        .requestLocation("Share your location")
        .resized();
      await ctx.reply("Please share your location:", { reply_markup: keyboard });
    } else if (ctx.message.location && userData.step === registrationSteps.location) {
      // Avval userning ma'lumotlarini saqlash
      updateUser(userId, {
        location: ctx.message.location,
        step: registrationSteps.completed
      });
      
      // So'ng asosiy menu klaviaturasini yaratish
      const mainMenuKeyboard = new Keyboard()
        .text(getMessage(ctx, "selectDistrict"))
        .text("/catalog")
        .row()
        .text("/help")
        .text("/language")
        .resized();
      
      // Ro'yxatdan o'tish yakunlangani haqida xabar
      await ctx.reply("✅ Ro'yxatdan o'tish muvaffaqiyatli yakunlandi!", {
        reply_markup: mainMenuKeyboard
      });
      
      // Xush kelibsiz xabari
      await ctx.reply(getMessage(ctx, "welcome"), {
        reply_markup: mainMenuKeyboard
      });
    }
  } else if (!ctx.message.contact && !ctx.message.location) {
    const text = ctx.message.text;
    if (text && !text.startsWith('/') && 
        !districts.includes(text) && 
        text !== getMessage(ctx, "selectDistrict")) {
      ctx.reply(getMessage(ctx, "unknownCommand"));
    }
  }
});

bot.start();