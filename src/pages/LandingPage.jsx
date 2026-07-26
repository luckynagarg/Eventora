import { Link } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Navbar from '../components/layout/Navbar.jsx';

// Lazy load the video background for performance
const VideoBackground = lazy(() => import('../components/ui/VideoBackground.jsx'));

const LandingPage = () => {
  return (
    <>
      <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
        <VideoBackground />
      </Suspense>

      <Navbar />

      <div className="fixed inset-0 bg-black/50 z-[-1]" />

      <main className="relative z-10 min-h-screen flex flex-col items-center justify-center pt-16">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white/95 text-center drop-shadow-2xl animate-pulse mb-8">
          EventOra
        </h1>

        <Link
          to="/login"
          className="inline-block px-12 py-6 text-xl md:text-2xl font-bold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-500 border-4 border-white/20 backdrop-blur-sm"
        >
          JOIN NOW
        </Link>

        <section className="max-w-4xl mx-auto mt-16 mb-16 p-8 bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 max-h-screen overflow-y-auto mx-4 lg:mx-auto">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">Home / Introduction</h2>
          <p className="text-lg text-gray-700 leading-relaxed mb-8">
            Welcome to EventOra — your all-in-one platform to plan, organize, and manage events effortlessly.
            Whether it's a college fest, corporate meet, workshop, or private party, EventOra helps you bring people together with just a few clicks.
          </p>
          <h2 className="text-3xl font-bold mb-6 text-gray-800 mt-12">Our Features</h2>
          <p className="text-lg text-gray-700 leading-relaxed">
            Easy Event Creation • Digital RSVP & Tracking • Live Updates • User-Friendly Dashboard
          </p>
        </section>
      </main>

      <footer className="relative z-10 bg-gradient-to-r from-gray-900 to-black/50 p-12 text-white">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-4xl font-black mb-6">EventOra</h2>
          <p className="mb-8">Copyright &copy; {new Date().getFullYear()} EventOra. All rights reserved.</p>
          <p className="text-lg">Email: luckynagar1505@gmail.com</p>
        </div>
      </footer>
    </>
  );
};

export default LandingPage;

