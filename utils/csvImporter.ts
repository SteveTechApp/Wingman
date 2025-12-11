import { ManuallyAddedEquipment, Product } from './types';
import toast from 'react-hot-toast';

export const parseCSV = (csvText: string): Array<Record<string, string>> => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV file must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    rows.push(row);
  }

  return rows;
};

export const importEquipmentFromCSV = (
  file: File,
  productDatabase: Product[]
): Promise<ManuallyAddedEquipment[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const rows = parseCSV(csvText);

        const equipment: ManuallyAddedEquipment[] = [];
        const errors: string[] = [];

        rows.forEach((row, index) => {
          const sku = row['SKU'] || row['sku'] || row['Product Code'];
          const quantityStr = row['Quantity'] || row['quantity'] || row['Qty'] || '1';
          const quantity = parseInt(quantityStr, 10);

          if (!sku) {
            errors.push(`Row ${index + 2}: Missing SKU`);
            return;
          }

          if (isNaN(quantity) || quantity < 1) {
            errors.push(`Row ${index + 2}: Invalid quantity for SKU ${sku}`);
            return;
          }

          // Find product in database
          const product = productDatabase.find(p => p.sku.toLowerCase() === sku.toLowerCase());

          if (!product) {
            errors.push(`Row ${index + 2}: Product not found for SKU ${sku}`);
            // Add as unknown product
            equipment.push({
              sku,
              name: row['Name'] || row['Product Name'] || 'Unknown Product',
              category: 'Misc' as any,
              description: 'Imported from CSV - not in database',
              tags: [],
              quantity,
            });
          } else {
            equipment.push({
              ...product,
              quantity,
            });
          }
        });

        if (errors.length > 0) {
          console.warn('CSV Import Warnings:', errors);
          toast.error(`Imported with ${errors.length} warning(s). Check console for details.`);
        }

        if (equipment.length === 0) {
          reject(new Error('No valid equipment found in CSV'));
        } else {
          toast.success(`Imported ${equipment.length} equipment item(s)`);
          resolve(equipment);
        }
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read CSV file'));
    };

    reader.readAsText(file);
  });
};

// Export equipment list as CSV with proper formatting
export const exportEquipmentToCSV = (
  equipment: ManuallyAddedEquipment[],
  filename: string = 'equipment_list.csv'
) => {
  if (equipment.length === 0) {
    toast.error('No equipment to export');
    return;
  }

  // Create CSV header
  const headers = ['SKU', 'Product Name', 'Category', 'Quantity', 'Description'];
  const csvRows = [headers.join(',')];

  // Add data rows
  equipment.forEach(item => {
    const row = [
      `"${item.sku}"`,
      `"${item.name}"`,
      `"${item.category}"`,
      item.quantity.toString(),
      `"${item.description || ''}"`,
    ];
    csvRows.push(row.join(','));
  });

  // Create blob and download
  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success('Equipment list exported successfully');
};

// Create a CSV template for import
export const downloadCSVTemplate = () => {
  const headers = ['SKU', 'Quantity', 'Name (optional)', 'Notes (optional)'];
  const exampleRow = ['EX-SKU-001', '2', 'Example Product', 'Additional notes'];

  const csvRows = [headers.join(','), exampleRow.join(',')];
  const csvContent = csvRows.join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'equipment_import_template.csv');
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success('Template downloaded');
};
