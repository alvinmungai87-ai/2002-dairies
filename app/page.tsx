"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase Client Initialization
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fallback Mock Data in case Supabase table is empty initially
const MOCK_FALLBACK_PRODUCTS = [
  {
    id: "1",
    name: "Fresh Tomatoes",
    category: "Vegetables",
    price: 150,
    unit: "per kg",
    image: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&q=80",
  },
  {
    id: "2",
    name: "Spinach (Sukuma Wiki)",
    category: "Vegetables",
    price: 50,
    unit: "per bunch",
    image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400&q=80",
  },
  {
    id: "3",
    name: "Sweet Mangoes",
    category: "Fruits",
    price: 200,
    unit: "per kg",
    image: "https://images.unsplash.com/photo-1553279768-865429fa0078?w=400&q=80",
  },
  {
    id: "4",
    name: "Fresh Avocados",
    category: "Fruits",
    price: 120,
    unit: "3 pcs",
    image: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&q=80",
  },
  {
    id: "5",
    name: "Garlic & Ginger Pack",
    category: "Herbs & Spices",
    price: 180,
    unit: "250g",
    image: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=400&q=80",
  },
  {
    id: "6",
    name: "Fresh Whole Milk",
    category: "Dairy & Bakery",
    price: 110,
    unit: "1 Litre",
    image: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&q=80",
  },
];

const CATEGORIES = ["All Items", "Vegetables", "Fruits", "Herbs & Spices", "Dairy & Bakery"];

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  unit?: string;
  image?: string;
  image_url?: string;
}

interface CartItem extends Product {
  quantity: number;
}

