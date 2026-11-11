import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate } from 'react-router-dom';
import { collection, addDoc, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { db, ensureAnonymousAuth } from './firebase';
import { members, stateThemes } from './data/members.js';
import { Cake, Share2, ArrowLeft, Send, Sparkles, Heart, AlertCircle, CheckCircle } from 'lucide-react';

// --- UTILS ---
const calculateNextBirthday = (birthdayStr) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bDate = new Date(`${birthdayStr} ${today.getFullYear()}`);
  
  if (bDate < today) {
    bDate.setFullYear(today.getFullYear() + 1);
  }
  
  const diffTime = Math.abs(bDate - today);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const formatIST = (timestamp) => {
  if (!timestamp) return 'Just now';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date);
};

// --- COMPONENTS ---
const ProfileCard = ({ member, daysLeft }) => {
  const navigate = useNavigate();
  const theme = stateThemes[member.state] || stateThemes.default;
  const isToday = daysLeft === 0;

  return (
    <button
      type="button"
      onClick={() => navigate(`/person/${member.id}`)}
      aria-label={`Open ${member.name}'s birthday page`}
      className={`relative w-full text-left scrapbook-shadow rounded-2xl p-6 cursor-pointer border-2 transition-transform hover:-translate-y-1 focus:outline-none focus:ring-4 focus:ring-pink-300 ${theme}`}
    >
      {isToday && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full animate-bounce shadow-md">
          TODAY IS YOUR DAY! 🎉
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center text-2xl font-bold border border-current shadow-inner opacity-90">
          {member.name.substring(0, 2).toUpperCase()}
        </div>
        <div>
          <h3 className="text-xl font-bold">{member.name}</h3>
          <p className="text-sm opacity-80 font-medium flex items-center gap-1">
            <Cake size={14}/> {member.birthday} 
            {member.state && ` • ${member.stateName}`}
          </p>
          <p className="text-sm mt-1 font-handwriting text-lg">
            {isToday ? "Happy Birthday!" : `${daysLeft} days left`}
          </p>
        </div>
      </div>
    </button>
  );
};

const Home = () => {
  const membersWithCountdowns = members.map(m => ({
    ...m,
    daysLeft: calculateNextBirthday(m.birthday)
  })).sort((a, b) => a.daysLeft - b.daysLeft);

  const nextThree = membersWithCountdowns.slice(0, 3);

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-12">
      <header className="text-center mb-16 relative">
        <h1 className="text-5xl md:text-6xl font-handwriting font-bold text-pink-500 mb-3">
          The Birthday Circle
        </h1>
        <p className="text-gray-600 text-lg md:text-xl font-medium">
          13 people. Countless memories. One place to celebrate. 🎈
        </p>
      </header>

      <section className="mb-16">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Sparkles className="text-yellow-500" /> Who's celebrating next?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {nextThree.map(m => <ProfileCard key={m.id} member={m} daysLeft={m.daysLeft} />)}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">All Friends</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {membersWithCountdowns.map(m => (
            <ProfileCard key={m.id} member={m} daysLeft={m.daysLeft} />
          ))}
        </div>
      </section>
    </div>
  );
};

