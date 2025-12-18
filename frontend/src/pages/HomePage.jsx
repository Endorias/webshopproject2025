import React, { useEffect, useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const HomePage = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState([]);
  const [itemsStatus, setItemsStatus] = useState("idle");
  const [itemsError, setItemsError] = useState("");
  const [cartMessage, setCartMessage] = useState("");
  const [cartStatus, setCartStatus] = useState("idle");

  const fetchItems = async () => {
    setItemsStatus("loading");
    setItemsError("");
    try {
      const data = await apiFetch("/items/");
      setItems(data || []);
      setItemsStatus("success");
    } catch (error) {
      setItemsStatus("error");
      setItemsError(error.message || "Failed to load items.");
    }
  };

  const handlePopulate = async () => {
    setStatus("loading");
    setMessage("Populating database with demo data...");
    try {
      const result = await apiFetch("/seed-demo/", { method: "POST" });
      setStatus("success");
      setMessage(result?.message || "Demo data generated successfully.");
      await fetchItems();
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Failed to populate the database.");
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAddToCart = async (item) => {
    setCartStatus("loading");
    setCartMessage("");
    try {
      const result = await apiFetch("/cart/", {
        method: "POST",
        body: JSON.stringify({ item_id: item.id }),
      });
      setCartStatus("success");
      setCartMessage(result?.message || "Added to cart.");
    } catch (error) {
      setCartStatus("error");
      setCartMessage(error.message || "Could not add to cart.");
    }
  };

  return (
    <div className="section-stack">
      <section className="stone-panel stack-md">
        <div className="flex-between" style={{ alignItems: "center" }}>
          <h1 style={{ margin: 0 }}>Welcome to the Webshop</h1>
          <div className="stack-sm align-end">
            <p style={{ margin: 0 }}>Click to populate demo data</p>
            <button onClick={handlePopulate} disabled={status === "loading"}>
              {status === "loading" ? "Seeding..." : "Populate Demo Data"}
            </button>
            {message ? (
              <p className={status === "error" ? "text-error" : "text-success"} style={{ margin: 0 }}>
                {message}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="stone-panel stack-md">
        <div className="flex-between">
          <h2>Items for Sale</h2>
          {cartMessage ? (
            <span className={cartStatus === "error" ? "text-error" : "text-success"}>{cartMessage}</span>
          ) : null}
        </div>
        {itemsStatus === "loading" && <p>Loading items...</p>}
        {itemsStatus === "error" && <p className="text-error">{itemsError || "Could not load items."}</p>}
        {itemsStatus === "success" && items.length === 0 && <p>No items available.</p>}
        {itemsStatus === "success" && items.length > 0 && (
          <ul className="list-plain grid-cards">
            {items.map((item) => (
              <li key={item.id} className="stone-card stack-sm">
                <div className="flex-between" style={{ alignItems: "baseline" }}>
                  <h3 style={{ margin: 0 }}>{item.title}</h3>
                  <span style={{ fontWeight: 700 }}>${item.price}</span>
                </div>
                <p style={{ margin: 0 }}>{item.description}</p>
                <small>
                  Added: {item.date_added ? new Date(item.date_added).toLocaleString() : ""}
                </small>
                <div className="flex-between" style={{ alignItems: "center" }}>
                  {user && user.username === item.owner ? (
                    <span className="muted">This is your item.</span>
                  ) : (
                    <button onClick={() => handleAddToCart(item)} disabled={cartStatus === "loading" || !user}>
                      {cartStatus === "loading" ? "Adding..." : "Add to Cart"}
                    </button>
                  )}
                  {!user && <small className="text-error">Log in to add to cart.</small>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default HomePage;
