import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { barcode } = await req.json();
    if (!barcode) {
      return new Response(JSON.stringify({ error: "Barcode is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Query Open Food Facts API (free, no API key needed)
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      { headers: { "User-Agent": "HIIT-App/1.0" } }
    );

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Product lookup failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();

    if (data.status !== 1 || !data.product) {
      return new Response(JSON.stringify({ product: null, message: "Product not found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = data.product;
    const nutrients = p.nutriments || {};

    const product = {
      name: p.product_name || p.product_name_en || "Unknown Product",
      brand: p.brands || "",
      calories: Math.round(nutrients["energy-kcal_100g"] || nutrients["energy-kcal"] || 0),
      protein: Math.round((nutrients.proteins_100g || nutrients.proteins || 0) * 10) / 10,
      fat: Math.round((nutrients.fat_100g || nutrients.fat || 0) * 10) / 10,
      carbs: Math.round((nutrients.carbohydrates_100g || nutrients.carbohydrates || 0) * 10) / 10,
      fiber: Math.round((nutrients.fiber_100g || nutrients.fiber || 0) * 10) / 10,
      serving_size: p.serving_size || "100g",
      image_url: p.image_front_small_url || p.image_url || null,
    };

    return new Response(JSON.stringify({ product }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Barcode lookup error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
