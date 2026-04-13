import xlsx from 'xlsx';
import path from 'path';

// Construct the file path
const filePath = path.resolve('Data MDB BRI KDP APRIL 2026.xls');

try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Take first sheet
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header option to see exactly how columns are named
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: "" });
    
    if (data.length > 0) {
        console.log("=== FIRST 10 ROWS ===");
        console.log(data.slice(0, 10));
    } else {
        console.log("No data found in the first sheet.");
    }
} catch (error) {
    console.error("Error reading file:", error.message);
}
