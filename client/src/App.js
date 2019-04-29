import React from 'react'
import PropTypes from 'prop-types'
import { ConnectedRouter } from 'connected-react-router'
import { Route } from 'react-router'
import GlobalNav from './views/global-nav';

const App = ({ history }) => {
  return (
    <ConnectedRouter history={history}>
        <Route path='/' component={GlobalNav}/>
    </ConnectedRouter>
  )
}

App.propTypes = {
  history: PropTypes.object,
}

export default App