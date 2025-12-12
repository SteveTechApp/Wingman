// This is a placeholder for a CSV exporting utility.

import { Proposal } from './types';

function convertToCSV(data: any[]): string {
    if (!data || data.length === 0) {
        return '';
    }
    const headers = Object.keys(data[0]);
    const csvRows = [
        headers.join(','), // header row
        ...data.map(row => 
            headers.map(fieldName => 
                JSON.stringify(row[fieldName], (key, value) => value === null ? '' : value)
            ).join(',')
        )
    ];
    return csvRows.join('\r\n');
}

export const exportEquipmentListToCsv = (proposal: Proposal, projectName: string) => {
    const csvData = convertToCSV(proposal.equipmentList);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${projectName}_EquipmentList.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Clean up blob URL to prevent memory leak
        URL.revokeObjectURL(url);
    }
};