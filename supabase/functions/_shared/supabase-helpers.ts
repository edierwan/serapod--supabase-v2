import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.44.4";
import { createErrorResponse } from "./api-helpers.ts";

export function getSupabaseClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Missing Authorization header.");
  }

  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    },
  );
}

export async function setProductGroup(
  client: SupabaseClient,
  req: Request,
): Promise<Response | null> {
  const productGroupId = req.headers.get("X-PG-ID");
  if (!productGroupId) {
    return createErrorResponse(
      "X-PG-ID header is required.",
      "VALIDATION_ERROR",
      400,
    );
  }

  const { error } = await client.rpc("set_config", {
    name: "app.pg_id",
    value: productGroupId,
    is_local: "true",
  });

  if (error) {
    console.error("Failed to set product group config:", error);
    return createErrorResponse(
      "Invalid X-PG-ID or server error.",
      "INTERNAL_ERROR",
      500,
    );
  }

  return null;
}
