import _ from 'lodash';

const chatReducer = (state = initialState(), action) => {
    switch (action.type) {
      case 'DASHBOARD_DATA_LOADED':
        return {
            onlineUsers: _.keyBy(action.onlineUsers, u => u.user_id),
            conversations: _.keyBy(action.conversations, u => u.from_user_id)
        }
        case 'CONNECTION_CHANGED':
            const {connection} = action;
            const connAction = connection.action;
            let onlineUsers = state.onlineUsers; 
            if (connAction === 'CONNECTED') {             
                onlineUsers[connection.user.user_id] = connection.user;
                return {
                    ...state,
                    onlineUsers: Object.assign({}, onlineUsers)
                }
            } else if (connAction === 'DISCONNECTED') {
                delete onlineUsers[connection.user.user_id];
                return {
                    ...state,
                    onlineUsers: Object.assign({}, onlineUsers)
                }
            } else {
                throw new Error("Unknown connection change " + action)
            }
      default:
        return state;
    }
  }
  
  const initialState = () => {
      return {
          onlineUsers: {}
      }
  }

export default chatReducer;