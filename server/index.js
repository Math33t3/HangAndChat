import express from "express";
import dotenv from "dotenv";
dotenv.config();
const PORT = process.env.PORT || 8080;
const app = express();
import helmet from "helmet";
import cors from "cors";
import authRouter from "./routers/authRouter.js";
import hangmanRouter from "./routers/hangmanRouter.js"
import { sessionMiddleware, protectRoutes, checkLoggedIn, corsServerConfig, fetchMessages } from "./controllers/serverController.js";
import { initializeSocket } from "./controllers/socketController.js";
app.use(express.static('public'))

import { createServer } from "http";
const server = createServer(app);

app.use(helmet());
app.use(cors(corsServerConfig));
app.use(express.json());
app.use(sessionMiddleware);
app.use("/auth", authRouter);
app.use(protectRoutes);

app.use((req, res, next) => {           //inline scripts
  res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");
  next();
});

app.set('view engine', 'ejs');
app.use(hangmanRouter);

app.get('/', (req, res) => {
  const username = req.session.user.username
  res.render('frontpage', { username });
});

app.get("/login", checkLoggedIn, (req, res) => {
  res.render('login');
});

app.get("/signup", checkLoggedIn, (req, res) => {
  res.render('signup');
})

app.get("/chatroom", (req, res) => {
  const initialFriendsList = [];
  const initialMessages = [];
  const user = req.session.user;
  res.render('chatroom', {friendsList: initialFriendsList, messages: initialMessages, user:user});
})



app.get("/api/messages", async (req, res) => {
  try {
      const userId = req.user.userId;
      const messages = await fetchMessages(userId);
      const friendsList = socket.user.friendsList;

      res.render("chatroom", { user: req.user, messages, friendsList });
  } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: "An error occurred while fetching messages." });
  }
});

const io = initializeSocket(server);

server.listen(PORT, () => {
  console.log("Server is running on port", PORT)
});