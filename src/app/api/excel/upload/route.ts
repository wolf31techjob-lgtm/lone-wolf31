import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { db } from "@/lib/db";
import { getSessionUser, hasPrivilege } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate the user
    const auth = req.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    const user = await getSessionUser(token);
    
    if (!user || !hasPrivilege(user, "upload-excel")) {
      return NextResponse.json(
        { ok: false, error: "Admin access required." },
        { status: 403 }
      );
    }

    // 2. Parse FormData
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const replace = formData.get("replace") === "true";

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    // 3. Read Excel file in memory
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    
    // Use defval: null to ensure empty cells are read as null, and raw: false for strings
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: null, raw: false });

    const errors: string[] = [];
    let created = 0;
    let updated = 0;
    let skipped = 0;

    // If replace mode is ticked, delete all existing stores first
    if (replace) {
      await db.store.deleteMany({});
    }

    // Fetch existing stores to check for updates (if not replace mode)
    let existingStoreIds = new Set<string>();
    if (!replace) {
      const existing = await db.store.findMany({ select: { storeId: true } });
      existingStoreIds = new Set(existing.map((s) => s.storeId));
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as any;
      const rowIndex = i + 2; // Excel rows start at 1, and row 1 is header
      
      try {
        // Resilient header matching (Case-insensitive and trims hidden spaces)
        const getVal = (key: string) => {
          const foundKey = Object.keys(row).find(
            k => k.trim().toLowerCase() === key.toLowerCase()
          );
          const val = foundKey ? row[foundKey] : null;
          return val !== null && val !== undefined ? String(val).trim() : null;
        };

        const storeId = getVal("ID#");
        const hashCode = getVal("Hashcode");
        const name = getVal("Store Name");

        if (!storeId || !hashCode || !name) {
          errors.push(`Row ${rowIndex}: Missing ID#, Hashcode, or Store Name. Skipped.`);
          skipped++;
          continue;
        }

        const storeNumber = getVal("Store Number");
        const region = getVal("Region") || "Manitoba";
        const area = getVal("Area");
        const branch = getVal("Branch"); // Will be null if removed from Excel
        const address = getVal("Address");
        const brand = getVal("Brand");
        const operationHours = getVal("Operation Hours");

        if (!replace && existingStoreIds.has(storeId)) {
          // Update existing store
          await db.store.update({
            where: { storeId: storeId },
            data: {
              hashCode,
              storeNumber,
              name,
              region,
              area,
              branch, 
              address,
              brand,
              operationHours,
            }
          });
          updated++;
        } else {
          // Create new store
          await db.store.create({
            data: {
              storeId,
              hashCode,
              storeNumber,
              name,
              region,
              area,
              branch,
              address,
              brand,
              operationHours,
            }
          });
          created++;
        }
      } catch (err: any) {
        console.error(`Error processing row ${rowIndex}:`, err);
        errors.push(`Row ${rowIndex}: Database error - ${err.message}`);
        skipped++;
      }
    }

    // 5. Return the exact format expected by your Dashboard frontend
    return NextResponse.json({
      ok: true,
      summary: {
        created,
        updated,
        skipped,
        replaceAll: replace
      },
      errors
    });

  } catch (err) {
    console.error("[excel/upload] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to process Excel file." },
      { status: 500 }
    );
  }
}
