import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc } from 'firebase/firestore';
import { Trash2, Plus, Minus, ShoppingBag, CreditCard, Wallet, Truck, ChevronRight, CheckCircle, MapPin, X } from 'lucide-react';
import { motion } from 'motion/react';

const Cart: React.FC = () => {
  const { items, total, updateQuantity, removeFromCart, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'address'>('cart');
  const [deliveryAddress, setDeliveryAddress] = useState({ street: '', neighborhood: '' });
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(2500);
  const [minOrder, setMinOrder] = useState(0);

  React.useEffect(() => {
    const fetchDeliveryFee = async () => {
      if (items.length > 0) {
        try {
          const bakeryDoc = await getDoc(doc(db, 'bakeries', items[0].bakeryId));
          if (bakeryDoc.exists()) {
            const data = bakeryDoc.data();
            if (data.deliveryFee !== undefined) {
              setDeliveryFee(data.deliveryFee);
            }
            if (data.minOrder !== undefined) {
              setMinOrder(data.minOrder);
            }
          }
        } catch (error) {
          showToast(t('error.generic'), 'error');
        }
      }
    };
    fetchDeliveryFee();
  }, [items]);

  const handleCheckout = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (total < minOrder) {
      showToast(`${t('error.minOrder')} ${minOrder.toLocaleString()} ${t('common.currency')}`, 'error');
      return;
    }

    if (checkoutStep === 'cart') {
      setCheckoutStep('address');
      return;
    }

    if (!deliveryAddress.street || !deliveryAddress.neighborhood) {
      showToast(t('error.noLocation'), 'error');
      return;
    }

    setIsCheckingOut(true);
    setPaymentStatus('processing');

    try {
      // Simulate Payment Gateway Interaction (Diagram 3)
      await new Promise(resolve => setTimeout(resolve, 2000));
      setPaymentStatus('success');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const orderData = {
        customerId: user.uid,
        bakeryId: items[0].bakeryId,
        items: items,
        totalPrice: total + deliveryFee, // Total + dynamic delivery fee
        deliveryFee: deliveryFee,
        status: 'pending',
        paymentMethod,
        paymentStatus: paymentMethod === 'card' ? 'paid' : 'pending',
        deliveryAddress: `${deliveryAddress.street}, ${deliveryAddress.neighborhood}`,
        specialInstructions,
        createdAt: new Date().toISOString(),
        customerName: profile?.name || 'Customer'
      };

      // Diagram 4: Save order to database
      const docRef = await addDoc(collection(db, 'orders'), orderData);
      
      // Simulate Bakery System accepting order
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      clearCart();
      setOrderSuccess(docRef.id);
    } catch (error) {
      showToast(t('error.payment'), 'error');
      setPaymentStatus('idle');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="text-center py-20 space-y-8 max-w-md mx-auto">
        <div className="bg-green-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-stone-900">{t('cart.successTitle')}</h2>
          <p className="text-stone-500">{t('cart.successSub')}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm text-left space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Order ID</span>
            <span className="font-bold">#{orderSuccess.slice(-6).toUpperCase()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Payment</span>
            <span className="font-bold uppercase text-orange-700">{paymentMethod}</span>
          </div>
        </div>
        <button 
          onClick={() => navigate(`/order/${orderSuccess}`)}
          className="w-full bg-orange-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-800 transition-colors"
        >
          {t('cart.trackOrder')}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 space-y-6">
        <div className="bg-orange-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto">
          <ShoppingBag className="w-12 h-12 text-orange-700" />
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-stone-900">{t('cart.empty')}</h2>
          <p className="text-stone-500">{t('cart.emptySub')}</p>
        </div>
        <Link to="/" className="inline-block bg-orange-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-800 transition-colors">
          {t('cart.browse')}
        </Link>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.25 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8"
    >
      <div className="lg:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-stone-900">{t('cart.title')}</h2>
          {checkoutStep === 'address' && (
            <button 
              onClick={() => setCheckoutStep('cart')}
              className="text-orange-700 font-bold text-sm hover:underline flex items-center gap-1"
            >
              <span className="rtl:rotate-180">←</span> {t('cart.backToCart') || 'Back to Cart'}
            </button>
          )}
        </div>
        
        {checkoutStep === 'cart' ? (
          <>
            <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
              {items.map((item) => (
                <div key={item.id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 border-b border-stone-50 last:border-0 relative">
                  <div className="w-full sm:w-24 h-48 sm:h-24 bg-stone-100 rounded-2xl overflow-hidden flex-shrink-0">
                    <img 
                      src={item.imageUrl || `https://picsum.photos/seed/${item.id}/200/200`} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-bold text-lg sm:text-base text-stone-900 truncate">{item.name}</h4>
                    <p className="text-orange-700 font-black">{item.price.toLocaleString()} {t('common.currency')}</p>
                  </div>
                  
                  <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                    <div className="flex items-center gap-3 bg-stone-50 p-1.5 rounded-xl border border-stone-100/50">
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all active:scale-90 shadow-sm disabled:opacity-30"
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-black text-lg w-6 text-center">{item.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg transition-all active:scale-90 shadow-sm"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-stone-300 hover:text-red-600 p-2 transition-colors active:scale-90"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm space-y-4">
              <h3 className="font-bold text-lg">{t('cart.paymentMethod')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setPaymentMethod('card')}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'card' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <CreditCard className="w-6 h-6" />
                  <span className="font-bold">{t('cart.card')}</span>
                </button>
                <button 
                  onClick={() => setPaymentMethod('cash')}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${
                    paymentMethod === 'cash' ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-stone-200 text-stone-500 hover:bg-stone-50'
                  }`}
                >
                  <Wallet className="w-6 h-6" />
                  <span className="font-bold">{t('cart.cash')}</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-6">
            <div className="flex items-center gap-3 text-orange-700">
              <MapPin className="w-6 h-6" />
              <h3 className="text-xl font-bold">Delivery Address</h3>
            </div>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">Street Address</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. House 12, Street 5"
                  value={deliveryAddress.street}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">Neighborhood</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Al-Mansour"
                  value={deliveryAddress.neighborhood}
                  onChange={(e) => setDeliveryAddress({ ...deliveryAddress, neighborhood: e.target.value })}
                  className="w-full p-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('cart.specialInstructions') || 'Special Instructions (optional)'}</label>
                <textarea 
                  placeholder={t('cart.specialInstructionsPlaceholder') || 'e.g. ring doorbell, leave at door...'}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  className="w-full p-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none h-24 resize-none"
                />
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-2xl flex gap-3 items-start">
              <Truck className="w-5 h-5 text-orange-700 mt-0.5 rtl:scale-x-[-1]" />
              <p className="text-sm text-stone-600">
                Please ensure your address is accurate to help our drivers find you quickly.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl sticky top-24 space-y-6">
          <h3 className="text-xl font-bold">{t('cart.summary')}</h3>
          <div className="space-y-3 text-stone-600">
            <div className="flex justify-between">
              <span>{t('cart.subtotal')}</span>
              <span className="font-bold text-stone-900">{total.toLocaleString()} {t('common.currency')}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('cart.deliveryFee')}</span>
              <span className="font-bold text-stone-900">{deliveryFee.toLocaleString()} {t('common.currency')}</span>
            </div>
            <div className="border-t border-stone-100 pt-3 flex justify-between text-xl">
              <span className="font-bold text-stone-900">{t('cart.total')}</span>
              <span className="font-bold text-orange-700">{(total + deliveryFee).toLocaleString()} {t('common.currency')}</span>
            </div>
          </div>

          {total < minOrder && (
            <div className="bg-red-50 p-4 rounded-2xl border border-red-100 space-y-2">
              <p className="text-red-700 text-sm font-bold flex items-center gap-2">
                <X className="w-4 h-4" />
                {t('error.minOrder')} {minOrder.toLocaleString()} {t('common.currency')}
              </p>
              <p className="text-red-600 text-[10px] leading-tight opacity-80">
                {t('error.minOrderWarning')}
              </p>
            </div>
          )}

          <button 
            onClick={handleCheckout}
            disabled={isCheckingOut || total < minOrder || (checkoutStep === 'address' && (!deliveryAddress.street || !deliveryAddress.neighborhood))}
            className="w-full bg-orange-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-800 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {paymentStatus === 'processing' ? (
              paymentMethod === 'card' ? t('cart.processingCard') : t('cart.confirmingCash')
            ) : paymentStatus === 'success' ? (
              t('cart.successTitle')
            ) : checkoutStep === 'cart' ? (
              "Continue to Address"
            ) : (
              t('cart.placeOrder')
            )}
            {paymentStatus === 'idle' && <ChevronRight className="w-6 h-6 rtl:rotate-180" />}
          </button>

          <div className="flex items-center gap-2 text-stone-500 text-sm justify-center">
            <Truck className="w-4 h-4" />
            <span>Estimated delivery in 30-45 min</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Cart;
