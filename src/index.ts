import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import logger from "./logger";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
  },
});

const PORT = process.env.PORT ?? 3000;

app.get("/", (_req, res) => {
  res.json({ status: "ok" });
});

io.on("connection", (socket) => {
  logger.info(`Cliente conectado: ${socket.id}`);

  socket.on('join', ({ locker_id, building_id }) => {
    const room_id = [locker_id, building_id].sort().join('-');
    socket.join(room_id);
    logger.info(`room_id::${room_id}`);
  });

  socket.on('open_door', ({ room_id, message, locker_id }) => {
    logger.info(`mensaje de ${locker_id} a room ${room_id}: ${message}`);
    socket.to(room_id).emit('door', { message });
  });

  socket.on('update_data_base', ({ room_id, message, locker_id }) => {
    logger.info(`mensaje de ${locker_id} a room ${room_id}: ${message}`);
    socket.to(room_id).emit('update_data', { message });
  });
});

httpServer.listen(PORT, () => {
  logger.info(`Servidor escuchando en el puerto ${PORT}`);
});
