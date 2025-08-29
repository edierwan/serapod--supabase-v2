import {
  createErrorResponse,
  createSuccessResponse,
} from "../_shared/api-helpers.ts";
import {
  getSupabaseClient,
  setProductGroup,
} from "../_shared/supabase-helpers.ts";
import { ulid } from "https://deno.land/x/ulid@v0.3.0/mod.ts";

// Generate CSV content for batch export
function generateCSV(batchData: any, qrCodes: string[]): string {
  const headers = ['QR_Code', 'Master_ID', 'Unit_Index', 'Created_At'];
  const rows = [headers.join(',')];
  
  let currentMaster = 1;
  let unitIndex = 1;
  const unitsPerMaster = batchData.qr_settings.units_per_master;
  
  qrCodes.forEach((qrCode, index) => {
    if (unitIndex > unitsPerMaster) {
      currentMaster++;
      unitIndex = 1;
    }
    
    const masterId = `M${String(currentMaster).padStart(4, '0')}`;
    const row = [
      qrCode,
      masterId,
      unitIndex.toString(),
      new Date().toISOString()
    ];
    rows.push(row.join(','));
    unitIndex++;
  });
  
  return rows.join('\n');
}

// Generate PDF content (simplified - in real implementation, use proper PDF library)
function generatePDFContent(batchData: any): string {
  return `
    Batch Report
    ============
    
    Batch ID: ${batchData.batch.id}
    Order ID: ${batchData.batch.order_id}
    Product ID: ${batchData.batch.product_id}
    
    Summary:
    - Total Units: ${batchData.calculations.total_units}
    - Buffer Units: ${batchData.calculations.buffer_units}
    - Total QR Codes: ${batchData.calculations.total_unique_qrs}
    - Masters Count: ${batchData.calculations.masters_count}
    
    QR Settings:
    - Units per Master: ${batchData.qr_settings.units_per_master}
    - Buffer per 1000: ${batchData.qr_settings.buffer_per_1000}
    
    Generated: ${new Date().toISOString()}
  `;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: { 
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-pg-id" 
      } 
    });
  }

  try {
    const client = getSupabaseClient(req);
    const pgError = await setProductGroup(client, req);
    if (pgError) return pgError;

    const body = await req.json();

    // Validate required fields
    if (!body.order_id || !body.product_id || !body.total_units) {
      return createErrorResponse(
        "Missing required fields: order_id, product_id, total_units", 
        "VALIDATION_ERROR", 
        400
      );
    }

    const { order_id, product_id, total_units } = body;

    // Validate that total_units is a positive number
    if (typeof total_units !== 'number' || total_units <= 0) {
      return createErrorResponse(
        "total_units must be a positive number", 
        "VALIDATION_ERROR", 
        400
      );
    }

    // Get the product group ID from the current config
    const productGroupId = req.headers.get("X-PG-ID");
    if (!productGroupId) {
      return createErrorResponse(
        "X-PG-ID header is required.", 
        "VALIDATION_ERROR", 
        400
      );
    }

    // Step 1: Fetch QR Settings from database
    const { data: qrSettings, error: settingsError } = await client
      .from("qr_settings")
      .select("units_per_master, buffer_per_1000")
      .eq("product_group_id", productGroupId)
      .single();

    if (settingsError || !qrSettings) {
      console.error("QR Settings not found:", settingsError);
      return createErrorResponse(
        "QR settings not found for this product group", 
        "NOT_FOUND", 
        404
      );
    }

    const { units_per_master, buffer_per_1000 } = qrSettings;

    // Validate QR settings values
    if (!units_per_master || units_per_master <= 0) {
      return createErrorResponse(
        "Invalid units_per_master configuration", 
        "PRECONDITION_FAILED", 
        412
      );
    }

    if (buffer_per_1000 === null || buffer_per_1000 === undefined || buffer_per_1000 < 0) {
      return createErrorResponse(
        "Invalid buffer_per_1000 configuration", 
        "PRECONDITION_FAILED", 
        412
      );
    }

    // Step 2: Perform Calculations
    // BufferUnits = ⌊(total_units / 1000)⌋ × buffer_per_1000
    const bufferUnits = Math.floor(total_units / 1000) * buffer_per_1000;
    
    // TotalUniqueQRs = total_units + BufferUnits
    const totalUniqueQRs = total_units + bufferUnits;
    
    // MastersCount = ⌈(TotalUniqueQRs / units_per_master)⌉
    const mastersCount = Math.ceil(totalUniqueQRs / units_per_master);

    // Step 3: Generate Real ULIDs for QR codes
    const qrCodes: string[] = [];
    const masterIds: string[] = [];
    
    // Generate QR codes (ULIDs)
    for (let i = 0; i < totalUniqueQRs; i++) {
      qrCodes.push(ulid());
    }
    
    // Generate Master IDs (ULIDs)
    for (let i = 0; i < mastersCount; i++) {
      masterIds.push(ulid());
    }

    // Step 4: Database Integration - Insert new batch record
    const batchData = {
      order_id,
      product_id,
      total_units,
      buffer_units: bufferUnits,
      total_unique_qrs: totalUniqueQRs,
      masters_count: mastersCount,
      qr_codes: qrCodes,
      master_ids: masterIds,
      status: 'created',
      created_at: new Date().toISOString()
    };

    const { data: newBatch, error: insertError } = await client
      .from("batches")
      .insert(batchData)
      .select()
      .single();

    if (insertError) {
      console.error("Failed to create batch:", insertError);
      return createErrorResponse(
        "Failed to create batch record", 
        "INTERNAL_ERROR", 
        500
      );
    }

    // Step 5: Generate Real Export Files
    const responseData = {
      batch: newBatch,
      calculations: {
        total_units,
        buffer_units: bufferUnits,
        total_unique_qrs: totalUniqueQRs,
        masters_count: mastersCount
      },
      qr_settings: {
        units_per_master,
        buffer_per_1000
      }
    };

    // Generate CSV content
    const csvContent = generateCSV(responseData, qrCodes);
    
    // Generate PDF content (simplified)
    const pdfContent = generatePDFContent(responseData);

    // Upload CSV to Supabase Storage
    const csvFileName = `batch_${newBatch.id}_export.csv`;
    const { error: csvUploadError } = await client.storage
      .from('batch_exports')
      .upload(csvFileName, csvContent, {
        contentType: 'text/csv',
        upsert: true
      });

    // Upload PDF to Supabase Storage (as text for now - in production use proper PDF library)
    const pdfFileName = `batch_${newBatch.id}_report.txt`;
    const { error: pdfUploadError } = await client.storage
      .from('batch_exports')
      .upload(pdfFileName, pdfContent, {
        contentType: 'text/plain',
        upsert: true
      });

    // Get public URLs
    const { data: csvUrl } = client.storage
      .from('batch_exports')
      .getPublicUrl(csvFileName);

    const { data: pdfUrl } = client.storage
      .from('batch_exports')
      .getPublicUrl(pdfFileName);

    // Step 6: Return Response with real export URLs
    return createSuccessResponse({
      ...responseData,
      qr_codes: qrCodes,
      master_ids: masterIds,
      export_urls: {
        csv: csvUrl.publicUrl,
        pdf: pdfUrl.publicUrl
      },
      export_status: {
        csv_generated: !csvUploadError,
        pdf_generated: !pdfUploadError,
        csv_error: csvUploadError?.message,
        pdf_error: pdfUploadError?.message
      }
    }, 201);

  } catch (err) {
    console.error("Batches function error:", err);
    return createErrorResponse(
      err.message || "An unexpected error occurred", 
      "INTERNAL_ERROR", 
      500
    );
  }
});
