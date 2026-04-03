import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Info } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface ExpensesProps {
  category: 'ingredients' | 'drinks';
}

export default function Expenses({ category }: ExpensesProps) {
  const { members, expenses, loading } = useData();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [participants, setParticipants] = useState<string[]>([]);
  const [note, setNote] = useState('');

  const filteredExpenses = expenses.filter(e => e.category === category);
  const activeMembers = members.filter(m => m.isActive);

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setPaidBy('');
    setDate(new Date());
    setParticipants(activeMembers.map(m => m.id));
    setNote('');
    setEditingId(null);
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsAddOpen(true);
  };

  const handleEdit = (exp: any) => {
    setTitle(exp.title);
    setAmount(exp.amount.toString());
    setPaidBy(exp.paidByMemberId);
    setDate(exp.expenseDate.toDate ? exp.expenseDate.toDate() : new Date(exp.expenseDate));
    setParticipants(exp.participants);
    setNote(exp.note || '');
    setEditingId(exp.id);
    setIsAddOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !paidBy || participants.length === 0) {
      alert('請填寫完整資訊並至少選擇一位參與者');
      return;
    }

    const data = {
      category,
      title,
      amount: parseFloat(amount),
      paidByMemberId: paidBy,
      expenseDate: Timestamp.fromDate(date),
      participants,
      note,
      updatedAt: serverTimestamp()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'expenses', editingId), data);
      } else {
        await addDoc(collection(db, 'expenses'), {
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
    if (!confirm('確定要刪除此筆支出嗎？')) return;
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-10">載入中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {category === 'ingredients' ? '食材支出' : '飲料支出'}
          </h1>
          <p className="text-gray-500">記錄並分攤{category === 'ingredients' ? '食材' : '飲料'}費用</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          新增支出
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">日期</TableHead>
                  <TableHead>項目</TableHead>
                  <TableHead>金額</TableHead>
                  <TableHead>付款人</TableHead>
                  <TableHead>參與者</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                      尚無紀錄
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((exp) => {
                    const payer = members.find(m => m.id === exp.paidByMemberId);
                    const participantNames = exp.participants
                      .map(pid => members.find(m => m.id === pid)?.name)
                      .filter(Boolean)
                      .join(', ');
                    const displayDate = exp.expenseDate.toDate ? exp.expenseDate.toDate() : new Date(exp.expenseDate);

                    return (
                      <TableRow key={exp.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(displayDate, 'yyyy/MM/dd')}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{exp.title}</div>
                          {exp.note && <div className="text-xs text-gray-400">{exp.note}</div>}
                        </TableCell>
                        <TableCell className="font-bold text-indigo-600">
                          ${exp.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>{payer?.name || '未知'}</TableCell>
                        <TableCell className="max-w-[200px] truncate" title={participantNames}>
                          {participantNames}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(exp)}>
                            <Edit2 className="h-4 w-4 text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(exp.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
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

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '編輯支出' : '新增支出'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
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
                <Label htmlFor="amount">金額</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">項目名稱</Label>
              <Input
                id="title"
                placeholder="例如：全聯買菜、手搖飲"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>付款人</Label>
              <Select value={paidBy} onValueChange={setPaidBy}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇付款人" />
                </SelectTrigger>
                <SelectContent>
                  {activeMembers.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>參與成員 (平均分攤)</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 text-xs"
                  onClick={() => setParticipants(activeMembers.map(m => m.id))}
                >
                  全選
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-40 overflow-y-auto">
                {activeMembers.map((member) => (
                  <div key={member.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`p-${member.id}`}
                      checked={participants.includes(member.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setParticipants([...participants, member.id]);
                        } else {
                          setParticipants(participants.filter(id => id !== member.id));
                        }
                      }}
                    />
                    <label
                      htmlFor={`p-${member.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {member.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="note">備註 (選填)</Label>
              <Input
                id="note"
                placeholder="補充說明"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>取消</Button>
              <Button type="submit">儲存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
