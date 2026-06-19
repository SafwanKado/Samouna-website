import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { Link } from 'react-router-dom';
import { Star, Clock, Truck, Search, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFirebaseLoading } from '../context/FirebaseLoadingContext';
import BakeryImage from '../components/BakeryImage';

interface Bakery {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  rating: number;
  deliveryTime: string;
  deliveryFee?: number;
  active: boolean;
  openTime?: string;
  closeTime?: string;
}

const Home: React.FC = () => {
  const [bakeries, setBakeries] = React.useState<Bakery[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const { t } = useLanguage();
  const { user, profile } = useAuth();
  const { showToast } = useToast();
  const { trackPromise } = useFirebaseLoading();

  const toggleFavorite = async (e: React.MouseEvent, bakeryId: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      showToast(t('error.loginRequired'), 'error');
      return;
    }

    const isFavorited = profile?.favorites?.includes(bakeryId);
    const userRef = doc(db, 'users', user.uid);

    try {
      if (isFavorited) {
        await trackPromise(updateDoc(userRef, {
          favorites: arrayRemove(bakeryId)
        }));
        showToast(t('bakery.removedFromFavorites'), 'success');
      } else {
        await trackPromise(updateDoc(userRef, {
          favorites: arrayUnion(bakeryId)
        }));
        showToast(t('bakery.addedToFavorites'), 'success');
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast(t('error.generic'), 'error');
    }
  };

  React.useEffect(() => {
    const fetchBakeries = async () => {
      try {
        const q = query(collection(db, 'bakeries'), where('active', '==', true));
        const querySnapshot = await trackPromise(getDocs(q));
        const bakeryData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bakery));
        setBakeries(bakeryData);
      } catch (error) {
        console.error("Error fetching bakeries:", error);
        try {
          handleFirestoreError(error, OperationType.LIST, 'bakeries');
        } catch (wrappedError) {
          // Allow error tracking to proceed
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBakeries();
  }, []);

  const filteredBakeries = bakeries.filter(b => 
    b.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const favoriteBakeries = bakeries.filter(b => 
    profile?.favorites?.includes(b.id)
  );

  const isBakeryOpen = (bakery: Bakery) => {
    if (!bakery.active) return false;
    if (!bakery.openTime || !bakery.closeTime) return true;
    
    // Use current local time (Diagram 4 context)
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [oh, om] = bakery.openTime.split(':').map(Number);
    const [ch, cm] = bakery.closeTime.split(':').map(Number);
    
    const openMinutes = oh * 60 + om;
    const closeMinutes = ch * 60 + cm;
    
    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } else {
      // Overnight case
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <section className="relative h-56 sm:h-80 rounded-3xl overflow-hidden bg-orange-900 flex items-center justify-center text-center px-6">
        <img 
          src="https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=1920" 
          alt="Bakery Background" 
          className="absolute inset-0 w-full h-full object-cover opacity-40"
          referrerPolicy="no-referrer"
        />
        <div className="relative z-10 max-w-2xl space-y-2 sm:space-y-4">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight">{t('home.heroTitle')}</h1>
          <p className="text-orange-100 text-sm sm:text-base md:text-lg font-medium opacity-90 max-w-lg mx-auto">{t('home.heroSub')}</p>
        </div>
      </section>

      {/* Search Bar */}
      <div className="relative max-w-xl mx-auto -mt-8 sm:-mt-10 px-4 sm:px-0 z-20">
        <div className="relative group">
          <Search className="absolute start-4 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5 group-focus-within:text-orange-500 transition-colors" />
          <input 
            type="text" 
            placeholder={t('home.searchPlaceholder')}
            className="w-full ps-12 pe-4 py-4 sm:py-5 rounded-2xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-xl transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Favorites Section */}
      <AnimatePresence>
        {!loading && favoriteBakeries.length > 0 && (
          <motion.section 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold font-serif flex items-center gap-2">
                <Heart className="w-6 h-6 text-red-500 fill-red-500" />
                {t('home.favorites') || 'Favorites'}
              </h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
              {favoriteBakeries.map((bakery) => (
                <Link 
                  key={`fav-${bakery.id}`}
                  to={`/bakery/${bakery.id}`}
                  className="w-64 flex-shrink-0 group bg-white rounded-2xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-md transition-all flex flex-col"
                >
                  <div className="relative h-32 overflow-hidden">
                    <BakeryImage 
                      bakeryId={bakery.id}
                      name={bakery.name}
                      description={bakery.description}
                      imageUrl={bakery.imageUrl}
                      className="w-full h-full group-hover:scale-105 transition-transform duration-500"
                    />
                    <button 
                      onClick={(e) => toggleFavorite(e, bakery.id)}
                      className="absolute top-2 left-2 p-1.5 rounded-full bg-white/80 backdrop-blur-sm shadow-sm z-10"
                    >
                      <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                    </button>
                    <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-black flex items-center gap-1 shadow-sm">
                      <Star className="w-3 h-3 text-orange-500 fill-orange-500" />
                      {bakery.rating || t('home.new')}
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="font-bold text-stone-900 truncate">{bakery.name}</h4>
                    <p className="text-stone-500 text-xs line-clamp-1">{bakery.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Bakery Grid */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold font-serif">{t('home.allBakeries') || 'Explore All'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-80 bg-stone-200 animate-pulse rounded-3xl" />
          ))
        ) : filteredBakeries.length > 0 ? (
          filteredBakeries.map((bakery, index) => (
            <motion.div 
              key={bakery.id}
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: index * 0.06, duration: 0.3 }}
            >
              <Link 
                to={`/bakery/${bakery.id}`}
                className="group bg-white rounded-3xl overflow-hidden border border-stone-100 shadow-sm hover:shadow-md transition-all h-full flex flex-col"
              >
                <div className="relative h-48 overflow-hidden">
                  <BakeryImage 
                    bakeryId={bakery.id}
                    name={bakery.name}
                    description={bakery.description}
                    imageUrl={bakery.imageUrl}
                    className={`w-full h-full group-hover:scale-105 transition-transform duration-500 ${!isBakeryOpen(bakery) ? 'grayscale opacity-60' : ''}`}
                  />
                  <button 
                    onClick={(e) => toggleFavorite(e, bakery.id)}
                    className="absolute top-4 left-4 p-2 rounded-full bg-white/80 backdrop-blur-md border border-white/50 text-stone-600 hover:text-red-500 transition-all z-20 shadow-sm active:scale-90"
                  >
                    <Heart className={`w-5 h-5 transition-all ${profile?.favorites?.includes(bakery.id) ? 'fill-red-500 text-red-500 scale-110' : 'text-stone-400'}`} />
                  </button>
                  {!isBakeryOpen(bakery) && (
                    <div className="absolute inset-0 bg-stone-900/40 flex items-center justify-center">
                      <span className="bg-red-600 text-white px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider shadow-lg">
                        {t('owner.closed')}
                      </span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur px-2 py-1 rounded-lg flex items-center gap-1 text-sm font-bold text-stone-900">
                    <Star className="w-4 h-4 text-orange-500 fill-orange-500" />
                    {bakery.rating || t('home.new')}
                  </div>
                </div>
                <div className="p-5 space-y-3 flex-grow flex flex-col">
                  <h3 className="text-xl font-bold text-stone-900">{bakery.name}</h3>
                  <p className="text-stone-500 text-sm line-clamp-2 flex-grow">{bakery.description}</p>
                  <div className="flex items-center gap-4 text-sm text-stone-600 font-medium pt-2 border-t border-stone-50">
                    <div className="flex items-center gap-1">
                      <div className={`w-2 h-2 rounded-full ${isBakeryOpen(bakery) ? 'bg-green-500' : 'bg-red-500'}`} />
                      <span className={isBakeryOpen(bakery) ? 'text-green-600' : 'text-red-600'}>
                        {isBakeryOpen(bakery) ? t('owner.open') : t('owner.closed')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {bakery.deliveryTime || `30-45 ${t('home.min')}`}
                    </div>
                    <div className="flex items-center gap-1">
                      <Truck className="w-4 h-4" />
                      {(bakery.deliveryFee || 2500).toLocaleString()} {t('common.currency')}
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-stone-500">
            {t('home.noBakeries')}
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default Home;
