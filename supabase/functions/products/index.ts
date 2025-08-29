import {
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/api-helpers.ts";
import {
  getSupabaseClient,
  setProductGroup,
} from "../_shared/supabase-helpers.ts";

async function createProduct(req: Request) {
  try {
    const productData = await req.json();

    const requiredFields = [
      "name",
      "category_id",
      "brand_id",
      "price_cents",
      "image_url",
    ];
    for (const field of requiredFields) {
      if (!productData[field]) {
        return createErrorResponse(
          `Missing required field: ${field}`,
          "VALIDATION_ERROR",
          400,
        );
      }
    }

    const client = getSupabaseClient(req);
    const pgError = await setProductGroup(client, req);
    if (pgError) return pgError;

    const { data, error } = await client
      .from("products")
      .insert(productData)
      .select()
      .single();

    if (error) {
      console.error(error);
      return createErrorResponse(error.message, "INTERNAL_ERROR", 500);
    }

    return createSuccessResponse(data, 201);
  } catch (err) {
    console.error(err);
    // FIX: Safely handle the 'unknown' type for the caught error.
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    return createErrorResponse(message, "INTERNAL_ERROR", 500);
  }
}

// FIX: Removed the unnecessary 'async' keyword.
Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pg-id" } });
  }
  
  switch (req.method) {
    case "POST":
      return createProduct(req);
    default:
      return createErrorResponse(
        `Method ${req.method} not allowed.`,
        "NOT_FOUND",
        405,
      );
  }
});
