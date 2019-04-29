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
import {loadDashboardData, connectionChanged, keysLoaded} from 'actions/chat-actions';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Avatar from '@material-ui/core/Avatar';
import _ from 'lodash';
import socket from 'socket-instance';
import * as keyUtils from 'key-utils';
import uuidv4 from 'uuid/v4'

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
      },
      keysLoaded: (uuid, privateKey, publicKey) => {
          dispatch(keysLoaded(uuid, privateKey, publicKey));
      },
    }
  }

class GlobalNav extends React.PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            socket: null,
            loaded: false
        };
    }

    static propTypes = {
        classes: PropTypes.object.isRequired,
        loadSettings: PropTypes.func.isRequired,
        user: PropTypes.object,
        history: PropTypes.object.isRequired,
        loadDashboardData: PropTypes.func.isRequired,
        connectionChanged: PropTypes.func.isRequired,
        keysLoaded: PropTypes.func.isRequired
    }

    initKeys(existingPublicKey) {
        const storedKey = keyUtils.getPrivateKey();
        if (_.isNil(storedKey) || (!_.isNil(existingPublicKey) && storedKey.uuid !== existingPublicKey.key_guid)) {
            const uuid = uuidv4();
            console.log('Generating new key!');
            return keyUtils.generateKeys()
            .then(keys => {
                this.props.keysLoaded(uuid, keys.privateKey, keys.publicKey);

                return Promise.all([
                    keyUtils.exportPrivateKey(keys.privateKey),
                    keyUtils.exportPublicKey(keys.publicKey)
                ])
            })
            .then(keyStrings => {
                keyUtils.setPrivateKey(uuid, keyUtils.stringifyPrivateKey(keyStrings[0]));

                return axios.put('/public-keys', {
                    key: keyUtils.stringifyPublicKey(keyStrings[1]),
                    uuid
                })
            });
        } else {
            return Promise.all(
                [
                    keyUtils.importPrivateKey(storedKey.pemString),
                    keyUtils.importPublicKey(existingPublicKey.public_key)
                ]
            )
            .then(keys => {
                this.props.keysLoaded(storedKey.uuid, keys[0], keys[1]);
            });
        }
    }
        
    
    componentDidMount() {
        axios.get('/settings').then(res => {
            this.props.loadSettings(res.data);
            return res.data;
        }).then(settings => {
            if (!_.isNil(settings.user)) {
                socket.open();
                return Promise.all([
                  axios.get('/who'),
                  axios.get('/conversations'),
                  this.initKeys(settings.publicKey)
                ]);
            } else {
                return Promise.resolve(null);
            }
        }).then(res => {
            if (_.isNil(res)) {
                return null;
            }
            const userList = res[0].data;
            const conversations = res[1].data;

            this.props.loadDashboardData(userList, conversations);
        }).finally(() => {
            this.setState({
                loaded: true
            })
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
        const {loaded} = this.state;

        if (!loaded) {
            return <div>Loading...</div>;
        }
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