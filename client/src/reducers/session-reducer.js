const sessionReducer = (state = initialState(), action) => {
    switch (action.type) {
      case 'SETTINGS_LOADED':
        return {
          user: action.settings.user
        }
      default:
        return state;
    }
  }

  const initialState = () => {
    return {
      user: null
    }
  }
  
  export default sessionReducer;