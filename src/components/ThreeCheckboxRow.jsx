"use client";
import { useState, useEffect } from 'react';

export default function ThreeCheckboxRow({ rowNo, designerSelected, productionSelected, machineSelected, onDesignerChange, onProductionChange, onMachineChange, userRole }) {
  const isDesigner = userRole === 'DESIGN';
  const isProduction = userRole === 'PRODUCTION';
  const isMachine = userRole === 'MACHINING';

  return (
    <tr className="border-t border-gray-100">
      <td className="px-2 py-1 font-medium">{rowNo}</td>
      <td className="px-2 py-1 text-center">
        <input
          type="checkbox"
          checked={designerSelected}
          onChange={(e) => onDesignerChange(rowNo, e.target.checked)}
          disabled={!isDesigner}
          className={isDesigner ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
        />
      </td>
      <td className="px-2 py-1 text-center">
        <input
          type="checkbox"
          checked={productionSelected}
          onChange={(e) => onProductionChange(rowNo, e.target.checked)}
          disabled={!isProduction}
          className={isProduction ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
        />
      </td>
      <td className="px-2 py-1 text-center">
        <input
          type="checkbox"
          checked={machineSelected}
          onChange={(e) => onMachineChange(rowNo, e.target.checked)}
          disabled={!isMachine}
          className={isMachine ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}
        />
      </td>
    </tr>
  );
}
