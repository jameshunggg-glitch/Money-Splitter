export interface Member {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: any;
}

export interface Expense {
  id: string;
  category: 'ingredients' | 'drinks';
  title: string;
  amount: number;
  paidByMemberId: string;
  expenseDate: any;
  participants: string[]; // Member IDs
  note?: string;
  createdAt: any;
}

export interface MahjongResult {
  memberId: string;
  netAmount: number;
}

export interface MahjongSession {
  id: string;
  title: string;
  sessionDate: any;
  results: MahjongResult[];
  note?: string;
  createdAt: any;
}

export interface Settlement {
  from: string; // Member ID
  to: string;   // Member ID
  amount: number;
}
