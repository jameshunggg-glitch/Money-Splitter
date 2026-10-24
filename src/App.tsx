import React from 'react';
import { HashRouter as Router, Routes, Route, Link, Navigate, Outlet, useLocation, useNavigate, useParams, matchPath } from 'react-router-dom';
import { Users, Utensils, Coffee, Disc, PieChart, Menu, X, Map as MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { DataProvider, useData } from './hooks/useData';
import { getLastTripId, setLastTripId } from './utils/lastTrip';
import Members from './pages/Members';
import Expenses from './pages/Expenses';
import Mahjong from './pages/Mahjong';
import Summary from './pages/Summary';
import Trips from './pages/Trips';

const globalNavItems = [
  { name: '旅程', path: '/trips', icon: MapIcon },
  { name: '成員管理', path: '/members', icon: Users },
];

const tripNavItems = [
  { name: '食材支出', path: 'ingredients', icon: Utensils },
  { name: '飲料支出', path: 'drinks', icon: Coffee },
  { name: '遊戲紀錄', path: 'mahjong', icon: Disc },
  { name: '總結算', path: 'summary', icon: PieChart },
];

// The trip shown in the URL, or the one last opened when on a page outside any trip.
function useCurrentTripId() {
  const location = useLocation();
  const { trips } = useData();
  const match = matchPath('/trips/:tripId/*', location.pathname);
  if (match?.params.tripId) return match.params.tripId;
  const lastTripId = getLastTripId();
  return trips.some(t => t.id === lastTripId) ? lastTripId : null;
}

function TripSwitcher({ tripId }: { tripId: string }) {
  const { trips } = useData();
  const location = useLocation();
  const navigate = useNavigate();
  const subPage = matchPath('/trips/:tripId/:page', location.pathname)?.params.page ?? 'summary';

  return (
    <Select
      value={tripId}
      onValueChange={(value) => {
        if (!value) return;
        setLastTripId(value);
        navigate(`/trips/${value}/${subPage}`);
      }}
    >
      <SelectTrigger className="max-w-[180px] sm:max-w-[240px] font-medium">
        <SelectValue>{(value: string) => trips.find(t => t.id === value)?.name ?? '選擇旅程'}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {trips.map(t => (
          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);
  const tripId = useCurrentTripId();

  const navItems = [
    ...(tripId ? tripNavItems.map(item => ({ ...item, path: `/trips/${tripId}/${item.path}` })) : []),
    ...globalNavItems,
  ];

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <PieChart className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900 hidden xl:block">分帳工具</span>
            </Link>
            {tripId && <TripSwitcher tripId={tripId} />}
          </div>

          <div className="hidden lg:flex lg:items-center lg:space-x-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === item.path
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <div className="flex items-center gap-2">
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </div>
              </Link>
            ))}
          </div>

          <div className="flex items-center lg:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 py-2 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                'block px-3 py-2 rounded-md text-base font-medium',
                location.pathname === item.path
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                {item.name}
              </div>
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}

// "/" opens the trip this browser used last, or the trip list.
function HomeRedirect() {
  const { trips, loading } = useData();
  if (loading) return <div className="text-center py-10">載入中...</div>;
  const lastTripId = getLastTripId();
  if (lastTripId && trips.some(t => t.id === lastTripId)) {
    return <Navigate to={`/trips/${lastTripId}/summary`} replace />;
  }
  return <Navigate to="/trips" replace />;
}

// Guards every page inside a trip: waits for data, handles unknown trip IDs, remembers the trip.
function TripLayout() {
  const { tripId } = useParams();
  const { trips, loading } = useData();
  const trip = trips.find(t => t.id === tripId);

  React.useEffect(() => {
    if (trip) setLastTripId(trip.id);
  }, [trip?.id]);

  if (loading) return <div className="text-center py-10">載入中...</div>;
  if (!trip) {
    return (
      <div className="text-center py-10 space-y-4">
        <p className="text-gray-500">找不到這個旅程，可能已被刪除。</p>
        <Link to="/trips" className="text-indigo-600 font-medium hover:underline">回到旅程列表</Link>
      </div>
    );
  }
  return <Outlet />;
}

export default function App() {
  return (
    <DataProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navigation />
          <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Routes>
              <Route path="/" element={<HomeRedirect />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/members" element={<Members />} />
              <Route path="/trips/:tripId" element={<TripLayout />}>
                <Route index element={<Navigate to="summary" replace />} />
                <Route path="ingredients" element={<Expenses category="ingredients" />} />
                <Route path="drinks" element={<Expenses category="drinks" />} />
                <Route path="mahjong" element={<Mahjong />} />
                <Route path="summary" element={<Summary />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500">
            © 2026 分帳工具 MVP
          </footer>
        </div>
      </Router>
    </DataProvider>
  );
}
