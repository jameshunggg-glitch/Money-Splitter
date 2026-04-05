import React from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Utensils, Coffee, Disc, PieChart, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import Members from './pages/Members';
import Expenses from './pages/Expenses';
import Mahjong from './pages/Mahjong';
import Summary from './pages/Summary';

const navItems = [
  { name: '成員管理', path: '/members', icon: Users },
  { name: '食材支出', path: '/ingredients', icon: Utensils, category: 'ingredients' },
  { name: '飲料支出', path: '/drinks', icon: Coffee, category: 'drinks' },
  { name: '遊戲紀錄', path: '/mahjong', icon: Disc },
  { name: '總結算', path: '/summary', icon: PieChart },
];

function Navigation() {
  const location = useLocation();
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/summary" className="flex-shrink-0 flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <PieChart className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-xl text-gray-900 hidden sm:block">分帳工具</span>
            </Link>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-4">
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

          <div className="flex items-center md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 py-2 px-4 space-y-1">
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

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navigation />
        <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Routes>
            <Route path="/" element={<Summary />} />
            <Route path="/members" element={<Members />} />
            <Route path="/ingredients" element={<Expenses category="ingredients" />} />
            <Route path="/drinks" element={<Expenses category="drinks" />} />
            <Route path="/mahjong" element={<Mahjong />} />
            <Route path="/summary" element={<Summary />} />
            <Route path="*" element={<Summary />} />
          </Routes>
        </main>
        <footer className="bg-white border-t border-gray-200 py-4 text-center text-sm text-gray-500">
          © 2026 分帳工具 MVP
        </footer>
      </div>
    </Router>
  );
}