export const loadDashboardData = (users, conversations) => {
    return {
        type: 'DASHBOARD_DATA_LOADED',
        onlineUsers: users,
        conversations
    }
}

export const connectionChanged = (connection) => {
    return {
        type: 'CONNECTION_CHANGED',
        connection
    }
}

export const keysLoaded = (uuid, privateKey, publicKey) => {
    return {
        type: 'KEYS_LOADED',
        keys: {
            uuid,
            privateKey,
            publicKey
        }
    }
}