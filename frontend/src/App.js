import React from "react";
import { Routes, Route } from "react-router-dom";
import NavBar from "./components/NavBar";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPage";
import LoginPage from "./pages/LoginPage";
import AccountPage from "./pages/AccountPage";
import MyItemsPage from "./pages/MyItemsPage";
import CartPage from "./pages/CartPage";
import { AuthProvider } from "./auth/AuthContext";
import "./global.css";

const App = () => {
  return (
    <AuthProvider>
      <div className="page-shell">
        <NavBar />
        <main className="page-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/myitems" element={<MyItemsPage />} />
            <Route path="/cart" element={<CartPage />} />
          </Routes>
        </main>
      </div>
    </AuthProvider>
  );
};

export default App;
