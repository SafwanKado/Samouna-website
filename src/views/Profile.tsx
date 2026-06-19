import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/ToastContext';
import { Save, ArrowLeft, Loader2, Lock, Key, Eye, EyeOff, Camera, User as UserIcon, Mail, Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getStorageInstance } from '../firebase';

const Profile: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const { t, dir } = useLanguage();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup preview URL to prevent memory leaks
      if (photoPreview && photoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setFormData({
            name: data.name || '',
            phone: data.phone || '',
            email: data.email || ''
          });
          setPhotoPreview(data.photoUrl || null);
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        showToast(t('error.generic'), 'error');
      } finally {
        setFetching(false);
      }
    };

    fetchUserData();
  }, [user, t, showToast]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      let finalPhotoUrl = profile?.photoUrl || '';

      if (photoFile) {
        const storage = getStorageInstance();
        if (storage) {
          const storageRef = ref(storage, `users/${user.uid}/avatar.jpg`);
          await uploadBytes(storageRef, photoFile);
          finalPhotoUrl = await getDownloadURL(storageRef);
        }
      }

      await updateDoc(doc(db, 'users', user.uid), {
        name: formData.name,
        phone: formData.phone,
        photoUrl: finalPhotoUrl
      });
      
      // Refresh context profile
      if (refreshProfile) {
        await refreshProfile();
      }

      showToast(t('owner.saveChanges'), 'success');
    } catch (error) {
      console.error("Error updating profile:", error);
      showToast(t('error.save'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentPassword || !newPassword || !confirmPassword) return;

    if (newPassword !== confirmPassword) {
      showToast(t('auth.passwordMismatch'), 'error');
      return;
    }

    if (newPassword.length < 8) {
      showToast(t('auth.passwordTooShort'), 'error');
      return;
    }

    setPasswordLoading(true);
    try {
      // Reauthenticate
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update
      await updatePassword(user, newPassword);
      
      showToast(t('auth.passwordUpdated'), 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (error: any) {
      console.error("Error updating password:", error);
      if (error.code === 'auth/wrong-password') {
        showToast(t('auth.wrongCurrentPassword'), 'error');
      } else if (error.code === 'auth/requires-recent-login') {
        showToast(t('auth.requiresRecentLogin'), 'error');
      } else {
        showToast(error.message || 'Failed to update password.', 'error');
      }
    } finally {
      setPasswordLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-pulse">
        <Loader2 className="w-12 h-12 text-orange-700 animate-spin mb-4" />
        <p className="text-stone-500 font-medium">{t('owner.uploading')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-stone-100 rounded-full transition-colors order-first"
        >
          <ArrowLeft className={`w-6 h-6 text-stone-600 ${dir === 'rtl' ? 'rotate-180' : ''}`} />
        </button>
        <h2 className="text-3xl font-bold text-stone-900">{t('auth.completeProfile')}</h2>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl space-y-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-8 border-b border-stone-50">
          <div className="relative group">
            <div className="w-28 h-28 bg-orange-100 rounded-full overflow-hidden flex items-center justify-center text-orange-700 ring-4 ring-orange-50 transition-all group-hover:ring-orange-100">
              {photoPreview ? (
                <img 
                  src={photoPreview} 
                  alt="Profile" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <UserIcon className="w-14 h-14" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-stone-100 text-orange-700 hover:bg-orange-50 transition-all transform hover:scale-110 active:scale-95"
              type="button"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handlePhotoChange}
              accept="image/*"
              className="hidden"
            />
          </div>
          <div className="text-center sm:text-start">
            <h3 className="text-2xl font-bold text-stone-900">{formData.name || t('auth.customer')}</h3>
            <p className="text-stone-500 font-medium flex items-center justify-center sm:justify-start gap-2 mt-1">
              <span className="px-2 py-0.5 bg-stone-100 rounded-full text-[10px] uppercase tracking-wider font-bold">
                {profile?.role || 'User'}
              </span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6">
            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">{t('auth.fullName')}</label>
              <div className="relative">
                <UserIcon className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="text" 
                  required 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full ps-10 pe-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder={t('auth.fullName')}
                />
              </div>
            </div>

            <div className="space-y-1 opacity-60">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="email" 
                  disabled
                  value={formData.email}
                  className="w-full ps-10 pe-4 py-3 rounded-xl border border-stone-200 bg-stone-50 cursor-not-allowed outline-none"
                />
              </div>
              <p className="text-[10px] text-stone-400 mt-1 italic">Email cannot be changed.</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold text-stone-500 uppercase tracking-wider">{t('auth.phone')}</label>
              <div className="relative">
                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type="tel" 
                  required 
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full ps-10 pe-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder={t('auth.phone')}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-orange-700 text-white py-4 rounded-2xl font-bold hover:bg-orange-800 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {t('owner.saveChanges')}
          </button>
        </form>
      </div>

      {user.providerData[0]?.providerId === 'password' && (
        <div className="bg-white p-8 rounded-3xl border border-stone-100 shadow-xl space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg text-red-600">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-stone-900">{t('auth.security')}</h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-wider text-stone-500">{t('auth.currentPassword')}</label>
              <div className="relative">
                <Key className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type={showCurrentPassword ? 'text' : 'password'} 
                  required 
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full ps-10 pe-12 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder={t('auth.currentPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                >
                  {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-wider text-stone-500">{t('auth.newPassword')}</label>
              <div className="relative">
                <Key className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type={showNewPassword ? 'text' : 'password'} 
                  required 
                  minLength={8}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full ps-10 pe-12 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder={t('auth.newPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                >
                  {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-[10px] text-stone-400 mt-1 italic">At least 8 characters long.</p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-bold uppercase tracking-wider text-stone-500">{t('auth.confirmPassword')}</label>
              <div className="relative">
                <Key className="absolute start-3 top-1/2 -translate-y-1/2 text-stone-400 w-5 h-5" />
                <input 
                  type={showConfirmPassword ? 'text' : 'password'} 
                  required 
                  minLength={8}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full ps-10 pe-12 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                  placeholder={t('auth.confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={passwordLoading || !newPassword || !currentPassword || !confirmPassword}
              className="w-full border border-stone-200 text-stone-700 py-3 rounded-xl font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {passwordLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              {t('owner.saveChanges')}
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default Profile;
