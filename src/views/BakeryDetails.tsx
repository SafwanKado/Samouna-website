import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useFirebaseLoading } from '../context/FirebaseLoadingContext';
import { Star, Clock, Truck, Plus, Minus, ShoppingBag, ChevronLeft, Store, Search, Heart } from 'lucide-react';
import BakeryImage from '../components/BakeryImage';
import ConfirmModal from '../components/ConfirmModal';
import { motion, AnimatePresence } from 'motion/react';

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

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  inStock: boolean;
  stockQuantity: number;
}

interface Review {
  id: string;
  rating: number;
  comment?: string;
  createdAt: any;
}

const BakeryDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [bakery, setBakery] = useState<Bakery | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [showClearCartConfirm, setShowClearCartConfirm] = useState(false);
  const { items, addToCart } = useCart();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { user, profile } = useAuth();
  const { trackPromise } = useFirebaseLoading();
  const navigate = useNavigate();

  const isFavorited = profile?.favorites?.includes(id || '');

  const toggleFavorite = async () => {
    if (!user) {
      showToast(t('error.loginRequired'), 'error');
      return;
    }
    if (!id) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      if (isFavorited) {
        await updateDoc(userRef, {
          favorites: arrayRemove(id)
        });
        showToast(t('bakery.removedFromFavorites'), 'success');
      } else {
        await updateDoc(userRef, {
          favorites: arrayUnion(id)
        });
        showToast(t('bakery.addedToFavorites'), 'success');
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
      showToast(t('error.generic'), 'error');
    }
  };

  const handleAddToCart = async (product: Product) => {
    if (!bakery) return;
    
    try {
      // Fetch latest stock quantity from Firestore
      const productRef = doc(db, 'products', product.id);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) {
        showToast(t('error.generic'), 'error');
        return;
      }

      const productData = productSnap.data();
      const stockQuantity = productData.stockQuantity || 0;
      
      // Calculate current total quantity in cart for this product
      const existingInCart = items.find(i => i.id === product.id);
      const currentInCart = existingInCart ? existingInCart.quantity : 0;

      if (currentInCart + 1 > stockQuantity) {
        showToast(t('error.outOfStock'), 'error');
        return;
      }

      const cartItem = { ...product, quantity: 1, bakeryId: bakery.id, imageUrl: product.imageUrl };
      const success = addToCart(cartItem);
      
      if (!success) {
        setPendingProduct(product);
        setShowClearCartConfirm(true);
      } else {
        showToast(t('cart.added'), 'success');
      }
    } catch (error) {
      showToast(t('error.generic'), 'error');
    }
  };

  const handleConfirmClearCart = () => {
    if (pendingProduct && bakery) {
      addToCart({ ...pendingProduct, quantity: 1, bakeryId: bakery.id, imageUrl: pendingProduct.imageUrl }, true);
      showToast(t('cart.added'), 'success');
    }
    setShowClearCartConfirm(false);
    setPendingProduct(null);
  };

  const isBakeryOpen = (b: Bakery) => {
    if (!b.active) return false;
    if (!b.openTime || !b.closeTime) return true;
    
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    const [oh, om] = b.openTime.split(':').map(Number);
    const [ch, cm] = b.closeTime.split(':').map(Number);
    
    const openMinutes = oh * 60 + om;
    const closeMinutes = ch * 60 + cm;
    
    if (closeMinutes > openMinutes) {
      return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
    } else {
      return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      try {
        const bakerySnap = await trackPromise(getDoc(doc(db, 'bakeries', id)));
        if (bakerySnap.exists()) {
          setBakery({ id: bakerySnap.id, ...bakerySnap.data() } as Bakery);
        }

        const q = query(collection(db, 'products'), where('bakeryId', '==', id), where('inStock', '==', true));
        const productSnap = await trackPromise(getDocs(q));
        setProducts(productSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));

        const reviewsQ = collection(db, 'bakeries', id, 'ratings');
        const reviewsSnap = await trackPromise(getDocs(reviewsQ));
        setReviews(reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review)));
      } catch (error) {
        showToast(t('error.generic'), 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];
  const filteredProducts = products.filter(p => 
    (activeCategory === 'All' || p.category === activeCategory) && 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="h-64 bg-stone-200 rounded-3xl" />
    <div className="h-10 w-48 bg-stone-200 rounded-lg" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="h-32 bg-stone-200 rounded-2xl" />
      <div className="h-32 bg-stone-200 rounded-2xl" />
    </div>
  </div>;

  if (!bakery) return <div className="text-center py-12 text-stone-500">Bakery not found.</div>;
  
  const isOpen = isBakeryOpen(bakery);
  const isOwnBakery = profile?.role === 'owner' && (bakery as any).ownerId === user?.uid;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-600 hover:text-stone-900 font-medium group">
        <ChevronLeft className="w-5 h-5 transition-transform group-hover:rtl:translate-x-1 group-hover:-translate-x-1 rtl:rotate-180" /> {t('nav.home')}
      </button>

      {/* Bakery Header */}
      <div className="relative h-64 sm:h-80 rounded-3xl overflow-hidden shadow-2xl">
        <BakeryImage 
          bakeryId={bakery.id}
          name={bakery.name}
          description={bakery.description}
          imageUrl={bakery.imageUrl}
          className="w-full h-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-stone-900/20 to-transparent flex flex-col justify-end p-5 sm:p-10">
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-start sm:items-center justify-between gap-4">
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">{bakery.name}</h1>
              <button 
                onClick={toggleFavorite}
                className="p-2.5 sm:p-3 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-red-500 transition-all group active:scale-95 flex-shrink-0"
              >
                <Heart className={`w-5 h-5 sm:w-8 sm:h-8 transition-all ${isFavorited ? 'fill-red-500 text-red-500 scale-110' : 'text-white group-hover:scale-110'}`} />
              </button>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className={`px-3 sm:px-4 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-sm font-black uppercase tracking-wider shadow-sm ${isOpen ? 'bg-green-500 text-white' : 'bg-red-500 text-white animate-pulse'}`}>
                {isOpen ? t('owner.open') : t('owner.closed')}
              </span>
              {bakery.openTime && (
                <div className="flex items-center gap-1.5 sm:gap-2 bg-black/40 backdrop-blur-md px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-white/10 text-white">
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                  <span className="text-[10px] sm:text-sm font-bold truncate">
                    {bakery.openTime} - {bakery.closeTime}
                  </span>
                </div>
              )}
            </div>

            <p className="text-stone-300 text-xs sm:text-base md:text-lg font-medium line-clamp-2 sm:line-clamp-none leading-relaxed opacity-90">{bakery.description}</p>
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 pt-2">
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-white text-xs sm:text-sm">
                <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400 fill-orange-400" />
                {bakery.rating || t('home.new')}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-white text-xs sm:text-sm">
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {bakery.deliveryTime || `30-45 ${t('home.min')}`}
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 bg-white/10 backdrop-blur px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-white text-xs sm:text-sm">
                <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 rtl:scale-x-[-1]" />
                {(bakery.deliveryFee || 2500).toLocaleString()} {t('common.currency')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input 
            type="text"
            placeholder={t('common.search') || 'Search products...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none font-medium bg-white/50 backdrop-blur-sm transition-all"
          />
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSearchTerm('');
              }}
              className={`px-6 py-2 rounded-full font-bold whitespace-nowrap transition-all ${
                activeCategory === cat 
                  ? 'bg-orange-700 text-white shadow-md' 
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'
              }`}
            >
              {t(`owner.${cat.toLowerCase()}`) || cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product List */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProducts.map(product => (
            <div key={product.id} className="bg-white p-4 rounded-2xl border border-stone-100 shadow-sm flex gap-4">
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-xl overflow-hidden flex-shrink-0">
                <img 
                  src={product.imageUrl || `https://picsum.photos/seed/${product.id}/300/300`} 
                  alt={product.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex-grow flex flex-col justify-between py-1">
                <div>
                  <h4 className="font-bold text-stone-900 text-lg">{product.name}</h4>
                  {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
                    <span className='text-orange-600 text-xs font-bold bg-orange-50 px-2 py-0.5 rounded-full'>
                      {t('bakery.onlyLeft') || `Only ${product.stockQuantity} left`}
                    </span>
                  )}
                  <p className="text-stone-500 text-sm line-clamp-2">{product.description}</p>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-orange-700 font-bold text-xl">{product.price.toLocaleString()} {t('common.currency')}</span>
                  <button 
                    disabled={!isOpen || isOwnBakery}
                    onClick={() => handleAddToCart(product)}
                    className={`p-2 rounded-xl transition-all flex items-center gap-2 font-bold px-4 ${
                      isOwnBakery
                        ? 'bg-stone-100 text-stone-400 cursor-not-allowed'
                        : isOpen 
                          ? 'bg-orange-100 text-orange-700 hover:bg-orange-700 hover:text-white' 
                          : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-5 h-5" />
                    {isOwnBakery ? (t('bakery.ownBakery') || 'Your bakery') : isOpen ? t('bakery.addToCart') : t('owner.closed')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-stone-200 text-center space-y-4">
          <div className="bg-stone-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
            <ShoppingBag className="w-10 h-10 text-stone-300" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-stone-900">{t('bakery.noProducts')}</h3>
          </div>
        </div>
      )}

      {/* Reviews Section */}
      <div className="pt-8 border-t border-stone-100 space-y-6">
        <h3 className="text-2xl font-bold text-stone-900 flex items-center gap-2">
          <Star className="w-6 h-6 text-orange-400 fill-orange-400" />
          {t('bakery.reviews') || 'Reviews'}
        </h3>
        
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-white p-5 rounded-3xl border border-stone-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating ? 'text-orange-400 fill-orange-400' : 'text-stone-200'
                        }`}
                      />
                    ))}
                    <span className="ms-2 font-black text-stone-900 text-sm">{review.rating}</span>
                  </div>
                  <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                    {review.createdAt?.toDate ? review.createdAt.toDate().toLocaleDateString() : 
                     review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
                {review.comment && (
                  <p className="text-stone-600 text-sm font-medium leading-relaxed italic">
                    "{review.comment}"
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-stone-50 p-8 rounded-3xl text-center border border-dashed border-stone-200">
            <p className="text-stone-400 font-medium italic">{t('bakery.noReviews') || 'No reviews yet'}</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={showClearCartConfirm}
        title={t('cart.clearConfirmTitle') || 'Clear Cart?'}
        message={t('cart.clearConfirmMessage') || 'Adding items from a different bakery will clear your current cart. Continue?'}
        confirmLabel={t('common.continue') || 'Continue'}
        cancelLabel={t('common.cancel')}
        onConfirm={handleConfirmClearCart}
        onCancel={() => {
          setShowClearCartConfirm(false);
          setPendingProduct(null);
        }}
        danger
      />

      {/* Mobile Floating Cart Button */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-6 left-6 right-6 z-40 sm:hidden"
          >
            <button 
              onClick={() => navigate('/cart')}
              className="w-full bg-orange-700 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between font-black text-lg active:scale-95 transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-lg">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span>{t('cart.title')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{items.reduce((acc, i) => acc + i.quantity, 0)} {t('owner.piece')}</span>
                <div className="w-1 h-1 bg-white/40 rounded-full" />
                <span>{items.reduce((acc, i) => acc + i.price * i.quantity, 0).toLocaleString()} {t('common.currency')}</span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BakeryDetails;
