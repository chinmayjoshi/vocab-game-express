const { get_next_question, generateQuestionForWord } = require("../utils/questionGenerator");
const { getCurrentQuestion, markQuestionAsAskedAndUpdateUserAnswer, writeUserWord } = require("../database/fauna");

module.exports = async (ctx) => {
    try {
        const userId = ctx.from.id;
        const currentQuestion = await getCurrentQuestion(userId);
        const selectedOptionIndex = parseInt(ctx.callbackQuery.data.split('_')[1], 10);
        const correctAnswerIndex = currentQuestion.correctAnswer;
        const isCorrect = selectedOptionIndex === correctAnswerIndex;

        // Reply to the user based on whether their answer is correct
        if (isCorrect) {
            await ctx.reply('Correct answer! 🎉');
        } else {
            await ctx.reply('Oops! That was not correct. 😢 Try another one!');
        }

        // Record the user's answer
        await markQuestionAsAskedAndUpdateUserAnswer(currentQuestion.id, selectedOptionIndex);

        // Generate the next question based on whether the current answer was correct
        let question = await generateAdjustedQuestion(currentQuestion, isCorrect);

        //word can be null in this call
        await writeUserWord(ctx.from.id, null,[question],currentQuestion.id); // Assume this adds an unanswered flag by default


        // Proceed to the next question
        await get_next_question(ctx);
    } catch (error) {
        console.error("Error in answerHandler: ", error);
        await ctx.reply("An error occurred. Please try again.");
    }
};


// Function to determine the next question difficulty and generate the question
async function generateAdjustedQuestion(currentQuestion, isCorrect) {
    console.log("Generating adjusted question based on current question and answer...")
    let nextLevel = currentQuestion.level; // Default to current level

    // Define the order of difficulty levels
    const levels = ['easy', 'medium', 'hard'];

    // Find the index of the current level
    let levelIndex = levels.indexOf(currentQuestion.level);

    if (isCorrect) {
        // If the answer is correct, move up a level, unless already at hardest
        if (levelIndex < levels.length - 1) {
            nextLevel = levels[levelIndex + 1];
        }
    } else {
        // If the answer is wrong, move down a level, unless already at easiest
        if (levelIndex > 0) {
            nextLevel = levels[levelIndex - 1];
        }
    }

    // Call generateQuestionForWord with adjusted parameters
    let question = await generateQuestionForWord(currentQuestion.word, nextLevel).catch(error => {
        console.error("Error generating adjusted question:", error);
    });

    return question;
}
