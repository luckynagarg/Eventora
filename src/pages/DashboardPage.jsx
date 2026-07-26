import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client.js';
import EventCard from '../components/dashboard/EventCard.jsx';
import { EventCardGridSkeleton } from '../components/dashboard/EventCardSkeleton.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import NotificationBell from '../components/ui/NotificationBell.jsx';

export default function DashboardPage() {
  const [featured, setFeatured] = useState([]);
  const [trending, setTrending] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [recent, setRecent] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [featuredRes, trendingRes, upcomingRes, recentRes, catRes] = await Promise.all([
          api.get('/events/featured').catch(() => ({ data: [] })),
          api.get('/events/trending').catch(() => ({ data: [] })),
          api.get('/events/upcoming').catch(() => ({ data: [] })),
          api.get('/events?sort=newest&limit=4&publicOnly=false').catch(() => ({ data: { events: [] } })),
          api.get('/categories').catch(() => ({ data: [] })),
        ]);

        if (mounted) {
          setFeatured(featuredRes.data || []);
          setTrending(trendingRes.data || []);
          setUpcoming(upcomingRes.data || []);
          setRecent(recentRes.data?.events || []);
          setCategories(catRes.data || []);
        }
      } catch {
        if (mounted) {
          setFeatured([]); setTrending([]); setUpcoming([]); setRecent([]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              EventOra
            </span>
          </Link>

          <SearchBar className="hidden sm:block flex-1 max-w-md" />

          <div className="flex items-center gap-2">
            <Link to="/explore" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hidden md:block">
              Explore
            </Link>
            <Link to="/my-events" className="text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hidden md:block">
              My Events
            </Link>

            <NotificationBell />

            {/* Dark mode toggle */}
            <label className="relative inline-block w-9 h-4.5 cursor-pointer">
              <input type="checkbox" checked={darkMode} onChange={(e) => setDarkMode(e.target.checked)} className="sr-only peer" />
              <span className="absolute inset-0 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-blue-500 transition-colors" />
              <span className="absolute left-0.5 top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-transform peer-checked:translate-x-4.5" />
            </label>

            <Link
              to="/events/create"
              className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium transition-colors"
            >
              + Create
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {loading ? (
          <>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
              <EventCardGridSkeleton count={4} />
            </div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
              <EventCardGridSkeleton count={4} />
            </div>
          </>
        ) : (
          <>
            {/* Featured Events */}
            {featured.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">✨ Featured Events</h2>
                  <Link to="/explore?filter=featured" className="text-sm text-purple-600 hover:underline">View all</Link>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {featured.map((event) => <EventCard key={event._id} event={event} />)}
                </div>
              </section>
            )}

            {/* Trending Events */}
            {trending.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">🔥 Trending Events</h2>
                  <Link to="/explore?sort=trending" className="text-sm text-purple-600 hover:underline">View all</Link>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {trending.map((event) => <EventCard key={event._id} event={event} />)}
                </div>
              </section>
            )}

            {/* Upcoming Events */}
            {upcoming.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">📅 Upcoming Events</h2>
                  <Link to="/explore" className="text-sm text-purple-600 hover:underline">View all</Link>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {upcoming.map((event) => <EventCard key={event._id} event={event} />)}
                </div>
              </section>
            )}

            {/* Popular Categories */}
            {categories.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">🏷️ Popular Categories</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  {categories.map((cat) => (
                    <Link
                      key={cat._id}
                      to={`/explore?category=${cat._id}`}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow"
                    >
                      <span className="text-lg">{cat.icon || '📋'}</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</span>
                      {cat.eventCount > 0 && (
                        <span className="text-xs text-gray-400">({cat.eventCount})</span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Recently Added */}
            {recent.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">🆕 Recently Added</h2>
                  <Link to="/explore?sort=newest" className="text-sm text-purple-600 hover:underline">View all</Link>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {recent.map((event) => <EventCard key={event._id} event={event} />)}
                </div>
              </section>
            )}

            {/* Empty state */}
            {featured.length === 0 && trending.length === 0 && upcoming.length === 0 && (
              <div className="text-center py-20">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Welcome to EventOra!</h2>
                <p className="text-gray-500 mb-6">No events yet. Be the first to create one!</p>
                <Link
                  to="/events/create"
                  className="inline-block px-8 py-3 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
                >
                  Create Your First Event
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

