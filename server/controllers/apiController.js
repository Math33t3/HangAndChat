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

        // Fetch additional friend information and add userId and username to each friend
        const updatedFriendsList = await Promise.all(friendsList.map(async (friend) => {
            const friendInfo = await db.users.findOne({ username: friend.username });
            return { userId: friendInfo.userId, username: friend.username };
        }));
        console.log(updatedFriendsList);
        return updatedFriendsList;
    } catch (error) {
        console.error("Error fetching friends list:", error);
        throw error;
    }
}

export default {fetchMessages, fetchFriendsList};