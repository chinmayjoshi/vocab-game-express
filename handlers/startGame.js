// Assuming generateQuestionForWord is imported from where you've defined it
const { generateQuestionForWord } = require("../utils/questionGenerator");
const { getCandidateWordsForUser, writeUserWord } = require("../database/fauna");

module.exports = async (ctx) => {
  try {
    // Get the user's candidate words
    const candidateWords = await getCandidateWordsForUser(ctx.from.id);

    // Process each candidate word
    for (const word of candidateWords) {
      // For simplicity, assuming 'level' is predefined or you have a way to determine it
      const level = 'easy';

      // Generate a question for the word with the specified level
      const question = await generateQuestionForWord(word, level);
      
      // Log the generated question for debugging, its a JSON object
      console.log(`Generated question for word "${word}":`, question);

      // Store the word and its question in the database
      // Assuming the question structure fits your database function's expectations
      await writeUserWord(ctx.from.id, word, [question]); // Wrap the question in an array to match expected structure
    }

    // Reply with the candidate words
    return ctx.reply(`Here are your candidate words: ${candidateWords.join(", ")}. Let's start the game!`);
  } catch (e) {
    console.error("Error in start game handler:", e);
    return ctx.reply("An error occurred while starting the game. Please try again later.");
  }
};
