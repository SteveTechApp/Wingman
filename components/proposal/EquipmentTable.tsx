import React from 'react';

interface EquipmentTableProps {
  equipmentList: { sku: string; name: string; quantity: number }[];
}

const EquipmentTable: React.FC<EquipmentTableProps> = ({ equipmentList }) => {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 border text-left">SKU</th>
          <th className="p-2 border text-left">Product Name</th>
          <th className="p-2 border text-center">Quantity</th>
        </tr>
      </thead>
      <tbody>
        {equipmentList.map(item => (
          <tr key={item.sku} className="hover:bg-gray-50">
            <td className="p-2 border font-mono text-sm">{item.sku}</td>
            <td className="p-2 border">{item.name}</td>
            <td className="p-2 border text-center">{item.quantity}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default EquipmentTable;