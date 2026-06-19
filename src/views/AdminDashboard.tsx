import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, query, orderBy, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Users, Store, ShoppingBag, TrendingUp, Shield, ShieldOff, Check, X, Plus, Edit2, BarChart3, AlertCircle, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import ConfirmModal from '../components/ConfirmModal';

interface User {
  uid: string;
  email: string;
  displayName: string;
  role: string;
  active: boolean;
  photoUrl?: string;
}

interface Bakery {
  id: string;
  name: string;
  active: boolean;
  ownerId: string;
  description?: string;
  contactNumber?: string;
  deliveryTime?: string;
  deliveryFee?: number;
  minOrder?: number;
}

interface Order {
  id: string;
  total: number;
  status: string;
  createdAt: string;
  customerName?: string;
  bakeryName?: string;
  items?: any[];
}

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [bakeries, setBakeries] = useState<Bakery[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'bakeries' | 'orders' | 'reports'>('users');
  const { t } = useLanguage();
  const { showToast } = useToast();

  // Modals
  const [isAddingBakery, setIsAddingBakery] = useState(false);
  const [editingBakery, setEditingBakery] = useState<Bakery | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

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
    const fetchData = async () => {
      try {
        const [uSnap, bSnap, oSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'bakeries')),
          getDocs(collection(db, 'orders'))
        ]);

        setUsers(uSnap.docs.map(d => ({ uid: d.id, ...d.data() } as User)));
        setBakeries(bSnap.docs.map(d => ({ id: d.id, ...d.data() } as Bakery)));
        setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const toggleUserStatus = async (uid: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'users', uid), { active: !currentStatus });
    setUsers(users.map(u => u.uid === uid ? { ...u, active: !currentStatus } : u));
  };

  const updateUserRole = async (uid: string, newRole: string) => {
    await updateDoc(doc(db, 'users', uid), { role: newRole });
    setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole } : u));
    setEditingUser(null);
  };

  const toggleBakeryStatus = async (id: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'bakeries', id), { active: !currentStatus });
    setBakeries(bakeries.map(b => b.id === id ? { ...b, active: !currentStatus } : b));
  };

  const deleteBakery = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: t('owner.delete') || 'Delete Bakery',
      message: t('owner.delete') + '?',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'bakeries', id));
          setBakeries(bakeries.filter(b => b.id !== id));
          showToast(t('owner.bakeryDeleted') || 'Bakery deleted successfully', 'success');
        } catch (error) {
          console.error("Error deleting bakery:", error);
          showToast(t('error.generic'), 'error');
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleEditBakery = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBakery) return;

    const formData = new FormData(e.currentTarget);
    const updatedBakery = {
      name: formData.get('name') as string,
      ownerId: formData.get('ownerId') as string,
      description: formData.get('description') as string,
      contactNumber: formData.get('contactNumber') as string,
      deliveryTime: formData.get('deliveryTime') as string,
    };

    try {
      await updateDoc(doc(db, 'bakeries', editingBakery.id), updatedBakery);
      setBakeries(bakeries.map(b => b.id === editingBakery.id ? { ...b, ...updatedBakery } : b));
      setEditingBakery(null);
    } catch (error) {
      console.error("Error updating bakery:", error);
    }
  };

  const handleAddBakery = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newBakery = {
      name: formData.get('name') as string,
      ownerId: formData.get('ownerId') as string,
      description: formData.get('description') as string,
      active: true,
      rating: 5,
      deliveryTime: '30-45 min',
      deliveryFee: 2.99,
      imageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800'
    };

    try {
      const docRef = await addDoc(collection(db, 'bakeries'), newBakery);
      setBakeries([...bakeries, { id: docRef.id, ...newBakery }]);
      setIsAddingBakery(false);
    } catch (error) {
      console.error("Error adding bakery:", error);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, reason?: string) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'cancelled' && reason) {
        updateData.cancellationReason = reason;
        updateData.cancelledAt = new Date().toISOString();
        updateData.cancelledBy = 'admin';
      }
      await updateDoc(doc(db, 'orders', orderId), updateData);
      setOrders(orders.map(o => o.id === orderId ? { ...o, ...updateData } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updateData });
      }
      if (newStatus === 'cancelled') {
        setCancellingOrder(null);
        setCancelReason('');
      }
    } catch (error) {
      console.error("Error updating order status:", error);
    }
  };

  const generateReport = () => {
    setIsGeneratingReport(true);
    
    try {
      // CSV Headers
      const headers = ["Order ID", "Customer Name", "Bakery", "Total", "Status", "Date"];
      
      // Format Rows
      const csvRows = orders.map(order => {
        // Try to identify bakery name if not directly on the order
        const bakery = bakeries.find(b => b.id === (order as any).bakeryId);
        const bakeryName = order.bakeryName || bakery?.name || 'N/A';
        
        const row = [
          order.id.toUpperCase(),
          `"${order.customerName || 'Customer'}"`,
          `"${bakeryName}"`,
          order.total || (order as any).totalPrice || 0,
          order.status,
          order.createdAt ? new Date(order.createdAt).toLocaleString() : 'N/A'
        ];
        return row.join(',');
      });

      const csvContent = [headers.join(','), ...csvRows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const today = new Date().toISOString().split('T')[0];
      
      link.setAttribute('href', url);
      link.setAttribute('download', `samoun-report-${today}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setIsGeneratingReport(false);
      setReportSuccess(true);
      setTimeout(() => setReportSuccess(false), 3000);
    } catch (error) {
      console.error("Error generating report:", error);
      setIsGeneratingReport(false);
    }
  };

  const stats = [
    { label: t('admin.totalUsers'), value: users.length, icon: Users, color: 'bg-blue-50 text-blue-600' },
    { label: t('admin.totalBakeries'), value: bakeries.length, icon: Store, color: 'bg-orange-50 text-orange-600' },
    { label: t('admin.totalOrders'), value: orders.length, icon: ShoppingBag, color: 'bg-green-50 text-green-600' },
    { label: t('admin.revenue'), value: `${orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.total, 0).toLocaleString()} ${t('common.currency')}`, icon: TrendingUp, color: 'bg-purple-50 text-purple-600' }
  ];

  // Process data for charts
  const chartData = orders
    .filter(o => o.createdAt && o.status !== 'cancelled')
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .reduce((acc: any[], order) => {
      const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const existing = acc.find(d => d.date === date);
      if (existing) {
        existing.sales += order.total;
        existing.count += 1;
      } else {
        acc.push({ date, sales: order.total, count: 1 });
      }
      return acc;
    }, [])
    .slice(-7); // Last 7 days

  if (loading) return <div className="flex items-center justify-center h-64 text-stone-500 font-medium">Loading...</div>;

  return (
    <div className="space-y-8 relative">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-stone-900">{t('admin.title')}</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${stat.color}`}><stat.icon className="w-6 h-6" /></div>
            <div>
              <p className="text-stone-500 text-xs font-bold uppercase">{stat.label}</p>
              <p className="text-2xl font-bold text-stone-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-stone-200">
        {(['users', 'bakeries', 'orders', 'reports'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 px-2 font-bold transition-all border-b-2 capitalize flex items-center gap-2 ${
              activeTab === tab ? 'border-orange-700 text-orange-700' : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            {tab === 'reports' && <BarChart3 className="w-4 h-4" />}
            {t(`admin.${tab}`)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.user')}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.role')}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.status')}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {users.map(user => (
                  <tr key={user.uid}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold overflow-hidden border border-stone-100">
                          {user.photoUrl ? (
                            <img src={user.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            user.displayName[0]?.toUpperCase() || '?'
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900">{user.displayName}</div>
                          <div className="text-xs text-stone-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="capitalize font-medium text-stone-600">{t(`auth.${user.role}`) || user.role}</span>
                        <button onClick={() => setEditingUser(user)} className="p-1 text-stone-400 hover:text-orange-700"><Edit2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${user.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {user.active ? t('admin.active') : t('admin.inactive')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => toggleUserStatus(user.uid, user.active)}
                        className={`p-2 rounded-lg transition-colors ${user.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                        title={user.active ? t('admin.suspend') : t('admin.activate')}
                      >
                        {user.active ? <ShieldOff className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'bakeries' && (
          <div className="space-y-4">
            <div className="p-6 flex justify-between items-center border-b border-stone-100">
              <h3 className="font-bold text-stone-900">{t('admin.totalBakeries')}</h3>
              <button onClick={() => setIsAddingBakery(true)} className="bg-orange-700 text-white px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" /> {t('admin.addBakery')}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-stone-50 border-b border-stone-100">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.bakery')}</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.ownerId')}</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.status')}</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {bakeries.map(bakery => (
                    <tr key={bakery.id}>
                      <td className="px-6 py-4 font-bold text-stone-900">{bakery.name}</td>
                      <td className="px-6 py-4 text-xs text-stone-500 font-mono">{bakery.ownerId}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${bakery.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {bakery.active ? t('admin.active') : t('admin.inactive')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditingBakery(bakery)}
                            className="p-2 text-stone-400 hover:text-orange-700"
                            title={t('admin.editBakery')}
                          >
                            <Edit2 className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => toggleBakeryStatus(bakery.id, bakery.active)}
                            className={`p-2 rounded-lg transition-colors ${bakery.active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          >
                            {bakery.active ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                          </button>
                          <button 
                            onClick={() => deleteBakery(bakery.id)}
                            className="p-2 text-stone-400 hover:text-red-600"
                            title={t('owner.delete')}
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-stone-50 border-b border-stone-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.orderId')}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.total')}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.status')}</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-stone-500">{t('admin.action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {orders.map(order => (
                  <tr key={order.id}>
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs text-stone-500">#{order.id.slice(-6).toUpperCase()}</div>
                      <div className="text-[10px] text-stone-400">{new Date(order.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-stone-900">{order.total.toLocaleString()} {t('common.currency')}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase bg-stone-100 text-stone-600">
                        {t(`status.${order.status}`) || order.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="text-orange-700 font-bold text-xs hover:underline"
                      >
                        {t('admin.viewOrder')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-8 space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">{t('admin.reports')}</h3>
              <button 
                onClick={generateReport}
                disabled={isGeneratingReport}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all ${
                  isGeneratingReport ? 'bg-stone-100 text-stone-400' : 'bg-orange-700 text-white hover:bg-orange-800 shadow-lg shadow-orange-700/20'
                }`}
              >
                {isGeneratingReport ? (
                  <div className="w-5 h-5 border-2 border-stone-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-5 h-5" />
                )}
                {t('admin.generateReport')}
              </button>
            </div>

            {reportSuccess && (
              <div className="bg-green-50 text-green-700 p-4 rounded-2xl font-bold flex items-center gap-2 animate-bounce">
                <Check className="w-5 h-5" />
                {t('admin.reportSuccess')}
              </div>
            )}

            <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100">
              <h3 className="text-lg font-bold text-stone-900 mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-700" />
                {t('admin.salesTrend')}
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c2410c" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#c2410c" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#78716c'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#78716c'}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      itemStyle={{fontWeight: 'bold', color: '#c2410c'}}
                    />
                    <Area type="monotone" dataKey="sales" stroke="#c2410c" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-stone-50 p-6 rounded-3xl border border-stone-100">
                <h3 className="text-sm font-bold text-stone-500 uppercase mb-4">{t('admin.totalOrders')}</h3>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke="#16a34a" strokeWidth={3} dot={{fill: '#16a34a'}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-stone-900 p-6 rounded-3xl text-white flex flex-col justify-center">
                <p className="text-stone-400 text-xs font-bold uppercase mb-2">{t('admin.revenue')}</p>
                <p className="text-4xl font-bold">{orders.filter(o => o.status === 'delivered').reduce((acc, o) => acc + o.total, 0).toLocaleString()} <span className="text-lg font-normal opacity-60">{t('common.currency')}</span></p>
                <div className="mt-6 flex items-center gap-2 text-green-400 text-sm font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12.5% from last week</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Bakery Modal */}
      {isAddingBakery && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">{t('admin.addBakery')}</h3>
              <button onClick={() => setIsAddingBakery(false)} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleAddBakery} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.bakeryName')}</label>
                <input name="name" required className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('admin.ownerId')}</label>
                <input name="ownerId" required className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.description')}</label>
                <textarea name="description" required className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none h-24" />
              </div>
              <button type="submit" className="w-full bg-orange-700 text-white py-4 rounded-2xl font-bold hover:bg-orange-800 transition-all mt-4">
                {t('admin.addBakery')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Bakery Modal */}
      {editingBakery && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">{t('admin.editBakery')}</h3>
              <button onClick={() => setEditingBakery(null)} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>
            <form onSubmit={handleEditBakery} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.bakeryName')}</label>
                <input name="name" required defaultValue={editingBakery.name} className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('admin.ownerId')}</label>
                <input name="ownerId" required defaultValue={editingBakery.ownerId} className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.contactNumber')}</label>
                  <input name="contactNumber" defaultValue={editingBakery.contactNumber} className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.deliveryTime')}</label>
                  <input name="deliveryTime" defaultValue={editingBakery.deliveryTime} className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('owner.description')}</label>
                <textarea name="description" required defaultValue={editingBakery.description} className="w-full p-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none h-24" />
              </div>
              <button type="submit" className="w-full bg-orange-700 text-white py-4 rounded-2xl font-bold hover:bg-orange-800 transition-all mt-4">
                {t('admin.saveChanges')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
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
                  <p className="text-lg font-bold text-stone-900">{selectedOrder.customerName || 'N/A'}</p>
                  <p className="text-xs text-stone-500">#{selectedOrder.id.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{t('admin.status')}</p>
                  <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs font-bold uppercase">{t(`status.${selectedOrder.status}`)}</span>
                </div>
              </div>

              {selectedOrder.items && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Items</p>
                  <div className="bg-stone-50 p-4 rounded-2xl space-y-2">
                    {selectedOrder.items.map((item: any, i: number) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="font-medium text-stone-700">{item.quantity}x {item.name}</span>
                        <span className="font-bold text-stone-900">{(item.price * item.quantity).toLocaleString()} {t('common.currency')}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-stone-200 flex justify-between font-bold text-lg">
                      <span>{t('cart.total')}</span>
                      <span className="text-orange-700">{selectedOrder.total.toLocaleString()} {t('common.currency')}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-4 border-t border-stone-100">
                <p className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {t('admin.resolveIssues')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['pending', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'on_the_way', 'delivered', 'cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        if (status === 'cancelled') {
                          setCancellingOrder(selectedOrder);
                        } else {
                          updateOrderStatus(selectedOrder.id, status);
                        }
                      }}
                      className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${
                        selectedOrder.status === status
                          ? 'bg-stone-900 text-white border-stone-900'
                          : 'bg-white text-stone-600 border-stone-200 hover:border-stone-900'
                      }`}
                    >
                      {t(`status.${status}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-100">
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="w-full bg-stone-900 text-white py-4 rounded-2xl font-bold hover:bg-stone-800 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-stone-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-stone-900">{t('admin.editRole')}</h3>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-stone-50 rounded-full transition-colors">
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4 p-4 bg-stone-50 rounded-2xl">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center text-orange-700 font-bold text-xl overflow-hidden border border-white shadow-sm">
                  {editingUser.photoUrl ? (
                    <img src={editingUser.photoUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    editingUser.displayName[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div>
                  <p className="font-bold text-stone-900">{editingUser.displayName}</p>
                  <p className="text-xs text-stone-500">{editingUser.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase">{t('admin.role')}</label>
                <div className="grid grid-cols-2 gap-2">
                  {['customer', 'owner', 'admin'].map(role => (
                    <button
                      key={role}
                      onClick={() => updateUserRole(editingUser.uid, role)}
                      className={`p-3 rounded-xl font-bold text-sm transition-all border ${
                        editingUser.role === role 
                          ? 'bg-orange-700 text-white border-orange-700' 
                          : 'bg-white text-stone-600 border-stone-200 hover:border-orange-500'
                      }`}
                    >
                      {t(`auth.${role}`) || role}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Cancellation Modal */}
      {cancellingOrder && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
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

export default AdminDashboard;
