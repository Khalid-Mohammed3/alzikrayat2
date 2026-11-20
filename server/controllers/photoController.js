const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Photo = require("../models/Photo");
const Comment = require("../models/Comment");

const OWNER_FIELDS = "firstName lastName";

exports.getAll = async (req, res, next) => {
  try {
    const photos = await Photo.find().sort({ dateTime: -1 }).populate("userId", OWNER_FIELDS);
    res.status(200).json({ success: true, photos });
  } catch (err) {
    next(err);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid photo id" });
    }

    const photo = await Photo.findById(id).populate("userId", OWNER_FIELDS);
    if (!photo) {
      return res.status(404).json({ success: false, message: "Photo not found" });
    }

    const comments = await Comment.find({ photoId: id })
      .sort({ dateTime: 1 })
      .populate("userId", OWNER_FIELDS);

    res.status(200).json({ success: true, photo, comments });
  } catch (err) {
    next(err);
  }
};

exports.create = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Photo file is required" });
    }

    const photo = await Photo.create({
      userId: req.userId,
      fileName: req.file.filename,
      title: req.body.title,
      description: req.body.description,
    });

    // Add the owner's name so every client can display the new photo right away
    await photo.populate("userId", OWNER_FIELDS);

    // Real-time: tell every connected client about the new photo
    const io = req.app.get("io");
    if (io) io.emit("photo:new", JSON.parse(JSON.stringify(photo)));

    res.status(201).json({ success: true, photo });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {});
    next(err);
  }
};


exports.remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid photo id" });
    }

    const photo = await Photo.findById(id);
    if (!photo) {
      return res.status(404).json({ success: false, message: "Photo not found" });
    }

    // Ownership check: only the owner can delete
    if (photo.userId.toString() !== req.userId) {
      return res.status(403).json({ success: false, message: "You can only delete your own photos" });
    }

    await Comment.deleteMany({ photoId: id });
    await photo.deleteOne();
    fs.unlink(path.join(__dirname, "..", "uploads", photo.fileName), () => {});

    // Real-time: tell every connected client to remove the photo
    const io = req.app.get("io");
    if (io) io.emit("photo:deleted", id);

    res.status(200).json({ success: true, message: "Photo deleted" });
  } catch (err) {
    next(err);
  }
};