export default function Home() {
  // Products & Loading
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Search, Filter & Sort
  const [selectedCategory, setSelectedCategory] = useState("All Items");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");

  // Cart & UI Drawers
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [addedAnimation, setAddedAnimation] = useState<string | null>(null);

  // Checkout Form Fields
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Fetch live products from Supabase
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error || !data || data.length === 0) {
          console.warn("Using fallback products list.", error);
          setProducts(MOCK_FALLBACK_PRODUCTS);
        } else {
          setProducts(data);
        }
      } catch (err) {
        console.error("Error fetching products:", err);
        setProducts(MOCK_FALLBACK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, []);

  // 2. Add to Cart with feedback animation
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });

    // Trigger visual checkmark feedback
    setAddedAnimation(product.id);
    setTimeout(() => setAddedAnimation(null), 1200);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Calculations
  const totalCartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = cart.length > 0 ? 100 : 0;
  const grandTotal = subtotal + deliveryFee;

  // 3. Filter & Sort Logic
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const matchesCategory =
          selectedCategory === "All Items" || p.category === selectedCategory;
        const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return a.price - b.price;
        if (sortBy === "price-high") return b.price - a.price;
        return 0;
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // 4. Place Order Handler
  const handleConfirmOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName,
          phoneNumber: phoneNumber,
          deliveryAddress: deliveryAddress,
          items: cart,
          grandTotal: grandTotal,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Order Confirmed! Order ID: ${data.order.order_number || data.order.id}. Payment collected on delivery.");
        setCart([]);
        setIsCheckoutOpen(false);
      } else {
        alert("Failed to place order: " + data.error);
      }
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-16">
      
      {/* Header / Navbar */}
      <header className="sticky top-0 z-40 bg-emerald-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">2002 Dairies</h1>
            <p className="text-xs text-emerald-200">Fresh Produce Delivered Fast</p>
          </div>

          <button
            onClick={() => setIsCartOpen(!isCartOpen)}
            className="relative bg-emerald-800 px-4 py-2 rounded-full flex items-center gap-2 cursor-pointer hover:bg-emerald-900 transition"
          >
            <span className="text-sm font-semibold">🛒 Cart</span>
            {totalCartCount > 0 && (
              <span className="bg-emerald-400 text-emerald-950 text-xs font-extrabold px-2 py-0.5 rounded-full animate-bounce">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="bg-emerald-600 text-white py-10 px-4 text-center relative overflow-hidden">
        <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-2">
          ⚡ Express Delivery
        </span>
        <h2 className="text-3xl md:text-4xl font-bold mb-2">Farm Fresh Groceries to Your Doorstep</h2>
        <p className="text-emerald-100 max-w-md mx-auto text-sm md:text-base">
          Order crisp vegetables, ripe fruits, and everyday kitchen essentials directly online.
        </p>
      </section>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">

        {/* Search & Sort Controls */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search Input */}
          <div className="w-full md:flex-1 relative">
            <input
              type="text"
              placeholder="🔍 Search tomatoes, avocados, milk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="w-full md:w-auto">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full md:w-auto px-3 py-2 border border-slate-300 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="default">Sort: Default</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition transform active:scale-95 ${
                selectedCategory === cat
                  ? "bg-emerald-700 text-white shadow-sm"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Counter */}
        <div className="flex items-center justify-between mb-4 px-1">
          <p className="text-xs text-slate-500 font-medium">
            Showing <span className="font-bold text-slate-800">{filteredProducts.length}</span> items
          </p>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="text-center py-12 text-slate-500 font-medium">
            Loading products from database...
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {filteredProducts.map((product) => {
              const isAdded = addedAnimation === product.id;
              const cartItem = cart.find((item) => item.id === product.id);
              const imageUrl = product.image || product.image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&q=80";

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col hover:shadow-md transition group"
                >
                  <div className="relative h-48 overflow-hidden bg-slate-100">
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-md text-[10px] font-bold text-emerald-800 uppercase px-2 py-1 rounded-md shadow-sm">
                      ★ Fresh
                    </span>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                        {product.category}
                      </span>
                      <h3 className="text-lg font-bold text-slate-800 mt-1">{product.name}</h3>
                      {product.unit && (
                        <p className="text-sm text-slate-500">{product.unit}</p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xl font-black text-slate-900">
                        KSh {product.price}
                      </span>

                      <button
                        onClick={() => addToCart(product)}
                        className={`font-semibold text-sm px-4 py-2 rounded-xl transition active:scale-95 flex items-center gap-1.5 ${
                          isAdded
                            ? "bg-emerald-900 text-white"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white"
                        }`}
                      >
                        {isAdded ? (
                          <span>✓ Added!</span>
                        ) : (
                          <>
                            <span>+ Add</span>
                            {cartItem && (
                              <span className="bg-emerald-800 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                {cartItem.quantity}
                              </span>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500 bg-white rounded-2xl border border-dashed border-slate-300">
            <p className="text-lg font-bold text-slate-700">No items match your filter</p>
            <button
              onClick={() => { setSearchQuery(""); setSelectedCategory("All Items"); }}
              className="mt-3 px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>

      {/* Cart Side Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
          <div className="bg-white w-full max-w-md h-full p-6 shadow-2xl flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between border-b pb-4 mb-4">
                <h2 className="text-xl font-bold text-slate-800">Your Cart</h2>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold"
                >
                  ✕
                </button>
              </div>

              {cart.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">Your cart is currently empty.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between border-b pb-3">
                      <div>
                        <h4 className="font-bold text-sm text-slate-800">{item.name}</h4>
                        <p className="text-xs text-slate-500">
                          KSh {item.price} x {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-700 text-sm">
                          KSh {item.price * item.quantity}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 text-xs font-bold hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span className="font-bold">KSh {subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Delivery Fee:</span>
                  <span className="font-bold">KSh {deliveryFee}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-emerald-800 pt-2 border-t">
                  <span>Total Amount:</span>
                  <span>KSh {grandTotal}</span>
                </div>

                <button
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition shadow-md"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center border-b pb-3 mb-4">
              <h3 className="font-bold text-slate-800 text-lg">Delivery Checkout</h3>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alvin Mungai"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Phone Number (M-Pesa)</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0712345678"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">delivery_address</label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="e.g. Westlands, Nairobi, Pin Live Location"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1">
                <div className="flex justify-between">
                  <span>Grand Total:</span>
                  <span className="font-bold text-emerald-700">KSh {grandTotal}</span>
                </div>
                <p className="text-slate-500 text-[10px]">Payment collected upon delivery.</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition disabled:bg-slate-400"
              >
                {isSubmitting ? "Placing Order..." : "Confirm & Place Order"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}