const BirthdayPage = () => {
  const { id } = useParams();
  const member = members.find(m => m.id === id);
  const [wishes, setWishes] = useState([]);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const theme = stateThemes[member?.state] || stateThemes.default;

  useEffect(() => {
    if (!member) return;
    const q = query(
      collection(db, "wishes"),
      where("recipientId", "==", member.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const wishData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort newest first on the client so this query does not need a composite index.
      wishData.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? 0;
        const bTime = b.createdAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      setWishes(wishData);
    }, (err) => {
      console.error("Firestore listener error:", err);
      setError("Failed to load wishes. Please check your connection.");
    });
    
    return () => unsubscribe();
  }, [member]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${member.name}'s Birthday Page`,
          text: `Leave a birthday wish for ${member.name} on The Birthday Circle!`,
          url: url
        });
      } catch (err) {
        // User cancelled or failed
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert("Link copied to clipboard!");
      } catch (err) {
        alert("Failed to copy link. " + url);
      }
    }
  };

  const submitWish = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      // Wait for the automatic anonymous Firebase session before writing.
      const authenticated = await ensureAnonymousAuth();
      if (!authenticated) {
        throw new Error("Could not connect anonymously to Firebase. Please try again.");
      }
      await addDoc(collection(db, "wishes"), {
        recipientId: member.id,
        senderName: name.trim() || "Someone special",
        message: message.trim(),
        createdAt: serverTimestamp()
      });
      setMessage('');
      setName('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error("Error adding document: ", err);
      setError("Failed to send wish. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!member) return <div className="p-8 text-center">Person not found.</div>;

  return (
    <div className={`min-h-screen ${theme.split(' ')[0]} transition-colors duration-500`}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <nav className="flex justify-between items-center mb-8">
          <Link to="/" className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium">
            <ArrowLeft size={20} /> Back to Home
          </Link>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 bg-white px-4 py-2 rounded-full scrapbook-shadow text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <Share2 size={16} /> Share Page
          </button>
        </nav>

        <header className="text-center mb-12 bg-white/60 p-8 rounded-3xl scrapbook-shadow backdrop-blur-sm border border-white/50">
          <div className="w-24 h-24 mx-auto rounded-full bg-white flex items-center justify-center text-3xl font-bold scrapbook-shadow mb-4 border border-gray-100 text-gray-800">
            {member.name.substring(0, 2).toUpperCase()}
          </div>
          <h1 className="text-5xl font-handwriting font-bold mb-2 text-gray-900">
            {member.name}
          </h1>
          <p className="text-gray-700 font-medium flex items-center justify-center gap-2">
            <Cake size={18} /> {member.birthday} • {member.stateName}
          </p>
        </header>

        <section className="bg-white p-6 rounded-3xl scrapbook-shadow mb-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Leave a Birthday Wish</h2>
          
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-200">
              <AlertCircle size={20} /> {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl flex items-center gap-2 border border-green-200">
              <CheckCircle size={20} /> Your wish has joined the birthday wall!
            </div>
          )}

          <form onSubmit={submitWish} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (Optional)</label>
              <input 
                type="text" 
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Someone special"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-300 focus:border-transparent outline-none bg-gray-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                <span>Your Message</span>
                <span className="text-gray-400 font-normal">{message.length}/500</span>
              </label>
              <textarea 
                required
                maxLength={500}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Happy Birthday ${member.name}! Hope this year brings...`}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-pink-300 focus:border-transparent outline-none bg-gray-50 resize-none"
              />
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting || !message.trim()}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Sending...' : <><Send size={18} /> Send Wish</>}
            </button>
          </form>
        </section>

        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Birthday Wall</h2>
            <span className="bg-white/80 px-3 py-1 rounded-full text-sm font-bold text-gray-700 scrapbook-shadow">
              {wishes.length} {wishes.length === 1 ? 'Wish' : 'Wishes'}
            </span>
          </div>

          {wishes.length === 0 ? (
            <div className="text-center p-12 bg-white/50 rounded-3xl border border-dashed border-gray-300 text-gray-500">
              <Heart className="mx-auto mb-3 opacity-20" size={48} />
              <p>No wishes yet. Be the first to make their day!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {wishes.map(wish => (
                <div key={wish.id} className="bg-white p-5 rounded-2xl scrapbook-shadow group">
                  <p className="text-gray-800 whitespace-pre-wrap leading-relaxed mb-4">
                    "{wish.message}"
                  </p>
                  <div className="flex justify-between items-end">
                    <p className="font-handwriting text-xl text-gray-900 font-bold">
                      - {wish.senderName}
                    </p>
                    <p className="text-xs text-gray-400 font-medium">
                      {formatIST(wish.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/person/:id" element={<BirthdayPage />} />
      </Routes>
    </HashRouter>
  );
}