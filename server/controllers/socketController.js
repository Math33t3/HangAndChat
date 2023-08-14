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
          // The word doesn't exist, so we can add it to the database
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
      console.log("User has logged out");
      socket.disconnect();
    });
  });

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
  async function handleDirectMessage(socket, message) {
    console.log("Received directMessage:", message);
    message.from = socket.user.userId;
    try {
        await db.messages.insertOne(message);

        socket.to(message.to).emit("directMessage", message);
        socket.emit("directMessage", message);
    } catch (error) {
        console.error('Error inserting message:', error);
    }
}
  /*

  REDIS FUNCTIONER
  async function handleDirectMessage(socket, message) {
    console.log("Received directMessage:", message);
    message.from = socket.user.userId;

    const messageStore = [message.to, message.from, message.content].join(".");

    await redisClient.lpush(`chat:${message.to}`, messageStore);
    await redisClient.lpush(`chat:${message.from}`, messageStore);

    socket.to(message.to).emit("directMessage", message);
    socket.emit("directMessage", message);




      async function addFriend(socket, friendName, callback) {
    if (friendName === socket.user.username) {
      callback({ done: false, errorMessage: "Cannot befriend yourself" });
      return;
    }
    const friendUserId = await redisClient.hget(`userid:${friendName}`, "userId");
    const existingFriends = await redisClient.lrange(`friends:${socket.user.username}`, 0, -1)

    if (!friendUserId) {
      callback({ done: false, errorMessage: "Invalid User" });
      return;
    }
    if (existingFriends && existingFriends.indexOf(friendName) !== -1) {
      callback({ done: false, errorMessage: "You are already friends" });
      return;
    }

    await redisClient.lpush(`friends:${socket.user.username}`, friendName);
    callback({ done: true });
  };
}*/

};