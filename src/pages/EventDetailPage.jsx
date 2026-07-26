import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import StarRating from '../components/ui/StarRating.jsx';
import EventCard from '../components/dashboard/EventCard.jsx';

const PLACEHOLDER_BANNER = 'https://via.placeholder.com/1200x400?text=EventOra';

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [related, setRelated] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [toast, setToast] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      try {
        const [eventRes, reviewsRes] = await Promise.all([
          api.get(`/events/${id}`),
          api.get(`/reviews/event/${id}`),
        ]);
        if (mounted) {
          setEvent(eventRes.data);
          setReviews(reviewsRes.data?.reviews || []);

          // Fetch related
          if (eventRes.data.category) {
            api.get(`/events?category=${eventRes.data.category._id || eventRes.data.category}&limit=4&publicOnly=false`)
              .then((r) => setRelated(r.data.events?.filter((e) => e._id !== id) || []))
              .catch(() => {});
          }
        }
      } catch {
        if (mounted) showToast('Event not found', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchData();
    return () => { mounted = false; };
  }, [id]);

  // Check bookmark + registration status
  useEffect(() => {
    if (!token || !id) return;
    api.get(`/bookmarks/check/${id}`).then((r) => setBookmarked(r.data.bookmarked)).catch(() => {});
    api.get('/registrations/my').then((r) => {
      const found = r.data.registrations?.find((reg) => reg.event?._id === id && reg.status === 'registered');
      setRegistered(!!found);
    }).catch(() => {});
  }, [id, token]);

  const handleRegister = async () => {
    if (!token) { navigate(`/login?redirect=/events/${id}`); return; }
    if (registered) return;
    setRegistering(true);
    try {
      await api.post('/registrations', { eventId: id });
      setRegistered(true);
      showToast('Registration successful!', 'success');
    } catch (err) {
      showToast(err.response?.data?.error || 'Registration failed', 'error');
    } finally {
      setRegistering(false);
    }
  };

  const handleCancelRegistration = async () => {
    try {
      const res = await api.get('/registrations/my');
      const reg = res.data.registrations?.find((r) => r.event?._id === id && r.status === 'registered');
      if (reg) {
        await api.delete(`/registrations/${reg._id}`);
        setRegistered(false);
        showToast('Registration cancelled', 'info');
      }
    } catch (err) {
      showToast('Failed to cancel registration', 'error');
    }
  };

  const toggleBookmark = async () => {
    if (!token) { navigate(`/login?redirect=/events/${id}`); return; }
    try {
      const res = await api.post('/bookmarks/toggle', { eventId: id });
      setBookmarked(res.data.bookmarked);
    } catch {}
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.rating) { showToast('Please select a rating', 'error'); return; }
    try {
      const res = await api.post('/reviews', { eventId: id, ...reviewForm });
      setReviews((prev) => [res.data, ...prev]);
      setReviewForm({ rating: 0, comment: '' });
      setShowReviewForm(false);
      showToast('Review submitted!', 'success');
      // Refresh event for new rating
      api.get(`/events/${id}`).then((r) => setEvent(r.data)).catch(() => {});
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to submit review', 'error');
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: event?.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      showToast('Link copied!', 'success');
    }
  };

  const handleReport = () => {
    showToast('Report submitted. Our team will review.', 'info');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">Loading event...</span>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event not found</h1>
          <Link to="/dashboard" className="mt-4 inline-block text-purple-600 hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const formatTime = (t) => t ? new Date(`2000-01-01T${t}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
  const isFree = event.ticketPrice === 0 || event.ticketPrice === undefined;
  const remainingSeats = event.maxCapacity ? event.maxCapacity - event.registrationCount : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Toast */}
      {toast && (
        <div className="fixed top-5 right-5 z-[100] animate-slideInRight">
          <div className={`px-4 py-3 rounded-lg shadow-lg text-sm ${
            toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
          }`}>{toast.msg}</div>
        </div>
      )}

      {/* Banner */}
      <div className="relative h-48 md:h-72 lg:h-96 overflow-hidden">
        <img src={event.banner || PLACEHOLDER_BANNER} alt={event.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <button onClick={() => navigate(-1)} className="absolute top-4 left-4 w-10 h-10 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-full text-white hover:bg-black/60 transition-colors">
          ←
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-16 relative z-10 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Info Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap items-start gap-2 mb-3">
                {event.category?.name && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: event.category.color || '#6B7280' }}>
                    {event.category.name}
                  </span>
                )}
                {event.isFeatured && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-400 text-yellow-900">Featured</span>}
                {event.isVerified && <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">Verified</span>}
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isFree ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>
                  {isFree ? 'Free' : `₹${event.ticketPrice} ${event.currency || ''}`}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  event.eventType === 'online' ? 'bg-blue-100 text-blue-700' :
                  event.eventType === 'hybrid' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {event.eventType === 'online' ? 'Online' : event.eventType === 'hybrid' ? 'Hybrid' : 'In-Person'}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">{event.title}</h1>

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">📅</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(event.startDate)}</p>
                    {event.endDate && <p className="text-xs text-gray-500">to {formatDate(event.endDate)}</p>}
                  </div>
                </div>
                {event.startTime && (
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">🕐</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatTime(event.startTime)}</p>
                      {event.endTime && <p className="text-xs text-gray-500">to {formatTime(event.endTime)}</p>}
                    </div>
                  </div>
                )}
                {event.venue && (
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">📍</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{event.venue}</p>
                      {event.city && <p className="text-xs text-gray-500">{event.city}{event.state ? `, ${event.state}` : ''}</p>}
                    </div>
                  </div>
                )}
                {event.maxCapacity && (
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">👥</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {remainingSeats > 0 ? `${remainingSeats} seats left` : 'Event Full'}
                      </p>
                      <p className="text-xs text-gray-500">Capacity: {event.maxCapacity}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <div className="mb-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">About This Event</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{event.description}</p>
                </div>
              )}

              {/* Tags */}
              {event.tags?.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {event.tags.map((tag) => (
                    <Link key={tag} to={`/explore?q=${tag}`} className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-xs text-gray-600 dark:text-gray-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Online Link */}
              {event.meetingLink && (
                <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">
                  🔗 Join Meeting
                </a>
              )}
            </div>

            {/* Reviews */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Reviews {event.averageRating > 0 && (
                    <span className="text-yellow-400 ml-2">★ {event.averageRating.toFixed(1)}</span>
                  )}
                  <span className="text-sm text-gray-500 font-normal ml-1">({event.reviewCount})</span>
                </h3>
                {token && !showReviewForm && (
                  <button onClick={() => setShowReviewForm(true)} className="text-sm text-purple-600 hover:underline">
                    Write a review
                  </button>
                )}
              </div>

              {/* Review Form */}
              {showReviewForm && (
                <form onSubmit={handleReviewSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Rating</label>
                    <StarRating rating={reviewForm.rating} onChange={(val) => setReviewForm((p) => ({ ...p, rating: val }))} size="md" />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Review</label>
                    <textarea
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm((p) => ({ ...p, comment: e.target.value }))}
                      placeholder="Share your experience..."
                      rows={3}
                      maxLength={2000}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors">
                      Submit
                    </button>
                    <button type="button" onClick={() => setShowReviewForm(false)} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                </form>
              )}

              {/* Review List */}
              {reviews.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">No reviews yet. Be the first!</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-sm font-bold text-purple-600 flex-shrink-0">
                          {review.user?.name?.[0] || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{review.user?.name || 'Anonymous'}</span>
                            <StarRating rating={review.rating} readOnly size="sm" />
                            {review.isEdited && <span className="text-[10px] text-gray-400">(edited)</span>}
                          </div>
                          {review.comment && <p className="text-sm text-gray-600 dark:text-gray-300">{review.comment}</p>}
                          <p className="text-xs text-gray-400 mt-1">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Registration Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 sticky top-20">
              <div className="text-center mb-4">
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {isFree ? 'FREE' : `₹${event.ticketPrice}`}
                </p>
                {remainingSeats !== null && (
                  <p className={`text-sm mt-1 ${remainingSeats > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {remainingSeats > 0 ? `${remainingSeats} seats left` : 'Sold Out'}
                  </p>
                )}
              </div>

              {registered ? (
                <div className="space-y-2">
                  <div className="w-full py-3 rounded-xl bg-green-100 text-green-700 text-sm font-medium text-center">
                    ✅ You are registered
                  </div>
                  <button onClick={handleCancelRegistration} className="w-full py-2.5 rounded-xl border border-red-300 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors">
                    Cancel Registration
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleRegister}
                  disabled={registering || remainingSeats === 0}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                    remainingSeats === 0
                      ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                      : 'bg-purple-600 hover:bg-purple-700 text-white'
                  }`}
                >
                  {registering ? 'Registering...' : remainingSeats === 0 ? 'Sold Out' : 'Register Now'}
                </button>
              )}

              <div className="flex items-center gap-2 mt-4">
                <button onClick={toggleBookmark} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm transition-colors ${
                  bookmarked ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 text-purple-600' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}>
                  {bookmarked ? '❤️ Saved' : '🤍 Save'}
                </button>
                <button onClick={handleShare} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  📤 Share
                </button>
                <button onClick={handleReport} className="py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors" title="Report">
                  ⚑
                </button>
              </div>

              {event.registrationDeadline && (
                <p className="text-xs text-gray-500 mt-3 text-center">
                  Registration closes {formatDate(event.registrationDeadline)}
                </p>
              )}
            </div>

            {/* Organizer Card */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <h3 className="font-semibold text-sm text-gray-900 dark:text-white mb-3">Organizer</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                  {(event.organizerName || event.organizer?.name || '?')[0]}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{event.organizerName || event.organizer?.name || 'Unknown'}</p>
                  {event.organizer?.email && <p className="text-xs text-gray-500">{event.organizer.email}</p>}
                </div>
              </div>
              {event.contactEmail && <p className="text-xs text-gray-500 mt-2">✉️ {event.contactEmail}</p>}
              {event.contactPhone && <p className="text-xs text-gray-500">📞 {event.contactPhone}</p>}
              {event.website && (
                <a href={event.website} target="_blank" rel="noopener noreferrer" className="block text-xs text-purple-600 mt-2 hover:underline">
                  🌐 Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Related Events */}
        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Related Events</h2>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {related.slice(0, 4).map((ev) => <EventCard key={ev._id} event={ev} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

