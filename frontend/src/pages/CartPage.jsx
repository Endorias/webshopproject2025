import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";

const CartPage = () => {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [payStatus, setPayStatus] = useState("idle");
  const [payMessage, setPayMessage] = useState("");
  const [itemWarnings, setItemWarnings] = useState({});

  const loadCart = async () => {
    setStatus("loading");
    setMessage("");
    setItemWarnings({});
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

  const handlePay = async () => {
    if (items.length === 0) return;

    setPayStatus("loading");
    setPayMessage("");
    setItemWarnings({});

    const payload = {
      items: items.map((entry) => ({ cart_item_id: entry.id, price: entry.price })),
    };

    try {
      const result = await apiFetch("/cart/pay/", { method: "POST", body: JSON.stringify(payload) });
      setPayStatus("success");
      setPayMessage(result?.message || "Payment completed. Items purchased.");
      await loadCart();
    } catch (error) {
      setPayStatus("error");
      setPayMessage(error.message || "Payment failed. Please review your cart.");

      const details = error?.details || {};
      const priceChanges = Array.isArray(details.price_changes) ? details.price_changes : [];
      const unavailable = Array.isArray(details.unavailable_items) ? details.unavailable_items : [];

      if (priceChanges.length > 0) {
        setItems((prev) =>
          prev.map((entry) => {
            const change = priceChanges.find((item) => item.cart_item_id === entry.id);
            if (!change) return entry;
            return { ...entry, price: change.current_price };
          })
        );
      }

      const warnings = {};
      priceChanges.forEach((change) => {
        warnings[change.cart_item_id] = {
          type: "price",
          message: `Price updated to $${change.current_price}`,
        };
      });
      unavailable.forEach((item) => {
        warnings[item.cart_item_id] = {
          type: "unavailable",
          message: "This item is no longer available.",
        };
      });

      if (Object.keys(warnings).length > 0) {
        setItemWarnings(warnings);
      }
    }
  };

  return (
    <section className="stone-panel stack-md" style={{ maxWidth: "780px" }}>
      <h1>My Cart</h1>
      {status === "loading" && <p>Loading cart...</p>}
      {status === "error" && <p className="text-error">{message}</p>}
      {status === "success" && items.length === 0 && <p>Your cart is empty.</p>}
      {status === "success" && items.length > 0 && (
        <div className="stack-md">
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
                    {itemWarnings[entry.id]?.type === "price" && (
                      <small className="text-error">{itemWarnings[entry.id].message}</small>
                    )}
                    {itemWarnings[entry.id]?.type === "unavailable" && (
                      <small className="text-error">{itemWarnings[entry.id].message}</small>
                    )}
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

          <div className="flex-between" style={{ alignItems: "center" }}>
            <div>
              {payMessage ? (
                <p className={payStatus === "error" ? "text-error" : "text-success"} style={{ margin: 0 }}>
                  {payMessage}
                </p>
              ) : null}
            </div>
            <button onClick={handlePay} disabled={payStatus === "loading"}>
              {payStatus === "loading" ? "Processing..." : "Pay"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default CartPage;
