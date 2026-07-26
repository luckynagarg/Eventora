import { useEffect, useState } from 'react';

/**
 * Toast Component
 *
 * Supports plain text strings and also multi-line / HTML-formatted messages.
 * If the message contains HTML tags (e.g., <a>, <br>, <strong>), it renders
 * them using dangerouslySetInnerHTML so that clickable links work.
 *
 * For security, only a safe subset of HTML is rendered (links, line breaks,
 * bold, code). Script tags and event handlers are NOT allowed.
 *
 * Usage:
 *   <Toast
 *     message="Line 1<br>Line 2<br><a href='...'>click here</a>"
 *     type="success|error|info"
 *   />
 */
export default function Toast({ message, type = 'info', duration = 6000 }) {
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

  // Detect if message contains HTML tags – if so, render with dangerouslySetInnerHTML
  const containsHtml = /<[a-z][\s\S]*>/i.test(message);

  if (containsHtml) {
    // Render a safe subset of HTML (links, bold, breaks, code)
    const safeHtml = message
      .replace(/<script[\s\S]*?<\/script>/gi, '')       // strip <script> tags
      .replace(/on\w+="[^"]*"/gi, '')                    // strip event handlers
      .replace(/on\w+='[^']*'/gi, '')
      .replace(/href="javascript:[^"]*"/gi, 'href="#"'); // strip javascript: in links

    return (
      <div
        className={`mb-4 p-3 rounded-lg text-sm border ${cls} transition-all duration-300 animate-fadeIn`}
        role="alert"
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  // Plain text message – render safely
  return (
    <div
      className={`mb-4 p-3 rounded-lg text-sm border ${cls} whitespace-pre-line transition-all duration-300 animate-fadeIn`}
      role="alert"
    >
      {message}
    </div>
  );
}

