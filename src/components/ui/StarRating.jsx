import { useState } from 'react';

export default function StarRating({ rating = 0, onChange, readOnly = false, size = 'sm' }) {
  const [hovered, setHovered] = useState(0);

  const sizeClass = size === 'sm' ? 'text-lg' : size === 'md' ? 'text-2xl' : 'text-3xl';

  const handleClick = (value) => {
    if (!readOnly && onChange) {
      onChange(value);
    }
  };

  return (
    <div className={`flex items-center gap-0.5 ${readOnly ? '' : 'cursor-pointer'}`} role={readOnly ? 'img' : 'radiogroup'} aria-label={`Rating: ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hovered || rating);
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => handleClick(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            onMouseLeave={() => !readOnly && setHovered(0)}
            className={`${sizeClass} transition-colors ${readOnly ? 'cursor-default' : 'cursor-pointer'} ${
              isFilled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
            }`}
            aria-label={`${star} star${star > 1 ? 's' : ''}`}
            role={readOnly ? undefined : 'radio'}
            aria-checked={readOnly ? undefined : star === rating}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

