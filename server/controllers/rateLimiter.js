import db from "../database/connection.js"

const rateLimiter = async (req, res, next) => {
    try {
        const ip = req.connection.remoteAddress;
        // opret nyt document eller update hvis der er et existerende 
        const result = await db.rateLimits.updateOne(
            { _id: ip },
            { $set: { createdAt: new Date() } },
            { upsert: true }
        );
        if (result.upsertedCount) {
            // nye expires efter 60 seconds
            await db.rateLimits.createIndex(
                { createdAt: 1 },
                { expireAfterSeconds: 60 }
            );
        }
        const count = await db.rateLimits.countDocuments({ _id: ip });
        if (count > 10) {
            res.json({ loggedIn: false, status: "Too Many Log In Attempts" });
        } else {
            next();
        }
    } catch (error) {
        console.error("Error in rateLimiter:", error);
        res.status(500).json({ loggedIn: false, status: "Internal Server Error" });
    }
};

export default rateLimiter;




/*import redisClient from "../redis.js";

const rateLimiter = async (req, res, next) => {
    
    const ip = req.connection.remoteAddress;
    //limit til 10 pr min fra samme ip adresse
    const [response] = 
    await redisClient
    .multi()        //så vi kan køre multiple Redis commands på en gang.
    .incr(ip)       //increments in Redis key-value db
    .expire(ip, 60) //levetid på entry = 60 sec
    .exec();        //executes vores multi command
    
    if (response[1] > 10) { 
        res.json({ loggedIn: false, status: "Too Many Log In Attempts" }) 
    } else {
        next();
    };
}

export default rateLimiter;*/