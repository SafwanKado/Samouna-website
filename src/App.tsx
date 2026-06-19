import React, { useEffect, type FC, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { ToastProvider } from './context/ToastContext';
import { FirebaseLoadingProvider } from './context/FirebaseLoadingContext';
import GlobalLoader from './components/GlobalLoader';
import { Croissant } from 'lucide-react';
import Navbar from './components/Navbar';
import Home from './views/Home';
import Auth from './views/Auth';
import CustomerDashboard from './views/CustomerDashboard';
import OwnerDashboard from './views/OwnerDashboard';
import AdminDashboard from './views/AdminDashboard';
import BakeryDetails from './views/BakeryDetails';
import Cart from './views/Cart';
import OrderTracking from './views/OrderTracking';
import Profile from './views/Profile';

const ProtectedRoute: FC<{ children: ReactNode; role?: string }> = ({ children, role }) => {
  const { user, profile, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) return (
    <div className='flex flex-col items-center justify-center h-screen bg-stone-50 gap-4'>
      <Croissant className='w-12 h-12 text-orange-700 animate-pulse' />
      <p className='text-stone-500 font-medium text-sm'>{t('nav.appName')}</p>
    </div>
  );
  if (!user) return <Navigate to="/auth" />;
  if (role && profile?.role !== role) return <Navigate to="/" />;

  return <>{children}</>;
};

function AppRoutes() {
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans animate-fade-in">
      <GlobalLoader />
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/bakery/:id" element={<BakeryDetails />} />
          <Route path="/cart" element={<Cart />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              {profile?.role === 'customer' && <CustomerDashboard />}
              {profile?.role === 'owner' && <OwnerDashboard />}
              {profile?.role === 'admin' && <AdminDashboard />}
            </ProtectedRoute>
          } />

          <Route path="/order/:id" element={
            <ProtectedRoute>
              <OrderTracking />
            </ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <LanguageProvider>
        <FirebaseLoadingProvider>
          <ToastProvider>
            <AuthProvider>
              <CartProvider>
                <AppRoutes />
              </CartProvider>
            </AuthProvider>
          </ToastProvider>
        </FirebaseLoadingProvider>
      </LanguageProvider>
    </Router>
  );
}
