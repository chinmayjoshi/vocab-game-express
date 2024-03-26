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
    const prompt = createPromptForQuestion(word, level);
    const response = await chatModel.invoke(prompt);
    let questionData = JSON.parse(response.content);
    
    return {
      query_text: questionData.query_text,
      options: questionData.options,
      level: level,
      correctAnswer: questionData.correctAnswer,
      answerExplanation: questionData.answerExplanation, // Include the answerExplanation
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
      Preface the query_text with the definition of the word and 
       ask a question on the correct usage of the word in a sentence.
       The goal here is to ensure the player can recognize and apply the basic meaning of the word in a simple context. 
       This approach helps build foundational vocabulary skills and confidence in word usage.`;
      break;
    case "medium":
      prompt += ` For medium difficulty level, 
      Ask a question that requires the player to understand the word in a more complex context.
      This could involve asking the player to identify synonyms, antonyms, or to use context clues to infer the meaning of the word in a given sentence. 
      The challenge should be moderate, requiring a good understanding of not just the word itself, but also its relation to other words and its application in varied contexts. 
    This level aims to enhance the player's vocabulary comprehension and their ability to draw connections between words."`;
      break;
    case "hard":
      prompt += ` For the 'hard' difficulty level, craft a question that truly tests whether the player has mastered the word. 
      This might involve creating a complex sentence where the word is used in an uncommon but correct way, or asking the player to distinguish between subtle nuances of the word's meaning compared to similar words. 
      Incorporate challenging distractors that require the player to carefully consider their choice. 
      The goal is to assess and reinforce a deep and nuanced understanding of the word, its connotations, and its applications in advanced contexts.`;
      break;
    default:
      // Optionally handle unknown difficulty levels
      throw new Error("Unknown difficulty level");
  }

  prompt += ` The question should include: - A query text - Multiple choice options (at least 4) - 
  Indicate the index of the correct answer (starting from 0) 
  Also add an answer explanation explaining why the correct answer is correct and why the other options are incorrect.
  Return a JSON response with the structure {query_text, options, correctAnswer, answerExplanation}.`;

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
