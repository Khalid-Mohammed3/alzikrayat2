require("dotenv").config();
const http = require("http");
const path = require("path");
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const errorHandler = require("./middleware/errorHandler");
const initSocket = require("./socket");

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded images publicly
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "Alzikrayat API is running" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/photos", require("./routes/photoRoutes"));

app.use(errorHandler); // must come after the routes

const PORT = process.env.PORT || 5000;

// Socket.io attaches to the raw HTTP server, so Express runs on top of it
const server = http.createServer(app);
const io = initSocket(server);
app.set("io", io); // lets controllers broadcast events

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection error:", err.message));