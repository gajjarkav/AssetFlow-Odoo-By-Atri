import React from 'react';
import { assetStatusConfig, bookingStatusConfig, maintenanceStatusConfig, transferStatusConfig } from '../../constants/statusConfig';

interface StatusBadgeProps {
  status: string;
  type: 'asset' | 'booking' | 'maintenance' | 'transfer';
}

const configMap = {
  asset: assetStatusConfig,
  booking: bookingStatusConfig,
  maintenance: maintenanceStatusConfig,
  transfer: transferStatusConfig,
};

export default function StatusBadge({ status, type }: StatusBadgeProps) {
  const config = configMap[type][status];
  if (!config) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/20 text-gray-400 border border-gray-500/30">
        {status}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  );
}
