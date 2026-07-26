export default function EventCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 animate-pulse">
      {/* Banner skeleton */}
      <div className="aspect-video bg-gray-200 dark:bg-gray-700" />

      <div className="p-3.5 space-y-3">
        {/* Title */}
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />

        {/* Organizer */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />

        {/* Date */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />

        {/* Location */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />

        {/* Button */}
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-lg w-full mt-3" />
      </div>
    </div>
  );
}

export function EventCardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </div>
  );
}

