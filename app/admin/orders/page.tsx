"use client";

import { useEffect, useState } from "react";

// Safe JSON parser to prevent crashes on corrupted items data
const parseItems = (itemsData: any) => {
  if (!itemsData) return [];
  if (Array.isArray(itemsData)) return itemsData;
  if (typeof itemsData === "object") return [itemsData];
  try {
    return JSON.parse(itemsData);
  } catch (e) {
    console.error("Error parsing items JSON:", e);
    return [];
  }
};

export default function AdminOrdersPage() {
  // --- PASSWORD AUTHENTICATION STATE ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // 🔑 Set your secret admin passcode here!
  const ADMIN_PASSWORD = "YourSecretPassword123";

  // --- ORDERS DASHBOARD STATE ---
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid">("all");

  // Handle Admin Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (authPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("Incorrect admin password!");
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

  // Only poll and load orders after the admin has successfully logged in
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Checkbox Payment Toggle Handler
  const handlePaymentToggle = async (orderId: string, currentStatus: string) => {
    const isPaid = currentStatus?.startsWith("Paid");
    const newStatus = isPaid ? "Pending (Pay on Delivery)" : "Paid";

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, payment_status: newStatus } : o))
    );

    try {
      const res = await fetch("/api/orders/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, paymentStatus: newStatus }),
      });

      const data = await res.json();
      if (!data.success) {
        alert("Failed to update status: " + data.error);
        fetchOrders();
      }
    } catch (err) {
      console.error("Error updating status:", err);
      fetchOrders();
    }
  };

  // Stats Calculations
  const totalOrdersCount = orders.length;
  const totalRevenue = orders
    .filter((o) => o.payment_status?.startsWith("Paid"))
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  const pendingRevenue = orders
    .filter((o) => !o.payment_status?.startsWith("Paid"))
    .reduce((sum, o) => sum + Number(o.total_amount || 0), 0);

  // Filter Logic
  const filteredOrders = orders.filter((o) => {
    if (filter === "paid") return o.payment_status?.startsWith("Paid");
    if (filter === "pending") return !o.payment_status?.startsWith("Paid");
    return true;
  });

  // WHATSAPP MESSAGE GENERATOR
  const handleWhatsAppCustomer = (order: any) => {
    let rawPhone = String(order.phone_number || "").replace(/\D/g, "");

    if (rawPhone.startsWith("0")) {
      rawPhone = "254" + rawPhone.slice(1);
    }

    const itemsList = parseItems(order.items);
    const itemNames = itemsList.map((i: any) => `${i.name || i.title} (x${i.quantity || i.qty || 1})`).join(", ");

    const message = `Hello ${order.customer_name}, thank you for ordering with us!\n\n` + 
     `${order.order_number || order.id}\n` +
      `*Items:* ${itemNames || "N/A"}\n` +
      `*Total Amount:* KES ${order.total_amount}\n` +
      `*Delivery Location:* ${order.delivery_location || order.delivery_address}\n` +
      `*Payment Status:* ${order.payment_status}\n\n` +
      `We are currently processing your order. Reply here if you have any questions!`;

    const encodedMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${rawPhone}?text=${encodedMsg}`, "_blank");
  };

  // EXPORT ORDERS TO CSV FOR EXCEL
  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert("No orders available to export.");
      return;
    }

    const headers = ["Order ID", "Customer Name", "Phone", "Location", "Items", "Total Amount (KES)", "Payment Status", "Date"];
    
    const rows = orders.map((o) => {
      const itemsList = parseItems(o.items);
      const itemsFormatted = itemsList.map((i: any) => `${i.name || i.title} (x${i.quantity || i.qty || 1})`).join(" | ");

      return [
        "${o.order_number || o.id}",
        "${o.customer_name || ''}",
        "${o.phone_number || ''}",
        "${o.delivery_location || o.delivery_address || ''}",
        "${itemsFormatted}",
        "${o.total_amount || 0}",
        "${o.payment_status || ''}",
        "${o.created_at ? new Date(o.created_at).toLocaleString() : ''}",
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `orders_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PRINT RECEIPT ACTION
  const handlePrintReceipt = (order: any) => {
    const itemsList = parseItems(order.items);
    const printWindow = window.open("", "_blank", "width=600,height=700");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt #${order.order_number || order.id}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 15px; }
            .details { margin-bottom: 15px; }
            .items-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
            .items-table th, .items-table td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
            .total { font-weight: bold; font-size: 1.1em; text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h2>ORDER RECEIPT</h2>
            <p><strong>Order #: ${order.order_number || order.id}</strong></p>
            <p>Date: ${order.created_at ? new Date(order.created_at).toLocaleString() : 'N/A'}</p>
          </div>
          
          <div class="details">
            <p><strong>Customer:</strong> ${order.customer_name}</p>
            <p><strong>Phone:</strong> ${order.phone_number}</p>
            <p><strong>Delivery Location:</strong> ${order.delivery_location || order.delivery_address}</p>
            <p><strong>Payment Status:</strong> ${order.payment_status}</p>
          </div>

          <h3>Items Ordered</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
              </tr>
            </thead>
            <tbody>
              ${itemsList.map((item: any) => `
                <tr>
                  <td>${item.name || item.title}</td>
                  <td>${item.quantity || item.qty || 1}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="total">
            <p>Total Amount: KES ${order.total_amount}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  // 🔒 LOCKOUT SCREEN (If not logged in)
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f3f4f6", padding: "1rem" }}>
        <form
          onSubmit={handleLogin}
          style={{ backgroundColor: "#ffffff", padding: "2rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)", width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <h2 style={{ margin: 0, fontSize: "1.25rem", color: "#1f2937", fontWeight: "bold" }}>Admin Access Required</h2>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "#6b7280" }}>Please enter your passcode to view live orders.</p>

          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="Enter Admin Password"
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}
            required
          />

          {authError && <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: 0 }}>{authError}</p>}

          <button
            type="submit"
            style={{ width: "100%", backgroundColor: "#16a34a", color: "#ffffff", fontWeight: "600", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "1rem" }}
          >
            Unlock Dashboard
          </button>
        </form>
      </div>
    );
  }

  // 🔓 UNLOCKED DASHBOARD VIEW
  return (
    <div style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <h2>Admin Dashboard</h2>
        
        <button
          onClick={handleExportCSV}
          style={{
            padding: "8px 16px",
            backgroundColor: "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: "6px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          Export CSV (Excel)
        </button>
      </div>

      {/* --- STAT CARDS --- */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div style={{ padding: "1rem", backgroundColor: "#f3f4f6", borderRadius: "8px" }}>
          <p style={{ margin: 0, color: "#4b5563", fontSize: "0.875rem" }}>Total Orders</p>
          <h3 style={{ margin: "5px 0 0 0", fontSize: "1.5rem" }}>{totalOrdersCount}</h3>
        </div>
        <div style={{ padding: "1rem", backgroundColor: "#dcfce7", borderRadius: "8px" }}>
          <p style={{ margin: 0, color: "#166534", fontSize: "0.875rem" }}>Collected Revenue (Paid)</p>
          <h3 style={{ margin: "5px 0 0 0", fontSize: "1.5rem", color: "#15803d" }}>KES {totalRevenue}</h3>
        </div>
        <div style={{ padding: "1rem", backgroundColor: "#fef3c7", borderRadius: "8px" }}>
          <p style={{ margin: 0, color: "#92400e", fontSize: "0.875rem" }}>Pending Collection</p>
          <h3 style={{ margin: "5px 0 0 0", fontSize: "1.5rem", color: "#b45309" }}>KES {pendingRevenue}</h3>
        </div>
      </div>

      {/* --- FILTER BUTTONS --- */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "1rem" }}>
        <button
          onClick={() => setFilter("all")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            backgroundColor: filter === "all" ? "#2563eb" : "#e5e7eb",
            color: filter === "all" ? "#fff" : "#374151",
            fontWeight: "600",
          }}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setFilter("pending")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            backgroundColor: filter === "pending" ? "#d97706" : "#e5e7eb",
            color: filter === "pending" ? "#fff" : "#374151",
            fontWeight: "600",
          }}
        >
          Pending ({orders.filter((o) => !o.payment_status?.startsWith("Paid")).length})
        </button>
        <button
          onClick={() => setFilter("paid")}
          style={{
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            backgroundColor: filter === "paid" ? "#16a34a" : "#e5e7eb",
            color: filter === "paid" ? "#fff" : "#374151",
            fontWeight: "600",
          }}
        >
          Paid ({orders.filter((o) => o.payment_status?.startsWith("Paid")).length})
        </button>
      </div>

      {/* --- TABLE VIEW --- */}
      {loading ? (
        <p>Loading orders...</p>
      ) : filteredOrders.length === 0 ? (
        <p>No orders found matching this filter.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "2px solid #e5e7eb" }}>
              <th style={{ padding: "10px" }}>Order #</th>
              <th style={{ padding: "10px" }}>Customer Name</th>
              <th style={{ padding: "10px" }}>Phone</th>
              <th style={{ padding: "10px" }}>Location</th>
              <th style={{ padding: "10px" }}>Items Ordered</th>
              <th style={{ padding: "10px" }}>Total Amount</th>
              <th style={{ padding: "10px" }}>Payment Status</th>
              <th style={{ padding: "10px" }}>Order Date</th>
              <th style={{ padding: "10px" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order: any) => {
              const itemsList = parseItems(order.items);
              const isPaid = order.payment_status?.startsWith("Paid");

              return (
                <tr key={order.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "10px", fontWeight: "bold" }}>
                    {order.order_number || order.id}
                  </td>
                  <td style={{ padding: "10px" }}>{order.customer_name}</td>
                  <td style={{ padding: "10px" }}>{order.phone_number}</td>
                  <td style={{ padding: "10px" }}>{order.delivery_location || order.delivery_address}</td>
                  
                  <td style={{ padding: "10px" }}>
                    {Array.isArray(itemsList) && itemsList.length > 0 ? (
                      <ul style={{ margin: 0, paddingLeft: "1.2rem" }}>
                        {itemsList.map((item: any, idx: number) => (
                          <li key={idx}>
                            {item.name || item.title} (x{item.quantity || item.qty || 1})
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span style={{ color: "#9ca3af" }}>No items listed</span>
                    )}
                  </td>

                  <td style={{ padding: "10px", fontWeight: "600" }}>
                    KES {order.total_amount}
                  </td>
                  
                  <td style={{ padding: "10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={isPaid}
                        onChange={() => handlePaymentToggle(order.id, order.payment_status)}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                      <span style={{ color: isPaid ? "#16a34a" : "#d97706", fontWeight: "600" }}>
                        {isPaid ? "Paid" : order.payment_status}
                      </span>
                    </label>
                  </td>

                  <td style={{ padding: "10px", fontSize: "0.875rem", color: "#4b5563" }}>
                    {order.created_at ? new Date(order.created_at).toLocaleString() : "N/A"}
                  </td>

                  <td style={{ padding: "10px" }}>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        onClick={() => handleWhatsAppCustomer(order)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.8rem",
                          backgroundColor: "#25D366",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          fontWeight: "600",
                          cursor: "pointer",
                        }}
                      >
                        WhatsApp
                      </button>
                      <button
                        onClick={() => handlePrintReceipt(order)}
                        style={{
                          padding: "4px 8px",
                          fontSize: "0.8rem",
                          backgroundColor: "#4b5563",
                          color: "#fff",
                          border: "none",
                          borderRadius: "4px",
                          cursor: "pointer",
                        }}
                      >
                        Print
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}