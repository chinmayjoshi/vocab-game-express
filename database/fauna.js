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

async function updateUser(userId, candidateWords) {
  try {
    // Fetch the user document reference based on the userId
    const userRef = await faunaClient.query(
      q.Select("ref", q.Get(q.Match(q.Index("users_by_id"), userId)))
    );

    // Update the user document with the new candidate words
    await faunaClient.query(
      q.Update(userRef, {
        data: { candidateWords: candidateWords },
      })
    );

    console.log(`Updated candidate words for user ID ${userId}.`);
  } catch (error) {
    console.log("Error updating user in FaunaDB: ", error);
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

async function getCandidateWordsForUser(userId) {
  try {
    // Query for the user document by userId
    const userDocument = await faunaClient.query(
      q.Get(q.Match(q.Index("users_by_id"), userId))
    );

    // Extract the candidateWords array from the user document
    const candidateWords = userDocument.data.candidateWords;

    console.log(`Retrieved candidate words for user ID ${userId}:`, candidateWords);
    return candidateWords;
  } catch (error) {
    console.log("Error retrieving candidate words from FaunaDB: ", error);
    // Decide how you want to handle errors. Here, we throw it to let the caller handle it.
    throw error;
  }
}

async function writeUserWord(userId, word, questions) {
  try {
    const result = await faunaClient.query(
      q.Create(
        q.Collection('user_words'),
        {
          data: {
            userId: userId,
            word: word,
            questions: questions.map(question => ({
              query_text: question.query_text,
              options: question.options,
              level: question.level,
              hasBeenAsked: false, // Default to false
              correctAnswer: question.correctAnswer // Updated key
            }))
          }
        }
      )
    );
    console.log(`Successfully added word for user ID ${userId}.`, result);
    return result;
  } catch (error) {
    console.log("Error writing user word to FaunaDB: ", error);
    throw error;
  }
}



module.exports = { storeUser, storeMessage, updateUser, getCandidateWordsForUser, writeUserWord};
