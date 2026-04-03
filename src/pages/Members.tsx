import React, { useState } from 'react';
import { Plus, Edit2, Trash2, UserPlus, UserCheck, UserX } from 'lucide-react';
import { collection, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useData } from '../hooks/useData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function Members() {
  const { members, loading } = useData();
  const [newName, setNewName] = useState('');
  const [editingMember, setEditingMember] = useState<{ id: string, name: string } | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await addDoc(collection(db, 'members'), {
        name: newName.trim(),
        isActive: true,
        createdAt: serverTimestamp()
      });
      setNewName('');
      setIsAddOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'members', id), {
        isActive: !currentStatus
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.name.trim()) return;
    try {
      await updateDoc(doc(db, 'members', editingMember.id), {
        name: editingMember.name.trim()
      });
      setEditingMember(null);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="text-center py-10">載入中...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">成員管理</h1>
          <p className="text-gray-500">管理參與分帳的成員名單</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              新增成員
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新增成員</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddMember} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">成員名稱</Label>
                <Input
                  id="name"
                  placeholder="請輸入名稱"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <DialogFooter>
                <Button type="submit">確認新增</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名稱</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-10 text-gray-500">
                    目前尚無成員，請點擊上方按鈕新增。
                  </TableCell>
                </TableRow>
              ) : (
                members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>
                      {member.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                          啟用中
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-100 border-none">
                          已停用
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingMember({ id: member.id, name: member.name })}
                      >
                        <Edit2 className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(member.id, member.isActive)}
                        title={member.isActive ? "停用" : "啟用"}
                      >
                        {member.isActive ? (
                          <UserX className="h-4 w-4 text-orange-500" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-500" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingMember} onOpenChange={(open) => !open && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯成員名稱</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdateName} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">成員名稱</Label>
              <Input
                id="edit-name"
                value={editingMember?.name || ''}
                onChange={(e) => setEditingMember(prev => prev ? { ...prev, name: e.target.value } : null)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="submit">確認修改</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
