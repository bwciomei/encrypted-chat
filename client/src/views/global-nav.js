import React from 'react';
import { Route } from 'react-router'
import Dashboard from './dashboard';
import Chat from './chat';
import PropTypes from 'prop-types'
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import axios from 'axios-instance';
import {getApiRoute} from 'constants/api-constants';
import { connect } from 'react-redux'
import {loadSettings} from 'actions/session-actions';
import {loadDashboardData, connectionChanged} from 'actions/chat-actions';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Avatar from '@material-ui/core/Avatar';
import _ from 'lodash';
import socket from 'socket-instance';

const styles = {
  root: {
    flexGrow: 1,
  },
  header: {
    flexGrow: 1,
    cursor: 'pointer'
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  }
};

const mapStateToProps = (state) => {
    return {
      user: state.session.user
    }
  }
  
  const mapDispatchToProps = (dispatch) => {
    return {
      loadSettings: (settings) => {
        dispatch(loadSettings(settings))
      },
      loadDashboardData: (users, conversations) => {
          dispatch(loadDashboardData(users, conversations));
      },
      connectionChanged: (connection) => {
          dispatch(connectionChanged(connection));
      }
    }
  }

class GlobalNav extends React.PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            socket: null
        };
    }

    static propTypes = {
        classes: PropTypes.object.isRequired,
        loadSettings: PropTypes.func.isRequired,
        user: PropTypes.object,
        history: PropTypes.object.isRequired,
        loadDashboardData: PropTypes.func.isRequired,
        connectionChanged: PropTypes.func.isRequired
    }

    componentDidMount() {
        axios.get(getApiRoute('/settings'), {withCredentials: true}).then(res => {
            this.props.loadSettings(res.data);
            return res.data;
        }).then(settings => {
            if (settings.user !== null) {
                return Promise.all([
                  axios.get('/who'),
                  axios.get('/conversations')
                ]);
            } else {
                return Promise.resolve(null);
            }
        }).then(res => {
            if (res.data === null) {
                return null;
            }
            const userList = res[0].data;
            const conversations = res[1].data;

            this.props.loadDashboardData(userList, conversations);
        })
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.user === null && this.props.user !== null) {

            socket.on('CONNECTION_CHANGED', d => {
                this.props.connectionChanged(d);
            })
        }
    }

    loginClicked = () => {
      window.location.href = getApiRoute('/auth/google');
    }

    headerClicked = () => {
      this.props.history.push('/');
    }

    render() {
        const {classes, user} = this.props;
        console.log('global nav render');
        return (
            <div className={classes.root}>
            <AppBar position="static">
              <Toolbar>
                <Typography variant="h6" color="inherit" className={classes.header} onClick={this.headerClicked}>
                  Encrypted-Chat
                </Typography>
                { _.isNil(user) ?
                <Button color="inherit" onClick={this.loginClicked}>Login</Button>
                : 
                <div>
                <IconButton
                //aria-owns={isMenuOpen ? 'material-appbar' : undefined}
                aria-haspopup="false"
                //onClick={this.handleProfileMenuOpen}
                color="inherit"
              >
              {_.isNil(user.picture) ?
                <AccountCircle />
                :
                <Avatar alt={user.display_name} src={user.picture} />
              }
              </IconButton>
              </div>
                }
              </Toolbar>
            </AppBar>

            <Route exact path='/' component={Dashboard} />
            <Route exact path='/chat/:id' component={Chat} />
          </div>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(GlobalNav));