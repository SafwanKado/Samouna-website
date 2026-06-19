import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, onSnapshot, updateDoc, collection, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Star, CheckCircle2, Clock, Package, Truck, Home, MapPin, Store, CheckCircle, X, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface Order {
  id: string;
  status: string;
  totalPrice: number;
  items: any[];
  deliveryAddress?: string;
  createdAt: string;
  bakeryId: string;
  cancellationReason?: string;
  driverId?: string;
}

const OrderTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [isRating, setIsRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [driverPhone, setDriverPhone] = useState<string | null>(null);

  const { t } = useLanguage();
  const { showToast } = useToast();

  useEffect(() => {
    if (!id) return;
    const unsubscribe = onSnapshot(doc(db, 'orders', id), async (snap) => {
      if (snap.exists()) {
        const orderData = { id: snap.id, ...snap.data() } as Order;
        setOrder(orderData);
        
        // Show rating modal if delivered and not yet rated
        if (orderData.status === 'delivered') {
          const ratingDoc = await getDoc(doc(db, 'bakeries', orderData.bakeryId, 'ratings', id));
          if (!ratingDoc.exists()) {
            setShowRatingModal(true);
          } else {
            setHasRated(true);
          }
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [id]);

  useEffect(() => {
    const fetchDriverPhone = async () => {
      if (order?.driverId) {
        try {
          const driverSnap = await getDoc(doc(db, 'users', order.driverId));
          if (driverSnap.exists()) {
            setDriverPhone(driverSnap.data().phone || null);
          }
        } catch (error) {
          console.error("Error fetching driver phone:", error);
        }
      }
    };
    fetchDriverPhone();
  }, [order?.driverId]);

  if (loading) return <div className="animate-pulse space-y-8">
    <div className="h-48 bg-stone-200 rounded-3xl" />
    <div className="h-64 bg-stone-200 rounded-3xl" />
  </div>;

  if (!order) return <div className="text-center py-12">{t('track.orderNotFound')}</div>;

  const steps = [
    { id: 'pending', label: t('status.pending'), icon: Clock, description: t('status.pending.desc') },
    { id: 'confirmed', label: t('status.confirmed'), icon: CheckCircle2, description: t('status.confirmed.desc') },
    { id: 'preparing', label: t('status.preparing'), icon: Package, description: t('status.preparing.desc') },
    { id: 'ready', label: t('status.ready'), icon: MapPin, description: t('status.ready.desc') },
    { id: 'on_the_way', label: t('status.on_the_way'), icon: Truck, description: t('status.on_the_way.desc') },
    { id: 'delivered', label: t('status.delivered'), icon: Home, description: t('status.delivered.desc') }
  ];

  const currentStepIndex = steps.findIndex(s => s.id === order.status);

  const handleConfirmDelivery = async () => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'orders', id), {
        status: 'delivered',
        deliveredAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error confirming delivery:", error);
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !cancelReason.trim()) return;
    try {
      await updateDoc(doc(db, 'orders', id), {
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancellationReason: cancelReason,
        cancelledBy: 'customer'
      });
      setIsCancelling(false);
    } catch (error) {
      console.error("Error cancelling order:", error);
    }
  };

  const handleRateBakery = async () => {
    if (!order || !user) return;
    setIsRating(true);
    try {
      await setDoc(doc(db, 'bakeries', order.bakeryId, 'ratings', order.id), {
        rating,
        customerId: user.uid,
        orderId: order.id,
        createdAt: new Date().toISOString()
      });
      setShowRatingModal(false);
      setHasRated(true);
      showToast(t('track.ratingSuccess'), 'success');
    } catch (error) {
      console.error("Error rating bakery:", error);
      showToast(t('track.ratingError'), 'error');
    } finally {
      setIsRating(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.25 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      {/* Tracking Map Simulation (Diagram 5) */}
      {(order.status === 'on_the_way' || order.status === 'delivered') && (
        <div className="bg-stone-100 h-64 rounded-3xl relative overflow-hidden border border-stone-200 shadow-inner">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full flex items-center justify-center">
            <div className="relative w-full h-full">
              {/* Bakery Location */}
              <div className="absolute top-1/4 left-1/4 flex flex-col items-center">
                <div className="bg-white p-2 rounded-full shadow-lg border border-stone-100">
                  <Store className="w-5 h-5 text-orange-700" />
                </div>
                <span className="text-[10px] font-bold text-stone-500 mt-1 uppercase">{t('track.bakery')}</span>
              </div>
              
              {/* Customer Location */}
              <div className="absolute bottom-1/4 right-1/4 flex flex-col items-center">
                <div className="bg-white p-2 rounded-full shadow-lg border border-stone-100">
                  <Home className="w-5 h-5 text-blue-700" />
                </div>
                <span className="text-[10px] font-bold text-stone-500 mt-1 uppercase">{t('track.you')}</span>
              </div>

              {/* Driver Location (Simulated GPS - Diagram 5) */}
              <div className={`absolute transition-all duration-1000 flex flex-col items-center ${
                order.status === 'delivered' ? 'bottom-1/4 right-1/4 translate-x-8 -translate-y-8' : 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse'
              }`}>
                <div className="bg-orange-700 p-2 rounded-full shadow-xl border-2 border-white">
                  <Truck className="w-6 h-6 text-white" />
                </div>
                <span className="text-[10px] font-bold text-orange-700 mt-1 uppercase">{t('track.driver')}</span>
              </div>

              {/* Path */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-10">
                <path d="M 25% 25% Q 50% 50% 75% 75%" fill="none" stroke="black" strokeWidth="4" strokeDasharray="8,8" />
              </svg>
            </div>
          </div>
          <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur p-3 rounded-2xl border border-white/50 shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-orange-100 p-2 rounded-xl">
                <Truck className="w-5 h-5 text-orange-700" />
              </div>
              <div>
                <p className="text-xs font-bold text-stone-900">{t('track.driverOnWay')}</p>
                <p className="text-[10px] text-stone-500">{t('track.estimatedArrival')}</p>
              </div>
            </div>
            {driverPhone && (
              <a 
                href={`tel:${driverPhone}`}
                className="text-orange-700 font-bold text-xs px-4 py-2 hover:bg-orange-50 rounded-xl transition-colors inline-block"
              >
                {t('track.callDriver')}
              </a>
            )}
          </div>
        </div>
      )}
      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl text-center space-y-4">
        <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
          <Package className="w-10 h-10 text-orange-700" />
        </div>
        <h2 className="text-3xl font-bold text-stone-900">{t('track.orderNumber')}{order.id.slice(-6).toUpperCase()}</h2>
        <p className="text-stone-500 font-medium">{t('track.status')}: <span className="text-orange-700 uppercase">{t('status.' + order.status)}</span></p>
        
        {order.deliveryAddress && (
          <div className="pt-2 border-t border-stone-100">
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('track.deliveryTo')}</p>
            <p className="text-stone-700 flex items-center justify-center gap-2 mt-1">
              <MapPin className="w-4 h-4 text-orange-700" />
              {order.deliveryAddress}
            </p>
          </div>
        )}
        
        {order.status === 'cancelled' && order.cancellationReason && (
          <div className="bg-red-50 p-4 rounded-2xl border border-red-100 text-red-700 text-sm mt-4">
            <p className="font-bold uppercase text-[10px] mb-1">{t('track.cancelReason')}</p>
            <p>{order.cancellationReason}</p>
          </div>
        )}

        {order.status === 'pending' && (
          <button 
            onClick={() => setIsCancelling(true)}
            className="mt-4 w-full bg-white border border-red-200 text-red-600 py-3 rounded-2xl font-bold text-sm hover:bg-red-50 transition-colors"
          >
            {t('track.cancelOrder')}
          </button>
        )}
        {order.status === 'ready' && (
          <button 
            onClick={handleConfirmDelivery}
            className="mt-4 w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-6 h-6" />
            {t('customer.confirmDelivery')}
          </button>
        )}

        {order.status === 'delivered' && !hasRated && (
          <button 
            onClick={() => setShowRatingModal(true)}
            className="mt-4 w-full bg-orange-700 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-800 transition-colors flex items-center justify-center gap-2"
          >
            <Star className="w-6 h-6" />
            {t('track.rateBakery')}
          </button>
        )}
      </div>

      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
        <h3 className="text-xl font-bold mb-8">{t('track.deliveryProgress')}</h3>
        <div className="relative space-y-8">
          {/* Vertical Line */}
          <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-stone-100" />

          {steps.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isPending = index > currentStepIndex;

            return (
              <div key={step.id} className="relative flex items-start gap-6">
                <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isCompleted ? 'bg-orange-700 text-white' : 
                  isCurrent ? 'bg-orange-100 text-orange-700 ring-4 ring-orange-50' : 
                  'bg-stone-50 text-stone-300'
                }`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <div className="flex-grow pt-1">
                  <h4 className={`font-bold ${isPending ? 'text-stone-400' : 'text-stone-900'}`}>{step.label}</h4>
                  <p className="text-stone-500 text-sm">{step.description}</p>
                </div>
                {isCompleted && <CheckCircle2 className="w-5 h-5 text-green-500 mt-1" />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-4">
        <h3 className="text-xl font-bold">{t('track.orderDetails')}</h3>
        <div className="space-y-4">
          {(order.items || []).map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="bg-stone-100 text-stone-600 px-2 py-1 rounded text-xs font-bold">{item.quantity}x</span>
                <span className="font-medium text-stone-800">{item.name}</span>
              </div>
              <span className="font-bold text-stone-900">{( (item.price || 0) * (item.quantity || 0) ).toLocaleString()} {t('common.currency')}</span>
            </div>
          ))}
          <div className="border-t border-stone-100 pt-4 flex justify-between text-xl font-bold">
            <span>{t('track.totalPaid')}</span>
            <span className="text-orange-700">{(order.totalPrice || 0).toLocaleString()} {t('common.currency')}</span>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      {isCancelling && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">{t('track.cancelOrder')}</h3>
              <button onClick={() => setIsCancelling(false)} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleCancelOrder} className="p-6 space-y-4">
              <p className="text-stone-500 text-sm">{t('track.cancelOrderLong')}</p>
              <textarea 
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={t('track.cancelPlaceholder')}
                className="w-full p-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none h-32 text-sm"
              />
              <div className="flex gap-3">
                <button type="submit" className="flex-grow bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors">
                  {t('track.confirmCancel')}
                </button>
                <button type="button" onClick={() => setIsCancelling(false)} className="px-6 bg-stone-100 text-stone-600 rounded-xl font-bold">
                  {t('track.back')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && order && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden p-8 space-y-6 text-center">
            <div className="bg-orange-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="w-10 h-10 text-orange-700" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold text-stone-900">{t('track.howWasBread')}</h3>
              <p className="text-stone-500">{t('track.rateExperience')}</p>
            </div>
            
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="p-1 transition-all hover:scale-110"
                >
                  <Star 
                    className={`w-10 h-10 ${
                      star <= rating 
                        ? 'text-orange-500 fill-orange-500' 
                        : 'text-stone-200'
                    }`} 
                  />
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                onClick={handleRateBakery}
                disabled={isRating}
                className="flex-grow bg-orange-700 text-white py-4 rounded-2xl font-bold hover:bg-orange-800 transition-all disabled:opacity-50"
              >
                {isRating ? t('track.saving') : t('track.submitRating')}
              </button>
              <button 
                onClick={() => setShowRatingModal(false)} 
                className="px-6 bg-stone-100 text-stone-600 rounded-2xl font-bold"
              >
                {t('track.later')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default OrderTracking;
