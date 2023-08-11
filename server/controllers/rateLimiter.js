import redisClient from "../redis.js";

const rateLimiter = async (req, res, next) => {
    
    const ip = req.connection.remoteAddress;
    //limit to 10 pr min fra samme ip adresse
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

export default rateLimiter;