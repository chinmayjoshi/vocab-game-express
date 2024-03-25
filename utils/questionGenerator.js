// utils/questionGenerator.js
const { ChatOpenAI } = require("@langchain/openai");
const { fetchUnansweredQuestions , updateCurrentQuestionInSession} = require("../database/fauna");

const openAIApiKey = process.env.OPENAI_API_KEY;

// Function to generate a question for a given word and difficulty level
// Refactored asynchronous function to generate question based on the word and difficulty level
async function generateQuestionForWord(word, level) {
  const chatModel = new ChatOpenAI({
    openAIApiKey: openAIApiKey,
  });

  try {
    // Create prompt based on difficulty level
    const prompt = createPromptForQuestion(word, level);

    // Invoke the model with the generated prompt
    const response = await chatModel.invoke(prompt);

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

// Function to create the prompt based on the word and difficulty level
function createPromptForQuestion(word, level) {
  let prompt = `Create a question for the word "${word}" at a "${level}" difficulty level.`;

  switch (level) {
    case "easy":
      prompt += ` For easy difficulty level, 
      Preface the query_text with the definition of the word
       ask a question on the correct usage of the word in a sentence.`;
      break;
    case "medium":
      prompt += ` For medium difficulty level, 
      Ask an appropriate DOK level 2 question.`;
      break;
    case "hard":
      prompt += ` For hard difficulty level, 
      Ask an appropriate DOK level 3 question.`;
      break;
    default:
      // Optionally handle unknown difficulty levels
      throw new Error("Unknown difficulty level");
  }

  prompt += ` The question should include: - A query text - Multiple choice options (at least 4) - 
  Indicate the index of the correct answer (starting from 0) 
  Return a JSON response with the structure {query_text, options, correctAnswer}.`;

  return prompt;
}

async function get_next_question(ctx) {
  try {
    const questions = await fetchUnansweredQuestions(ctx.from.id);

    if (questions.length === 0) {
      return ctx.reply("Congratulations! You have answered all questions.");
    }

    const randomIndex = Math.floor(Math.random() * questions.length);
    const question = questions[randomIndex];
    console.log("Selected question:", question);

    await updateCurrentQuestionInSession(ctx.from.id, question);

    // Function to generate option labels (A, B, C, ..., AA, AB, ...)
    function generateOptionLabels(n) {
      const labels = [];
      for (let i = 0; i < n; i++) {
        let label = '';
        let divisionResult = i;
        while (divisionResult >= 0) {
          label = String.fromCharCode('A'.charCodeAt(0) + (divisionResult % 26)) + label;
          divisionResult = Math.floor(divisionResult / 26) - 1;
        }
        labels.push(label);
      }
      return labels;
    }

    // Construct the message with options
    let messageWithOptions = question.query_text + "\n";
    const optionsLabels = generateOptionLabels(question.options.length);
    question.options.forEach((option, index) => {
      messageWithOptions += `\n${optionsLabels[index]}. ${option}`;
    });

    // Create an inline keyboard for the options
    const optionsKeyboard = optionsLabels.map((label, index) => {
      return [{ text: label, callback_data: 'answer_' + index }];
    });

    return ctx.reply(messageWithOptions, {
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
