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

    // 3. Read Excel file in memory (No fs.writeFile)
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // 4. Process and save to Neon Database
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
        const storeId = row["ID#"] ? String(row["ID#"]).trim() : null;
        const hashCode = row["Hashcode"] ? String(row["Hashcode"]).trim() : null;
        const name = row["Store Name"] ? String(row["Store Name"]).trim() : null;

        if (!storeId || !hashCode || !name) {
          errors.push(`Row ${rowIndex}: Missing ID#, Hashcode, or Store Name. Skipped.`);
          skipped++;
          continue;
        }

        const storeNumber = row["Store Number"] ? String(row["Store Number"]) : null;
        const region = row["Region"] ? String(row["Region"]) : "Manitoba";
        const area = row["Area"] ? String(row["Area"]) : null;
        // Branch is removed from the new template, so it will be null
        const branch = row["Branch"] ? String(row["Branch"]) : null; 
        const address = row["Address"] ? String(row["Address"]) : null;
        const brand = row["Brand"] ? String(row["Brand"]) : null;
        const operationHours = row["Operation Hours"] ? String(row["Operation Hours"]) : null;

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
