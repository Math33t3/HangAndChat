import dotenv from "dotenv";
dotenv.config();
import session from "express-session";
import RedisStore from "connect-redis";
import createClient from "ioredis";
import db from "../database/connection.js";

/*
// Initialize client. fra connect-redis documentation
export const redisClient = new createClient();

// Initialize store.
const redisStore = new RedisStore({
    client: redisClient,
});
*/
export const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    credentials: true,
    name: "sid",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        expires: 1000 * 60 * 60 * 24,
        sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
    store: db.createSessionStore(), 
});

export const compatibility = expressMiddleware => (socket, next) =>
    expressMiddleware(socket.request, {}, next);

export const corsServerConfig = {
    origin: "http://localhost:8080",
    credentials: true,
};

export const authorizeUser = async (socket, next) => {
    try {
        if (!socket.request.session || !socket.request.session.user) {
            next(new Error("Authorization failed!"));
        } else {
            socket.user = { ...socket.request.session.user };
            await db.users.updateOne(
                { username: socket.user.username },
                { $set: { connected: true } }
            );
            
            const user = await db.users.findOne({ username: socket.user.username });
            const friendsList = user.friends || [];
            const friendRooms = friendsList.map(friend => friend.toString());
            if (friendRooms.length > 0) {
                socket.to(friendRooms).emit("connected", true, socket.user.userId);
            }
            
            socket.emit("friends", friendsList);
            const messages = await db.messages.find({
                $or: [{ to: socket.user.username }, { from: socket.user.username }]
            }).toArray();
            if (messages && messages.length > 0) {
                socket.emit("messages", messages);
            }
            next();
        }
    } catch (error) {
        console.error("Error authorizing user:", error);
        next(new Error("Authorization failed"));
    }
};

export const protectRoutes = (req, res, next) => {
    if (req.session.user && req.session.user.username) {
        // User authenticated
        next();
    } else {
        // User er ikke authenticated --> redirect to login
        if (req.path === "/login" || req.path === "/signup") {
            // login og signup routes skal ikke bruge redirect
            next();
        } else {
            res.redirect("/login");
        }
    }
};

export const checkLoggedIn = (req, res, next) => {
    if (req.session.user && req.session.user.username) {
        res.redirect("/");
    } else {
        next();
    }
};
export async function fetchMessages(userId) {
    const messages = await db.collection('messages').find({
        $or: [{ to: userId }, { from: userId }]
    }).toArray();

    return messages;
}

export async function fetchFriendsList(userId) {
    return new Promise((resolve, reject) => {
        redisClient.lrange(`chats:${userId}`, 0, -1, (error, messages) => {
            if (error) {
                reject(error);
            } else {
                const parsedMessages = messages.map((message) => JSON.parse(message));
                resolve(parsedMessages);
            }
        });
    });
}
export default { sessionMiddleware, compatibility, authorizeUser, corsServerConfig, fetchMessages };

/*
export const addFriend = async (socket, friendName, callback) => {
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

}

export const directMessage = async (socket, message) => {
    message.from = socket.user.userId;

    const messageStore = [message.to, message.from, message.content].join(".");
    await redisClient.lpush(`chat:${message.to}`, messageStore);
    await redisClient.lpush(`chat:${message.from}`, messageStore);

    socket.emit("directMessage", message);
    io.to(message.to).emit("directMessage", message);
};


export const authorizeUser = async (socket, next) => {
    try {
        if (!socket.request.session || !socket.request.session.user) {
            next(new Error("Authorization failed!"));
        } else {
            socket.user = { ...socket.request.session.user };
            
            await redisClient.hset(
                `userid:${socket.user.username}`,
                "userId",
                socket.user.userId
            );
            await redisClient.hset(
                `userid:${socket.user.username}`,
                "connected", true
            )
            const redisfriendsList = await redisClient.lrange(`friends:${socket.user.username}`, 0, -1)
            const friendsList = await compatibilityFriendsList(redisfriendsList);
            console.log(friendsList)
            const friendRooms = friendsList.map(friend => friend.userId);
            if (friendRooms.length > 0) {
                socket.to(friendRooms).emit("connected", true, socket.user.userId);
            }
            socket.emit("friends", friendsList);
            const redisMessages = await redisClient.lrange(`chat:${socket.user.userId}`, 0, -1)
            //min messageformat er to.from.content fra d-message event
            const messages = redisMessages.map(stringOfMessage => {
                const prevMessage = stringOfMessage.split(".");
                return { to: prevMessage[0], from: prevMessage[1], content: prevMessage[2] };
            })
            if (messages && messages.length > 0) {
                socket.emit("messages", messages)
            }
            next();
        }
    } catch (error) {
        console.error("Error authorizing user:", error);
        next(new Error("Authorization failed"));
    }
};

const compatibilityFriendsList = async (friendsList) => {
    const newFriendsList = [];

    for (let friendUsername of friendsList) {
        const userIdKey = `userid:${friendUsername}`;

        // Retrieve userId and connected status from Redis
        const [userId, connectedStatus] = await Promise.all([
            redisClient.hget(userIdKey, "userId"),
            redisClient.hget(userIdKey, "connected")
        ]);

        // Handle cases where userId and connectedStatus are null or undefined
        const formattedUserId = userId || "";
        const formattedConnectedStatus = connectedStatus === "true" ? true : false;

        newFriendsList.push({
            username: friendUsername,
            userId: formattedUserId,
            connected: formattedConnectedStatus
        });
    }

    console.log("Final friends list:", newFriendsList);

    return newFriendsList;
};

export async function fetchMessages(userId) {
    return new Promise((resolve, reject) => {
        redisClient.lrange(`chat:${userId}`, 0, -1, (error, messages) => {
            if (error) {
                reject(error);
            } else {
                const parsedMessages = messages.map((message) => JSON.parse(message));
                resolve(parsedMessages);
            }
        });
    });
}*/

