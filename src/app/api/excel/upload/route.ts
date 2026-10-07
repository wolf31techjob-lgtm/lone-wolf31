import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

// This handles the POST request when uploading an Excel file
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json(
        { ok: false, error: "No file uploaded." },
        { status: 400 }
      );
    }

    // Read the file directly into memory (Buffer) - NO fs.writeFile!
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the Excel file using SheetJS
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // NOTE: You can add your database saving logic here using Prisma.
    // For now, we just return the parsed data so the frontend won't error.

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    console.error("[excel/upload] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to process Excel file." },
      { status: 500 }
    );
  }
}
