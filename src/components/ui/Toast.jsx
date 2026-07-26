import { useEffect, useState } from 'react';

export default function Toast({ message, type = 'info', duration = 4000 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) {
      setVisible(false);
      return;
    }

    setVisible(true);

    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!message || !visible) return null;

  const cls =
    type === 'success'
      ? 'bg-green-100 text-green-800 border-green-300'
      : type === 'error'
        ? 'bg-red-100 text-red-800 border-red-300'
        : 'bg-blue-100 text-blue-800 border-blue-300';

  return (
    <div
      className={`mb-4 p-3 rounded-lg text-sm border ${cls} transition-all duration-300 animate-fadeIn`}
      role="alert"
    >
      {message}
    </div>
  );
}

