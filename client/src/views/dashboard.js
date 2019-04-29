import React from 'react';
import PropTypes from 'prop-types'
import { withStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import { connect } from 'react-redux'
import Avatar from '@material-ui/core/Avatar';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemAvatar from '@material-ui/core/ListItemAvatar';
import _ from 'lodash';
import CircularProgress from '@material-ui/core/CircularProgress';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';


const styles = {
  onlineAvatar: {
    border: 'solid 3px green'
  },
  offlineAvatar: {
    
  },
  row: {
    cursor: 'pointer'
  },
  otherOnline: {
    marginTop: '1rem'
  }
};

const mapStateToProps = (state) => {
    return {
      onlineUsers: state.chat.onlineUsers,
      conversations: state.chat.conversations,
      session: state.session
    }
  }

@withStyles(styles)
@connect(mapStateToProps)
class Dashboard extends React.PureComponent {
    static propTypes = {
        onlineUsers: PropTypes.object,
        conversations: PropTypes.object,
        session: PropTypes.object,
        history: PropTypes.object,
        otherOnlineUsers: PropTypes.list,
        classes: PropTypes.object
    };

    constructor(props) {
      super(props);

      this.state = {
        conversations: null,
        otherOnlineUsers: null
      }
    }

    componentDidUpdate(prevProps) {
      if (prevProps.conversations !== this.props.conversations
        || prevProps.onlineUsers !== this.props.onlineUsers) {
          this.rebuildDashboardUsers();
        }
    }

    rebuildDashboardUsers = () =>{
      let {conversations, onlineUsers} = this.props;

      if (conversations === null || onlineUsers === null) {
        return;
      }

      conversations = Object.assign({}, conversations);
      onlineUsers = Object.assign({}, onlineUsers);

      _.forEach(conversations, convo => {
        const userId = convo.from_user_id;
        if (onlineUsers.hasOwnProperty(userId)) {
          delete onlineUsers[userId];
          convo.online = true;
        } else {
          convo.online = false;
        }        
      });

      conversations = _.sortBy(conversations, c => c.display_name);
      onlineUsers = _.sortBy(onlineUsers, u => u.display_name);

      this.setState({
        conversations,
        otherOnlineUsers: onlineUsers
      });
    }

    componentDidMount() {
        this.rebuildDashboardUsers();
    }

    onConversationClick = userId => {
      this.props.history.push(`/chat/${userId}`);
    }

    render() {
      if (_.isNil(this.props.session.user)) {
        return <div>Please Login</div>
      }

        const {conversations, otherOnlineUsers, classes} = this.props;
        if (otherOnlineUsers === null || conversations === null) {
            return <CircularProgress/>;
        } else {
            return (<div>
              <List>
            { _.values(conversations).map(u => 
              <ListItem key={u.from_user_id} onClick={() => this.onConversationClick(u.from_user_id)} className={classes.row}>
                <ListItemAvatar>
                  <Avatar src={u.picture} className={u.online ? classes.onlineAvatar : classes.offlineAvatar}/>
                </ListItemAvatar>
                <ListItemText
                  primary={u.display_name}
                />
              </ListItem>
            )
            }
            </List>
            <Divider/>
            <Typography variant='h4' className={classes.otherOnline}>Other Online Users</Typography>
            { _.values(otherOnlineUsers).map(u => 
              <ListItem key={u.user_id} onClick={() => this.onConversationClick(u.user_id)} className={classes.row}>
                <ListItemAvatar>
                  <Avatar src={u.picture}/>
                </ListItemAvatar>
                <ListItemText
                  primary={u.display_name}
                />
              </ListItem>
            )
            }
            
            </div>)
        }
    }
}

export default Dashboard;