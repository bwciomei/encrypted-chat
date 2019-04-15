import React from 'react';
import { Route, Switch } from 'react-router'
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
import {loadOnlineUsers} from 'actions/chat-actions';
import AccountCircle from '@material-ui/icons/AccountCircle';
import Avatar from '@material-ui/core/Avatar';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import _ from 'lodash';
import CircularProgress from '@material-ui/core/CircularProgress';
import ListItemText from '@material-ui/core/ListItemText';

const mapStateToProps = (state) => {
    return {
      onlineUsers: state.chat.onlineUsers
    }
  }
class Dashboard extends React.PureComponent {
    static propTypes = {
        onlineUsers: PropTypes.object
    };

    render() {
        const {onlineUsers} = this.props;
        console.log(onlineUsers);
        if (onlineUsers === null) {
            return <CircularProgress/>;
        } else {
            return (<List>
            { _.values(onlineUsers).map(u => 
              <ListItem key={u.user_id}>
                <ListItemAvatar>
                  <Avatar src={u.picture}/>
                </ListItemAvatar>
                <ListItemText
                  primary={u.display_name}
                />
              </ListItem>
            )
            }
            </List>)
        }
    }
}

export default connect(mapStateToProps, null)(Dashboard);