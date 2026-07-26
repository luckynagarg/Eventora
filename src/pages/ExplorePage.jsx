import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client.js';
import EventCard from '../components/dashboard/EventCard.jsx';
import { EventCardGridSkeleton } from '../components/dashboard/EventCardSkeleton.jsx';
import FilterPanel from '../components/ui/FilterPanel.jsx';
import SearchBar from '../components/ui/SearchBar.jsx';
import Pagination from '../components/ui/Pagination.jsx';

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [showFilters, setShowFilters] = useState(false);

  const currentFilters = {
    category: searchParams.get('category') || '',
    city: searchParams.get('city') || '',
    date: searchParams.get('date') || '',
    price: searchParams.get('price') || '',
    eventType: searchParams.get('eventType') || '',
    sort: searchParams.get('sort') || 'date_asc',
  };

  const searchQuery = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page')) || 1;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('search', searchQuery);
      params.set('page', page);
      params.set('limit', '12');
      Object.entries(currentFilters).forEach(([key, val]) => {
        if (val) params.set(key, val);
      });

      const res = await api.get(`/events?${params.toString()}`);
      setEvents(res.data.events || []);
      setPagination(res.data.pagination || { page: 1, pages: 1, total: 0 });
    } catch {
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, page, currentFilters.category, currentFilters.city, currentFilters.date, currentFilters.price, currentFilters.eventType, currentFilters.sort]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleFilterChange = (filters) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.set(key, val);
    });
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <a href="/dashboard" className="text-xl font-black bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            EventOra
          </a>
          <SearchBar className="flex-1 max-w-md" />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="lg:hidden px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 text-sm"
          >
            {showFilters ? '✕ Close' : '☰ Filters'}
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Search Results Header */}
        {searchQuery && (
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Search results for "{searchQuery}"
            </h1>
            <p className="text-sm text-gray-500 mt-1">{pagination.total} event{pagination.total !== 1 ? 's' : ''} found</p>
          </div>
        )}

        <div className="flex gap-6">
          {/* Filter Sidebar */}
          <div className={`${showFilters ? 'block' : 'hidden'} lg:block w-full lg:w-64 flex-shrink-0`}>
            <FilterPanel filters={currentFilters} onChange={handleFilterChange} />
          </div>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <EventCardGridSkeleton count={12} />
            ) : events.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">🔍</div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No events found</h2>
                <p className="text-gray-500 mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={() => setSearchParams({})}
                  className="px-6 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-gray-500">{pagination.total} event{pagination.total !== 1 ? 's' : ''} found</p>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                  {events.map((event) => <EventCard key={event._id} event={event} />)}
                </div>
                <Pagination
                  page={pagination.page}
                  pages={pagination.pages}
                  onPageChange={handlePageChange}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

