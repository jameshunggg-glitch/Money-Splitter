import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, Calendar as CalendarIcon, Users, Wallet, Disc, Lock, AlertCircle } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, Timestamp, writeBatch, deleteField } from 'firebase/firestore';
import { format } from 'date-fns';
import { zhTW } from 'date-fns/locale';
import { db } from '../firebase';
import { useData } from '../hooks/useData';
import { Trip } from '../types';
import { toDate, formatDateRange } from '../utils/dates';
import { setLastTripId } from '../utils/lastTrip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

function DatePickerField({ label, value, onChange }: { label: string; value: Date | undefined; onChange: (d: Date | undefined) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>{label}</Label>
        {value && (
          <button type="button" className="text-xs text-gray-400 hover:text-gray-600" onClick={() => onChange(undefined)}>
            清除
          </button>
        )}
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={"outline"}
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "PPP", { locale: zhTW }) : <span>選擇日期</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => onChange(d ?? undefined)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function Trips() {
  const { members, trips, expenses, mahjongSessions, loading, tripsError } = useData();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingTrip, setDeletingTrip] = useState<Trip | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [memberIds, setMemberIds] = useState<string[]>([]);

  // Members who already have records in the trip being edited can't be removed from it.
  const lockedMemberIds = new Set<string>();
  if (editingId) {
    expenses.filter(e => e.tripId === editingId).forEach(e => {
      lockedMemberIds.add(e.paidByMemberId);
      e.participants.forEach(p => lockedMemberIds.add(p));
    });
    mahjongSessions.filter(s => s.tripId === editingId).forEach(s => {
      s.results.forEach(r => lockedMemberIds.add(r.memberId));
    });
  }
  const candidateMembers = members.filter(m => m.isActive || memberIds.includes(m.id) || lockedMemberIds.has(m.id));

  const handleOpenAdd = () => {
    setName('');
    setStartDate(undefined);
    setEndDate(undefined);
    setMemberIds(members.filter(m => m.isActive).map(m => m.id));
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (trip: Trip) => {
    setName(trip.name);
    setStartDate(toDate(trip.startDate) ?? undefined);
    setEndDate(toDate(trip.endDate) ?? undefined);
    setMemberIds(trip.memberIds);
    setEditingId(trip.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('請輸入旅程名稱');
      return;
    }
    if (startDate && endDate && startDate > endDate) {
      alert('結束日期不能早於開始日期');
      return;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'trips', editingId), {
          name: name.trim(),
          startDate: startDate ? Timestamp.fromDate(startDate) : deleteField(),
          endDate: endDate ? Timestamp.fromDate(endDate) : deleteField(),
          memberIds: Array.from(new Set([...memberIds, ...lockedMemberIds])),
          updatedAt: serverTimestamp()
        });
        setIsFormOpen(false);
      } else {
        const ref = await addDoc(collection(db, 'trips'), {
          name: name.trim(),
          ...(startDate && { startDate: Timestamp.fromDate(startDate) }),
          ...(endDate && { endDate: Timestamp.fromDate(endDate) }),
          memberIds,
          createdAt: serverTimestamp()
        });
        setIsFormOpen(false);
        openTrip(ref.id);
      }
    } catch (err) {
      console.error(err);
      alert('儲存失敗，請稍後再試');
    }
  };

  const openTrip = (tripId: string) => {
    setLastTripId(tripId);
    navigate(`/trips/${tripId}/summary`);
  };

  const handleOpenDelete = (trip: Trip) => {
    setDeleteConfirmName('');
    setDeletingTrip(trip);
  };

  const handleDelete = async () => {
    if (!deletingTrip || deleteConfirmName !== deletingTrip.name) return;
    setIsDeleting(true);
    try {
      // Delete the trip's records first, then the trip itself, so a failure never leaves records without a trip.
      const refs = [
        ...expenses.filter(e => e.tripId === deletingTrip.id).map(e => doc(db, 'expenses', e.id)),
        ...mahjongSessions.filter(s => s.tripId === deletingTrip.id).map(s => doc(db, 'mahjong_sessions', s.id)),
        doc(db, 'trips', deletingTrip.id)
      ];
      // Firestore batches are limited to 500 writes.
      for (let i = 0; i < refs.length; i += 500) {
        const batch = writeBatch(db);
        refs.slice(i, i + 500).forEach(ref => batch.delete(ref));
        await batch.commit();
      }
      setDeletingTrip(null);
    } catch (err) {
      console.error(err);
      alert('刪除失敗，請稍後再試');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) return <div className="text-center py-10">載入中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">旅程</h1>
          <p className="text-gray-500">每趟旅程各自記帳，舊的帳務都會保留</p>
        </div>
        <Button onClick={handleOpenAdd} className="gap-2" disabled={tripsError}>
          <Plus className="h-4 w-4" />
          新增旅程
        </Button>
      </div>

      {tripsError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>無法讀取旅程</AlertTitle>
          <AlertDescription>
            資料庫拒絕存取旅程資料，請確認 Firebase Console 的 Firestore 規則已更新。
          </AlertDescription>
        </Alert>
      )}

      {!tripsError && trips.length === 0 ? (
        <Card>
          <CardContent className="text-center py-10 text-gray-500">
            目前尚無旅程，請點擊上方按鈕新增。
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => {
            const tripExpenses = expenses.filter(e => e.tripId === trip.id);
            const total = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
            const sessionCount = mahjongSessions.filter(s => s.tripId === trip.id).length;
            const dateRange = formatDateRange(trip.startDate, trip.endDate);

            return (
              <Card
                key={trip.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openTrip(trip.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-lg truncate">{trip.name}</CardTitle>
                      <CardDescription>{dateRange || '未設定日期'}</CardDescription>
                    </div>
                    <div className="flex shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(trip);
                        }}
                      >
                        <Edit2 className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDelete(trip);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {trip.memberIds.length} 人
                  </span>
                  <span className="flex items-center gap-1">
                    <Wallet className="h-4 w-4" />
                    <span className="font-bold text-indigo-600">${total.toLocaleString()}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Disc className="h-4 w-4" />
                    {sessionCount} 場
                  </span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? '編輯旅程' : '新增旅程'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="trip-name">旅程名稱</Label>
              <Input
                id="trip-name"
                placeholder="例如：2026 墾丁"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <DatePickerField label="開始日期 (選填)" value={startDate} onChange={setStartDate} />
              <DatePickerField label="結束日期 (選填)" value={endDate} onChange={setEndDate} />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label>參加成員</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setMemberIds(candidateMembers.map(m => m.id))}
                >
                  全選
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-48 overflow-y-auto">
                {candidateMembers.length === 0 && (
                  <div className="col-span-2 text-center text-sm text-gray-400 py-2">請先到「成員管理」新增成員</div>
                )}
                {candidateMembers.map((member) => {
                  const isLocked = lockedMemberIds.has(member.id);
                  return (
                    <div key={member.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`t-${member.id}`}
                        checked={isLocked || memberIds.includes(member.id)}
                        disabled={isLocked}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setMemberIds([...memberIds, member.id]);
                          } else {
                            setMemberIds(memberIds.filter(id => id !== member.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={`t-${member.id}`}
                        className="flex items-center gap-1 text-sm font-medium leading-none"
                        title={isLocked ? '此成員在本旅程已有紀錄，無法移除' : undefined}
                      >
                        {member.name}
                        {isLocked && <Lock className="h-3 w-3 text-gray-400" />}
                      </label>
                    </div>
                  );
                })}
              </div>
              {lockedMemberIds.size > 0 && (
                <p className="text-xs text-gray-400">有鎖頭的成員在本旅程已有紀錄，無法移除。</p>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>取消</Button>
              <Button type="submit">儲存</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletingTrip} onOpenChange={(open) => !open && !isDeleting && setDeletingTrip(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>刪除旅程</DialogTitle>
            <DialogDescription>
              這會永久刪除「{deletingTrip?.name}」以及其中所有的支出與麻將紀錄，無法復原。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-confirm">請輸入旅程名稱以確認</Label>
            <Input
              id="delete-confirm"
              placeholder={deletingTrip?.name}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" onClick={() => setDeletingTrip(null)} disabled={isDeleting}>取消</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting || deleteConfirmName !== deletingTrip?.name}
            >
              {isDeleting ? '刪除中...' : '永久刪除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
