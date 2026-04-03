import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, query, orderBy, serverTimestamp, getDocFromServer } from 'firebase/firestore';
import { db } from '../firebase';
import { Member, Expense, MahjongSession } from '../types';

export function useData() {
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [mahjongSessions, setMahjongSessions] = useState<MahjongSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Test connection
    const testConnection = async () => {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration.");
        }
      }
    };
    testConnection();

    const unsubMembers = onSnapshot(query(collection(db, 'members'), orderBy('createdAt', 'desc')), (snapshot) => {
      setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
    }, (err) => console.error("Members error:", err));

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('expenseDate', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    }, (err) => console.error("Expenses error:", err));

    const unsubMahjong = onSnapshot(query(collection(db, 'mahjong_sessions'), orderBy('sessionDate', 'desc')), (snapshot) => {
      setMahjongSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MahjongSession)));
    }, (err) => console.error("Mahjong error:", err));

    setLoading(false);
    return () => {
      unsubMembers();
      unsubExpenses();
      unsubMahjong();
    };
  }, []);

  return { members, expenses, mahjongSessions, loading };
}
