import React from 'react';
import { Route, Switch } from 'react-router'
import Dashboard from './dashboard';
import PropTypes from 'prop-types'
import { withStyles } from '@material-ui/core/styles';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import axios from 'axios';
import {getApiRoute, API_ROOT} from 'constants/api-constants';
import { connect } from 'react-redux'
import {loadSettings} from 'actions/session-actions';
import {loadOnlineUsers, connectionChanged} from 'actions/chat-actions';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Avatar from '@material-ui/core/Avatar';
import _ from 'lodash';
// with ES6 import
import io from 'socket.io-client';

const styles = {
  root: {
    flexGrow: 1,
  },
  grow: {
    flexGrow: 1,
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },
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
      loadOnlineUsers: (users) => {
          dispatch(loadOnlineUsers(users));
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
        loadOnlineUsers: PropTypes.func.isRequired,
        connectionChanged: PropTypes.func.isRequired
    }

    loginClicked = () => {
        window.location.href = getApiRoute('/auth/google');
    }

    componentDidMount() {
        axios.get(getApiRoute('/settings'), {withCredentials: true}).then(res => {
            this.props.loadSettings(res.data);
            return res.data;
        }).then(settings => {
            if (settings.user !== null) {
                return axios.get(getApiRoute('/who'), {withCredentials: true})
            } else {
                return Promise.resolve(null);
            }
        }).then(res => {
            if (res.data === null) {
                return null;
            }
            const userList = res.data;
            this.props.loadOnlineUsers(userList);
            this.props.history.push('/dashboard');
        })
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.user === null && this.props.user !== null) {
            const socket = io(API_ROOT);
            socket.on('CONNECTION_CHANGED', d => {
                this.props.connectionChanged(d);
            })
            this.setState({
                socket: socket
            });
        }
    }

    render() {
        const {classes, user} = this.props;
        console.log('global nav render');
        return (
            <div className={classes.root}>
            <AppBar position="static">
              <Toolbar>
                {/*<IconButton className={classes.menuButton} color="inherit" aria-label="Menu">
                  <MenuIcon />
                </IconButton>*/}
                <Typography variant="h6" color="inherit" className={classes.grow}>
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

            <Route exact path='/dashboard' component={Dashboard} />
          </div>
        );
    }
}

export default connect(mapStateToProps, mapDispatchToProps)(withStyles(styles)(GlobalNav));