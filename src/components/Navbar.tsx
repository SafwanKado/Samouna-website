import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useLanguage, Language } from '../context/LanguageContext';
import { ShoppingCart, User, LogOut, Croissant, LayoutDashboard, Languages, ChevronDown, Menu, X, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const Navbar: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const { items } = useCart();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setShowLangMenu(false);
      }
    };

    if (showLangMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLangMenu]);

  const handleSignOut = async () => {
    setMobileMenuOpen(false);
    await signOut();
    navigate('/');
  };

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'ar', label: 'العربية' },
    { code: 'ku', label: 'کوردی (بادینی)' }
  ];

  return (
    <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2 text-orange-700 font-bold text-xl">
            <Croissant className="w-8 h-8" />
            <span className="hidden sm:inline">{t('nav.appName')}</span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-6">
            {/* Language Selector (Always visible) */}
            <div className="relative" ref={langMenuRef}>
              <button 
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1.5 p-2 text-stone-600 hover:text-orange-700 transition-colors font-bold text-sm touch-target"
              >
                <Languages className="w-5 h-5" />
                <span className="hidden md:inline">{languages.find(l => l.code === language)?.label}</span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showLangMenu ? 'rotate-180' : ''}`} />
              </button>
              
              <AnimatePresence>
                {showLangMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute ltr:right-0 rtl:left-0 sm:ltr:right-0 sm:rtl:left-0 mt-2 w-48 bg-white border border-stone-100 rounded-2xl shadow-xl py-2 z-[60] overflow-hidden"
                  >
                    {languages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setLanguage(lang.code);
                          setShowLangMenu(false);
                        }}
                        className={`w-full text-start px-4 py-3 text-sm hover:bg-orange-50 transition-colors flex items-center justify-between group ${
                          language === lang.code ? 'text-orange-700 font-bold bg-orange-50/30' : 'text-stone-600'
                        }`}
                      >
                        <span>{lang.label}</span>
                        {language === lang.code && (
                          <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="hidden sm:flex items-center gap-2 sm:gap-6">
              <Link to="/" className="flex items-center gap-1 text-stone-600 hover:text-orange-700 font-medium">
                <Home className="w-5 h-5" />
                <span className="hidden lg:inline">{t('nav.home') || 'Home'}</span>
              </Link>
              {profile?.role !== 'admin' && (
                <Link to="/cart" className="relative p-2 text-stone-600 hover:text-orange-700 transition-colors">
                  <ShoppingCart className="w-6 h-6" />
                  {items.length > 0 && (
                    <span className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {items.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>
                  )}
                </Link>
              )}

              {user ? (
                <div className="flex items-center gap-2 sm:gap-4">
                  <Link to="/profile" className="flex items-center gap-1 text-stone-600 hover:text-orange-700 font-medium">
                    {profile?.photoUrl ? (
                      <img 
                        src={profile.photoUrl} 
                        alt="Profile" 
                        className="w-8 h-8 rounded-full object-cover border border-stone-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <User className="w-5 h-5" />
                    )}
                    <span className="hidden sm:inline">{t('nav.profile')}</span>
                  </Link>
                  <Link to="/dashboard" className="flex items-center gap-1 text-stone-600 hover:text-orange-700 font-medium">
                    <LayoutDashboard className="w-5 h-5" />
                    <span className="hidden sm:inline">{t('nav.dashboard')}</span>
                  </Link>
                  <button 
                    onClick={handleSignOut}
                    className="flex items-center gap-1 text-stone-600 hover:text-red-600 font-medium cursor-pointer"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="hidden sm:inline">{t('nav.signOut')}</span>
                  </button>
                </div>
              ) : (
                <Link 
                  to="/auth" 
                  className="bg-orange-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-800 transition-colors flex items-center gap-2"
                >
                  <User className="w-5 h-5" />
                  {t('nav.login')}
                </Link>
              )}
            </div>

            {/* Mobile Actions Container (Cart + Menu) */}
            <div className="flex sm:hidden items-center gap-2">
              {profile?.role !== 'admin' && (
                <Link 
                  to="/cart" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="relative p-2 text-stone-600 hover:text-orange-700 transition-colors"
                >
                  <ShoppingCart className="w-6 h-6" />
                  {items.length > 0 && (
                    <span className="absolute top-0 right-0 bg-orange-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {items.reduce((acc, item) => acc + item.quantity, 0)}
                    </span>
                  )}
                </Link>
              )}
              
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-stone-600 hover:text-orange-700 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 sm:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 bottom-0 w-80 bg-white z-50 sm:hidden shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-stone-100 flex justify-between items-center bg-orange-50/50">
                <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 text-orange-700 font-black text-xl">
                  <Croissant className="w-8 h-8" />
                  <span>{t('nav.appName')}</span>
                </Link>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 text-stone-600 hover:bg-white rounded-full shadow-sm"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto py-4">
                <div className="px-6 pb-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">{t('common.navigation') || 'Menu'}</div>
                <Link 
                  to="/" 
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-4 px-6 py-4 text-stone-600 hover:bg-orange-50 hover:text-orange-700 transition-all font-bold group"
                >
                  <div className="bg-stone-50 group-hover:bg-white p-2 rounded-lg transition-colors shadow-sm">
                    <Home className="w-5 h-5 text-stone-400 group-hover:text-orange-600" />
                  </div>
                  {t('nav.home') || 'Home'}
                </Link>

                {user ? (
                  <>
                    <Link 
                      to="/profile" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-4 px-6 py-4 text-stone-600 hover:bg-orange-50 hover:text-orange-700 transition-all font-bold group"
                    >
                      <div className="bg-stone-50 group-hover:bg-white p-2 rounded-lg transition-colors shadow-sm overflow-hidden flex items-center justify-center">
                        {profile?.photoUrl ? (
                          <img 
                            src={profile.photoUrl} 
                            alt="Profile" 
                            className="w-5 h-5 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <User className="w-5 h-5 text-stone-400 group-hover:text-orange-600" />
                        )}
                      </div>
                      {t('nav.profile')}
                    </Link>
                    <Link 
                      to="/dashboard" 
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-4 px-6 py-4 text-stone-600 hover:bg-orange-50 hover:text-orange-700 transition-all font-bold group"
                    >
                      <div className="bg-stone-50 group-hover:bg-white p-2 rounded-lg transition-colors shadow-sm">
                        <LayoutDashboard className="w-5 h-5 text-stone-400 group-hover:text-orange-600" />
                      </div>
                      {t('nav.dashboard')}
                    </Link>

                    {profile?.role !== 'admin' && (
                      <Link 
                        to="/cart" 
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-4 px-6 py-4 text-stone-600 hover:bg-orange-50 hover:text-orange-700 transition-all font-bold group"
                      >
                        <div className="bg-stone-50 group-hover:bg-white p-2 rounded-lg transition-colors shadow-sm relative">
                          <ShoppingCart className="w-5 h-5 text-stone-400 group-hover:text-orange-600" />
                          {items.length > 0 && (
                            <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[8px] font-bold px-1 rounded-full">
                              {items.reduce((acc, item) => acc + item.quantity, 0)}
                            </span>
                          )}
                        </div>
                        {t('cart.title')}
                      </Link>
                    )}

                    <div className="mt-8 px-6 pb-2 text-[10px] font-black text-stone-400 uppercase tracking-widest">{t('common.account') || 'Account'}</div>
                    <button 
                      onClick={handleSignOut}
                      className="flex items-center gap-4 px-6 py-4 text-red-500 hover:bg-red-50 transition-all font-bold w-full text-left group"
                    >
                      <div className="bg-red-50 group-hover:bg-white p-2 rounded-lg transition-colors shadow-sm">
                        <LogOut className="w-5 h-5 text-red-400 group-hover:text-red-600" />
                      </div>
                      {t('nav.signOut')}
                    </button>
                  </>
                ) : (
                  <Link 
                    to="/auth" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-4 px-6 py-4 text-orange-700 hover:bg-orange-50 transition-all font-bold group"
                  >
                    <div className="bg-white p-2 rounded-lg shadow-sm">
                      <User className="w-5 h-5" />
                    </div>
                    {t('nav.login')}
                  </Link>
                )}
              </div>
              
              <div className="p-6 bg-stone-50 border-t border-stone-100 italic text-[10px] text-stone-400 space-y-1">
                <p>Samoun Delivery App</p>
                <p>© 2026 Fresh Heritage</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
