// Holds the Socket.IO server instance so HTTP-side services (e.g. a battle submission
// finishing evaluation) can push events to rooms without importing the HTTP server.
let ioInstance = null;

const setIo = (io) => {
  ioInstance = io;
};

const getIo = () => ioInstance;

module.exports = {
  getIo,
  setIo,
};
