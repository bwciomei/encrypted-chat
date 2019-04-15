export const loadOnlineUsers = (users) => {
    return {
        type: 'USERS_LOADED',
        onlineUsers: users
    }
}

export const connectionChanged = (connection) => {
    return {
        type: 'CONNECTION_CHANGED',
        connection
    }
}