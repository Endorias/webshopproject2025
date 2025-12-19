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
  const [inventory, setInventory] = useState({ on_sale: [], sold: [], purchased: [] });
  const [inventoryStatus, setInventoryStatus] = useState("idle");
  const [inventoryError, setInventoryError] = useState("");
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingPrice, setEditingPrice] = useState("");
  const [editStatus, setEditStatus] = useState("idle");
  const [editMessage, setEditMessage] = useState("");

  const loadInventory = async () => {
    setInventoryStatus("loading");
    setInventoryError("");
    try {
      const data = await apiFetch("/inventory/");
      setInventory({
        on_sale: Array.isArray(data?.on_sale) ? data.on_sale : [],
        sold: Array.isArray(data?.sold) ? data.sold : [],
        purchased: Array.isArray(data?.purchased) ? data.purchased : [],
      });
      setInventoryStatus("success");
    } catch (error) {
      setInventoryStatus("error");
      setInventoryError(error.message || "Could not load your items.");
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
      await loadInventory();
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not create item.");
    }
  };

  const startEditing = (item) => {
    setEditingItemId(item.id);
    setEditingPrice(item.price);
    setEditStatus("idle");
    setEditMessage("");
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingPrice("");
    setEditStatus("idle");
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!editingItemId) return;

    setEditStatus("loading");
    setEditMessage("");
    try {
      const result = await apiFetch(`/items/${editingItemId}/`, {
        method: "PATCH",
        body: JSON.stringify({ price: editingPrice }),
      });
      setEditStatus("success");
      setEditMessage(result?.message || "Price updated.");
      setEditingItemId(null);
      setEditingPrice("");
      await loadInventory();
    } catch (error) {
      setEditStatus("error");
      setEditMessage(error.message || "Could not update price.");
    }
  };

  const handleDelete = async (itemId) => {
    try {
      await apiFetch(`/items/${itemId}/`, { method: "DELETE" });
      await loadInventory();
    } catch (error) {
      setInventoryStatus("error");
      setInventoryError(error.message || "Could not delete item.");
    }
  };

  useEffect(() => {
    if (user) {
      loadInventory();
    } else {
      setInventory({ on_sale: [], sold: [], purchased: [] });
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
        <div className="flex-between" style={{ alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>My Inventory</h2>
          {inventoryStatus === "loading" && <span>Loading...</span>}
        </div>
        {inventoryStatus === "error" && <p className="text-error">{inventoryError}</p>}
        {editMessage ? (
          <p className={editStatus === "error" ? "text-error" : "text-success"}>{editMessage}</p>
        ) : null}

        {inventoryStatus === "success" && (
          <div className="stack-md">
            <div className="stack-sm">
              <h3 style={{ margin: 0 }}>On Sale</h3>
              {inventory.on_sale.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>You have no items on sale.</p>
              ) : (
                <ul className="list-plain grid-cards">
                  {inventory.on_sale.map((item) => (
                    <li key={item.id} className="stone-card stack-sm">
                      <div className="flex-between" style={{ alignItems: "baseline" }}>
                        <div className="stack-sm" style={{ gap: "0.2rem" }}>
                          <h4 style={{ margin: 0 }}>{item.title}</h4>
                          <small>
                            Added: {item.date_added ? new Date(item.date_added).toLocaleString() : ""}
                          </small>
                        </div>
                        <div className="stack-sm" style={{ textAlign: "right", alignItems: "flex-end", display: "flex", flexDirection: "column" }}>
                          {editingItemId === item.id ? (
                            <form onSubmit={handleEditSubmit} className="stack-sm" style={{ alignItems: "flex-end" }}>
                              <label htmlFor={`edit-price-${item.id}`} style={{ fontWeight: 600 }}>
                                Price
                              </label>
                              <input
                                id={`edit-price-${item.id}`}
                                type="number"
                                step="0.01"
                                value={editingPrice}
                                onChange={(e) => setEditingPrice(e.target.value)}
                                required
                                style={{ minWidth: "140px" }}
                              />
                              <div className="flex" style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
                                <button type="button" onClick={cancelEditing} disabled={editStatus === "loading"}>
                                  Cancel
                                </button>
                                <button type="submit" disabled={editStatus === "loading"}>
                                  {editStatus === "loading" ? "Saving..." : "Save"}
                                </button>
                              </div>
                            </form>
                          ) : (
                            <>
                              <div style={{ fontWeight: 700 }}>${item.price}</div>
                              <div className="flex" style={{ gap: "0.5rem" }}>
                                <button onClick={() => startEditing(item)}>Edit</button>
                                <button onClick={() => handleDelete(item.id)}>Delete</button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      {item.description ? <p style={{ margin: 0 }}>{item.description}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="stack-sm">
              <h3 style={{ margin: 0 }}>Sold</h3>
              {inventory.sold.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>No sold items yet.</p>
              ) : (
                <ul className="list-plain grid-cards">
                  {inventory.sold.map((item) => (
                    <li key={item.id} className="stone-card stack-sm">
                      <div className="flex-between" style={{ alignItems: "baseline" }}>
                        <h4 style={{ margin: 0 }}>{item.title}</h4>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700 }}>${item.price}</div>
                          <small>Buyer: {item.buyer || "Unknown"}</small>
                        </div>
                      </div>
                      {item.description ? <p style={{ margin: 0 }}>{item.description}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="stack-sm">
              <h3 style={{ margin: 0 }}>Purchased</h3>
              {inventory.purchased.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>You have not purchased any items.</p>
              ) : (
                <ul className="list-plain grid-cards">
                  {inventory.purchased.map((item) => (
                    <li key={item.id} className="stone-card stack-sm">
                      <div className="flex-between" style={{ alignItems: "baseline" }}>
                        <h4 style={{ margin: 0 }}>{item.title}</h4>
                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700 }}>${item.price}</div>
                          <small>Seller: {item.owner}</small>
                        </div>
                      </div>
                      {item.description ? <p style={{ margin: 0 }}>{item.description}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default MyItemsPage;
