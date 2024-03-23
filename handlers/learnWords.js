// handlers/learnWords.js
const { storeMessage } = require("../database/fauna");
const { ChatOpenAI } = require("@langchain/openai");
const { updateUser } = require("../database/fauna");
const { getCandidateWordsForUser } = require("../database/fauna");



module.exports = async (ctx) => {
  const callbackData = ctx.match[0];
  const numberOfWords = parseInt(callbackData.split(":")[2]);
  console.log(`Received callback data: ${numberOfWords}`);
  try {
    // Store incoming message from the user
    console.log("Incoming message: ", ctx.update.callback_query.message.text);
    await storeMessage(ctx.from.id, ctx.update.callback_query.message.text);

    // Send waiting message with animated loader
    const loader = "⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏";
    const loadingMessage = await ctx.reply(`Please wait while I find ${numberOfWords} words for you...`);
    let loaderIndex = 0;
    const loaderInterval = setInterval(() => {
      loaderIndex = (loaderIndex + 1) % loader.length;
      ctx.telegram.editMessageText(loadingMessage.chat.id, loadingMessage.message_id, undefined, `Please wait while I find ${numberOfWords} words for you... ${loader[loaderIndex]}`);
    }, 100);

    // Determine the difficulty level
    let difficultyPrompt;
    if (callbackData.includes("easy")) {
      difficultyPrompt = "easy";
    } else if (callbackData.includes("hard")) {
      difficultyPrompt = "hard";
    } else {
      difficultyPrompt = "medium"; // Default to medium if no specific difficulty is provided
    }

    // Make a call to OpenAI with the appropriate prompt based on difficulty
    console.log(process.env.OPENAI_API_KEY)
    const chatModel = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // If easy or hard, fetch candidate words from user and pass them to the model
    if (difficultyPrompt === "easy" || difficultyPrompt === "hard") {
      const candidateWords = await getCandidateWordsForUser(ctx.from.id);
    }


    let response;
    if (difficultyPrompt === "easy" || difficultyPrompt === "hard") {
      const candidateWords = await getCandidateWordsForUser(ctx.from.id);
      response = await chatModel.invoke(`
      Give me ${numberOfWords} words in English to practice vocabulary. You had previously given me the words: ${candidateWords.join(", ")}.
      I want more ${difficultyPrompt} words than those.
      . Don't reply with anything else, not even the meaning of the word. 
      Return a JSON response with an array of words and the key 'words'.
      `);
    } else {
      response = await chatModel.invoke(`
      Give me ${numberOfWords} words in English to practice vocabulary.
      Don't reply with anything else, not even the meaning of the word. 
      Return a JSON response with an array of words and the key 'words'.
      `);
    }

    // Stop the loader animation
    clearInterval(loaderInterval);

    // Access the response data
    let modelResponse = response.content;

    // Parse the response to extract the words 
    const words = JSON.parse(modelResponse).words;
    updateUser(ctx.from.id, words);
    modelResponse = `Here are ${numberOfWords} words for you to learn: \n\n${words.join(", ")}`;
  
    // Provide options for the user
    const options = [
      { text: "Let's play", callback_data: "action:start_game" },
      { text: "Give me easier words", callback_data: `action:learn_words:${numberOfWords}:easy` },
      { text: "Give me harder words", callback_data: `action:learn_words:${numberOfWords}:hard` }
    ];
    const replyMarkup = {
      inline_keyboard: options.map(option => [{ text: option.text, callback_data: option.callback_data }])
    };

    console.log(replyMarkup)

    // Reply with the words and options
    return ctx.reply(`${modelResponse}`, { reply_markup: replyMarkup });
  } catch (e) {
    console.error("error in action handler:", e);
    return ctx.reply("Error occurred");
  }
};
