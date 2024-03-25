const { generateQuestionForWord, get_next_question } = require("../utils/questionGenerator");
const { getCandidateWordsFromUserSession, writeUserWord } = require("../database/fauna");

module.exports = async (ctx) => {
  try {
    const loadingMessage = await ctx.reply("Generating questions for you, please wait...");
    const candidateWords = await getCandidateWordsFromUserSession(ctx.from.id);

    for (const word of candidateWords) {
      const level = 'medium';
      const question = await generateQuestionForWord(word, level);
      console.log(`Generated question for word "${word}":`, question);
      await writeUserWord(ctx.from.id, word, [question]); // Assume this adds an unanswered flag by default
    }

    // Once all questions are generated and stored, delete the loading message and proceed
    await ctx.telegram.deleteMessage(loadingMessage.chat.id, loadingMessage.message_id);

    // Invoke get_next_question handler to fetch and ask the next question
    await get_next_question(ctx);

  } catch (e) {
    console.error("Error in start game handler:", e);
    return ctx.reply("An error occurred while starting the game. Please try again later.");
  }
};

