import io from 'socket.io-client';
import {API_ROOT} from 'constants/api-constants';

const socket = io(API_ROOT, {
    autoConnect: false
  });
export default socket;