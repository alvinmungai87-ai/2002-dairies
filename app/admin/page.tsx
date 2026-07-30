"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial Fetch
  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      if (data.orders) setOrders(data.orders);
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Real-Time Listener for New Orders or Updates
    const channel = supabase
      .channel("realtime-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setOrders((prev) => [payload.new, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setOrders((prev) =>
              prev.map((ord) => (ord.id === payload.new.id ? payload.new : ord))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Handler to update order or payment status
  const updateStatus = async (orderId: string, orderStatus: string, paymentStatus?: string) => {
    try {
      const res = await fetch("/api/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, orderStatus, paymentStatus }),
      });
      const data = await res.json();
      if (!data.success) {
        alert("Failed to update status: " + data.error);
      }
    } catch (err) {
      alert("Error updating order status.");
    }
  };

  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "1200px", margin: "0 auto" }}>
      <h2>Live Orders Dashboard (Real-Time)</h2>
      {loading ? (
        <p>Loading orders...</p>
      ) : orders.length === 0 ? (
        <p>No orders placed yet.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }} border={1} cellPadding={10}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6" }}>
              <th>Order #</th>
              <th>Customer</th>
              <th>Phone / Location</th>
              <th>Total</th>
              <th>Payment Status</th>
              <th>Order Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><strong>{order.order_number}</strong></td>
                <td>{order.customer_name}</td>
                <td>{order.phone_number}<br /><small>{order.delivery_location}</small></td>
                <td>KES {order.total_amount}</td>
                <td>
                  <span style={{
                    color: order.payment_status === "Paid" ? "green" : "orange",
                    fontWeight: "bold"
                  }}>
                    {order.payment_status}
                  </span>
                </td>
                <td>
                  <strong style={{
                    color: order.order_status === "Delivered" ? "green" : order.order_status === "Cancelled" ? "red" : "#2563eb"
                  }}>
                    {order.order_status}
                  </strong>
                </td>
                <td>
                  <select
                    value={order.order_status}
                    onChange={(e) => updateStatus(order.id, e.target.value)}
                    style={{ padding: "4px", borderRadius: "4px", marginRight: "6px" }}
                  >
                    <option value="Processing">Processing</option>
                    <option value="Dispatched">Dispatched</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>

                  {order.payment_status !== "Paid" && (
                    <button
                      onClick={() => updateStatus(order.id, order.order_status, "Paid")}
                      style={{ padding: "4px 8px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}
                    >
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}