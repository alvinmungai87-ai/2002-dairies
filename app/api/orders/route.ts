import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const { fullName, phoneNumber, deliveryAddress, items, grandTotal } = await req.json();

    if (!fullName || !phoneNumber || !deliveryAddress || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Name, phone, location, and items are required." },
        { status: 400 }
      );
    }

    const orderNumber = `ORD-${Date.now().toString().slice(-6)}`;
    // Insert order into Supabase
    const { data, error } = await supabase
      .from("orders")
      .insert([
        {
          order_number: orderNumber,
          customer_name: fullName,
          phone_number: phoneNumber,
          delivery_Address: deliveryAddress,
          items: Array.isArray(items) ? items : JSON.parse(items ||"[}"),
          total_amount: grandTotal,
          payment_status: "Pending (Pay on Delivery)", 
          order_status: "Processing",
          created_at : new Date(). toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Order placed successfully!",
      order: data,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET endpoint to retrieve orders for the admin dashboard
export async function GET() {
  try {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}