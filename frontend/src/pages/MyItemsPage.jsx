import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const MyItemsPage = () => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState([]);
  const [itemsStatus, setItemsStatus] = useState("idle");
  const [itemsError, setItemsError] = useState("");

  const loadMyItems = async () => {
    setItemsStatus("loading");
    setItemsError("");
    try {
      const data = await apiFetch("/items/?mine=1");
      setItems(Array.isArray(data) ? data : []);
      setItemsStatus("success");
    } catch (error) {
      setItemsStatus("error");
      setItemsError(error.message || "Could not load your items.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const result = await apiFetch("/items/", {
        method: "POST",
        body: JSON.stringify({ title, description, price }),
      });
      setStatus("success");
      setMessage(result?.message || "Item created.");
      setTitle("");
      setDescription("");
      setPrice("");
      await loadMyItems();
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not create item.");
    }
  };

  const handleDelete = async (itemId) => {
    try {
      await apiFetch(`/items/${itemId}/`, { method: "DELETE" });
      await loadMyItems();
    } catch (error) {
      setItemsStatus("error");
      setItemsError(error.message || "Could not delete item.");
    }
  };

  useEffect(() => {
    if (user) {
      loadMyItems();
    } else {
      setItems([]);
    }
  }, [user]);

  if (!user) {
    return (
      <section className="stone-panel stack-md" style={{ maxWidth: "600px" }}>
        <h1>Add Item</h1>
        <p className="muted">You need to be logged in to add items. Please log in first.</p>
      </section>
    );
  }

  return (
    <div className="section-stack">
      <section className="stone-panel stack-md" style={{ maxWidth: "1200px" }}>
        <h1>Add Item</h1>
        <form onSubmit={handleSubmit} className="stack-md">
          <div className="stack-sm">
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="stack-sm">
            <label htmlFor="description">Item description</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="stack-sm">
            <label htmlFor="price">Price</label>
            <input
              id="price"
              type="number"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={status === "loading"}>
            {status === "loading" ? "Saving..." : "Add Item"}
          </button>
        </form>

        {message ? <p className={status === "error" ? "text-error" : "text-success"}>{message}</p> : null}
      </section>

      <section className="stone-panel stack-md" style={{ maxWidth: "1200px" }}>
        <h2>My Items</h2>
        {itemsStatus === "loading" && <p>Loading your items...</p>}
        {itemsStatus === "error" && <p className="text-error">{itemsError}</p>}
        {itemsStatus === "success" && items.length === 0 && <p>You have no items yet.</p>}
        {itemsStatus === "success" && items.length > 0 && (
          <ul className="list-plain grid-cards">
            {items.map((item) => (
              <li key={item.id} className="stone-card stack-sm">
                <div className="flex-between" style={{ alignItems: "baseline" }}>
                  <div className="stack-sm" style={{ gap: "0.2rem" }}>
                    <h3 style={{ margin: 0 }}>{item.title}</h3>
                    <small>
                      Added: {item.date_added ? new Date(item.date_added).toLocaleString() : ""}
                    </small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>${item.price}</div>
                    <button onClick={() => handleDelete(item.id)}>Delete</button>
                  </div>
                </div>
                {item.description ? <p style={{ margin: 0 }}>{item.description}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default MyItemsPage;
