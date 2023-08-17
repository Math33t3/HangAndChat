import dotenv from "dotenv";
dotenv.config();
import session from "express-session";
import db from "../database/connection.js";

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
            next();
        }
    } catch (error) {
        console.error("Error authorizing user:", error);
        next(new Error("Authorization failed"));
    }
};

export const protectRoutes = (req, res, next) => {
    if (req.session.user && req.session.user.username) {
        // User er authenticated
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

export default { sessionMiddleware, compatibility, authorizeUser, corsServerConfig };