import { useState, useEffect } from 'react';

export default function FilterPanel({ filters, onChange, className = '' }) {
  const [categories, setCategories] = useState([]);
  const [localFilters, setLocalFilters] = useState({
    category: '',
    city: '',
    date: '',
    price: '',
    eventType: '',
    sort: 'date_asc',
    ...filters,
  });

  useEffect(() => {
    fetch('/api/categories')
      .then((res) => res.json())
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLocalFilters((prev) => ({ ...prev, ...filters }));
  }, [filters]);

  const handleChange = (key, value) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    onChange?.(updated);
  };

  const clearAll = () => {
    const cleared = { category: '', city: '', date: '', price: '', eventType: '', sort: 'date_asc' };
    setLocalFilters(cleared);
    onChange?.(cleared);
  };

  const hasActiveFilters = Object.values(localFilters).some((v) => v && v !== '' && v !== 'date_asc');

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">Filters</h3>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-xs text-purple-600 hover:underline">
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Category */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Category</label>
          <select
            value={localFilters.category}
            onChange={(e) => handleChange('category', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* City */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">City</label>
          <input
            type="text"
            value={localFilters.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="Enter city..."
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
          <select
            value={localFilters.date}
            onChange={(e) => handleChange('date', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">Any Time</option>
            <option value="today">Today</option>
            <option value="tomorrow">Tomorrow</option>
            <option value="this_week">This Week</option>
            <option value="this_weekend">This Weekend</option>
            <option value="next_week">Next Week</option>
            <option value="this_month">This Month</option>
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Price</label>
          <select
            value={localFilters.price}
            onChange={(e) => handleChange('price', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">All Prices</option>
            <option value="free">Free</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {/* Event Type */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Event Type</label>
          <select
            value={localFilters.eventType}
            onChange={(e) => handleChange('eventType', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="">All Types</option>
            <option value="offline">In-Person</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>

        {/* Sort */}
        <div>
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sort By</label>
          <select
            value={localFilters.sort}
            onChange={(e) => handleChange('sort', e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="date_asc">Date (Earliest)</option>
            <option value="date_desc">Date (Latest)</option>
            <option value="newest">Newest First</option>
            <option value="popularity">Most Popular</option>
            <option value="trending">Trending</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>
    </div>
  );
}

