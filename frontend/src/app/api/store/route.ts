import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
  try {
    const { shop_name: original_shop_name } = await req.json();

    if (!original_shop_name) {
      return NextResponse.json({ error: "Shop name is required" }, { status: 400 });
    }

    const shop_name = original_shop_name.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];

    // Check if company already exists
    const { data: existingCompany, error: existingCompanyError } = await supabaseAdmin
      .from("companies")
      .select("ingested, access_token")
      .eq("shop_name", shop_name)
      .single();

    if (existingCompany) {
      if (existingCompany.ingested) {
        return NextResponse.json({ redirect: "/stores" });
      } else {
        // Not ingested, so we can proceed with ingestion using existing token
        const response = await fetch(`${process.env.BACKEND_URL}/ingest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ shop_url: shop_name, access_token: existingCompany.access_token }),
        });

        if (!response.ok) {
          console.error("Error connecting to backend:", response.statusText);
          return NextResponse.json({ error: "Failed to connect store." }, { status: 500 });
        }

        const { data: updatedCompany, error: updateError } = await supabaseAdmin
          .from("companies")
          .update({ ingested: true })
          .eq("shop_name", shop_name)
          .select()
          .single();

        if (updateError) {
          console.error("Error updating company ingestion status:", updateError);
          return NextResponse.json({ error: "Failed to update company status." }, { status: 500 });
        }

        return NextResponse.json({ message: "Store connected successfully", data: existingCompany }, { status: 200 });
      }
    }

    // If we are here, the company does not exist. Create it.
    const access_token = uuidv4();

    const { data, error } = await supabaseAdmin
      .from("companies")
      .insert([{ shop_name, access_token, ingested: false }])
      .select()
      .single();

    if (error || !data) {
      console.error("Error inserting into Supabase:", error);
      return NextResponse.json({ error: "Failed to connect store." }, { status: 500 });
    }

    const response = await fetch(`${process.env.BACKEND_URL}/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ shop_url: shop_name, access_token }),
    });

    const { data: updatedCompany, error: updateError } = await supabaseAdmin
      .from("companies")
      .update({ ingested: true })
      .eq("shop_name", shop_name)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating company ingestion status:", updateError);
      return NextResponse.json({ error: "Failed to update company status." }, { status: 500 });
    }

    if (!response.ok) {
      console.error("Error connecting to backend:", response.statusText);
      return NextResponse.json({ error: "Failed to connect store." }, { status: 500 });
    }

    return NextResponse.json({ message: "Store connected successfully", data }, { status: 200 });
  } catch (error) {
    console.error("Error in /api/store:", error);
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
