const { Server } = require("socket.io");
const mongoose = require("mongoose");

module.exports = (httpServer) => {
  const io = new Server(httpServer);

  io.on("connection", (socket) => {
    // A client joins the room of the photo it is viewing
    socket.on("photo:join", (photoId) => {
      if (mongoose.isValidObjectId(photoId)) socket.join(`photo:${photoId}`);
    });

    socket.on("photo:leave", (photoId) => {
      socket.leave(`photo:${photoId}`);
    });
  });

  return io;
};