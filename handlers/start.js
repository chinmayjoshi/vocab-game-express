// handlers/start.js
const { storeUser } = require("../database/fauna");

module.exports = async (ctx) => {
  console.log("Received /start command");
  try {
    // Store user information in FaunaDB
    await storeUser(
      ctx.from.id,
      ctx.from.first_name,
      ctx.from.last_name,
      ctx.from.username
    );

    // Send initial message to start the game
    const options = [
      { text: "2", callback_data: "action:learn_words:2:medium" },
      { text: "3", callback_data: "action:learn_words:3:medium" },
      { text: "4", callback_data: "action:learn_words:4:medium" }
    ];
    const replyMarkup = {
      inline_keyboard: options.map(option => [{ text: option.text, callback_data: option.callback_data }])
    };
    return ctx.reply("How many words would you like to learn today?", { reply_markup: replyMarkup });
  } catch (e) {
    console.error("error in start action:", e);
    return ctx.reply("Error occurred");
  }
};
