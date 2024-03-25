require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Telegraf } = require('telegraf');

const app = express();
const port = process.env.PORT || 8888;
const bot = new Telegraf(process.env.BOT_TOKEN);

// Import handlers
const startHandler = require('./handlers/start');
const learnWordsHandler = require('./handlers/learnWords');
const startGameHandler = require('./handlers/startGame');
const answerHandler = require('./handlers/answer');

// Use bodyParser to parse incoming updates as JSON
app.use(bodyParser.json());

// Define the webhook endpoint for Telegram bot
app.post('/api/bot', (req, res) => {
    bot.handleUpdate(req.body, res).then(() => {
      // No need to call res.end('ok') if bot.handleUpdate already ends the response
    }).catch((err) => {
      // It's a good practice to handle potential errors
      console.error('Error handling update:', err);
      if (!res.headersSent) {
        res.status(500).end();
      }
    });
  });

// Register event handlers with Telegraf
bot.start(startHandler);
bot.action(/^action:learn_words:\d+:[a-z]+$/, learnWordsHandler);
bot.action("action:start_game", startGameHandler);
bot.action(/answer_(\d+)/, answerHandler);

// This method is not needed in an Express setup and was specific to serverless deployment
// exports.handler = async (event) => { ... };

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});