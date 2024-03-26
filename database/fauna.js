// database/fauna.js
const { Client, query: q } = require('faunadb');
const faunaClient = new Client({ secret: process.env.FAUNA_SECRET });

async function storeUser(userId, firstName, lastName, username) {
  try {
    // Check if the user already exists
    const userExists = await faunaClient.query(
      q.Exists(q.Match(q.Index("users_by_id"), userId))
    );

    // If the user already exists, do not create a new document
    if (userExists) {
      console.log(`User with ID ${userId} already exists in the database.`);
      return;
    }

    await faunaClient.query(
      q.Create(
        q.Collection('user'),
        {
          data: {
            userId: userId,
            firstName: firstName,
            lastName: lastName,
            username: username
          }
        },
      )
    );
  } catch (error) {
    console.log("Error storing user in FaunaDB: ", error);
    throw error;
  }
}

async function updateUserSession(userId, candidateWords) {
  try {
    // Fetch the user document reference based on the userId
    const userRef = await faunaClient.query(
      q.Select("ref", q.Get(q.Match(q.Index("users_by_id"), userId)))
    );

    // Update the user document with the new candidate words within userSession
    await faunaClient.query(
      q.Update(userRef, {
        data: { 
          userSession: {
            candidateWords: candidateWords
            // Add more session-related fields here as needed
          } 
        },
      })
    );

    console.log(`Updated candidate words for user ID ${userId} within userSession.`);
  } catch (error) {
    console.log("Error updating user session in FaunaDB: ", error);
    throw error;
  }
}



async function storeMessage(userId, message, fromUser = true) {
  try {
    await faunaClient.query(
      q.Create(
        q.Collection('messages'),
        {
          data: {
            userId: userId,
            message: message,
            fromUser: fromUser,
            timestamp: new Date().toISOString()
          }
        },
      )
    );
  } catch (error) {
    console.log("Error storing message in FaunaDB: ", error);
    throw error;
  }
}

async function getCandidateWordsFromUserSession(userId) {
  try {
    // Query for the user document by userId
    const userDocument = await faunaClient.query(
      q.Get(q.Match(q.Index("users_by_id"), userId))
    );

    // Extract the candidateWords array from the userSession field of the user document
    const candidateWords = userDocument.data.userSession?.candidateWords;

    console.log(`Retrieved candidate words for user ID ${userId} from userSession:`, candidateWords);
    return candidateWords;
  } catch (error) {
    console.log("Error retrieving candidate words from user session in FaunaDB: ", error);
    throw error;
  }
}

async function writeUserWord(userId, word, questions, questionId = null) {
  try {
    if (questionId) {
      // Step 1: Use the index to get the reference of the user_word document containing the question
      const { ref: userWordRef } = await faunaClient.query(
        q.Get(
          q.Match(q.Index("user_words_by_question_id"), questionId)
        )
      );
    
      // Ensure questions are well-formed
      if (!Array.isArray(questions) || !questions.every(question => question && typeof question.query_text === 'string')) {
        console.log("Invalid questions format: ", questions)
        throw new Error("Invalid questions format. Each question must be an object with a 'query_text' property.");
      }
    
      // Prepare the data for updating, including the new field
      const updateData = {
        questions: q.Append(
          questions.map(question => ({
            id: q.NewId(),
            query_text: question.query_text,
            options: question.options,
            level: question.level,
            hasBeenAsked: false,
            correctAnswer: question.correctAnswer,
            answerExplanation: question.answerExplanation // Updated to include answerExplanation
          })),
          q.Select(["data", "questions"], q.Get(userWordRef))
        ),
        hasAnyUnansweredQuestions: true
      };
    
      if (word) {
        updateData.word = word;
      }
    
      // Step 2: Update the document
      const result = await faunaClient.query(
        q.Update(userWordRef, { data: updateData })
      );
    
      console.log(`Successfully updated document for user ID ${userId} with additional questions.`, result);
      return result;
    } else {
      if (!word) {
        throw new Error("Word is required when not updating an existing document.");
      }
      
      const result = await faunaClient.query(
        q.Create(
          q.Collection('user_words'),
          {
            data: {
              userId: userId,
              word: word,
              questions: questions.map(question => ({
                id: q.NewId(),
                query_text: question.query_text,
                options: question.options,
                level: question.level,
                hasBeenAsked: false,
                correctAnswer: question.correctAnswer,
                answerExplanation: question.answerExplanation // Updated to include answerExplanation
              })),
              hasAnyUnansweredQuestions: true
            }
          }
        )
      );
      console.log(`Successfully added word for user ID ${userId}.`, result);
      return result;
    }
  } catch (error) {
    console.log("Error writing user word to FaunaDB: ", error);
    throw error;
  }
}


