import React, { useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const LoginPage = () => {
  const { setUser } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    try {
      const result = await apiFetch("/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setStatus("success");
      setMessage(result?.message || "Logged in successfully.");
      if (result?.user) {
        setUser(result.user);
      }
      setPassword("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Login failed.");
    }
  };

  return (
    <section className="stone-panel stack-md" style={{ maxWidth: "540px" }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit} className="stack-md">
        <div className="stack-sm">
          <label htmlFor="username">Username</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>

        <div className="stack-sm">
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Logging in..." : "Log In"}
        </button>
      </form>

      {message ? <p className={status === "error" ? "text-error" : "text-success"}>{message}</p> : null}
    </section>
  );
};

export default LoginPage;
