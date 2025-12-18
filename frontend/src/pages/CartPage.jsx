import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

const CartPage = () => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const loadCart = async () => {
    setStatus("loading");
    setMessage("");
    try {
      const data = await apiFetch("/cart/");
      setItems(Array.isArray(data) ? data : []);
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Failed to load cart.");
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handleRemove = async (cartId) => {
    try {
      await apiFetch(`/cart/${cartId}/`, { method: "DELETE" });
      await loadCart();
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Failed to remove item.");
    }
  };

  return (
    <section className="stone-panel stack-md" style={{ maxWidth: "780px" }}>
      <h1>My Cart</h1>
      {status === "loading" && <p>Loading cart...</p>}
      {status === "error" && <p className="text-error">{message}</p>}
      {status === "success" && items.length === 0 && <p>Your cart is empty.</p>}
      {status === "success" && items.length > 0 && (
        <ul className="list-plain">
          {items.map((entry) => (
            <li key={entry.id} className="stone-card stack-sm">
              <div className="flex-between" style={{ alignItems: "baseline" }}>
                <div className="stack-sm" style={{ gap: "0.2rem" }}>
                  <h3 style={{ margin: 0 }}>{entry.title}</h3>
                  <small>Seller: {entry.seller}</small>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700 }}>${entry.price}</div>
                  <button onClick={() => handleRemove(entry.id)}>Remove</button>
                </div>
              </div>
              {entry.description ? <p style={{ margin: 0 }}>{entry.description}</p> : null}
              <small>
                Added to cart: {entry.added_at ? new Date(entry.added_at).toLocaleString() : ""}
              </small>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default CartPage;
