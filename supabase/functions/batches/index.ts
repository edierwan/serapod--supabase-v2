import {
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/api-helpers.ts";
import {
  getSupabaseClient,
  setProductGroup,
} from "../_shared/supabase-helpers.ts";

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pg-id" } });
    }
  try {
    const client = getSupabaseClient(req);
    const pgError = await setProductGroup(client, req);
    if (pgError) return pgError;

    const body = await req.json();

    if (!body.order_id || !body.product_id || !body.total_units) {
        return createErrorResponse("Missing required fields.", "VALIDATION_ERROR", 400);
    }
    
    // For this smoke test, we'll just return a mocked success message.
    return createSuccessResponse({
        batch: {
            id: crypto.randomUUID(),
            status: "created",
            masters_count: Math.ceil(body.total_units / 200),
        },
        export_urls: {
            csv: "https://example.com/export.csv",
            pdf: "https://example.com/export.pdf",
        }
    });

  } catch (err) {
    console.error(err);
    return createErrorResponse(err.message, "INTERNAL_ERROR", 500);
  }
});
