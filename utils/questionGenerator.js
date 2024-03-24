// utils/questionGenerator.js
const { ChatOpenAI } = require("@langchain/openai");
const { fetchUnansweredQuestions , updateCurrentQuestionInSession} = require("../database/fauna");

const openAIApiKey = process.env.OPENAI_API_KEY;

// Function to generate a question for a given word and difficulty level
async function generateQuestionForWord(word, level) {
  const chatModel = new ChatOpenAI({
    openAIApiKey: openAIApiKey,
  });

  try {
    // Invoke the model with a prompt to generate a question based on the word and difficulty
    const response = await chatModel.invoke(`
      Create a question for the word "${word}" at a "${level}" difficulty level.
      The question should include:
      - A query text
      - Multiple choice options (at least 4)
      - Indicate the index of the correct answer (starting from 0)
      Return a JSON response with the structure {query_text, options, correctAnswer}.
    `);

    // Assuming the model's response is well-structured JSON matching the expected format
    let questionData = JSON.parse(response.content);
    return {
      query_text: questionData.query_text,
      options: questionData.options,
      level: level,
      correctAnswer: questionData.correctAnswer,
    };
  } catch (error) {
    console.error("Error generating question for word:", error);
    throw error;
  }
}

async function get_next_question(ctx) {
  try {
    const questions = await fetchUnansweredQuestions(ctx.from.id);

    if (questions.length === 0) {
      return ctx.reply("Congratulations! You have answered all questions.");
    }

    // Select a random question
    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];
    console.log("Selected question:", question);

    // Update the userSession with the current question
    await updateCurrentQuestionInSession(ctx.from.id, question);

    // Create an inline keyboard for the question options
    const optionsKeyboard = question.options.map((option, index) => [
      {text: option, callback_data: 'answer_' + index}
    ]);

    return ctx.reply(question.query_text, {
      reply_markup: {
        inline_keyboard: optionsKeyboard,
      },
    });
  } catch (error) {
    console.error("Error getting next question:", error);
    return ctx.reply("An error occurred while getting the next question.");
  }
}



module.exports = { generateQuestionForWord,get_next_question};
