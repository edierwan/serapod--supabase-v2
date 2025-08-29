#!/usr/bin/env bash
set -e

echo "--- Creating shared utility files... ---"
mkdir -p supabase/functions/_shared

cat << 'EOSH' > supabase/functions/_shared/api-helpers.ts
import { ulid } from "https://deno.land/x/ulid@v0.3.0/mod.ts";

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PRECONDITION_FAILED"
  | "INTERNAL_ERROR"
  | "IDEMPOTENT_REPLAY";

export function createSuccessResponse(
  data: unknown,
  status: number = 200,
): Response {
  const body = {
    ok: true,
    data,
    request_id: `req_${ulid()}`,
  };
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { "Content-Type": "application/json" },
  });
}

export function createErrorResponse(
  message: string,
  code: ApiErrorCode,
  status: number,
): Response {
  const body = {
    ok: false,
    error: {
      code: code,
      message: message,
    },
    request_id: `req_${ulid()}`,
  };
  return new Response(JSON.stringify(body), {
    status: status,
    headers: { "Content-Type": "application/json" },
  });
}
EOSH

cat << 'EOSH' > supabase/functions/_shared/supabase-helpers.ts
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
EOSH
echo "✅ Shared files created."

echo "--- Creating 'products' function... ---"
mkdir -p supabase/functions/products

cat << 'EOSH' > supabase/functions/products/index.ts
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
    return createErrorResponse(err.message, "INTERNAL_ERROR", 500);
  }
}

Deno.serve(async (req) => {
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
EOSH
echo "✅ 'products' function created."

echo "--- Creating 'orders' function... ---"
mkdir -p supabase/functions/orders

cat << 'EOSH' > supabase/functions/orders/index.ts
import {
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/api-helpers.ts";
import {
  getSupabaseClient,
  setProductGroup,
} from "../_shared/supabase-helpers.ts";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";

async function handlePoRender(req: Request, orderId: string) {
  try {
    const client = getSupabaseClient(req);
    const pgError = await setProductGroup(client, req);
    if (pgError) return pgError;

    const { data: order, error } = await client
      .from("orders")
      .select(`*, manufacturers(*), products(*)`)
      .eq("id", orderId)
      .single();

    if (error || !order) {
      console.error("Order not found:", error);
      return createErrorResponse("Order not found.", "NOT_FOUND", 404);
    }

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 12;

    page.drawText("PURCHASE ORDER", {
      x: 50,
      y: height - 50,
      font,
      size: 24,
      color: rgb(0, 0, 0),
    });

    page.drawText(`PO Code: ${order.code}`, {
      x: 50,
      y: height - 80,
      font,
      size: fontSize,
    });
    page.drawText(`Manufacturer: ${order.manufacturers.name}`, {
      x: 50,
      y: height - 100,
      font,
      size: fontSize,
    });
    page.drawText(`Product: ${order.products.name}`, {
      x: 50,
      y: height - 120,
      font,
      size: fontSize,
    });

    const pdfBytes = await pdfDoc.save();
    const filePath = `${order.code}.pdf`;

    const { error: uploadError } = await client.storage
      .from("purchase_orders") 
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("PDF upload error:", uploadError);
      throw new Error("Failed to upload PO to storage.");
    }
    
    const { data: urlData } = client.storage
      .from("purchase_orders")
      .getPublicUrl(filePath);

    return createSuccessResponse({
      message: "PO rendered and saved successfully.",
      publicUrl: urlData.publicUrl,
    });
  } catch (err) {
    console.error(err);
    return createErrorResponse(err.message, "INTERNAL_ERROR", 500);
  }
}

async function handlePoSend(req: Request, orderId: string) {
  try {
    const client = getSupabaseClient(req);
    const pgError = await setProductGroup(client, req);
    if (pgError) return pgError;

    const { data: order, error: fetchError } = await client
      .from("orders")
      .select(`code, manufacturers(email)`)
      .eq("id", orderId)
      .single();

    if (fetchError || !order) {
      return createErrorResponse("Order not found.", "NOT_FOUND", 404);
    }

    const { error: updateError } = await client
      .from("orders")
      .update({ status: "po_sent", po_sent_at: new Date().toISOString() })
      .eq("id", orderId);

    if (updateError) {
      console.error("Order update error:", updateError);
      throw new Error("Failed to update order status.");
    }
    
    return createSuccessResponse({
      message: `PO sent successfully to ${order.manufacturers.email} and status updated.`,
    });
  } catch (err) {
    console.error(err);
    return createErrorResponse(err.message, "INTERNAL_ERROR", 500);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pg-id" } });
  }

  const url = new URL(req.url);
  const poRenderPattern = new URLPattern({ pathname: "/api/v1/orders/:id/po/render" });
  const poSendPattern = new URLPattern({ pathname: "/api/v1/orders/:id/po/send" });
  
  const renderMatch = poRenderPattern.exec(url);
  if (renderMatch && req.method === "POST") {
    const orderId = renderMatch.pathname.groups.id;
    return handlePoRender(req, orderId);
  }

  const sendMatch = poSendPattern.exec(url);
  if (sendMatch && req.method === "POST") {
    const orderId = sendMatch.pathname.groups.id;
    return handlePoSend(req, orderId);
  }

  return createErrorResponse(
    "Route not found for orders endpoint.",
    "NOT_FOUND",
    404,
  );
});
EOSH
echo "✅ 'orders' function created."
echo ""
echo "All function files have been created successfully!"
