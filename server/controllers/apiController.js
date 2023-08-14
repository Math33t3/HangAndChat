import db from "../database/connection.js"

export async function fetchMessages(userId) {
    const messages = await db.messages.find({
        $or: [{ to: userId.toString() }, { from: userId.toString() }]
    }).toArray();
    return messages;
}

export async function fetchFriendsList(userId) {
    try {
        const user = await db.users.findOne({ userId: userId }); 
        if (!user) {
            throw new Error("User not found");
        }

        const friendsList = user.friends || [];
        return friendsList;
    } catch (error) {
        console.error("Error fetching friends list:", error);
        throw error;
    }
}

export default {fetchMessages, fetchFriendsList};