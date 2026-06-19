import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Link } from 'react-router-dom';
import { ShoppingBag, ChevronRight, Clock, MapPin, Settings, Trash2, X, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import ConfirmModal from '../components/ConfirmModal';

interface Order {
  id: string;
  status: string;
  totalPrice: number;
  createdAt: string;
  bakeryId: string;
}

const CustomerDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const { items, addToCart } = useCart();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'orders' | 'settings'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    danger?: boolean;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'orders'), 
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        setOrders(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setConfirmModal({
      isOpen: true,
      title: t('common.deleteAccount') || 'Delete Account',
      message: t('common.deleteAccountConfirm'),
      danger: true,
      onConfirm: async () => {
        try {
          setLoading(true);
          // Delete user profile
          await deleteDoc(doc(db, 'users', user.uid));
          // Logout and redirect
          await signOut();
          navigate('/');
        } catch (error) {
          console.error("Error deleting account:", error);
          showToast("Failed to delete account. Please try again.", 'error');
        } finally {
          setLoading(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleCancelOrder = async (orderId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('owner.cancel') || 'Cancel Order',
      message: (t('owner.cancel') || 'Cancel') + '?',
      danger: true,
      onConfirm: async () => {
        try {
          await updateDoc(doc(db, 'orders', orderId), {
            status: 'cancelled',
            cancelledAt: new Date().toISOString(),
            cancelledBy: 'customer'
          });
          setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
          showToast(t('owner.orderUpdated') || 'Order cancelled', 'success');
        } catch (error) {
          console.error("Error cancelling order:", error);
          showToast("Failed to cancel order. Please try again.", 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.25 }}
      className="space-y-8"
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-3xl font-bold text-stone-900">{t('customer.yourOrders')}</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'orders' ? 'bg-orange-700 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
          >
            {t('customer.yourOrders')}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'settings' ? 'bg-orange-700 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
          >
            {t('common.settings')}
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <>
          <div className="flex justify-end">
            <Link to="/" className="text-orange-700 font-bold hover:underline flex items-center gap-1">
              {t('customer.orderMore')} <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-24 bg-stone-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : orders.length > 0 ? (
        <div className="grid gap-4">
          {orders.map(order => (
            <Link 
              key={order.id} 
              to={`/order/${order.id}`}
              className="bg-white p-4 sm:p-6 rounded-3xl border border-stone-100 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="bg-orange-50 p-2.5 sm:p-3 rounded-xl shrink-0">
                  <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6 text-orange-700" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-stone-900 truncate">Order #{order.id.slice(-6).toUpperCase()}</h4>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-stone-500">
                    <span className="flex items-center gap-1 shrink-0"><Clock className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                    <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[9px] tracking-wider shrink-0 ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {t(`status.${order.status}`) || order.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 border-t sm:border-0 pt-3 sm:pt-0 mt-1 sm:mt-0">
                <div className="flex items-center gap-2">
                  {order.status === 'pending' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleCancelOrder(order.id);
                      }}
                      className="flex items-center gap-1.5 text-red-600 hover:text-red-700 font-bold text-xs bg-red-50 px-3 py-2 rounded-xl transition-all active:scale-95 border border-red-100"
                    >
                      <X className="w-3.5 h-3.5" />
                      {t('owner.cancel')}
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <button
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        try {
                          const orderDoc = await getDoc(doc(db, 'orders', order.id));
                          if (orderDoc.exists()) {
                            const orderData = orderDoc.data();
                            if (orderData.items && Array.isArray(orderData.items)) {
                              const firstItem = { ...orderData.items[0], bakeryId: orderData.bakeryId };
                              const initialSuccess = addToCart(firstItem);
                              
                              if (initialSuccess) {
                                for (let i = 1; i < orderData.items.length; i++) {
                                  addToCart({ ...orderData.items[i], bakeryId: orderData.bakeryId });
                                }
                                showToast(t('cart.added'), 'success');
                                navigate('/cart');
                              } else {
                                showToast(t('cart.clearConfirmMessage'), 'error');
                              }
                            }
                          }
                        } catch (error) {
                          showToast(t('error.generic'), 'error');
                        }
                      }}
                      className="flex items-center gap-1.5 text-orange-700 font-bold text-xs bg-orange-50 px-3 py-2 rounded-xl transition-all active:scale-95 border border-orange-100 shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      {t('customer.reorder')}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-stone-400 uppercase font-black tracking-widest">{t('cart.total')}</p>
                    <p className="text-base sm:text-lg font-black text-stone-900">{(order.totalPrice || 0).toLocaleString()} <span className="text-xs font-bold opacity-60 font-sans">{t('common.currency')}</span></p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 hidden sm:block" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-stone-200 text-center space-y-4">
          <ShoppingBag className="w-12 h-12 text-stone-300 mx-auto" />
          <p className="text-stone-500 font-medium">{t('customer.noOrders')}</p>
          <Link to="/" className="inline-block bg-orange-700 text-white px-6 py-2 rounded-xl font-bold">
            {t('customer.startShopping')}
          </Link>
        </div>
      )}
    </>
  ) : (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm space-y-8">
            <div>
              <h3 className="text-xl font-bold text-red-600 mb-4">{t('common.dangerZone')}</h3>
              <div className="bg-red-50 p-6 rounded-2xl border border-red-100">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <p className="font-bold text-red-900">{t('common.deleteAccount')}</p>
                    <p className="text-sm text-red-700 opacity-80">Permanently delete your account and all order history.</p>
                  </div>
                  <button 
                    onClick={handleDeleteAccount}
                    className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all shadow-sm flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    {t('common.deleteAccount')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
        danger={confirmModal.danger}
      />
    </motion.div>
  );
};

export default CustomerDashboard;
