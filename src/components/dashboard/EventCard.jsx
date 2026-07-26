import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client.js';

const PLACEHOLDER_BANNER = 'https://via.placeholder.com/400x200?text=EventOra';

export default function EventCard({ event, onBookmarkChange, showActions = true }) {
  const [bookmarked, setBookmarked] = useState(false);
  const [bookmarkLoading, setBookmarkLoading] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (token && event._id) {
      api.get(`/bookmarks/check/${event._id}`)
        .then((res) => setBookmarked(res.data.bookmarked))
        .catch(() => {});
    }
  }, [event._id, token]);

  const toggleBookmark = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token || bookmarkLoading) return;
    setBookmarkLoading(true);
    try {
      const res = await api.post('/bookmarks/toggle', { eventId: event._id });
      setBookmarked(res.data.bookmarked);
      onBookmarkChange?.(event._id, res.data.bookmarked);
    } catch (err) {
      console.error('Bookmark error:', err);
    } finally {
      setBookmarkLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!token) {
      window.location.href = `/login?redirect=/events/${event._id}`;
      return;
    }
    try {
      await api.post('/registrations', { eventId: event._id });
      alert('Registration successful!');
    } catch (err) {
      alert(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `${window.location.origin}/events/${event._id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: event.title, url });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const isFree = event.ticketPrice === 0 || event.ticketPrice === undefined;
  const hasSeats = !event.maxCapacity || event.registrationCount < event.maxCapacity;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all group">
      {/* Banner */}
      <Link to={`/events/${event._id}`} className="block relative overflow-hidden aspect-video">
        <img
          src={event.banner || PLACEHOLDER_BANNER}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Category Badge */}
        {event.category?.name && (
          <span
            className="absolute top-2 left-2 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white shadow"
            style={{ backgroundColor: event.category.color || '#6B7280' }}
          >
            {event.category.name}
          </span>
        )}

        {/* Price Badge */}
        <span className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-[11px] font-semibold shadow ${
          isFree ? 'bg-green-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white'
        }`}>
          {isFree ? 'FREE' : `₹${event.ticketPrice}`}
        </span>

        {/* Verified Badge */}
        {event.isVerified && (
          <span className="absolute bottom-2 left-2 w-5 h-5 flex items-center justify-center bg-blue-500 text-white rounded-full text-[10px] shadow" title="Verified Organizer">
            ✓
          </span>
        )}
      </Link>

      {/* Content */}
      <div className="p-3.5">
        {/* Title */}
        <Link to={`/events/${event._id}`}>
          <h3 className="font-semibold text-sm md:text-base text-gray-900 dark:text-white line-clamp-2 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
            {event.title}
          </h3>
        </Link>

        {/* Organizer */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
          {event.organizerName || event.organizer?.name || 'Unknown'}
        </p>

        {/* Date & Time */}
        <div className="flex items-center gap-1.5 mt-2 text-xs text-gray-500 dark:text-gray-400">
          <span>📅</span>
          <span>{formatDate(event.startDate)}</span>
          {event.startTime && (
            <>
              <span>•</span>
              <span>🕐 {formatTime(event.startTime)}</span>
            </>
          )}
        </div>

        {/* Location */}
        {event.city && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            📍 {event.city}{event.venue ? ` • ${event.venue}` : ''}
          </p>
        )}

        {/* Seats */}
        {event.maxCapacity && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
              <span>{event.maxCapacity - event.registrationCount} seats left</span>
              <span>{Math.round((event.registrationCount / event.maxCapacity) * 100)}% full</span>
            </div>
            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (event.registrationCount / event.maxCapacity) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {showActions && (
          <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            {/* Register */}
            <button
              onClick={handleRegister}
              disabled={!hasSeats && !isFree}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                hasSeats || isFree
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
            >
              {hasSeats ? 'Register' : 'Full'}
            </button>

            {/* Bookmark */}
            <button
              onClick={toggleBookmark}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                bookmarked ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20' : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'
              }`}
              title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
            >
              {bookmarked ? '❤️' : '🤍'}
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              title="Share"
            >
              📤
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

