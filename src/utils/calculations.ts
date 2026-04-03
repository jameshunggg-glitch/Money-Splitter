import { Member, Expense, MahjongSession, Settlement } from '../types';

export function calculateSummary(members: Member[], expenses: Expense[], mahjongSessions: MahjongSession[]) {
  const summaryMap = new Map<string, {
    paid: number;
    owed: number;
    mahjong: number;
    net: number;
  }>();

  // Initialize with all members who have at least one record or are active
  const memberIdsWithData = new Set<string>();
  members.filter(m => m.isActive).forEach(m => memberIdsWithData.add(m.id));
  expenses.forEach(e => {
    memberIdsWithData.add(e.paidByMemberId);
    e.participants.forEach(p => memberIdsWithData.add(p));
  });
  mahjongSessions.forEach(s => {
    s.results.forEach(r => memberIdsWithData.add(r.memberId));
  });

  memberIdsWithData.forEach(id => {
    summaryMap.set(id, { paid: 0, owed: 0, mahjong: 0, net: 0 });
  });

  // Calculate Expenses
  expenses.forEach(exp => {
    const payer = summaryMap.get(exp.paidByMemberId);
    if (payer) {
      payer.paid += exp.amount;
    }

    const participantCount = exp.participants.length;
    if (participantCount > 0) {
      const share = exp.amount / participantCount;
      exp.participants.forEach(pid => {
        const p = summaryMap.get(pid);
        if (p) {
          p.owed += share;
        }
      });
    }
  });

  // Calculate Mahjong
  mahjongSessions.forEach(session => {
    session.results.forEach(res => {
      const p = summaryMap.get(res.memberId);
      if (p) {
        p.mahjong += res.netAmount;
      }
    });
  });

  // Calculate Net
  const balances: { memberId: string; net: number }[] = [];
  summaryMap.forEach((val, id) => {
    val.net = val.paid - val.owed + val.mahjong;
    balances.push({ memberId: id, net: val.net });
  });

  // Calculate Settlements
  const creditors = balances.filter(b => b.net > 0.01).sort((a, b) => b.net - a.net);
  const debtors = balances.filter(b => b.net < -0.01).sort((a, b) => a.net - b.net);

  const settlements: Settlement[] = [];
  let cIdx = 0;
  let dIdx = 0;

  const tempCreditors = creditors.map(c => ({ ...c }));
  const tempDebtors = debtors.map(d => ({ ...d, net: Math.abs(d.net) }));

  while (cIdx < tempCreditors.length && dIdx < tempDebtors.length) {
    const creditor = tempCreditors[cIdx];
    const debtor = tempDebtors[dIdx];

    const amount = Math.min(creditor.net, debtor.net);
    if (amount > 0.01) {
      settlements.push({
        from: debtor.memberId,
        to: creditor.memberId,
        amount: Number(amount.toFixed(2))
      });
    }

    creditor.net -= amount;
    debtor.net -= amount;

    if (creditor.net < 0.01) cIdx++;
    if (debtor.net < 0.01) dIdx++;
  }

  return {
    memberSummaries: Array.from(summaryMap.entries()).map(([id, data]) => ({
      memberId: id,
      ...data
    })),
    settlements
  };
}
