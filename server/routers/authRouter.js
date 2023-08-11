import express from 'express';
import { Router } from 'express';
import db from '../database/connection.js';
import bcrypt from 'bcrypt';
import { v4 as uniqueID } from 'uuid';

const router = Router();
router.use(express.json());
router.use(express.urlencoded({ extended: true }))

import rateLimiter from "../controllers/rateLimiter.js";
import formValidationMiddleware from "./formValidationMiddleware.js";

router.route("/login")
.get( async (req, res ) => {
    if (req.session.user && req.session.user.username ) {
        res.json({ loggedIn: true, username: req.session.user.username, userId: req.session.user.userId});
    } else {
        res.json({loggedIn: false});
    }
})
.post( formValidationMiddleware, rateLimiter, async (req, res) => {
    const loginAttempt = await db.users.find({ username: req.body.username }).toArray();
    if (loginAttempt.length > 0) {
        const isValidPassword = await bcrypt.compare(req.body.password, loginAttempt[0].password);

        if (isValidPassword) {
            const userId = loginAttempt[0].userId;
            //login, sætter session
            req.session.user = {
                username: req.body.username,
                userId: userId
            };
            res.json({ loggedIn: true, username: req.body.username, userId: userId});
        } else {
            //invalid password
            res.json({ loggedIn: false, status: "Invalid user credentials" })
        }
    } else {
        //invalid username
        res.json({ loggedIn: false, status: "Invalid user credentials" })
    };
});


router.post("/register", formValidationMiddleware, rateLimiter, async (req, res) => {
    const existingUsers = await db.users.find().toArray();
    const existingUser = existingUsers.find(user => user.username === req.body.username); 
    //tjekker om username bliver brugt allerede
    if (!existingUser) {
        //register
        const hashedPassword = await bcrypt.hash(req.body.password, 8)
        const newUserID = uniqueID();
        await db.users.insertOne({ username: req.body.username, password: hashedPassword , userId: newUserID});
        req.session.user = {
            username: req.body.username,
            userId: newUserID
        };
        res.json({ loggedIn: true, username: req.body.username, message: "Account created" });
    } else {
        res.json({ loggedIn: false, status: "Invalid Username, try another" }); //vil ikke sende "Username already taken" da det er info til angribere
    };
});

router.get("/logout", (req, res) => {
    res.clearCookie("sid");
    res.send("Cookie cleared");
})


export default router;

