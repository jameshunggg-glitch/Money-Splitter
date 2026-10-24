import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, doc, query, orderBy, serverTimestamp, getDocFromServer, setDoc, updateDoc, writeBatch, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Member, Expense, MahjongSession, Trip } from '../types';
import { toDate } from '../utils/dates';

// Records created before trips existed are moved into this trip on first load.
export const DEFAULT_TRIP_ID = 'default';
const DEFAULT_TRIP_NAME = '第一趟旅程';

interface DataContextValue {
  members: Member[];
  trips: Trip[];
  expenses: Expense[];
  mahjongSessions: MahjongSession[];
  loading: boolean;
  tripsError: boolean;
}

const DataContext = createContext<DataContextValue | null>(null);

type LoadedKey = 'members' | 'trips' | 'expenses' | 'mahjong';

async function migrateLegacyRecords(trips: Trip[], members: Member[], expenses: Expense[], mahjongSessions: MahjongSession[]) {
  const orphanExpenses = expenses.filter(e => !e.tripId);
  const orphanSessions = mahjongSessions.filter(s => !s.tripId);
  if (orphanExpenses.length === 0 && orphanSessions.length === 0) return;

  const referencedIds = new Set<string>();
  orphanExpenses.forEach(e => {
    referencedIds.add(e.paidByMemberId);
    e.participants.forEach(p => referencedIds.add(p));
  });
  orphanSessions.forEach(s => s.results.forEach(r => referencedIds.add(r.memberId)));

  // Create the trip first so records never point at a trip that failed to save.
  const tripRef = doc(db, 'trips', DEFAULT_TRIP_ID);
  if (trips.some(t => t.id === DEFAULT_TRIP_ID)) {
    await updateDoc(tripRef, { memberIds: arrayUnion(...referencedIds) });
  } else {
    members.filter(m => m.isActive).forEach(m => referencedIds.add(m.id));
    await setDoc(tripRef, {
      name: DEFAULT_TRIP_NAME,
      memberIds: Array.from(referencedIds),
      createdAt: serverTimestamp()
    });
  }

  const refs = [
    ...orphanExpenses.map(e => doc(db, 'expenses', e.id)),
    ...orphanSessions.map(s => doc(db, 'mahjong_sessions', s.id))
  ];
  // Firestore batches are limited to 500 writes.
  for (let i = 0; i < refs.length; i += 500) {
    const batch = writeBatch(db);
    refs.slice(i, i + 500).forEach(ref => batch.update(ref, { tripId: DEFAULT_TRIP_ID }));
    await batch.commit();
  }
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [mahjongSessions, setMahjongSessions] = useState<MahjongSession[]>([]);
  const [loaded, setLoaded] = useState<Record<LoadedKey, boolean>>({ members: false, trips: false, expenses: false, mahjong: false });
  const [tripsError, setTripsError] = useState(false);
  const migrationStarted = useRef(false);

  const markLoaded = (key: LoadedKey) => setLoaded(prev => prev[key] ? prev : { ...prev, [key]: true });

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
      markLoaded('members');
    }, (err) => {
      console.error("Members error:", err);
      markLoaded('members');
    });

    const unsubTrips = onSnapshot(collection(db, 'trips'), (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, memberIds: [], ...d.data() } as Trip));
      // Newest first: by start date when set, otherwise by creation time (pending writes count as now).
      const sortKey = (t: Trip) => (toDate(t.startDate) ?? toDate(t.createdAt))?.getTime() ?? Infinity;
      list.sort((a, b) => sortKey(b) - sortKey(a));
      setTrips(list);
      setTripsError(false);
      markLoaded('trips');
    }, (err) => {
      console.error("Trips error:", err);
      setTripsError(true);
      markLoaded('trips');
    });

    const unsubExpenses = onSnapshot(query(collection(db, 'expenses'), orderBy('expenseDate', 'desc')), (snapshot) => {
      setExpenses(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
      markLoaded('expenses');
    }, (err) => {
      console.error("Expenses error:", err);
      markLoaded('expenses');
    });

    const unsubMahjong = onSnapshot(query(collection(db, 'mahjong_sessions'), orderBy('sessionDate', 'desc')), (snapshot) => {
      setMahjongSessions(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MahjongSession)));
      markLoaded('mahjong');
    }, (err) => {
      console.error("Mahjong error:", err);
      markLoaded('mahjong');
    });

    return () => {
      unsubMembers();
      unsubTrips();
      unsubExpenses();
      unsubMahjong();
    };
  }, []);

  const loading = !(loaded.members && loaded.trips && loaded.expenses && loaded.mahjong);

  useEffect(() => {
    if (loading || tripsError || migrationStarted.current) return;
    migrationStarted.current = true;
    migrateLegacyRecords(trips, members, expenses, mahjongSessions).catch(err => {
      console.error("Migration error:", err);
    });
  }, [loading, tripsError, trips, members, expenses, mahjongSessions]);

  const value = useMemo(
    () => ({ members, trips, expenses, mahjongSessions, loading, tripsError }),
    [members, trips, expenses, mahjongSessions, loading, tripsError]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

// Data scoped to one trip: its members, expenses and mahjong sessions.
export function useTripData(tripId: string | undefined) {
  const { members, trips, expenses, mahjongSessions, loading } = useData();

  return useMemo(() => {
    const trip = trips.find(t => t.id === tripId) ?? null;
    const memberIds = new Set(trip?.memberIds ?? []);
    return {
      trip,
      members,
      tripMembers: members.filter(m => memberIds.has(m.id)),
      expenses: expenses.filter(e => e.tripId === tripId),
      mahjongSessions: mahjongSessions.filter(s => s.tripId === tripId),
      loading
    };
  }, [tripId, members, trips, expenses, mahjongSessions, loading]);
}
