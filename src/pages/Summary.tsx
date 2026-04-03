import React, { useMemo } from 'react';
import { ArrowRight, Wallet, TrendingUp, TrendingDown, RefreshCcw } from 'lucide-react';
import { useData } from '../hooks/useData';
import { calculateSummary } from '../utils/calculations';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export default function Summary() {
  const { members, expenses, mahjongSessions, loading } = useData();

  const { memberSummaries, settlements } = useMemo(() => {
    if (loading) return { memberSummaries: [], settlements: [] };
    return calculateSummary(members, expenses, mahjongSessions);
  }, [members, expenses, mahjongSessions, loading]);

  if (loading) return <div className="text-center py-10">載入中...</div>;

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const ingredientExpenses = expenses.filter(e => e.category === 'ingredients').reduce((sum, e) => sum + e.amount, 0);
  const drinkExpenses = expenses.filter(e => e.category === 'drinks').reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">總結算</h1>
        <p className="text-gray-500">匯總所有支出與麻將勝負，提供最終轉帳建議</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>食材總支出</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600">${ingredientExpenses.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>飲料總支出</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600">${drinkExpenses.toLocaleString()}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>麻將總場次</CardDescription>
            <CardTitle className="text-2xl font-bold text-indigo-600">{mahjongSessions.length} 場</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Member Summary Table */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-indigo-500" />
                每人彙總
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>成員</TableHead>
                      <TableHead className="text-right">總付款</TableHead>
                      <TableHead className="text-right">總應付</TableHead>
                      <TableHead className="text-right">麻將淨額</TableHead>
                      <TableHead className="text-right">最終淨額</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberSummaries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                          尚無資料
                        </TableCell>
                      </TableRow>
                    ) : (
                      memberSummaries.map((summary) => {
                        const member = members.find(m => m.id === summary.memberId);
                        return (
                          <TableRow key={summary.memberId}>
                            <TableCell className="font-medium">{member?.name}</TableCell>
                            <TableCell className="text-right">${Math.round(summary.paid).toLocaleString()}</TableCell>
                            <TableCell className="text-right">${Math.round(summary.owed).toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <span className={cn(
                                summary.mahjong > 0 ? "text-green-600" : summary.mahjong < 0 ? "text-red-600" : "text-gray-400"
                              )}>
                                {summary.mahjong > 0 ? `+${Math.round(summary.mahjong)}` : Math.round(summary.mahjong)}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Badge 
                                variant={summary.net > 0 ? "default" : summary.net < 0 ? "destructive" : "secondary"}
                                className={cn(
                                  "font-bold",
                                  summary.net > 0 ? "bg-green-100 text-green-700 hover:bg-green-100 border-none" : 
                                  summary.net < 0 ? "bg-red-100 text-red-700 hover:bg-red-100 border-none" : ""
                                )}
                              >
                                {summary.net > 0 ? `+${Math.round(summary.net)}` : Math.round(summary.net)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settlement Suggestions */}
        <div className="space-y-6">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCcw className="h-5 w-5 text-indigo-500" />
                最終轉帳建議
              </CardTitle>
              <CardDescription>自動計算最簡化轉帳路徑</CardDescription>
            </CardHeader>
            <CardContent>
              {settlements.length === 0 ? (
                <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  目前帳目已清平
                </div>
              ) : (
                <div className="space-y-3">
                  {settlements.map((s, i) => {
                    const fromMember = members.find(m => m.id === s.from);
                    const toMember = members.find(m => m.id === s.to);
                    return (
                      <div key={i} className="flex items-center justify-between p-4 bg-white border rounded-xl shadow-sm">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-gray-400">付款方</span>
                          <span className="font-bold text-red-600">{fromMember?.name}</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 px-4">
                          <span className="text-lg font-black text-indigo-600">${s.amount.toLocaleString()}</span>
                          <ArrowRight className="h-4 w-4 text-gray-300" />
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs text-gray-400">收款方</span>
                          <span className="font-bold text-green-600">{toMember?.name}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
