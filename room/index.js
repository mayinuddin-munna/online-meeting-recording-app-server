const { v4: uuIdv4 } = require("uuid");

// --------------------------------
// Global variable
const rooms = {};
const chats = {};
// --------------------------------

const roomHandler = (socket) => {
  const createRoom = () => {
    const roomId = uuIdv4();
    rooms[roomId] = [];
    socket.emit("room-create", { roomId });
    console.log("User create a room");
  };

  const joinRoom = ({ roomId, peerId }) => {
    if (!rooms[roomId]) rooms[roomId] = [];

    socket.emit("get-messages", chats[roomId]);

    console.log("User join the room hurray", roomId, peerId);
    rooms[roomId].push(peerId);
    socket.join(roomId);
    socket.to(roomId).emit("user-joined", { peerId });

    socket.emit("get-users", {
      roomId,
      participants: rooms[roomId],
    });

    socket.on("disconnect", () => {
      console.log("User left the room", peerId);
      leaveRoom({ roomId, peerId });
    });
  };

  const leaveRoom = ({ peerId, roomId }) => {
    rooms[roomId] = rooms[roomId]?.filter((id) => id !== peerId);
    socket.to(roomId).emit("user-disconnected", peerId);
  };

  const startSharing = ({ peerId, roomId }) => {
    socket.to(roomId).emit("user-started-sharing", peerId);
  };

  const stopSharing = (roomId) => {
    socket.to(roomId).emit("user-stop-sharing");
  };

  const addMessage = (roomId, message) => {
    console.log({ message });
    if (chats[roomId]) {
      chats[roomId].push(message);
    } else {
      chats[roomId] = [message];
    }
    socket.to(roomId).emit("add-message", message);
  };

  socket.on("create-room", createRoom);
  socket.on("join-room", joinRoom);
  socket.on("start-sharing", startSharing);
  socket.on("stop-sharing", stopSharing);
  socket.on("send-message", addMessage);
};

<<<<<<< HEAD
module.exports = roomHandler;
=======
module.exports = roomHandler;
<<<<<<< HEAD
>>>>>>> 1b464fedb7a006bef46079871bea7432facb7d2a
=======
>>>>>>> 7fd1c224ed9f4fbca82160d60369ce4a300bc512
>>>>>>> 78dfae656a0842e7a221c3950719076e362ef19b
