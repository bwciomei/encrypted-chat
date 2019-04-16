import React from 'react';
import axios from 'axios-instance';
import { connect } from 'react-redux';
import Avatar from '@material-ui/core/Avatar';
import Paper from '@material-ui/core/Paper';
import CircularProgress from '@material-ui/core/CircularProgress';
import { withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import socket from 'socket-instance';

const styles = theme => ({
    messageRow: {
        display: 'flex',
        flexDirection: 'row-reverse',
        padding: '.5rem'
    },
    message: {
        lineHeight: '40px',
        padding: '0 .5rem',
    },
    messageFrom: {
        lineHeight: '40px',
        padding: '0 .5rem',
        textAlign: 'right'
    },
    messageRowFrom: {
        display: 'flex',
        flexDirection: 'row',
        padding: '.5rem',
        backgroundColor: '#c2ccff'
    },
    p: {
        margin: '.5rem'
    },
    messageInput: {
        width: '100%'
    },
    messageContainer: {
        overflowY: 'scroll',
        maxHeight: '80vh'
    }
})
const mapStateToProps = state => ({
    router: state.router,
    session: state.session
  });

@withStyles(styles)
@connect(mapStateToProps)
class Chat extends React.PureComponent {
    constructor(props) {
        super(props);

        this.state = {
            messages: [],
            userData: [],
            loading: true,
            input: ''
        }
    }
    componentDidMount() {
        const {match} = this.props;
        const userId = match.params.id;
        axios.get(`/messages/${userId}`)
        .then(result => {
            this.setState({
                messages: result.data.messages,
                userData: result.data.userData,
                loading: false
            })
        }).then(() => {
            // This is lazy and should be moved to the main store, including the message data
            socket.on('message_received', d => {
                this.setState({
                    messages: [...this.state.messages].concat(d)
                })
            })
        })
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.messages.length !== this.state.messages.length) {
            this.scrollToBottom();              
        }
    }

    sendMessage = () => {
        const {input, messages} = this.state;
        const {session, match} = this.props;
        axios.post(`/messages/${match.params.id}`,
         {
            message: input             
         });

         const newMessage = {
             message: input,
             from_user_id: session.user.user_id,
             to_user_id: match.params.id,
             sent_timestamp: new Date()
         };

         this.setState({
            input: '',
            messages: [...messages].concat(newMessage)
        });
    }

    onKeyDown = ev => {
        if (ev.keyCode === 13) {
            this.sendMessage();
        }
    }

    onInputChange = (e) => {
        this.setState({
            input: e.target.value
        })
    }

    scrollToBottom = () => {
        this.messagesEnd.scrollIntoView();
      }
      

    render() {
        const {messages, userData, loading} = this.state;
        const {classes, session} = this.props;

        if (loading) {
            return <CircularProgress/>
        }

        const userDataLookup = _.keyBy(userData, u => u.user_id);
        return (
            <div>
                <div className={classes.messageContainer}>
                {messages.map(m => {
                    return (
                        <div className={classes.p}>
                        { session.user.user_id === m.from_user_id ? 
                            <Paper key={m.message_id} className={classes.messageRow}>
                                <Avatar src={userDataLookup[m.from_user_id].picture}/>
                                <span className={classes.message}>{m.message}</span>
                            </Paper>
                        :
                            <Paper key={m.message_id} className={classes.messageRowFrom}>
                                <Avatar src={userDataLookup[m.from_user_id].picture}/>
                                <span className={classes.messageFrom}>{m.message}</span>
                            </Paper>
                        }
                        </div>
                    );
                })
            }
        <div style={{ float:"left", clear: "both" }}
             ref={(el) => { this.messagesEnd = el; }}>
        </div>
        </div>
        <div>
            <TextField
                id="outlined-bare"
                className={classes.messageInput}
                placeholder="Enter a message"
                margin="normal"
                variant="outlined"
                onKeyDown={this.onKeyDown}
                onChange={this.onInputChange}
                value={this.state.input}
            />
        </div>
      </div>)
    }
}

export default Chat;