async function fetchUnansweredQuestions(userId) {
  try {
    // Fetch documents for the user that have unanswered questions
    const result = await faunaClient.query(
      q.Map(
        q.Paginate(q.Match(q.Index("user_words_with_unanswered_by_userId"), userId)),
        q.Lambda("ref", q.Get(q.Var("ref")))
      )
    );

    let unansweredQuestions = [];
    result.data.forEach(wordDoc => {
      // Since these documents are confirmed to have unanswered questions,
      // you directly filter the questions array.
      const questions = wordDoc.data.questions.filter(question => !question.hasBeenAsked);
      unansweredQuestions = unansweredQuestions.concat(questions.map(question => ({
        word: wordDoc.data.word, // Include the word for context
        ...question
      })));
    });

    console.log(`Fetched unanswered questions for user ID ${userId}:`, unansweredQuestions);
    return unansweredQuestions;
  } catch (error) {
    console.log("Error fetching unanswered questions from FaunaDB: ", error);
    throw error;
  }
}





// In your database or fauna.js file

async function updateCurrentQuestionInSession(userId, currentQuestion) {
  try {
    // Fetch the user document reference based on the userId
    const userRef = await faunaClient.query(
      q.Select("ref", q.Get(q.Match(q.Index("users_by_id"), userId)))
    );

    // Update only the currentQuestion field within the userSession
    await faunaClient.query(
      q.Update(userRef, {
        data: { 
          userSession: {
            ...q.Select(["data", "userSession"], q.Get(userRef), {}),
            currentQuestion: currentQuestion
          } 
        },
      })
    );

    console.log(`Updated currentQuestion for user ID ${userId} in userSession.`);
  } catch (error) {
    console.error("Error updating currentQuestion in userSession in FaunaDB: ", error);
    throw error;
  }
}
async function getCurrentQuestion(userId) {
  try {
    // Query for the user document by userId
    const userDocument = await faunaClient.query(
      q.Get(q.Match(q.Index("users_by_id"), userId))
    );

    // Extract the currentQuestion object from the userSession field of the user document
    const currentQuestion = userDocument.data.userSession?.currentQuestion;

    console.log(`Retrieved current question for user ID ${userId}:`, currentQuestion);
    return currentQuestion;
  } catch (error) {
    console.log("Error retrieving current question from user session in FaunaDB: ", error);
    throw error;
  }
}

async function markQuestionAsAskedAndUpdateUserAnswer(questionId, userAnswer) {
  try {
    // Step 1: Use the index to get the reference of the user_word document containing the question
    const {ref: userWordRef} = await faunaClient.query(
      q.Get(
        q.Match(q.Index("user_words_by_question_id"), questionId)
      )
    );

    // Step 2: Retrieve the document to locate the question needing update
    const userWordDoc = await faunaClient.query(
      q.Get(userWordRef)
    );

    // Find the question and its index within the questions array
    const questionIndex = userWordDoc.data.questions.findIndex(question => question.id === questionId);
    
    // Step 3: Prepare the updated question with `hasBeenAsked` set to true and the user's answer
    const updatedQuestion = {
      ...userWordDoc.data.questions[questionIndex],
      hasBeenAsked: true,
      userAnswer: userAnswer // Adding user's answer
    };

    // Update the document's question array with the modified question
    const updatedQuestions = [...userWordDoc.data.questions];
    updatedQuestions[questionIndex] = updatedQuestion;

    // Determine if any questions remain unanswered
    const hasAnyUnansweredQuestions = updatedQuestions.some(question => !question.hasBeenAsked);

    // Step 4: Update the document with the modified questions and the hasAnyUnansweredQuestions status
    await faunaClient.query(
      q.Update(userWordRef, {
        data: { questions: updatedQuestions, hasAnyUnansweredQuestions: hasAnyUnansweredQuestions }
      })
    );

    console.log(`Question with ID ${questionId} has been updated with user's answer.`);
  } catch (error) {
    console.log("Error updating question in FaunaDB: ", error);
    throw error;
  }
}

async function getWordsByUserId(userId) {
  try {
    // query the index userwords_by_userId to get all the words for a user
    const result = await faunaClient.query(
      q.Map(
        q.Paginate(q.Match(q.Index("userwords_by_userId"), userId)),
        q.Lambda("ref", q.Get(q.Var("ref")))
      )
    );

    let words = [];
    result.data.forEach(wordDoc => {
      words.push(wordDoc.data.word);
    });

    // Keep only unique words
    words = [...new Set(words)];

    console.log(`Fetched words for user ID ${userId}:`, words);
    return words;


  } catch (error) {
    console.log("Error retrieving words from user session in FaunaDB: ", error);
    throw error;
  }
}







module.exports = {getWordsByUserId,  storeUser, storeMessage, updateUserSession, getCandidateWordsFromUserSession, writeUserWord, fetchUnansweredQuestions , updateCurrentQuestionInSession, getCurrentQuestion,markQuestionAsAskedAndUpdateUserAnswer};
