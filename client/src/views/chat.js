import React from 'react';
import axios from 'axios-instance';
import { connect } from 'react-redux';
import Avatar from '@material-ui/core/Avatar';
import Paper from '@material-ui/core/Paper';
import CircularProgress from '@material-ui/core/CircularProgress';
import { withStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import socket from 'socket-instance';
import DialogTitle from '@material-ui/core/DialogTitle';
import Dialog from '@material-ui/core/Dialog';
import Button from '@material-ui/core/Button';
import * as keyUtils from 'key-utils';

function decryptMessages(result, privateKey) {
    const messages = result.data.messages;
    const userData = result.data.userData;

    return Promise.all(messages.map(m => decryptMessage(m, privateKey)))
    .then(messages => {
        return {messages, userData}
    });
}

function decryptMessage(message, keys) {
    const {privateKey, uuid} = keys;

    let rawMessage;
    if (message.to_key_guid === uuid) {
        rawMessage = message.message;
    } else if (message.from_key_guid === uuid) {
        rawMessage = message.from_message;
    } else {
        message.decrypted = '+Key Mismatch+';
        return Promise.resolve(message);
    }

    const binaryMessage = keyUtils.str2ab(window.atob(rawMessage));
    return window.crypto.subtle.decrypt(
        {
            name: "RSA-OAEP"
        },
        privateKey,
        binaryMessage
        ).then(decrypted => {
            message.decrypted = new TextDecoder().decode(decrypted);
            return message;
        }).catch(err => {
            console.log("error decrpytping");
            message.decrypted = "Error decrypting";
            return message;
        })
    
}

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
    session: state.session,
    chat: state.chat
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
        const {match, chat} = this.props;
        const userId = match.params.id;

        Promise.all([
            axios.get(`/messages/${userId}`).then(result => decryptMessages(result, this.props.chat.keys)),
            axios.get(`/public-keys/${userId}`).then(r => {
                if (_.isNil(r.data.key)) {
                    return null;
                }

                return keyUtils.importPublicKey(r.data.key.public_key)
                .then(importedKey => {
                    return {
                        uuid: r.data.key.key_guid,
                        key: importedKey
                    }
                })
            })
        ])
        
        .then(result => {
            if (_.isNil(result[1])) {
                alert('Target user has never signed in :(');
            }
            this.setState({
                messages: result[0].messages,
                userData: result[0].userData,
                loading: false,
                publicKey: result[1]
            })
        }).then(() => {
            // This is lazy and should be moved to the main store, including the message data
            socket.on('message_received', d => {
                decryptMessage(d, chat.keys).then(message => {
                    this.setState({
                        messages: [...this.state.messages].concat(message)
                    })
                });
            })
        })
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.messages.length !== this.state.messages.length) {
            this.scrollToBottom();              
        }
    }

    sendMessage = () => {
        const {input, messages, publicKey} = this.state;
        const {session, match, chat} = this.props;

        Promise.all([
            crypto.subtle.encrypt({
                name: "RSA-OAEP"
              },
              publicKey.key,
              Buffer.from(input, 'utf8')
              ),
              crypto.subtle.encrypt({
                name: "RSA-OAEP"
              },
              chat.keys.publicKey,
              Buffer.from(input, 'utf8')
            )
        ])

        
        .then(encryptedTexts => {
            const textString = window.btoa(keyUtils.ab2str(encryptedTexts[0]));
            const fromTextString = window.btoa(keyUtils.ab2str(encryptedTexts[1]));

            axios.post(`/messages/${match.params.id}`,
            {
                message: textString,
                keyGuid: publicKey.uuid,
                fromMessage: fromTextString,
                fromKeyGuid: chat.keys.uuid
            });
        })



         const newMessage = {
             message: input,
             decrypted: input,
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
                        <div className={classes.p} key={m.message_id}>
                        { session.user.user_id === m.from_user_id ? 
                            <Paper className={classes.messageRow}>
                                <Avatar src={userDataLookup[m.from_user_id].picture}/>
                                <span className={classes.message}>{m.decrypted}</span>
                            </Paper>
                        :
                            <Paper className={classes.messageRowFrom}>
                                <Avatar src={userDataLookup[m.from_user_id].picture}/>
                                <span className={classes.messageFrom}>{m.decrypted}</span>
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
                disabled={this.state.publicKey === null}
            />
        </div>
      </div>)
    }
}

export default Chat;