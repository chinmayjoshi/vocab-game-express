// utils/questionGenerator.js
const { ChatOpenAI } = require("@langchain/openai");

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
      - Indicate the correct answer
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

module.exports = { generateQuestionForWord };
