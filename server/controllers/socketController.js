import { Server } from "socket.io";
import { sessionMiddleware, compatibility, authorizeUser } from "./serverController.js";
import db from "../database/connection.js";


export const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:8080",
      credentials: true,
    },
  });

  io.use(compatibility(sessionMiddleware));
  io.use(authorizeUser);

  io.on("connect", (socket) => {

    socket.on("addFriend", (friendName, callback) => {
      addFriend(socket, friendName, callback);
    });

    socket.on("directMessage", (message) => {
      handleDirectMessage(socket, message, io);
    });

    socket.on("gameOver", async (data) => {
      try {
        await db.users.updateOne(
          { userId: socket.user.userId },
          { $push: { hangmanRecords: { isWin: data.isWin, timestamp: new Date() } } }
        );
        const user = await db.users.findOne({ userId: socket.user.userId });
        socket.emit("updateUserStatistics", user.hangmanRecords);
      } catch (error) {
        console.error("Error saving game result to database:", error);
      }
    });

    socket.on("addToWordlist", async (data) => {
      try {
        const username = socket.user.username;
        const existingWords = await db.wordList.find().toArray();
        const existingWord = existingWords.find(word => word.word.toLowerCase() === data.word.toLowerCase());

        if (!existingWord) {
          await db.wordList.insertOne({
            word: data.word,
            hint: data.hint,
            createdBy: username,
          });
          socket.emit("wordAdded", "Word added to the wordlist!");
        } else {
          socket.emit("wordNotAdded", "Word already exists in the wordlist!");
        }
      } catch (error) {
        console.error("Error adding word to wordlist:", error);
      }
    });

    socket.on("logout", () => {
      socket.disconnect();
    });
  });

  async function handleDirectMessage(socket, message) {
    message.from = socket.user.userId;
    try {
        await db.messages.insertOne(message);

        io.emit("directMessage", message); // Emit to all sockets
    } catch (error) {
        console.error('Error inserting message:', error);
    }
}


  async function addFriend(socket, friendName, callback) {
    if (friendName === socket.user.username) {
      callback({ done: false, errorMessage: "Cannot befriend yourself" });
      return;
    }

    try {
      const friendUser = await db.users.findOne({ username: friendName });

      if (!friendUser) {
        callback({ done: false, errorMessage: "Invalid User" });
        return;
      }

      const currentUser = await db.users.findOne({ username: socket.user.username, friends: friendUser._id });

      if (currentUser) {
        callback({ done: false, errorMessage: "You are already friends" });
        return;
      }

      await db.users.updateOne(
        { username: socket.user.username },
        {
          $addToSet: {
            friends: {
              userId: friendUser._id,
              username: friendUser.username
            }
          }
        }
      );

      callback({ done: true });
    } catch (error) {
      console.error('Error adding friend:', error);
      callback({ done: false, errorMessage: "An error occurred" });
    }
  }
};