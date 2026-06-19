import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, updateDoc, onSnapshot, addDoc, deleteDoc, writeBatch, runTransaction, getDoc, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, getStorageInstance, requestForToken, onMessageListener } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Plus, Store, Package, TrendingUp, Settings, Check, Clock, X, Sparkles, MapPin, Trash2, Bell, BellOff, User, ChevronRight, BarChart3 } from 'lucide-react';
import BakeryImage from '../components/BakeryImage';
import ConfirmModal from '../components/ConfirmModal';
import { generateBakeryImage, generateProductImage } from '../services/imageService';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface Bakery {
  id: string;
  name: string;
  description: string;
  active: boolean;
  ownerId: string;
  deliveryTime: string;
  contactNumber: string;
  imageUrl?: string;
  address: string;
  openTime?: string;
  closeTime?: string;
  minOrder?: number;
  deliveryFee?: number;
}

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
  stockQuantity: number;
  imageUrl?: string;
  description?: string;
}

interface Order {
  id: string;
  status: string;
  totalPrice: number;
  items: any[];
  customerName: string;
  deliveryAddress?: string;
  specialInstructions?: string;
  createdAt: string;
}

const OwnerDashboard: React.FC = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'my_orders' | 'profile'>('dashboard');
  const [bakery, setBakery] = useState<Bakery | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [myOrdersLoading, setMyOrdersLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditingDeliveryTime, setIsEditingDeliveryTime] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', price: 0, category: 'Samoun', description: '', stockQuantity: 0, imageUrl: '' });
  const [editBakeryData, setEditBakeryData] = useState({ name: '', description: '', contactNumber: '', address: '', imageUrl: '', openTime: '08:00', closeTime: '22:00', minOrder: 0, deliveryFee: 2500 });
  const [isDeleting, setIsDeleting] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isGeneratingAIImage, setIsGeneratingAIImage] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [bakeryImageFile, setBakeryImageFile] = useState<File | null>(null);
  const [bakeryImagePreview, setBakeryImagePreview] = useState<string | null>(null);
  const [notificationToken, setNotificationToken] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (bakeryImagePreview && bakeryImagePreview.startsWith('blob:')) {
        URL.revokeObjectURL(bakeryImagePreview);
      }
    };
  }, [bakeryImagePreview]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(Notification.permission);
  
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
    if (!user) return;

    // Set up foreground message listener
    onMessageListener().then((payload: any) => {
      console.log('Received foreground message:', payload);
      // You could show a toast here if you want
    }).catch(err => console.log('failed: ', err));

    const fetchBakery = async () => {
      try {
        const q = query(collection(db, 'bakeries'), where('ownerId', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const b = { id: snap.docs[0].id, ...snap.docs[0].data() } as Bakery;
          setBakery(b);
          setEditBakeryData({
            name: b.name,
            description: b.description,
            contactNumber: b.contactNumber,
            address: b.address,
            imageUrl: b.imageUrl || '',
            openTime: b.openTime || '08:00',
            closeTime: b.closeTime || '22:00',
            minOrder: b.minOrder || 0,
            deliveryFee: b.deliveryFee || 2500
          });
          
          // Fetch products
          const pq = query(collection(db, 'products'), where('bakeryId', '==', b.id));
          const psnap = await getDocs(pq);
          setProducts(psnap.docs.map(d => ({ id: d.id, ...d.data() } as Product)));

          // Listen for orders (Diagram 3)
          const oq = query(collection(db, 'orders'), where('bakeryId', '==', b.id));
          const unsubscribe = onSnapshot(oq, (osnap) => {
            const fetchedOrders = osnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            // Detect new orders for alert (Diagram 3)
            osnap.docChanges().forEach((change) => {
              if (change.type === 'added') {
                const newOrder = { id: change.doc.id, ...change.doc.data() } as Order;
                // Only alert if it's actually new (not initial load) and pending
                if (newOrder.status === 'pending') {
                  setNewOrderAlert(newOrder);
                  // Auto hide after 5 seconds
                  setTimeout(() => setNewOrderAlert(null), 5000);
                }
              }
            });

            setOrders(fetchedOrders);
          });
          return unsubscribe;
        }
      } catch (error) {
        showToast(t('error.generic'), 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchBakery();
  }, [user]);

  useEffect(() => {
    const fetchMyOrders = async () => {
      if (!user || activeTab !== 'my_orders') return;
      setMyOrdersLoading(true);
      try {
        const q = query(
          collection(db, 'orders'), 
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        setMyOrders(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      } catch (error) {
        console.error("Error fetching my orders:", error);
      } finally {
        setMyOrdersLoading(false);
      }
    };

    fetchMyOrders();
  }, [user, activeTab]);

  const handleGenerateAIImage = async () => {
    if (!bakery) return;
    setIsGeneratingAIImage(true);
    try {
      const aiImageBase64 = await generateBakeryImage(editBakeryData.name, editBakeryData.description);
      if (aiImageBase64) {
        const storage = getStorageInstance();
        if (storage) {
          // Convert base64 to blob
          const response = await fetch(aiImageBase64);
          const blob = await response.blob();
          
          const storageRef = ref(storage, `bakeries/${bakery.id}/ai_generated_${Date.now()}.png`);
          const uploadResult = await uploadBytes(storageRef, blob);
          const downloadUrl = await getDownloadURL(uploadResult.ref);
          
          setEditBakeryData({ ...editBakeryData, imageUrl: downloadUrl });
        } else {
          // Fallback if storage is not available (though it will likely fail Firestore limit)
          setEditBakeryData({ ...editBakeryData, imageUrl: aiImageBase64 });
        }
      }
    } catch (error) {
      showToast(t('error.generic'), 'error');
    } finally {
      setIsGeneratingAIImage(false);
    }
  };

  const handleUpdateBakery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bakery) return;

    setUploadingImage(true);
    try {
      let imageUrl = editBakeryData.imageUrl;

      const storage = getStorageInstance();
      if (bakeryImageFile && storage) {
        const storageRef = ref(storage, `bakeries/${bakery.id}/profile_${Date.now()}_${bakeryImageFile.name}`);
        const uploadResult = await uploadBytes(storageRef, bakeryImageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      } else if (imageUrl.startsWith('data:image')) {
        if (storage) {
          // Handle base64 image that might be in the state from previous failed attempts or pasting
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const storageRef = ref(storage, `bakeries/${bakery.id}/profile_${Date.now()}.png`);
          const uploadResult = await uploadBytes(storageRef, blob);
          imageUrl = await getDownloadURL(uploadResult.ref);
        } else {
          showToast("Firebase Storage is required for AI images", 'error');
          setUploadingImage(false);
          return;
        }
      }

      const updatedBakery = {
        ...bakery,
        name: editBakeryData.name,
        description: editBakeryData.description,
        contactNumber: editBakeryData.contactNumber,
        imageUrl: imageUrl,
        address: editBakeryData.address,
        openTime: editBakeryData.openTime,
        closeTime: editBakeryData.closeTime,
        deliveryFee: editBakeryData.deliveryFee
      };

      await updateDoc(doc(db, 'bakeries', bakery.id), {
        name: updatedBakery.name,
        description: updatedBakery.description,
        contactNumber: updatedBakery.contactNumber,
        imageUrl: updatedBakery.imageUrl,
        address: updatedBakery.address,
        openTime: updatedBakery.openTime,
        closeTime: updatedBakery.closeTime,
        minOrder: editBakeryData.minOrder,
        deliveryFee: editBakeryData.deliveryFee
      });

      setBakery(updatedBakery);
      setBakeryImageFile(null);
      setBakeryImagePreview(null);
      showToast(t('common.saveSuccess') || 'Profile updated successfully!', 'success');
    } catch (error) {
      showToast(t('error.save'), 'error');
      if (error instanceof Error && error.message.includes('exceeds the maximum allowed size')) {
        showToast("Image too large", 'error');
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleCreateBakery = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = (e.target as any).name.value;
    const description = (e.target as any).description.value;
    const contactNumber = (e.target as any).contactNumber.value;
    const address = (e.target as any).address.value;
    const openTime = (e.target as any).openTime?.value || '08:00';
    const closeTime = (e.target as any).closeTime?.value || '22:00';
    const deliveryFee = Number((e.target as any).deliveryFee?.value) || 2500;
    
    const newBakery = {
      ownerId: user!.uid,
      name,
      description,
      contactNumber,
      address,
      active: true,
      rating: 5,
      deliveryTime: '30-45 min',
      deliveryFee,
      openTime,
      closeTime,
      minOrder: 0,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800'
    };

    if (!user) return;
    try {
      const docRef = await addDoc(collection(db, 'bakeries'), newBakery);
      // Link bakery to user profile
      await updateDoc(doc(db, 'users', user.uid), { bakeryId: docRef.id });
      setBakery({ id: docRef.id, ...newBakery });
    } catch (error) {
      showToast(t('error.generic'), 'error');
    }
  };

  const handleGenerateProductImage = async () => {
    if (!newProduct.name || !newProduct.category) {
      showToast("Name and category required", 'info');
      return;
    }
    setUploadingImage(true);
    try {
      const imageUrl = await generateProductImage(newProduct.name, newProduct.category);
      if (imageUrl) {
        setNewProduct({ ...newProduct, imageUrl });
        setProductImageFile(null); // Clear selected file when generating AI image
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleGenerateEditProductImage = async () => {
    if (!editingProduct || !editingProduct.name || !editingProduct.category) {
      showToast("Name and category required", 'info');
      return;
    }
    setUploadingImage(true);
    try {
      const imageUrl = await generateProductImage(editingProduct.name, editingProduct.category);
      if (imageUrl) {
        setEditingProduct({ ...editingProduct, imageUrl });
        setProductImageFile(null); // Clear selected file when generating AI image
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bakery) return;

    setUploadingImage(true);
    try {
      let imageUrl = newProduct.imageUrl || 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&q=80&w=400';

      const storage = getStorageInstance();
      if (productImageFile && storage) {
        const storageRef = ref(storage, `products/${bakery.id}/${Date.now()}_${productImageFile.name}`);
        const uploadResult = await uploadBytes(storageRef, productImageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      } else if (imageUrl.startsWith('data:image')) {
        if (storage) {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const storageRef = ref(storage, `products/${bakery.id}/${Date.now()}.png`);
          const uploadResult = await uploadBytes(storageRef, blob);
          imageUrl = await getDownloadURL(uploadResult.ref);
        } else {
          showToast("Storage not enabled", 'info');
          imageUrl = 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?auto=format&fit=crop&q=80&w=400';
        }
      } else if (productImageFile && !storage) {
        showToast("Storage not enabled", 'info');
      }

      const productData = {
        ...newProduct,
        bakeryId: bakery.id,
        inStock: newProduct.stockQuantity > 0,
        imageUrl
      };

      const docRef = await addDoc(collection(db, 'products'), productData);
      setProducts([...products, { id: docRef.id, ...productData }]);
      setIsAddingProduct(false);
      setNewProduct({ name: '', price: 0, category: 'Samoun', description: '', stockQuantity: 0, imageUrl: '' });
      setProductImageFile(null);
    } catch (error) {
      showToast(t('error.save'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !bakery) return;

    setUploadingImage(true);
    try {
      let imageUrl = editingProduct.imageUrl;

      const storage = getStorageInstance();
      if (productImageFile && storage) {
        const storageRef = ref(storage, `products/${bakery.id}/${Date.now()}_${productImageFile.name}`);
        const uploadResult = await uploadBytes(storageRef, productImageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      } else if (imageUrl.startsWith('data:image')) {
        if (storage) {
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          const storageRef = ref(storage, `products/${bakery.id}/${Date.now()}.png`);
          const uploadResult = await uploadBytes(storageRef, blob);
          imageUrl = await getDownloadURL(uploadResult.ref);
        }
      } else if (productImageFile && !storage) {
        showToast("Storage not enabled", 'info');
      }

      await updateDoc(doc(db, 'products', editingProduct.id), {
        name: editingProduct.name,
        price: editingProduct.price,
        category: editingProduct.category,
        stockQuantity: editingProduct.stockQuantity,
        inStock: editingProduct.stockQuantity > 0,
        imageUrl
      });
      setProducts(products.map(p => p.id === editingProduct.id ? { ...editingProduct, imageUrl } : p));
      setEditingProduct(null);
      setProductImageFile(null);
    } catch (error) {
      showToast(t('error.save'), 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string, reason?: string) => {
    try {
      if (status === 'confirmed') {
        // Run as a transaction to ensure stock is subtracted correctly
        await runTransaction(db, async (transaction) => {
          const orderRef = doc(db, 'orders', orderId);
          const orderSnap = await transaction.get(orderRef);
          
          if (!orderSnap.exists()) throw new Error("Order not found");
          const orderData = orderSnap.data() as Order;

          // Subtract stock for each item
          for (const item of orderData.items) {
            const productRef = doc(db, 'products', item.id);
            const productSnap = await transaction.get(productRef);
            
            if (productSnap.exists()) {
              const currentStock = productSnap.data().stockQuantity || 0;
              const newStock = Math.max(0, currentStock - item.quantity);
              
              transaction.update(productRef, {
                stockQuantity: newStock,
                inStock: newStock > 0
              });
            }
          }

          // Update order status
          transaction.update(orderRef, { status });
        });
        
        console.log("Requesting delivery driver...");
        // In a real app, this would be a server-side trigger
      } else {
        // Handle other status updates
        const updateData: any = { status };
        if (status === 'cancelled' && reason) {
          updateData.cancellationReason = reason;
          updateData.cancelledAt = new Date().toISOString();
          updateData.cancelledBy = 'owner';
        }
        await updateDoc(doc(db, 'orders', orderId), updateData);
      }
      
      if (status === 'cancelled') {
        setCancellingOrder(null);
        setCancelReason('');
      }
      showToast(t('owner.orderUpdated') || 'Order updated', 'success');
    } catch (error) {
      showToast(t('error.generic'), 'error');
    }
  };

  const toggleProductAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'products', productId), { inStock: !currentStatus });
      setProducts(products.map(p => p.id === productId ? { ...p, inStock: !currentStatus } : p));
      showToast(t('owner.availabilityUpdated'), 'success');
    } catch (error) {
      showToast(t('error.save'), 'error');
    }
  };

  const deleteProduct = async (productId: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('owner.delete') || 'Delete Product',
      message: t('owner.delete') + '?',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'products', productId));
          setProducts(products.filter(p => p.id !== productId));
          showToast(t('owner.productDeleted'), 'success');
        } catch (error) {
          showToast(t('error.delete'), 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const updateProductPrice = async (productId: string, newPrice: number) => {
    try {
      await updateDoc(doc(db, 'products', productId), { price: newPrice });
      setProducts(products.map(p => p.id === productId ? { ...p, price: newPrice } : p));
      showToast(t('owner.priceUpdated'), 'success');
    } catch (error) {
      showToast(t('error.save'), 'error');
    }
  };

  const updateBakeryDeliveryTime = async (newTime: string) => {
    if (!bakery) return;
    try {
      await updateDoc(doc(db, 'bakeries', bakery.id), { deliveryTime: newTime });
      setBakery({ ...bakery, deliveryTime: newTime });
      setIsEditingDeliveryTime(false);
      showToast(t('owner.deliveryTimeUpdated'), 'success');
    } catch (error) {
      showToast(t('error.save'), 'error');
    }
  };

  const toggleBakeryStatus = async () => {
    if (!bakery) return;
    try {
      const newStatus = !bakery.active;
      await updateDoc(doc(db, 'bakeries', bakery.id), { active: newStatus });
      setBakery({ ...bakery, active: newStatus });
      showToast(newStatus ? t('owner.bakeryOpened') : t('owner.bakeryClosed'), 'info');
    } catch (error) {
      showToast(t('error.save'), 'error');
    }
  };

  // Process data for charts
  const chartData = orders
    .filter(o => o.createdAt && o.status === 'delivered')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .reduce((acc: any[], order) => {
      const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.sales += order.totalPrice;
        existing.count += 1;
      } else {
        acc.push({ date, sales: order.totalPrice, count: 1 });
      }
      return acc;
    }, [])
    .slice(-7); // Last 7 days

  const handleDeleteBakery = async () => {
    if (!bakery || !user) return;
    
    setConfirmModal({
      isOpen: true,
      title: t('owner.deleteBakery') || 'Delete Bakery',
      message: t('owner.deleteBakeryConfirm'),
      danger: true,
      onConfirm: async () => {
        try {
          setIsDeleting(true);
          const batch = writeBatch(db);
          
          // Delete all products
          const productsQuery = query(collection(db, 'products'), where('bakeryId', '==', bakery.id));
          const productsSnap = await getDocs(productsQuery);
          productsSnap.forEach((productDoc) => {
            batch.delete(productDoc.ref);
          });

          // Delete the bakery
          batch.delete(doc(db, 'bakeries', bakery.id));

          // Update user profile to remove bakeryId
          batch.update(doc(db, 'users', user.uid), { bakeryId: null });

          await batch.commit();
          setBakery(null);
          setProducts([]);
          setActiveTab('dashboard');
          showToast(t('owner.bakeryDeleted'), 'info');
        } catch (error) {
          console.error("Delete bakery error:", error);
          showToast(t('error.delete'), 'error');
        } finally {
          setIsDeleting(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setConfirmModal({
      isOpen: true,
      title: t('common.deleteAccount') || 'Delete Account',
      message: t('common.deleteAccountConfirm'),
      danger: true,
      onConfirm: async () => {
        try {
          setIsDeleting(true);
          
          // 1. Delete Bakery and Products if exists
          if (bakery) {
            const batch = writeBatch(db);
            const productsQuery = query(collection(db, 'products'), where('bakeryId', '==', bakery.id));
            const productsSnap = await getDocs(productsQuery);
            productsSnap.forEach((productDoc) => {
              batch.delete(productDoc.ref);
            });
            batch.delete(doc(db, 'bakeries', bakery.id));
            await batch.commit();
          }

          // 2. Delete user profile
          await deleteDoc(doc(db, 'users', user.uid));
          
          // 3. Logout and redirect
          await signOut();
          navigate('/');
          showToast(t('auth.accountDeleted') || 'Account deleted successfully', 'info');
        } catch (error) {
          console.error("Delete account error:", error);
          showToast(t('error.generic'), 'error');
        } finally {
          setIsDeleting(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  const handleEnableNotifications = async () => {
    try {
      const token = await requestForToken();
      if (token) {
        setNotificationToken(token);
        setNotificationPermission('granted');
        
        // Save token to user document
        await updateDoc(doc(db, 'users', user!.uid), {
          fcmToken: token
        });
        
        showToast("Notifications enabled!", 'success');
      } else {
        showToast("Permission denied or failed", 'error');
      }
    } catch (error) {
      showToast(t('error.generic'), 'error');
    }
  };

  if (loading && !bakery) return <div className="flex items-center justify-center h-64 text-stone-500 font-medium">Loading...</div>;

  if (!bakery && !loading) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-3xl shadow-xl border border-stone-100 space-y-6">
        <div className="text-center space-y-2">
          <Store className="w-12 h-12 text-orange-700 mx-auto" />
          <h2 className="text-3xl font-bold text-stone-900">{t('owner.registerTitle')}</h2>
          <p className="text-stone-500">{t('owner.registerSub')}</p>
        </div>
        <form onSubmit={handleCreateBakery} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-bold text-stone-700">{t('owner.bakeryName')}</label>
            <input name="name" required placeholder="e.g. Golden Crust Bakery" className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('owner.contactNumber')}</label>
              <input name="contactNumber" required placeholder="e.g. +964 770 123 4567" className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('owner.address')}</label>
              <input name="address" required placeholder="e.g. Mansour District, Baghdad" className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('owner.openTime')}</label>
              <input name="openTime" type="time" defaultValue="08:00" required className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('owner.closeTime')}</label>
              <input name="closeTime" type="time" defaultValue="22:00" required className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('owner.deliveryFee')}</label>
              <div className="relative">
                <input name="deliveryFee" type="number" defaultValue="2500" required className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none ps-12" />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">{t('common.currency')}</span>
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-bold text-stone-700">{t('owner.description')}</label>
            <textarea name="description" required placeholder="Tell us about your bakery..." className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none h-32" />
          </div>
          <button type="submit" className="w-full bg-orange-700 text-white py-3 rounded-xl font-bold hover:bg-orange-800 transition-colors">
            {t('owner.createBakery')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-8 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-stone-900">{bakery.name}</h2>
          <p className="text-stone-500">{bakery.address}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'dashboard' ? 'bg-orange-700 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
          >
            {t('common.dashboard') || 'Dashboard'}
          </button>
          <button 
            onClick={() => setActiveTab('my_orders')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'my_orders' ? 'bg-orange-700 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
          >
            {t('customer.yourOrders') || 'My Orders'}
          </button>
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl font-bold transition-all ${activeTab === 'profile' ? 'bg-orange-700 text-white' : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-50'}`}
          >
            {t('owner.bakeryProfile')}
          </button>
        </div>
      </div>

      {activeTab === 'dashboard' ? (
        <>
          {/* New Order Notification Alert (Diagram 3) */}
      {newOrderAlert && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div className="bg-orange-700 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-white/20">
            <div className="bg-white/20 p-2 rounded-xl">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold">{t('owner.newOrderAlert')}</p>
              <p className="text-xs opacity-80">#{newOrderAlert.id.slice(-6).toUpperCase()} • {newOrderAlert.customerName}</p>
            </div>
            <button 
              onClick={() => {
                setSelectedOrder(newOrderAlert);
                setNewOrderAlert(null);
              }}
              className="bg-white text-orange-700 px-3 py-1 rounded-lg text-xs font-bold uppercase"
            >
              {t('owner.orderDetails')}
            </button>
          </div>
        </div>
      )}

      {/* Order Details Modal (Diagram 3) */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">{t('owner.orderDetails')}</h3>
              <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('auth.customer')}</p>
                  <p className="text-lg font-bold text-stone-900">{selectedOrder.customerName}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Status</p>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{t(`status.${selectedOrder.status}`)}</span>
                </div>
              </div>

              {selectedOrder.deliveryAddress && (
                <div>
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Delivery Address</p>
                  <p className="text-stone-700 flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4 text-orange-700" />
                    {selectedOrder.deliveryAddress}
                  </p>
                </div>
              )}

              {selectedOrder.specialInstructions && (
                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                  <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-1">
                    {t('cart.specialInstructions') || 'Special Instructions'}
                  </p>
                  <p className="text-stone-700 text-sm italic italic font-medium">
                    "{selectedOrder.specialInstructions}"
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Items</p>
                <div className="bg-stone-50 p-4 rounded-2xl space-y-2">
                  {selectedOrder.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="font-medium text-stone-700">{item.quantity}x {item.name}</span>
                      <span className="font-bold text-stone-900">{(item.price * item.quantity).toLocaleString()} {t('common.currency')}</span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-lg">
                    <span>{t('cart.total')}</span>
                    <span className="text-orange-700">{selectedOrder.totalPrice.toLocaleString()} {t('common.currency')}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                {selectedOrder.status === 'pending' && (
                  <div className="flex gap-3 w-full">
                    <button 
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'confirmed');
                        setSelectedOrder(null);
                      }} 
                      className="flex-grow bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all"
                    >
                      {t('owner.confirm')}
                    </button>
                    <button 
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, 'cancelled');
                        setSelectedOrder(null);
                      }} 
                      className="px-6 bg-red-50 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-all"
                    >
                      {t('owner.reject')}
                    </button>
                  </div>
                )}
                {selectedOrder.status === 'confirmed' && (
                  <button 
                    onClick={() => {
                      updateOrderStatus(selectedOrder.id, 'preparing');
                      setSelectedOrder(null);
                    }} 
                    className="flex-grow bg-orange-700 text-white py-4 rounded-2xl font-bold hover:bg-orange-800 transition-all"
                  >
                    {t('owner.startPreparing')}
                  </button>
                )}
                {selectedOrder.status === 'preparing' && (
                  <button 
                    onClick={() => {
                      updateOrderStatus(selectedOrder.id, 'ready');
                      setSelectedOrder(null);
                    }} 
                    className="flex-grow bg-green-700 text-white py-4 rounded-2xl font-bold hover:bg-green-800 transition-all"
                  >
                    {t('owner.readyForPickup')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal (Diagram 1) */}
      {editingProduct && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">{t('owner.editProduct')}</h3>
              <button onClick={() => setEditingProduct(null)} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleEditProduct} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.productName')}</label>
                <input required value={editingProduct.name} onChange={e => setEditingProduct({...editingProduct, name: e.target.value})} className="w-full p-3 rounded-xl border border-stone-200" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.pricePerPiece')}</label>
                  <input type="number" step="0.01" required value={editingProduct.price} onChange={e => setEditingProduct({...editingProduct, price: parseFloat(e.target.value)})} className="w-full p-3 rounded-xl border border-stone-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.stockQuantity')}</label>
                  <input type="number" required value={editingProduct.stockQuantity} onChange={e => setEditingProduct({...editingProduct, stockQuantity: parseInt(e.target.value)})} className="w-full p-3 rounded-xl border border-stone-200" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.category')}</label>
                <select value={editingProduct.category} onChange={e => setEditingProduct({...editingProduct, category: e.target.value})} className="w-full p-3 rounded-xl border border-stone-200">
                  <option value="Samoun">{t('owner.samoun')}</option>
                  <option value="Bread">{t('owner.bread')}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.productImage') || 'Product Image'}</label>
                
                {/* Image Preview */}
                {(productImageFile || editingProduct.imageUrl) && (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-stone-200 group">
                    <img 
                      src={productImageFile ? URL.createObjectURL(productImageFile) : editingProduct.imageUrl} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setProductImageFile(null);
                        setEditingProduct({ ...editingProduct, imageUrl: '' });
                      }}
                      className="absolute top-1 right-1 bg-white/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4 text-stone-600" />
                    </button>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-grow">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0] || null;
                        setProductImageFile(file);
                        if (file) setEditingProduct({ ...editingProduct, imageUrl: '' });
                      }}
                      className="w-full p-2 text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateEditProductImage}
                    disabled={uploadingImage || !editingProduct.name}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all disabled:opacity-50 whitespace-nowrap"
                  >
                    <Sparkles className="w-4 h-4 text-orange-600" />
                    {uploadingImage ? t('owner.uploading') || 'Uploading...' : 'AI Generate'}
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  type="submit" 
                  disabled={uploadingImage}
                  className="flex-grow bg-orange-700 text-white py-4 rounded-2xl font-bold hover:bg-orange-800 transition-all disabled:opacity-50"
                >
                  {uploadingImage ? t('owner.uploading') || 'Uploading...' : t('owner.saveChanges')}
                </button>
                <button type="button" onClick={() => { setEditingProduct(null); setProductImageFile(null); }} className="px-6 bg-stone-100 text-stone-600 rounded-2xl font-bold">
                  {t('owner.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="bg-green-50 p-3 rounded-2xl"><TrendingUp className="w-6 h-6 text-green-600" /></div>
          <div><p className="text-stone-500 text-xs font-bold uppercase">{t('dash.revenue')}</p><p className="text-2xl font-bold text-stone-900">{orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.totalPrice, 0).toLocaleString()} {t('common.currency')}</p></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="bg-orange-50 p-3 rounded-2xl"><Package className="w-6 h-6 text-orange-600" /></div>
          <div><p className="text-stone-500 text-xs font-bold uppercase">{t('dash.activeOrders')}</p><p className="text-2xl font-bold text-stone-900">{orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length}</p></div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-2xl"><Clock className="w-6 h-6 text-blue-600" /></div>
          <div className="flex-grow">
            <p className="text-stone-500 text-xs font-bold uppercase">{t('owner.deliveryTime')}</p>
            {isEditingDeliveryTime ? (
              <div className="flex gap-2 mt-1">
                <input 
                  autoFocus
                  defaultValue={bakery.deliveryTime}
                  onBlur={(e) => updateBakeryDeliveryTime(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && updateBakeryDeliveryTime((e.target as any).value)}
                  className="w-full text-sm p-1 border rounded"
                />
              </div>
            ) : (
              <p 
                onClick={() => setIsEditingDeliveryTime(true)}
                className="text-2xl font-bold text-stone-900 cursor-pointer hover:text-orange-700"
              >
                {bakery.deliveryTime}
              </p>
            )}
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
          <div className={`${bakery.active ? 'bg-green-50' : 'bg-red-50'} p-3 rounded-2xl`}>
            <Store className={`w-6 h-6 ${bakery.active ? 'text-green-600' : 'text-red-600'}`} />
          </div>
          <div className="flex-grow">
            <p className="text-stone-500 text-xs font-bold uppercase">{t('owner.bakeryStatus')}</p>
            <button 
              onClick={toggleBakeryStatus}
              className={`mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${
                bakery.active 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-red-100 text-red-700 hover:bg-red-200'
              }`}
            >
              {bakery.active ? t('owner.open') : t('owner.closed')}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
        <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-orange-600" />
          Revenue (last 7 days)
        </h3>
        <div className="h-[300px] w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorSalesOwner" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ea580c" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ea580c" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 12, fill: '#78716c'}} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fontSize: 12, fill: '#78716c'}}
                  tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(1)}k` : val}
                />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  itemStyle={{fontWeight: 'bold', color: '#ea580c'}}
                  formatter={(value) => [`${value.toLocaleString()} ${t('common.currency')}`, 'Revenue']}
                />
                <Area 
                  type="monotone" 
                  dataKey="sales" 
                  stroke="#ea580c" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorSalesOwner)" 
                  animationDuration={1500}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-stone-400 gap-2">
              <TrendingUp className="w-10 h-10 opacity-20" />
              <p className="font-medium">No sales data available for the last 7 days.</p>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Orders Management */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2"><Clock className="w-6 h-6" /> {t('dash.incomingOrders')}</h3>
          <div className="space-y-4">
            {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).map(order => (
              <div 
                key={order.id} 
                className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4 cursor-pointer hover:border-orange-200 transition-all"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-stone-900">{order.customerName}</h4>
                    <p className="text-xs text-stone-500">Order #{order.id.slice(-6).toUpperCase()}</p>
                  </div>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{t(`status.${order.status}`)}</span>
                </div>
                <div className="space-y-1">
                  {order.items.map((item, i) => (
                    <div key={i} className="text-sm text-stone-600 flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      <span>{(item.price * item.quantity).toLocaleString()} {t('common.currency')}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 pt-2" onClick={e => e.stopPropagation()}>
                  {order.status === 'pending' && (
                    <>
                      <button onClick={() => updateOrderStatus(order.id, 'confirmed')} className="flex-grow bg-stone-900 text-white py-2 rounded-xl font-bold text-sm hover:bg-stone-800">{t('owner.confirm')}</button>
                      <button onClick={() => setCancellingOrder(order)} className="px-4 bg-red-50 text-red-600 py-2 rounded-xl font-bold text-sm hover:bg-red-100">{t('owner.reject')}</button>
                    </>
                  )}
                  {order.status === 'confirmed' && (
                    <button onClick={() => updateOrderStatus(order.id, 'preparing')} className="flex-grow bg-orange-700 text-white py-2 rounded-xl font-bold text-sm hover:bg-orange-800">{t('owner.startPreparing')}</button>
                  )}
                  {order.status === 'preparing' && (
                    <button onClick={() => updateOrderStatus(order.id, 'ready')} className="flex-grow bg-green-700 text-white py-2 rounded-xl font-bold text-sm hover:bg-green-800">{t('owner.readyForPickup')}</button>
                  )}
                  {order.status !== 'pending' && (
                    <button onClick={() => setCancellingOrder(order)} className="p-2 text-stone-400 hover:text-red-600" title={t('owner.reject')}><X className="w-5 h-5" /></button>
                  )}
                </div>
              </div>
            ))}
            {orders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length === 0 && (
              <p className="text-center py-8 text-stone-400 font-medium">{t('owner.noActiveOrders')}</p>
            )}
          </div>
        </div>

        {/* Product Management */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-stone-900 flex items-center gap-2"><Package className="w-6 h-6" /> {t('dash.yourProducts')}</h3>
            <button onClick={() => setIsAddingProduct(true)} className="bg-orange-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-1"><Plus className="w-4 h-4" /> {t('dash.addProduct')}</button>
          </div>

          {isAddingProduct && (
            <div className="bg-stone-50 p-6 rounded-2xl border-2 border-dashed border-stone-200">
              <form onSubmit={handleAddProduct} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.productName')}</label>
                    <input required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-2 rounded-lg border border-stone-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.pricePerPiece')}</label>
                    <input type="number" step="0.01" required value={isNaN(newProduct.price) ? '' : newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value === '' ? NaN : parseFloat(e.target.value)})} className="w-full p-2 rounded-lg border border-stone-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.stockQuantity')}</label>
                    <input type="number" required value={isNaN(newProduct.stockQuantity) ? '' : newProduct.stockQuantity} onChange={e => setNewProduct({...newProduct, stockQuantity: e.target.value === '' ? NaN : parseInt(e.target.value)})} className="w-full p-2 rounded-lg border border-stone-200" />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.category')}</label>
                  <select value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full p-2 rounded-lg border border-stone-200">
                    <option value="Samoun">{t('owner.samoun')}</option>
                    <option value="Bread">{t('owner.bread')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.productImage') || 'Product Image'}</label>
                  
                  {/* Image Preview */}
                  {(productImageFile || newProduct.imageUrl) && (
                    <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-stone-200 group">
                      <img 
                        src={productImageFile ? URL.createObjectURL(productImageFile) : newProduct.imageUrl} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          setProductImageFile(null);
                          setNewProduct({ ...newProduct, imageUrl: '' });
                        }}
                        className="absolute top-1 right-1 bg-white/80 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4 text-stone-600" />
                      </button>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-grow">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={e => {
                          const file = e.target.files?.[0] || null;
                          setProductImageFile(file);
                          if (file) setNewProduct({ ...newProduct, imageUrl: '' });
                        }}
                        className="w-full p-2 text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateProductImage}
                      disabled={uploadingImage || !newProduct.name}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-stone-100 text-stone-700 rounded-xl font-bold text-sm hover:bg-stone-200 transition-all disabled:opacity-50 whitespace-nowrap"
                    >
                      <Sparkles className="w-4 h-4 text-orange-600" />
                      {uploadingImage ? t('owner.uploading') || 'Uploading...' : 'AI Generate'}
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    type="submit" 
                    disabled={uploadingImage}
                    className="flex-grow bg-orange-700 text-white py-2 rounded-xl font-bold disabled:opacity-50"
                  >
                    {uploadingImage ? t('owner.uploading') || 'Uploading...' : t('owner.saveProduct')}
                  </button>
                  <button type="button" onClick={() => { setIsAddingProduct(false); setProductImageFile(null); }} className="px-4 bg-stone-200 text-stone-600 rounded-xl font-bold">{t('owner.cancel')}</button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
            {products.map(product => (
              <div key={product.id} className="p-4 flex items-center justify-between border-b border-stone-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-stone-100 rounded-lg overflow-hidden">
                    <img src={product.imageUrl || `https://picsum.photos/seed/${product.id}/100/100`} alt={product.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h5 className="font-bold text-stone-900">{product.name}</h5>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-stone-500">{t(`owner.${product.category.toLowerCase()}`) || product.category} • </p>
                      <p className="text-xs text-stone-500">
                        {product.price.toLocaleString()} {t('common.currency')} / {t('owner.piece') || 'piece'}
                      </p>
                      <span className="text-xs text-stone-400">• {t('owner.stock')}: {product.stockQuantity}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEditingProduct(product)}
                    className="p-2 text-stone-400 hover:text-orange-700"
                    title={t('owner.editProduct') || 'Edit Product'}
                  >
                    <Settings className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => toggleProductAvailability(product.id, product.inStock)}
                    className={`p-2 rounded-lg transition-all ${product.inStock ? 'text-green-600 bg-green-50' : 'text-stone-300 bg-stone-50'}`}
                    title={product.inStock ? "Available" : "Not Available"}
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => deleteProduct(product.id)}
                    className="p-2 text-stone-400 hover:text-red-600"
                    title={t('owner.delete')}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Cancellation Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">Cancel Order #{cancellingOrder.id.slice(-6).toUpperCase()}</h3>
              <button onClick={() => setCancellingOrder(null)} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-stone-500 text-sm">Please provide a reason for cancelling this order. This will be visible to the customer.</p>
              <textarea 
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation..."
                className="w-full p-4 rounded-2xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none h-32 text-sm"
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => updateOrderStatus(cancellingOrder.id, 'cancelled', cancelReason)}
                  disabled={!cancelReason.trim()}
                  className="flex-grow bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  Confirm Cancellation
                </button>
                <button onClick={() => setCancellingOrder(null)} className="px-6 bg-stone-100 text-stone-600 rounded-xl font-bold">
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  ) : activeTab === 'my_orders' ? (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-bold text-stone-900">{t('customer.yourOrders') || 'My Orders'}</h3>
        <p className="text-stone-500 text-sm font-medium">{myOrders.length} orders found</p>
      </div>

      {myOrdersLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-stone-100 animate-pulse rounded-2xl" />)}
        </div>
      ) : myOrders.length > 0 ? (
        <div className="grid gap-4">
          {myOrders.map(order => (
            <div 
              key={order.id} 
              onClick={() => navigate(`/order/${order.id}`)}
              className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-all flex flex-wrap items-center justify-between gap-4 cursor-pointer group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-orange-50 p-3 rounded-xl group-hover:scale-110 transition-transform">
                  <Package className="w-6 h-6 text-orange-700" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-stone-900">Order #{order.id.slice(-6).toUpperCase()}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      order.status === 'delivered' ? 'bg-green-100 text-green-700' : 
                      order.status === 'cancelled' ? 'bg-red-100 text-red-700' : 
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {t(`status.${order.status}`) || order.status}
                    </span>
                  </div>
                  <p className="text-sm text-stone-500 flex items-center gap-1 mt-1">
                    <Clock className="w-4 h-4" />
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{t('cart.total') || 'Total'}</p>
                  <p className="text-lg font-bold text-orange-700">{(order.totalPrice || 0).toLocaleString()} {t('common.currency')}</p>
                </div>
                <ChevronRight className="w-6 h-6 text-stone-300 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white p-12 rounded-3xl border border-dashed border-stone-200 text-center space-y-4">
          <Package className="w-12 h-12 text-stone-200 mx-auto" />
          <p className="text-stone-500 font-medium">{t('customer.noOrders') || "You haven't placed any orders yet."}</p>
          <button 
            onClick={() => navigate('/')}
            className="bg-orange-700 text-white px-8 py-3 rounded-xl font-bold hover:bg-orange-800 transition-all shadow-lg shadow-orange-700/20"
          >
            {t('customer.startShopping') || 'Start Shopping'}
          </button>
        </div>
      )}
    </div>
  ) : (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-sm">
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-stone-900">{t('owner.bakeryProfile')}</h3>
          <p className="text-stone-500">{t('owner.editProfileSub') || 'Manage your bakery identity and settings'}</p>
        </div>

        <form onSubmit={handleUpdateBakery} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('owner.bakeryName')}</label>
              <input 
                required 
                value={editBakeryData.name} 
                onChange={e => setEditBakeryData({...editBakeryData, name: e.target.value})} 
                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('owner.contactNumber')}</label>
              <input 
                required 
                value={editBakeryData.contactNumber} 
                onChange={e => setEditBakeryData({...editBakeryData, contactNumber: e.target.value})} 
                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-stone-700">{t('owner.address')}</label>
            <input 
              required 
              value={editBakeryData.address} 
              onChange={e => setEditBakeryData({...editBakeryData, address: e.target.value})} 
              className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('owner.openTime')}</label>
              <input 
                type="time"
                required 
                value={editBakeryData.openTime} 
                onChange={e => setEditBakeryData({...editBakeryData, openTime: e.target.value})} 
                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('owner.closeTime')}</label>
              <input 
                type="time"
                required 
                value={editBakeryData.closeTime} 
                onChange={e => setEditBakeryData({...editBakeryData, closeTime: e.target.value})} 
                className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('bakery.minOrder')}</label>
              <div className="relative">
                <input 
                  type="number"
                  required 
                  value={editBakeryData.minOrder} 
                  onChange={e => setEditBakeryData({...editBakeryData, minOrder: Number(e.target.value)})} 
                  className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none ps-12" 
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">{t('common.currency')}</span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-700">{t('owner.deliveryFee')}</label>
              <div className="relative">
                <input 
                  type="number"
                  required 
                  value={editBakeryData.deliveryFee} 
                  onChange={e => setEditBakeryData({...editBakeryData, deliveryFee: Number(e.target.value)})} 
                  className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none ps-12" 
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-xs">{t('common.currency')}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-stone-700">{t('owner.bakeryImage')}</label>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="w-32 h-32 rounded-2xl overflow-hidden border border-stone-200 flex-shrink-0 bg-stone-50">
                <BakeryImage 
                  bakeryId={bakery?.id || ''} 
                  name={editBakeryData.name || bakery?.name || ''} 
                  description={editBakeryData.description || bakery?.description || ''} 
                  imageUrl={bakeryImagePreview || editBakeryData.imageUrl || bakery?.imageUrl} 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="flex-grow space-y-2 w-full">
                <div className="flex gap-2">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0] || null;
                      setBakeryImageFile(file);
                      if (file) {
                        const url = URL.createObjectURL(file);
                        setBakeryImagePreview(url);
                      } else {
                        setBakeryImagePreview(null);
                      }
                    }}
                    className="flex-grow p-2 text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                  />
                  <button 
                    type="button"
                    onClick={handleGenerateAIImage}
                    disabled={isGeneratingAIImage || !editBakeryData.name}
                    className="bg-stone-900 text-white px-4 rounded-xl hover:bg-stone-800 disabled:opacity-50 flex items-center justify-center transition-all"
                  >
                    {isGeneratingAIImage ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Sparkles className="w-5 h-5" />
                    )}
                  </button>
                </div>
                <input 
                  value={editBakeryData.imageUrl} 
                  onChange={e => setEditBakeryData({...editBakeryData, imageUrl: e.target.value})} 
                  placeholder="Or paste image URL here..."
                  className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none text-xs" 
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-stone-700">{t('owner.description')}</label>
            <textarea 
              required 
              value={editBakeryData.description} 
              onChange={e => setEditBakeryData({...editBakeryData, description: e.target.value})} 
              className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none h-32" 
            />
          </div>

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={uploadingImage || isGeneratingAIImage}
              className="w-full md:w-auto bg-orange-700 text-white px-12 py-4 rounded-2xl font-bold hover:bg-orange-800 transition-all disabled:opacity-50 shadow-lg shadow-orange-700/20"
            >
              {uploadingImage ? t('owner.uploading') || 'Uploading...' : t('owner.saveChanges')}
            </button>
          </div>
        </form>

        <div className="mt-12 pt-12 border-t border-stone-100 space-y-8">
          {/* Notifications */}
          <div>
            <h3 className="text-xl font-bold text-stone-900 mb-4">{t('owner.notifications') || 'Push Notifications'}</h3>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-orange-50 p-6 rounded-2xl border border-orange-100">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${notificationPermission === 'granted' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {notificationPermission === 'granted' ? <Bell className="w-6 h-6 text-green-600" /> : <BellOff className="w-6 h-6 text-red-600" />}
                </div>
                <div>
                  <p className="font-bold text-stone-900">{t('owner.receiveAlerts') || 'Order Alerts'}</p>
                  <p className="text-sm text-stone-500">
                    {notificationPermission === 'granted' 
                      ? (t('owner.notificationsEnabled') || 'You will receive a browser notification for every new order.')
                      : (t('owner.notificationsDisabled') || 'Enable notifications to stay updated on new orders even when this tab is closed.')}
                  </p>
                </div>
              </div>
              {notificationPermission !== 'granted' && (
                <button 
                  onClick={handleEnableNotifications}
                  className="bg-orange-700 text-white px-6 py-3 rounded-xl font-bold hover:bg-orange-800 transition-all shadow-md"
                >
                  {t('owner.enableNotifications') || 'Enable Now'}
                </button>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          <div>
            <h3 className="text-xl font-bold text-red-600 mb-4">{t('common.dangerZone')}</h3>
            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="font-bold text-red-900">{t('owner.deleteBakery')}</p>
                  <p className="text-sm text-red-700 opacity-80">{t('owner.deleteBakerySub') || 'Permanently remove your bakery and all products.'}</p>
                </div>
                <button 
                  onClick={handleDeleteBakery}
                  disabled={isDeleting}
                  className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? '...' : t('owner.deleteBakery')}
                </button>
              </div>
              
              <div className="pt-6 border-t border-red-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="font-bold text-red-900">{t('common.deleteAccount')}</p>
                  <p className="text-sm text-red-700 opacity-80">{t('common.deleteAccountSub') || 'Delete your user account and all associated data.'}</p>
                </div>
                <button 
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-red-700 transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  {isDeleting ? '...' : t('common.deleteAccount')}
                </button>
              </div>
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
    </div>
  );
};

export default OwnerDashboard;
