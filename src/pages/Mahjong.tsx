import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { db } from '../firebase';
import { useData } from '../hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function Mahjong() {
  const { members, mahjongSessions, loading } = useData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [results, setResults] = useState<{ memberId: string, netAmount: string }[]>([]);
  const [note, setNote] = useState('');
  const [expandedSessionIds, setExpandedSessionIds] = useState<Set<string>>(new Set());

  const toggleSessionExpand = (sessionId: string) => {
    setExpandedSessionIds((prev) => {
      const next = new Set(prev);

      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }

      return next;
    });
  };

  const activeMembers = members.filter(m => m.isActive);

  const totalSum = results.reduce((sum, r) => sum + (parseFloat(r.netAmount) || 0), 0);
  const isBalanced = Math.abs(totalSum) < 0.01;

  const resetForm = () => {
    setTitle('');
    setDate(new Date());
    setResults([]);
    setNote('');
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleEdit = (session: any) => {
    setTitle(session.title);
    setDate(session.sessionDate.toDate ? session.sessionDate.toDate() : new Date(session.sessionDate));
    setResults(session.results.map((r: any) => ({ memberId: r.memberId, netAmount: r.netAmount.toString() })));
    setNote(session.note || '');
    setEditingId(session.id);
    setIsAddOpen(true);
  };

  const handleAddPlayer = (memberId: string) => {
    if (results.find(r => r.memberId === memberId)) return;
    setResults([...results, { memberId, netAmount: '0' }]);
  };

  const handleRemovePlayer = (memberId: string) => {
    setResults(results.filter(r => r.memberId !== memberId));
  };

  const handleAmountChange = (memberId: string, amount: string) => {
    setResults(results.map(r => r.memberId === memberId ? { ...r, netAmount: amount } : r));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || results.length < 2) {
      alert('請填寫標題並至少加入兩位玩家');
      return;
    }
    if (!isBalanced) {
      alert('總和必須為 0');
      return;
    }

    const data = {
      title,
      sessionDate: Timestamp.fromDate(date),
      results: results.map(r => ({ memberId: r.memberId, netAmount: parseFloat(r.netAmount) || 0 })),
      note,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'mahjong_sessions', editingId), data);
      } else {
        await addDoc(collection(db, 'expenses'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleActualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || results.length < 2) {
      alert('請填寫標題並至少加入兩位玩家');
      return;
    }
    if (!isBalanced) {
      alert('總和必須為 0');
      return;
    }

    const data = {
      title,
      sessionDate: Timestamp.fromDate(date),
      results: results.map(r => ({ memberId: r.memberId, netAmount: parseFloat(r.netAmount) || 0 })),
      note,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'mahjong_sessions', editingId), data);
      } else {
        await addDoc(collection(db, 'mahjong_sessions'), {
          ...data,
          createdAt: serverTimestamp()
        });
      }
      setIsAddOpen(false);
      resetForm();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定要刪除此場麻將紀錄嗎？')) return;
    try {
      await deleteDoc(doc(db, 'mahjong_sessions', id));
    } catch (err) {
      console.error(err);
    }
  };

  const getMemberName = (memberId: string) => {
    return members.find((m) => m.id === memberId)?.name || '未知玩家';
  };

  if (loading) return <div className="text-center py-10">載入中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">遊戲紀錄</h1>
          <p className="text-gray-500">打工十年還是工 一朝All in著皇宮</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          新增場次
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">日期</TableHead>
                  <TableHead>場次名稱</TableHead>
                  <TableHead>玩家數</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mahjongSessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-gray-500">
                      尚無紀錄
                    </TableCell>
                  </TableRow>
                ) : (
                  mahjongSessions.map((session) => {
                    const displayDate = session.sessionDate.toDate ? session.sessionDate.toDate() : new Date(session.sessionDate);
                    const isExpanded = expandedSessionIds.has(session.id);

                    return (
                      <React.Fragment key={session.id}>
                        <TableRow
                          className="cursor-pointer transition-colors hover:bg-muted/40"
                          onClick={() => toggleSessionExpand(session.id)}
                        >
                          <TableCell className="whitespace-nowrap">
                            {format(displayDate, 'yyyy/MM/dd')}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{session.title}</div>
                            {session.note && <div className="text-xs text-gray-400">{session.note}</div>}
                          </TableCell>
                          <TableCell>{session.results.length} 人</TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(session);
                              }}
                            >
                              <Edit2 className="h-4 w-4 text-gray-500" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(session.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isExpanded && (
                          <TableRow>
                            <TableCell colSpan={4} className="bg-muted/20 px-6 py-4">
                              <div className="rounded-lg border bg-background p-4">
                                <div className="mb-3 text-sm font-medium text-muted-foreground">
                                  本場明細
                                </div>

                                <div className="space-y-2">
                                  {session.results.map((result: any) => {
                                    const amount = Number(result.netAmount) || 0;
                                    const amountClass =
                                      amount > 0
                                        ? 'text-green-600'
                                        : amount < 0
                                        ? 'text-red-600'
                                        : 'text-gray-500';

                                    return (
                                      <div
                                        key={result.memberId}
                                        className="flex items-center justify-between rounded-md border px-4 py-3"
                                      >
                                        <span className="font-medium text-gray-900">
                                          {getMemberName(result.memberId)}
                                        </span>

                                        <span className={`font-semibold tabular-nums ${amountClass}`}>
                                          {amount > 0 ? '+' : ''}
                                          {amount}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '編輯麻將場次' : '新增麻將場次'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleActualSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>日期</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP", { locale: zhTW }) : <span>選擇日期</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-title">場次名稱</Label>
                <Input
                  id="m-title"
                  placeholder="例如：週五麻將"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>新增玩家</Label>
              <div className="flex flex-wrap gap-2">
                {activeMembers.map(m => (
                  <Button
                    key={m.id}
                    type="button"
                    variant={results.find(r => r.memberId === m.id) ? "secondary" : "outline"}
                    size="sm"
                    className="text-xs"
                    onClick={() => handleAddPlayer(m.id)}
                    disabled={!!results.find(r => r.memberId === m.id)}
                  >
                    {m.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Label>玩家勝負金額 (贏為正，輸為負)</Label>
              <div className="space-y-2 border rounded-md p-3">
                {results.length === 0 && <div className="text-center text-sm text-gray-400 py-2">請先新增玩家</div>}
                {results.map((res, index) => {
                  const member = members.find(m => m.id === res.memberId);
                  return (
                    <div key={res.memberId} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-20 truncate">{member?.name}</span>
                      <Input
                        type="number"
                        className="flex-grow"
                        placeholder="0"
                        value={res.netAmount}
                        onChange={(e) => handleAmountChange(res.memberId, e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-400"
                        onClick={() => handleRemovePlayer(res.memberId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={cn(
              "p-3 rounded-md flex justify-between items-center text-sm font-bold",
              isBalanced ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            )}>
              <span>總和驗證：</span>
              <span>{totalSum > 0 ? `+${totalSum}` : totalSum} {isBalanced ? '(OK)' : '(不為 0)'}</span>
            </div>

            {!isBalanced && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>驗證失敗</AlertTitle>
                <AlertDescription>
                  所有玩家的勝負金額總和必須等於 0。
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="m-note">備註 (選填)</Label>
              <Input
                id="m-note"
                placeholder="補充說明"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>取消</Button>
              <Button type="submit" disabled={!isBalanced || results.length < 2}>儲存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
