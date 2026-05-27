export interface Prize {
  id: string;
  label: string;
  probability: number; // e.g. 5.0 for 5%
  color: string; // hex code or color class
  textColor: string; // text color hex or class
  status: 'نشط' | 'غير نشط';
  isGoldGradient?: boolean;
  cost?: number;
}

export interface AccessRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  purpose: string;
  status: 'مقبول' | 'قيد الانتظار' | 'مرفوض';
  requestDate: string;
  position?: string;
}

export interface DashboardStats {
  totalDistributed: number;
  increasePercentage: number;
}

export interface WinRecord {
  id: string;
  email: string;
  displayName: string;
  prizeLabel: string;
  valueAssumed: number;
  winDate: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
}
