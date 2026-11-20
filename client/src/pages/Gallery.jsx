import { useEffect, useRef, useState } from "react";
import api from "../api";
import socket from "../socket";
import { useAuth } from "../AuthContext";
import PhotoCard from "../components/PhotoCard";

// Adds a photo to the list only if it is not already there (avoids duplicates)
const withPhoto = (list, photo) =>
  list.some((p) => p._id === photo._id) ? list : [photo, ...list];

export default function Gallery() {
  const { user } = useAuth();
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);

  // Runs once when the page opens: loads all photos from the API
  useEffect(() => {
    const loadPhotos = async () => {
      try {
        const { data } = await api.get("/photos");
        setPhotos(data.photos);
      } catch {
        setErrors(["Could not load photos. Is the server running?"]);
      } finally {
        setLoading(false);
      }
    };
    loadPhotos();
  }, []);

  // Real-time: new photos appear and deleted photos disappear for everyone
  useEffect(() => {
    const onNewPhoto = (photo) => {
      setPhotos((prev) => withPhoto(prev, photo));
      if (photo.userId?._id !== user?.id) {
        setNotice(`New photo: "${photo.title}"`);
        setTimeout(() => setNotice(""), 4000);
      }
    };
    const onDeleted = (id) => setPhotos((prev) => prev.filter((p) => p._id !== id));

    socket.on("photo:new", onNewPhoto);
    socket.on("photo:deleted", onDeleted);
    socket.connect();

    // Cleanup when leaving the page
    return () => {
      socket.off("photo:new", onNewPhoto);
      socket.off("photo:deleted", onDeleted);
      socket.disconnect();
    };
  }, [user?.id]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrors(["Please choose a photo first."]);
      return;
    }
    setErrors([]);
    setUploading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("photo", file);

    try {
      const { data } = await api.post("/photos", formData);
      // The socket event may arrive first; withPhoto ignores the duplicate
      setPhotos((prev) => withPhoto(prev, data.photo));
      setTitle("");
      setDescription("");
      setFile(null);
      fileInput.current.value = "";
    } catch (err) {
      const data = err.response?.data;
      setErrors(data?.errors || [data?.message || "Upload failed. Please try again."]);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this photo?")) return;
    try {
      await api.delete(`/photos/${id}`);
      setPhotos((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      setErrors([err.response?.data?.message || "Could not delete the photo."]);
    }
  };

  return (
    <section>
      <h1>Gallery</h1>

      {notice && <p className="notice">{notice}</p>}

      {errors.length > 0 && (
        <ul className="alert">
          {errors.map((msg) => <li key={msg}>{msg}</li>)}
        </ul>
      )}

      {user && (
        <form className="card upload-form" onSubmit={handleUpload}>
          <h2>Upload a photo</h2>
          <label>Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} />
          </label>
          <label>Description
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={500} />
          </label>
          <label>Photo
            <input type="file" accept="image/*" ref={fileInput} onChange={(e) => setFile(e.target.files[0])} />
          </label>
          <button className="btn" type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      )}

      {loading ? (
        <p>Loading photos...</p>
      ) : photos.length === 0 ? (
        <p className="muted">No photos yet. Be the first to share a memory!</p>
      ) : (
        <div className="photo-grid">
          {photos.map((photo) => (
            <PhotoCard
              key={photo._id}
              photo={photo}
              canDelete={user && photo.userId?._id === user.id}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
}