import * as XLSX from 'xlsx';

export const parseExcel = (file) => {
  return new Promise((resolve, reject) => {
    if (file.size === 0) {
      reject(new Error(`File "${file.name}" is empty.`));
      return;
    }

    const processWorkbook = (workbook) => {
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      // 1. Convert to array of arrays to find header row
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: null });

      // 2. Find header row index (scan first 20 rows)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(rawData.length, 20); i++) {
        const row = rawData[i];
        // Check for common header keywords
        if (row && row.some(cell => cell && (
          String(cell).trim().toLowerCase() === 'код' ||
          String(cell).trim().toLowerCase() === 'code' ||
          String(cell).trim().toLowerCase() === 'артикул'
        ))) {
          headerRowIndex = i;
          break;
        }
      }

      console.log(`Detected header row at index ${headerRowIndex} for file "${file.name}"`);

      // 3. Parse again using the detected header row
      const json = XLSX.utils.sheet_to_json(sheet, { range: headerRowIndex });
      resolve(json);
    };

    const readAsBinaryString = () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, {
            type: 'binary',
            cellDates: true,
            cellNF: false,
            cellText: false,
            sheetStubs: true,
            bookVBA: false,
            WTF: false // Suppress warnings
          });
          processWorkbook(workbook);
        } catch (error) {
          // Silently try fallback (ArrayBuffer) for ANY error
          console.warn(`BinaryString attempt failed for "${file.name}", trying ArrayBuffer...`);
          readAsArrayBuffer();
        }
      };
      reader.onerror = (error) => reject(new Error(`Failed to read file "${file.name}"`));
      reader.readAsBinaryString(file);
    };

    const readAsArrayBuffer = () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, {
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false,
            sheetStubs: true,
            bookVBA: false,
            WTF: false // Suppress warnings
          });
          processWorkbook(workbook);
        } catch (error) {
          console.error("Excel parse error:", error);
          reject(new Error(`Failed to parse "${file.name}". Возможные причины:\n- Файл поврежден\n- Файл защищен паролем\n- Неподдерживаемый формат Excel`));
        }
      };
      reader.onerror = (error) => reject(new Error(`Failed to read file "${file.name}"`));
      reader.readAsArrayBuffer(file);
    };

    // Start with BinaryString as it is more robust for mixed file types (xls/xlsx)
    readAsBinaryString();
  });
};

// Gap Analysis Logic
export const analyzeData = async (warehouseFiles, storeFiles) => {
  console.log("Starting Gap Analysis...");

  // 1. Parse Warehouse Files
  const warehouseItems = new Map(); // Code -> { Item Details }

  for (const file of warehouseFiles) {
    const data = await parseExcel(file);
    console.log(`Parsed Warehouse File "${file.name}": ${data.length} rows`);

    data.forEach(row => {
      // Normalize keys: remove spaces
      const cleanRow = {};
      Object.keys(row).forEach(k => cleanRow[k.trim()] = row[k]);

      // Identify Columns based on user input
      // Warehouse: Код, Название, Доступно (or В наличии)
      const code = cleanRow['Код'] || cleanRow['Code'];
      const name = cleanRow['Название'] || cleanRow['Наименование'] || cleanRow['Name'];

      // Quantity: User said "В наличии" or "Доступно"
      let qty = 0;
      if (cleanRow['Доступно'] !== undefined) qty = parseFloat(String(cleanRow['Доступно']).replace(',', '.'));
      else if (cleanRow['В наличии'] !== undefined) qty = parseFloat(String(cleanRow['В наличии']).replace(',', '.'));

      if (code && qty > 0) {
        const codeStr = String(code).trim().toLowerCase();
        if (!warehouseItems.has(codeStr)) {
          warehouseItems.set(codeStr, {
            code: code, // Original format
            name: name || 'Unknown',
            available: qty,
            region: cleanRow['Регион'] || '',
            manufacturer: cleanRow['Производитель'] || ''
          });
        } else {
          // Aggregate quantity if item appears in multiple warehouse files
          const item = warehouseItems.get(codeStr);
          item.available += qty;
        }
      }
    });
  }
  console.log(`Total Unique Warehouse Items (Qty > 0): ${warehouseItems.size}`);

  // 2. Analyze Stores
  const results = [];

  for (const file of storeFiles) {
    const data = await parseExcel(file);
    console.log(`Parsed Store File "${file.name}": ${data.length} rows`);

    const storeInventory = new Set(); // Set of Codes present in this store

    data.forEach(row => {
      const cleanRow = {};
      Object.keys(row).forEach(k => cleanRow[k.trim()] = row[k]);

      // Store: Код, Доступно (or Остаток)
      const code = cleanRow['Код'] || cleanRow['Code'];

      let qty = 0;
      if (cleanRow['Доступно'] !== undefined) qty = parseFloat(String(cleanRow['Доступно']).replace(',', '.'));
      else if (cleanRow['Остаток'] !== undefined) qty = parseFloat(String(cleanRow['Остаток']).replace(',', '.'));

      if (code && qty > 0) {
        storeInventory.add(String(code).trim().toLowerCase());
      }
    });

    // 3. Find Gaps: Item in Warehouse but NOT in Store
    const missingItems = [];

    warehouseItems.forEach((item, codeStr) => {
      if (!storeInventory.has(codeStr)) {
        missingItems.push({
          ...item,
          storeAvailable: 0
        });
      }
    });

    if (missingItems.length > 0) {
      results.push({
        storeName: file.name,
        items: missingItems
      });
    }
  }

  console.log(`Gap Analysis Complete. Found gaps for ${results.length} stores.`);
  return results;
};
