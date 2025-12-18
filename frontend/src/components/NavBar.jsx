import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import "./NavBar.css";

const NavBar = () => {
  const { user, logout, authLoading } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar__section navbar__section--left">
        <Link to="/" className="navbar__brand">
          Granite Webstore
        </Link>
      </div>

      <div className="navbar__section navbar__links">
        <Link to="/" className="navbar__link">
          Home
        </Link>
        {!user && !authLoading && (
          <>
            <Link to="/signup" className="navbar__link">
              Signup
            </Link>
            <Link to="/login" className="navbar__link">
              Login
            </Link>
          </>
        )}
        <Link to="/account" className="navbar__link">
          Account
        </Link>
        <Link to="/myitems" className="navbar__link">
          My Items
        </Link>
        <Link to="/cart" className="navbar__link">
          Cart
        </Link>
      </div>

      <div className="navbar__section navbar__section--right">
        {authLoading ? (
          <span className="navbar__user navbar__user--muted">Loading…</span>
        ) : user ? (
          <div className="navbar__user">
            <span>
              Signed in as <strong>{user.username}</strong>
            </span>
            <button className="navbar__button" onClick={logout}>
              Logout
            </button>
          </div>
        ) : (
          <span className="navbar__user navbar__user--muted">Guest</span>
        )}
      </div>
    </nav>
  );
};

export default NavBar;
