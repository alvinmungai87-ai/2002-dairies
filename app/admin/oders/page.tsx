"use client";

import { useEffect, useState } from "react";

const parseItems = (itemsData: any) => {
  return [];
};

export default function AdminOrdersPage() {
  // --- Password Protection State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // 🔑 Set your secret admin password here!
  const ADMIN_PASSWORD = "YourSecretPassword123";

  // --- Orders Dashboard State ---
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect admin password!");
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.orders) {
        setOrders(data.orders);
      }
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // 🔒 Lockout Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <form
          onSubmit={handleLogin}
          className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm space-y-4"
        >
          <h2 className="text-xl font-bold text-gray-800">Admin Access Required</h2>
          <p className="text-sm text-gray-600">Please enter the passcode to view orders.</p>

          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter Admin Password"
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-black"
            required
          />

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg"
          >
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  // 🔓 Unlocked Orders Dashboard UI
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Live Orders Dashboard</h1>
      {loading ? (
        <p className="text-gray-600">Loading orders...</p>
      ) : (
        <div className="space-y-4">
          <p className="text-gray-700">Total Orders: {orders.length}</p>
          {/* Your existing orders table or map goes here */}
        </div>
      )}
    </div>
  );
}