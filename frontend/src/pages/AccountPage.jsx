import React, { useState } from "react";
import { apiFetch } from "../api/client";
import { useAuth } from "../auth/AuthContext";

const AccountPage = () => {
  const { user, authLoading } = useAuth();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("New password and confirmation do not match.");
      return;
    }

    setStatus("loading");
    setMessage("");
    try {
      const result = await apiFetch("/change-password/", {
        method: "POST",
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      setStatus("success");
      setMessage(result?.message || "Password updated successfully.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Could not update password.");
    }
  };

  if (authLoading) {
    return (
      <section className="stone-panel stack-md" style={{ maxWidth: "720px" }}>
        <h1>Account</h1>
        <p>Loading account...</p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="stone-panel stack-md" style={{ maxWidth: "720px" }}>
        <h1>Account</h1>
        <p className="text-error">You need to log in to manage your account.</p>
      </section>
    );
  }

  return (
    <section className="stone-panel stack-md" style={{ maxWidth: "720px" }}>
      <h1>Account</h1>
      <div className="stack-sm">
        <div><strong>Username:</strong> {user.username}</div>
        <div><strong>Email:</strong> {user.email}</div>
      </div>

      <div className="divider" />

      <form onSubmit={handleSubmit} className="stack-md" style={{ maxWidth: "520px" }}>
        <h2 style={{ margin: 0 }}>Change Password</h2>
        <div className="stack-sm">
          <label htmlFor="oldPassword">Current password</label>
          <input
            id="oldPassword"
            type="password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <div className="stack-sm">
          <label htmlFor="newPassword">New password</label>
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="stack-sm">
          <label htmlFor="confirmPassword">Confirm new password</label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Updating..." : "Update Password"}
        </button>

        {message ? (
          <p className={status === "error" ? "text-error" : "text-success"} style={{ margin: 0 }}>
            {message}
          </p>
        ) : null}
      </form>
    </section>
  );
};

export default AccountPage;
