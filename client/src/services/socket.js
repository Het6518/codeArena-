import { io } from 'socket.io-client';
import { SOCKET_URL } from '../constants/app';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: (callback) => {
        callback({
          token: localStorage.getItem('codearena_token'),
        });
      },
    });
  }

  return socket;
};

export const connectSocket = () => {
  const activeSocket = getSocket();

  if (!activeSocket.connected) {
    activeSocket.connect();
  }

  return activeSocket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};

// Emits an event and resolves with the server acknowledgement. Rejects on failure
// responses or when the server does not answer in time.
export const emitWithAck = (eventName, payload, timeoutMs = 10000) => {
  const activeSocket = connectSocket();

  return new Promise((resolve, reject) => {
    activeSocket.timeout(timeoutMs).emit(eventName, payload, (error, response) => {
      if (error) {
        reject(new Error('Server did not respond. Check your connection and try again.'));
        return;
      }

      if (!response?.success) {
        reject(new Error(response?.message || 'Request failed'));
        return;
      }

      resolve(response);
    });
  });
};
