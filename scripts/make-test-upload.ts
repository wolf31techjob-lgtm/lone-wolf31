// Generate a test Excel file with new Canada stores to verify upload
import * as XLSX from "xlsx";

const data = [
  // Update existing store 001 with new operation hours
  { "ID#": "001", Hashcode: "MB001A", "Store Number": "ST-WPG-001", "Store Name": "Winnipeg Polo Park (Updated)", Region: "Manitoba", Branch: "Winnipeg", "Operation Hours": "Mon-Sun 06:00-24:00" },
  // Add brand new stores
  { "ID#": "016", Hashcode: "MB016P", "Store Number": "ST-WPG-004", "Store Name": "Winnipeg Kildonan Place", Region: "Manitoba", Branch: "Winnipeg", "Operation Hours": "Mon-Sun 09:00-21:00" },
  { "ID#": "017", Hashcode: "EDM017Q", "Store Number": "ST-EDM-005", "Store Name": "Edmonton South Common", Region: "Edmonton", Branch: "Edmonton", "Operation Hours": "Mon-Sun 08:00-23:00" },
  { "ID#": "018", Hashcode: "CLG018R", "Store Number": "ST-CLG-005", "Store Name": "Calgary Deerfoot Meadow", Region: "Calgary", Branch: "Calgary", "Operation Hours": "Mon-Sun 07:00-23:00" },
];

const ws = XLSX.utils.json_to_sheet(data);
ws["!cols"] = [
  { wch: 10 }, { wch: 14 }, { wch: 16 }, { wch: 32 }, { wch: 12 }, { wch: 18 }, { wch: 28 },
];
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Stores");
XLSX.writeFile(wb, "/home/z/my-project/download/test-upload-canada-stores.xlsx");
console.log("Wrote test-upload-canada-stores.xlsx");
