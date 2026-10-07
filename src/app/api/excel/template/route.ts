import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

/**
 * Returns a downloadable Excel template (.xlsx) with 9 columns:
 *   ID# | Hashcode | Store Number | Store Name | Region | Area
 *   | Address | Brand | Operation Hours
 */
export async function GET(req: NextRequest) {
  try {
    const data = [
      {
        "ID#": "001",
        Hashcode: "MB001A",
        "Store Number": "ST-WPG-001",
        "Store Name": "Winnipeg Polo Park",
        Region: "Manitoba",
        Area: "Manitoba",
        Address: "Winnipeg, MB",
        Brand: "KFC",
        "Operation Hours": "Mon-Sun 07:00-23:00",
      },
      {
        "ID#": "002",
        Hashcode: "MB002B",
        "Store Number": "ST-WPG-002",
        "Store Name": "Winnipeg St. Vital",
        Region: "Manitoba",
        Area: "Manitoba",
        Address: "Winnipeg, MB",
        Brand: "KT",
        "Operation Hours": "Mon-Sun 08:00-22:00",
      },
      {
        "ID#": "006",
        Hashcode: "EDM006F",
        "Store Number": "ST-EDM-001",
        "Store Name": "Edmonton West Edmonton Mall",
        Region: "Edmonton",
        Area: "Edmonton",
        Address: "Edmonton, AB",
        Brand: "KFC",
        "Operation Hours": "Mon-Sun 07:00-23:00",
      },
      {
        "ID#": "011",
        Hashcode: "CLG011K",
        "Store Number": "ST-CLG-001",
        "Store Name": "Calgary Chinook Centre",
        Region: "Calgary",
        Area: "Calgary",
        Address: "Calgary, AB",
        Brand: "KT",
        "Operation Hours": "Mon-Sun 07:00-23:00",
      },
      {
        "ID#": "013",
        Hashcode: "CLG013M",
        "Store Number": "ST-CLG-003",
        "Store Name": "Calgary CrossIron Mills",
        Region: "Calgary",
        Area: "Calgary",
        Address: "Calgary, AB",
        Brand: "KFC",
        "Operation Hours": "24/7",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(data);

    // Adjusted column widths (Branch removed)
    ws["!cols"] = [
      { wch: 10 }, // ID#
      { wch: 14 }, // Hashcode
      { wch: 16 }, // Store Number
      { wch: 32 }, // Store Name
      { wch: 12 }, // Region
      { wch: 12 }, // Area
      { wch: 22 }, // Address
      { wch: 10 }, // Brand
      { wch: 28 }, // Operation Hours
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stores");

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="store-update-monitor-template.xlsx"',
        "Content-Length": String(buf.length),
      },
    });
  } catch (err) {
    console.error("[excel/template] error:", err);
    return NextResponse.json(
      { ok: false, error: "Failed to generate template." },
      { status: 500 }
    );
  }
}
