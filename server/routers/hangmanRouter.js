import { Router } from 'express';
import db from '../database/connection.js';
import { fetchFriendsList, fetchHangmanRecords } from "../controllers/apiController.js";

const router = Router();

router.use((req, res, next) => {           //tillader inline scripts
    res.setHeader("Content-Security-Policy", "script-src 'self' 'unsafe-inline'");
    next();
  });

router.get('/hangman', async (req, res) => {
    const currentUser = await db.users.findOne({ username: req.session.user.username });
    const correctWord = "placeholder"                 //skal bare initialiseres her, overwriter med det samme i .ejs
    res.render('hangman', { currentUser, correctWord });
});

router.get('/highscores', async (req, res) => {
    try {
        const highscores = await db.users.find().toArray();
        res.render('highscores', { users: highscores });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

router.get('/highscoresFriends', async (req, res) => {
    try {
        const userId = req.session.user.userId;
        const friendsList = await fetchFriendsList(userId);

        const users = await Promise.all(friendsList.map(async (friend) => {
            const user = await db.users.findOne({ userId: friend.userId });
            const hangmanRecords = await fetchHangmanRecords(friend.userId);
            return {
                username: friend.username,
                hangmanRecords: hangmanRecords,
            };
        }));

        res.render('highscoresFriends', { users: users });
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/api/hangman/wordList', async (req, res) => {
    try {
        const wordList = await db.wordList.find().toArray();
        res.json(wordList);
    } catch (error) {
        console.error("Error in wordlist fetch:", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;