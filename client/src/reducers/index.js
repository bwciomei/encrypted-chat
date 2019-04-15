import { combineReducers } from 'redux'
import { connectRouter } from 'connected-react-router'
import chatReducer from './chat-reducer'
import sessionReducer from './session-reducer';

const rootReducer = (history) => combineReducers({
  chat: chatReducer,
  session: sessionReducer,
  router: connectRouter(history)
})

export default rootReducer