import React, { createContext, useContext, ReactNode } from 'react';

export type Language = 'en' | 'ar' | 'ku';

const translations: Record<string, Record<Language, string>> = {
  // Navigation
  'nav.appName': { en: 'Samoun', ar: 'صمون', ku: 'سەموون' },
  'nav.home': { en: 'Home', ar: 'الرئيسية', ku: 'دەسپێک' },
  'nav.profile': { en: 'Profile', ar: 'الملف الشخصي', ku: 'پڕۆفایل' },
  'nav.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم', ku: 'داشبۆرد' },
  'nav.signOut': { en: 'Sign Out', ar: 'تسجيل الخروج', ku: 'چوونە ژۆرفە' },
  'nav.login': { en: 'Login', ar: 'تسجيل الدخول', ku: 'چوونە ژوورەوە' },

  // Common
  'common.currency': { en: 'IQD', ar: 'د.ع', ku: 'د.ع' },
  'common.dashboard': { en: 'Dashboard', ar: 'لوحة التحكم', ku: 'داشبۆرد' },
  'common.settings': { en: 'Settings', ar: 'الإعدادات', ku: 'ڕێکخستن' },
  'common.deleteAccount': { en: 'Delete Account', ar: 'حذف الحساب', ku: 'ژێبرنا ئەکاونتی' },
  'common.deleteAccountConfirm': { en: 'Are you sure you want to delete your account? This action cannot be undone.', ar: 'هل أنت متأكد من حذف حسابك؟ لا يمكن التراجع عن هذا الإجراء.', ku: 'تۆ پشتراستی ژ ژێبرنا ئەکاونتێ خۆ؟ ئەڤ کارە پاشڤە نا زڤریت.' },
  'common.dangerZone': { en: 'Danger Zone', ar: 'منطقة الخطر', ku: 'دەڤەرا مەترسیێ' },

  // Auth
  'auth.welcome': { en: 'Welcome Back', ar: 'أهلاً بك مجدداً', ku: 'بخێر بێی' },
  'auth.join': { en: 'Join Samoun', ar: 'انضم إلى صمون', ku: 'بەژداربە دگەل سەموون' },
  'auth.sub': { en: 'Experience traditional Samoun delivered fresh to your door.', ar: 'جرب الصمون التقليدي الطازج الواصل إلى باب منزلك.', ku: 'تاما سەموونا تەقلیدی بکە یا گەهشتیە بەر دەرگەهێ مالا تە.' },
  'auth.fullName': { en: 'Full Name', ar: 'الاسم الكامل', ku: 'ناڤێ سێیانی' },
  'auth.email': { en: 'Email Address', ar: 'البريد الإلكتروني', ku: 'ئیمەیل' },
  'auth.password': { en: 'Password', ar: 'كلمة المرور', ku: 'پەیڤا نهێنی' },
  'auth.confirmPassword': { en: 'Confirm Password', ar: 'تأكيد كلمة المرور', ku: 'پشتراستکرنا پەیڤا نهێنی' },
  'auth.newPassword': { en: 'New Password', ar: 'كلمة مرور جديدة', ku: 'پەیڤا نهێنی يا نوو' },
  'auth.phone': { en: 'Phone Number', ar: 'رقم الهاتف', ku: 'ژمارەیا تەلەفۆنا' },
  'auth.roleLabel': { en: 'I am a...', ar: 'أنا...', ku: 'ئەز...' },
  'auth.customer': { en: 'Customer', ar: 'زبون', ku: 'زبون' },
  'auth.owner': { en: 'Bakery Owner', ar: 'صاحب مخبز', ku: 'خودانێ نانپێژێ' },
  'auth.driver': { en: 'Delivery Driver', ar: 'سائق توصيل', ku: 'شۆفێرێ گەهاندنێ' },
  'auth.signIn': { en: 'Sign In', ar: 'تسجيل الدخول', ku: 'چوونە ژوورەوە' },
  'auth.signUp': { en: 'Sign Up', ar: 'إنشاء حساب', ku: 'چێکرنا ئەکاونتی' },
  'auth.createAccount': { en: 'Create Account', ar: 'إنشاء حساب', ku: 'چێکرنا ئەکاونتی' },
  'auth.finish': { en: 'Finish Setup', ar: 'إنهاء الإعداد', ku: 'دووماهیک ئامادەکرن' },
  'auth.completeProfile': { en: 'Complete Your Profile', ar: 'أكمل ملفك الشخصي', ku: 'پڕۆفایلا خۆ تمام بکە' },
  'auth.noAccount': { en: "Don't have an account?", ar: 'ليس لديك حساب؟', ku: 'ئەکاونت نینە؟' },
  'auth.hasAccount': { en: 'Already have an account?', ar: 'لديك حساب بالفعل؟', ku: 'ئینا ئەکاونت هەردی؟' },
  'auth.orContinue': { en: 'Or continue with', ar: 'أو استمر بـ', ku: 'یان بەردەوام بە بـ' },
  'auth.resetPassword': { en: 'Reset Password', ar: 'إعادة تعيين كلمة المرور', ku: 'نووکرنا پەیڤا نهێنی' },
  'auth.resetSub': { en: 'Enter your email to receive a reset link', ar: 'أدخل بريدك الإلكتروني لتلقي رابط إعادة التعيين', ku: 'ئیمەیلا خۆ بنڤیسە بۆ وەرگرتنا لینکا نووکرنێ' },
  'auth.resetNote': { en: "We'll send you a link to reset your password if your account exists.", ar: 'سنرسل لك رابطاً لإعادة تعيين كلمة المرور الخاصة بك إذا كان حسابك موجوداً.', ku: 'ئەم دێ لینکا نووکرنا پەیڤا نهێنی بۆ تە هنێرین ئەگەر ئەکاونت هەبیت.' },
  'auth.sending': { en: 'Sending...', ar: 'جارٍ الإرسال...', ku: 'دهێتە هنارتن...' },
  'auth.processing': { en: 'Processing...', ar: 'جارٍ المعالجة...', ku: 'دهێتە چارەسەرکرن...' },
  'auth.sendResetEmail': { en: 'Send Reset Email', ar: 'إرسال رابط إعادة التعيين', ku: 'هنارتنا لینکا نووکرنێ' },
  'auth.backToLogin': { en: 'Back to Login', ar: 'العودة لتسجيل الدخول', ku: 'زڤڕین بۆ چوونە ژوورڤە' },
  'auth.verifyEmailTitle': { en: 'Verify your email', ar: 'تحقق من بريدك الإلكتروني', ku: 'ئیمەیلا خۆ پشکنینبکە' },
  'auth.verifyEmailSent': { en: 'A verification email has been sent to', ar: 'تم إرسال بريد تحقق إلى', ku: 'ئیمەیلا پشکنینێ هنارتیە بۆ' },
  'auth.verifyEmailInstructions': { en: 'Please check your inbox (and spam folder) before signing in.', ar: 'يرجى فحص صندوق الوارد (ومجلد الرسائل غير المرغوبة)', ku: 'تکایە قوتیا ناردنا خۆ بپشکنە' },
  'auth.backToSignIn': { en: 'Back to Sign In', ar: 'العودة لتسجيل الدخول', ku: 'زڤڕین بۆ چوونە ژوورڤە' },
  'auth.resendEmail': { en: 'Resend Email', ar: 'إعادة إرسال البريد الالكتروني', ku: 'دووبارە هنارتنا ئیمەیلێ' },
  'auth.resending': { en: 'Resending...', ar: 'جاري إعادة الإرسال...', ku: 'دووبارە دهێتە هنارتن...' },
  'auth.resendIn': { en: 'Resend in', ar: 'إعادة الإرسال خلال', ku: 'دووبارە هنارتن ل' },
  'auth.resendSuccess': { en: 'Verification email resent!', ar: 'تم إعادة إرسال بريد التحقق!', ku: 'ئیمەیلا پشکنینێ دووبارە هاتە هنارتن!' },
  'auth.security': { en: 'Security', ar: 'الأمان', ku: 'ئەمنیەت' },
  'auth.currentPassword': { en: 'Current Password', ar: 'كلمة المرور الحالية', ku: 'پەیڤا نهێنی یا ئێستا' },
  'auth.passwordUpdated': { en: 'Password updated successfully!', ar: 'تم تحديث كلمة المرور!', ku: 'پەیڤا نهێنی نوێکرایەوە!' },
  'auth.passwordMismatch': { en: 'New passwords do not match.', ar: 'كلمتا المرور الجديدتان غير متطابقتين.', ku: 'پەیڤا نهێنی یێن نوو یەکتر نین.' },
  'auth.passwordTooShort': { en: 'New password must be at least 8 characters.', ar: 'يجب أن تكون كلمة المرور الجديدة 8 أحرف على الأقل.', ku: 'پەیڤا نهێنی یا نوو دڤێت کێمتر نەبیت ژ ٨ پیتان.' },
  'auth.wrongCurrentPassword': { en: 'Incorrect current password.', ar: 'كلمة المرور الحالية غير صحيحة.', ku: 'پەیڤا نهێنی یا نوکە نەدرۆستە.' },
  'auth.requiresRecentLogin': { en: 'Please sign in again to change your password.', ar: 'يرجى تسجيل الدخول مرة أخرى لتغيير كلمة المرور.', ku: 'تکایە جارەکا دی بچە ژوورڤە بۆ گوهۆڕینا پەیڤا نهێنی.' },
  'auth.forgotPassword': { en: 'Forgot Password?', ar: 'هل نسيت كلمة المرور؟', ku: 'تە پەیڤا نهێنی یا ژبیرکری؟' },
  'auth.rememberMe': { en: 'Remember Me', ar: 'تذكرني', ku: 'من ل بیر بهێنە' },

  // Home
  'home.heroTitle': { en: 'Fresh Samoun at Your Doorstep', ar: 'صمون طازج عند باب منزلك', ku: 'سەموونا تازە ل بەر دەرگەهێ تە' },
  'home.heroSub': { en: 'Authentic Iraqi bakeries delivered within minutes.', ar: 'مخابز عراقية أصيلة تصلك خلال دقائق.', ku: 'نانپێژێن عێراقی یێن ڕاستەقینە د چەند خۆلەکا دا دگەهنە تە.' },
  'home.searchPlaceholder': { en: 'Search for bakeries...', ar: 'البحث عن المخابز...', ku: 'ل نانپێژا بگەرێ...' },
  'home.favorites': { en: 'Your Favorites', ar: 'مفضلاتك', ku: 'پەسەندکریێن تە' },
  'home.allBakeries': { en: 'All Bakeries', ar: 'جميع المخابز', ku: 'هەمی نانپێژ' },
  'home.new': { en: 'New', ar: 'جديد', ku: 'نوی' },
  'home.min': { en: 'min', ar: 'دقيقة', ku: 'خۆلەک' },
  'home.noBakeries': { en: 'No bakeries found matching your search.', ar: 'لا توجد مخابز مطابقة لبحثك.', ku: 'چ نانپێژ نەهاتنە دیتن ل دیڤ گەڕیانا تە.' },

  // Cart
  'cart.title': { en: 'Your Cart', ar: 'عربة التسوق', ku: 'عەربەنا کڕینێ' },
  'cart.empty': { en: 'Your cart is empty', ar: 'عربة التسوق فارغة', ku: 'عەربەنا کڕینێ یا ڤالایە' },
  'cart.emptySub': { en: 'Add some fresh bread to get started!', ar: 'أضف بعض الخبز الطازج للبدء!', ku: 'هندەک نانێ تازە زێدە بکە بۆ دەسپێکرنێ!' },
  'cart.browse': { en: 'Browse Bakeries', ar: 'تصفح المخابز', ku: 'نانپێژا بگەڕێ' },
  'cart.subtotal': { en: 'Subtotal', ar: 'المجموع الفرعي', ku: 'کۆما هەمییان' },
  'cart.deliveryFee': { en: 'Delivery Fee', ar: 'رسوم التوصيل', ku: 'کرێیا گەهاندنێ' },
  'cart.total': { en: 'Total Price', ar: 'السعر الإجمالي', ku: 'بهایێ هەمییێ' },
  'cart.placeOrder': { en: 'Place Order', ar: 'إتمام الطلب', ku: 'دووماهیک ئینانا داخوازێ' },
  'cart.successTitle': { en: 'Order Placed!', ar: 'تم الطلب!', ku: 'داخوازی چێبوو!' },
  'cart.successSub': { en: 'Your fresh bread will arrive shortly.', ar: 'سيصل خبزك الطازج قريباً.', ku: 'دێ نانێ تە یێ تازە د نێزیک دا گەهیت.' },
  'cart.trackOrder': { en: 'Track Order', ar: 'تتبع الطلب', ku: 'دووڤچوونا داخوازێ' },
  'cart.added': { en: 'Added to cart', ar: 'تمت الإضافة للعربة', ku: 'هاتە زێدەکرن بۆ عەربەنێ' },
  'cart.paymentMethod': { en: 'Payment Method', ar: 'طريقة الدفع', ku: 'رێکا پارەدانێ' },
  'cart.card': { en: 'Online Payment', ar: 'دفع إلكتروني', ku: 'پارەدانا ئەلکترۆنی' },
  'cart.cash': { en: 'Cash on Delivery', ar: 'دفع عند الاستلام', ku: 'پارەدانا ل دەمێ وەرگرتنێ' },
  'cart.processingCard': { en: 'Processing Card...', ar: 'جاري معالجة البطاقة...', ku: 'پشکنینا کارتێ دهێتەکرن...' },
  'cart.confirmingCash': { en: 'Confirming Order...', ar: 'جاري تأكيد الطلب...', ku: 'پشتراستکرنا داخوازێ دهێتەکرن...' },
  'cart.backToCart': { en: 'Back to Cart', ar: 'الرجوع للعربة', ku: 'پاشڤە بۆ عەربەنێ' },

  // Bakery Dashboard
  'owner.registerTitle': { en: 'Register Your Bakery', ar: 'سجل مخبزك', ku: 'نانپێژا خۆ تۆمار بکە' },
  'owner.registerSub': { en: 'Join our network and reach thousands of customers.', ar: 'انضم لشبكتنا واصل لآلاف الزبائن.', ku: 'بەژداری تۆرا مە ببە و بگەهە ب هەزاران زبونان.' },
  'owner.bakeryName': { en: 'Bakery Name', ar: 'اسم المخبز', ku: 'ناڤێ نانپێژێ' },
  'owner.contactNumber': { en: 'Contact Number', ar: 'رقم الاتصال', ku: 'ژمارەیا تەلەفۆنا' },
  'owner.address': { en: 'Bakery Address', ar: 'عنوان المخبز', ku: 'ناڤونیشانێ نانپێژێ' },
  'owner.description': { en: 'Bakery Description', ar: 'وصف المخبز', ku: 'وەسفا نانپێژێ' },
  'owner.createBakery': { en: 'Create Bakery Profile', ar: 'إنشاء ملف المخبز', ku: 'چێکرنا پڕۆفایلا نانپێژێ' },
  'owner.editProfile': { en: 'Edit Bakery Profile', ar: 'تعديل ملف المخبز', ku: 'دەستکاریا پڕۆفایلا نانپێژێ' },
  'owner.saveChanges': { en: 'Save Changes', ar: 'حفظ التغييرات', ku: 'پاراستنا گوهۆڕینان' },
  'owner.cancel': { en: 'Cancel', ar: 'إلغاء', ku: 'هەلوەشاندن' },
  'owner.pricePerPiece': { en: 'Price per piece', ar: 'السعر للقطعة', ku: 'بهایێ هەر پارچەکێ' },
  'owner.piece': { en: 'piece', ar: 'قطعة', ku: 'پارچە' },
  'owner.editProduct': { en: 'Edit Product', ar: 'تعديل المنتج', ku: 'دەستکاریا بەرهەمی' },
  'owner.saveProduct': { en: 'Save Product', ar: 'حفظ المنتج', ku: 'پاراستنا بەرهەمی' },
  'owner.productDeleted': { en: 'Product deleted', ar: 'تم حذف المنتج', ku: 'بەرهەم هاتە ژێبرن' },
  'owner.priceUpdated': { en: 'Price updated', ar: 'تم تحديث السعر', ku: 'بها هاتە نووکرن' },
  'owner.deliveryTimeUpdated': { en: 'Delivery time updated', ar: 'تم تحديث وقت التوصيل', ku: 'دەمێ گەهاندنێ هاتە نووکرن' },
  'owner.bakeryOpened': { en: 'Bakery marked as active', ar: 'تم تفعيل المخبز', ku: 'نانپێژ هاتە چالاککرن' },
  'owner.bakeryClosed': { en: 'Bakery marked as inactive', ar: 'تم تعطيل المخبز', ku: 'نانپێژ هاتە ڕاگرتن' },
  'owner.bakeryDeleted': { en: 'Bakery deleted successfully', ar: 'تم حذف المخبز بنجاح', ku: 'نانپێژ ب سەرکەفتی هاتە ژێبرن' },
  'owner.deleteBakeryConfirm': { en: 'Are you sure you want to delete this bakery? All products and data will be lost.', ar: 'هل أنت متأكد من حذف هذا المخبز؟ ستفقد جميع المنتجات والبيانات.', ku: 'تۆ پشتراستی ژ ژێبرنا ڤێ نانپێژێ؟ هەمی بەرهەم و پێزانین دێ بەرزە بن.' },
  'owner.deleteBakery': { en: 'Delete Bakery', ar: 'حذف المخبز', ku: 'ژێبرنا نانپێژێ' },
  'owner.availabilityUpdated': { en: 'Availability updated', ar: 'تم تحديث التوفر', ku: 'بەردەستبوون هاتە نووکرن' },
  'owner.orderUpdated': { en: 'Order updated', ar: 'تم تحديث الطلب', ku: 'داخوازی هاتە نووکرن' },
  'owner.newOrderAlert': { en: 'New Order Received!', ar: 'تم استلام طلب جديد!', ku: 'داخوازیەکا نوو گەهشت!' },
  'owner.orderDetails': { en: 'Order Details', ar: 'تفاصيل الطلب', ku: 'پێزانینێن داخوازێ' },
  'owner.confirm': { en: 'Confirm Order', ar: 'تأكيد الطلب', ku: 'پشتراستکرنا داخوازێ' },
  'owner.reject': { en: 'Reject Order', ar: 'رفض الطلب', ku: 'رەتکرنا داخوازێ' },
  'owner.startPreparing': { en: 'Start Preparing', ar: 'بدء التحضير', ku: 'دەست ب بەرهەڤکرنێ بکە' },
  'owner.readyForPickup': { en: 'Ready for Pickup', ar: 'جاهز للاستلام', ku: 'بەرهەڤە بۆ وەرگرتنێ' },
  'owner.deliveryTime': { en: 'Delivery Time', ar: 'وقت التوصيل', ku: 'دەمێ گەهاندنێ' },
  'owner.editPrice': { en: 'Edit Price', ar: 'تعديل السعر', ku: 'دەستکاریا بهایێ' },
  'owner.delete': { en: 'Delete', ar: 'حذف', ku: 'ژێبرن' },
  'owner.category': { en: 'Category', ar: 'الفئة', ku: 'پۆلێن' },
  'owner.samoun': { en: 'Samoun', ar: 'صمون', ku: 'سەموون' },
  'owner.bread': { en: 'Bread', ar: 'خبز', ku: 'نان' },
  'owner.productName': { en: 'Product Name', ar: 'اسم المنتج', ku: 'ناڤێ بەرهەمی' },
  'owner.stockQuantity': { en: 'Stock Quantity', ar: 'الكمية المتوفرة', ku: 'کۆما هەین' },
  'owner.stock': { en: 'Stock', ar: 'المخزون', ku: 'کۆم' },
  'owner.bakeryStatus': { en: 'Bakery Status', ar: 'حالة المخبز', ku: 'بارێ نانپێژێ' },
  'owner.open': { en: 'Open', ar: 'مفتوح', ku: 'ڤەکری' },
  'owner.closed': { en: 'Closed', ar: 'مغلق', ku: 'گرتی' },
  'owner.openTime': { en: 'Open Time', ar: 'وقت الفتح', ku: 'دەمێ ڤەکرنێ' },
  'owner.closeTime': { en: 'Close Time', ar: 'وقت الإغلاق', ku: 'دەمێ گرتنێ' },
  'owner.bakeryImage': { en: 'Bakery Image', ar: 'صورة المخبز', ku: 'وێنێ نانپێژێ' },
  'owner.bakeryProfile': { en: 'Bakery Profile', ar: 'ملف المخبز', ku: 'پڕۆفایلا نانپێژێ' },
  'owner.deliveryFee': { en: 'Delivery Fee', ar: 'رسوم التوصيل', ku: 'کرێیا گەهاندنێ' },
  'bakery.operatingHours': { en: 'Operating Hours', ar: 'ساعات العمل', ku: 'دەمێن کارکرنێ' },
  'bakery.addedToFavorites': { en: 'Added to favorites', ar: 'تمت الإضافة للمفضلة', ku: 'هاتە زێدەکرن بۆ پەسەندکرییان' },
  'bakery.removedFromFavorites': { en: 'Removed from favorites', ar: 'تمت الإزالة من المفضلة', ku: 'هاتە ژێبرن ژ پەسەندکرییان' },
  'owner.uploading': { en: 'Uploading...', ar: 'جاري الرفع...', ku: 'دهێتە هنارتن...' },
  'owner.productImage': { en: 'Product Image', ar: 'صورة المنتج', ku: 'وێنێ بەرهەمی' },
  'owner.noActiveOrders': { en: 'No active orders at the moment.', ar: 'لا توجد طلبات نشطة حالياً.', ku: 'چ داخوازێن کارا نینن ل ڤی سەردەمی.' },
  'owner.notifications': { en: 'Notifications', ar: 'التنبيهات', ku: 'ئەگەهدارکرن' },
  'owner.receiveAlerts': { en: 'Order Alerts', ar: 'تنبيهات الطلبات', ku: 'ئەگەهدارکرنا داخوازان' },
  'owner.notificationsEnabled': { en: 'You will receive a browser notification for every new order.', ar: 'ستتلقى إشعاراً في المتصفح لكل طلب جديد.', ku: 'تۆ دێ ئەگەهدارکرنەکێ وەرگری بۆ هەر داخوازەکا نوو.' },
  'owner.notificationsDisabled': { en: 'Enable notifications to stay updated on new orders even when this tab is closed.', ar: 'قم بتفعيل التنبيهات للبقاء على اطلاع بالطلبات الجديدة حتى عند إغلاق هذه الصفحة.', ku: 'ئەگەهداریا چالاک بکە بۆ هندێ تو هەمی دەما هایدار بی ژ داخوازێن نوو.' },
  'owner.enableNotifications': { en: 'Enable Now', ar: 'تفعيل الآن', ku: 'نوکە چالاک بکە' },

  // Customer Dash
  'customer.yourOrders': { en: 'Your Orders', ar: 'طلباتك', ku: 'داخوازێن تە' },
  'customer.orderMore': { en: 'Order more bread', ar: 'اطلب المزيد من الخبز', ku: 'نانێ پتر داخواز بکە' },
  'customer.noOrders': { en: "You haven't placed any orders yet.", ar: 'لم تقم بأي طلبات بعد.', ku: 'تە چ داخواز نەکریە هەتا نوکە.' },
  'customer.startShopping': { en: 'Start Shopping', ar: 'ابدأ التسوق', ku: 'دەست ب کڕینێ بکە' },
  'customer.confirmDelivery': { en: 'Confirm Delivery', ar: 'تأكيد الاستلام', ku: 'پشتراستکرنا وەرگرتنێ' },

  // Driver Dashboard
  'driver.dashboard': { en: 'Driver Dashboard', ar: 'لوحة قيادة السائق', ku: 'داشبۆردا شۆفێری' },
  'driver.earnings': { en: 'Total Earnings', ar: 'إجمالي الأرباح', ku: 'کۆما قازانجی' },
  'driver.deliveries': { en: 'Deliveries', ar: 'التوصيلات', ku: 'گەهاندن' },
  'driver.currentDelivery': { en: 'Current Delivery', ar: 'التوصيل الحالي', ku: 'گەهاندنا نوکە' },
  'driver.startDelivery': { en: 'Start Delivery', ar: 'بدء التوصيل', ku: 'دەست ب گەهاندنێ بکە' },
  'driver.markDelivered': { en: 'Mark as Delivered', ar: 'تم التوصيل', ku: 'وەک گەهاندن نیشان بکە' },
  'driver.availableRequests': { en: 'Available Requests', ar: 'الطلبات المتاحة', ku: 'داخوازێن بەردەست' },
  'driver.activeDelivery': { en: 'Active Delivery', ar: 'توصيل نشط', ku: 'گەهاندنا کارا' },
  'driver.acceptDelivery': { en: 'Accept Delivery', ar: 'قبول التوصيل', ku: 'قبوولکرنا گەهاندنێ' },
  'driver.pickup': { en: 'PICKUP', ar: 'استلام', ku: 'وەرگرتن' },
  'driver.dropoff': { en: 'DROPOFF', ar: 'تسليم', ku: 'گەهاندن' },
  'driver.deliveryStatus': { en: 'Delivery Status', ar: 'حالة التوصيل', ku: 'بارێ گەهاندنێ' },
  'driver.earn': { en: 'Earn', ar: 'اربح', ku: 'قازانج بکە' },
  'driver.noAvailable': { en: 'No available delivery requests.', ar: 'لا توجد طلبات توصيل متاحة.', ku: 'چ داخوازێن گەهاندنێ یێن بەردەست نینن.' },
  'driver.history': { en: 'History', ar: 'السجل', ku: 'دیرۆک' },
  'driver.orderPicked': { en: 'Order accepted', ar: 'تم قبول الطلب', ku: 'داخوازی هاتە قبوولکرن' },

  // Dash
  'dash.noOrders': { en: "You haven't placed any orders yet.", ar: 'لم تقم بأي طلبات بعد.', ku: 'تە چ داخواز نەکریە هەتا نوکە.' },
  'dash.startShopping': { en: 'Start Shopping', ar: 'ابدأ التسوق', ku: 'دەست ب کڕینێ بکە' },
  'dash.revenue': { en: 'Total Revenue', ar: 'إجمالي الإيرادات', ku: 'کۆما داهاتی' },
  'dash.activeOrders': { en: 'Active Orders', ar: 'الطلبات النشطة', ku: 'داخوازێن کارا' },
  'dash.products': { en: 'Products', ar: 'المنتجات', ku: 'بەرهەم' },
  'dash.incomingOrders': { en: 'Incoming Orders', ar: 'الطلبات الواردة', ku: 'داخوازێن هاتین' },
  'dash.yourProducts': { en: 'Your Products', ar: 'منتجاتك', ku: 'بەرهەمێن تە' },
  'dash.addProduct': { en: 'Add Product', ar: 'إضافة منتج', ku: 'زێدەکرنا بەرهەمی' },

  // Order Status
  'status.pending': { en: 'Pending', ar: 'قيد الانتظار', ku: 'ل هیڤیێ' },
  'status.confirmed': { en: 'Confirmed', ar: 'تم التأكيد', ku: 'هاتە پشتراستکرن' },
  'status.preparing': { en: 'Preparing', ar: 'قيد التحضير', ku: 'بەرهەڤکرن' },
  'status.ready': { en: 'Ready for Pickup', ar: 'جاهز للاستلام', ku: 'بەرهەڤە بۆ برنێ' },
  'status.assigned': { en: 'Driver Assigned', ar: 'تم تعيين سائق', ku: 'شۆفێر هاتە دیارکرن' },
  'status.picked_up': { en: 'Picked Up', ar: 'تم الاستلام', ku: 'هاتە وەرگرتن' },
  'status.on_the_way': { en: 'On the Way', ar: 'في الطريق', ku: 'د رێکێ دایە' },
  'status.delivered': { en: 'Delivered', ar: 'تم التوصيل', ku: 'هاتە گەهاندن' },
  'status.cancelled': { en: 'Cancelled', ar: 'ملغي', ku: 'هاتە هەلوەشاندن' },
  'status.pending.desc': { en: 'We have received your order', ar: 'لقد استلمنا طلبك', ku: 'مە داخوازا تە وەرگرت' },
  'status.confirmed.desc': { en: 'The bakery has confirmed your order', ar: 'المخبز قد أكد طلبك', ku: 'نانپێژى داخوازا تە پشتراست کر' },
  'status.preparing.desc': { en: 'Your bread is being prepared', ar: 'خبزك قيد التحضير', ku: 'نانێ تە دهێتە بەرهەڤکرن' },
  'status.ready.desc': { en: 'Waiting for a driver', ar: 'بانتظار السائق', ku: 'ل هیڤیا شۆفێری' },
  'status.on_the_way.desc': { en: 'Your driver is heading to you', ar: 'السائق في طريقه إليك', ku: 'شۆفێرێ تە د رێکێ دایە' },
  'status.delivered.desc': { en: 'Enjoy your fresh bread!', ar: 'استمتع بخبزك الطازج!', ku: 'نۆشی گیانی تە بیت، نانێ تە یێ تازەیە!' },

  // Order Tracking
  'track.orderNotFound': { en: 'Order not found.', ar: 'الطلب غير موجود.', ku: 'داخوازی نەهاتە دیتن.' },
  'track.bakery': { en: 'Bakery', ar: 'المخبز', ku: 'نانپێژ' },
  'track.you': { en: 'You', ar: 'أنت', ku: 'تۆ' },
  'track.driver': { en: 'Driver', ar: 'السائق', ku: 'شۆفێر' },
  'track.driverOnWay': { en: 'Driver is on the way', ar: 'السائق في الطريق', ku: 'شۆفێر د رێکێ دایە' },
  'track.estimatedArrival': { en: 'Estimated arrival: 5-10 min', ar: 'الوصول المتوقع: ٥-١٠ دقائق', ku: 'گەهشتنا پێشبینیکری: ٥-١٠ خۆلەک' },
  'track.callDriver': { en: 'Call Driver', ar: 'اتصل بالسائق', ku: 'پەیوەندیێ ب شۆفێری بکە' },
  'track.orderNumber': { en: 'Order #', ar: 'طلب رقم ', ku: 'داخوازیا ژمارە ' },
  'track.status': { en: 'Status', ar: 'الحالة', ku: 'بار' },
  'track.deliveryTo': { en: 'Delivery to', ar: 'التوصيل إلى', ku: 'گەهاندن بۆ' },
  'track.cancelReason': { en: 'Cancellation Reason', ar: 'سبب الإلغاء', ku: 'ئەگەرێ هەلوەشاندنێ' },
  'track.cancelOrder': { en: 'Cancel Order', ar: 'إلغاء الطلب', ku: 'هەلوەشاندنا داخوازێ' },
  'track.rateBakery': { en: 'Rate this Bakery', ar: 'قيم هذا المخبز', ku: 'هەلسەنگاندنا ڤێ نانپێژێ' },
  'track.deliveryProgress': { en: 'Delivery Progress', ar: 'تقدم التوصيل', ku: 'پێشکەفتنا گەهاندنێ' },
  'track.orderDetails': { en: 'Order Details', ar: 'تفاصيل الطلب', ku: 'پێزانینێن داخوازێ' },
  'track.totalPaid': { en: 'Total Paid', ar: 'إجمالي المبلغ المدفوع', ku: 'کۆما پارەیێ هاتەدان' },
  'track.howWasBread': { en: 'How was the bread?', ar: 'كيف كان الخبز؟', ku: 'نان چەوا بوو؟' },
  'track.rateExperience': { en: 'Rate your experience with this bakery.', ar: 'قيم تجربتك مع هذا المخبز.', ku: 'هەلسەنگاندنا ئەزموونا خۆ بکە دگەل ڤێ نانپێژێ.' },
  'track.submitRating': { en: 'Submit Rating', ar: 'إرسال التقييم', ku: 'هنارتنا هەلسەنگاندنێ' },
  'track.saving': { en: 'Saving...', ar: 'جاري الحفظ...', ku: 'دهێتە پاراستن...' },
  'track.later': { en: 'Later', ar: 'لاحقاً', ku: 'پاشتر' },
  'track.back': { en: 'Back', ar: 'رجوع', ku: 'پاشڤە' },
  'track.cancelOrderLong': { en: "Please tell us why you're cancelling this order. This helps us improve our service.", ar: 'يرجى إخبارنا لماذا تقوم بإلغاء هذا الطلب. هذا يساعدنا على تحسين خدمتنا.', ku: 'تکایە بێژە مە بۆچی تو ڤێ داخوازێ هەلوەشینی. ئەڤە دێ هاریکاریا مە کەت بۆ باشترکرنا خزمەتێن مە.' },
  'track.cancelPlaceholder': { en: 'Reason for cancellation...', ar: 'سبب الإلغاء...', ku: 'ئەگەرێ هەلوەشاندنێ...' },
  'track.confirmCancel': { en: 'Confirm Cancellation', ar: 'تأكيد الإلغاء', ku: 'پشتراستکرنا هەلوەشاندنێ' },
  'track.ratingSuccess': { en: 'Thank you for your rating!', ar: 'شكراً لتقييمك!', ku: 'سوپاس بۆ هەلسەنگاندنا تە!' },
  'bakery.noProducts': { en: "This bakery hasn't added their menu yet, check back soon.", ar: 'لم يقم هذا المخبز بعد بإضافة قائمة الطعام الخاصة به، يرجى التحقق مرة أخرى قريباً.', ku: 'ڤێ نانپێژێ هێشتا لیستا خوارنێن خۆ زێدە نەکریە، پاشی جارەکا دی پشکنین بکە.' },
  'bakery.minOrder': { en: 'Min. Order', ar: 'الأدنى للطلب', ku: 'کێمتریین داخواز' },
  'bakery.addToCart': { en: 'Add to Cart', ar: 'أضف إلى العربة', ku: 'زێدەکرن بۆ عەربەنێ' },

  // Admin
  'admin.title': { en: 'Admin Dashboard', ar: 'لوحة تحكم المدير', ku: 'داشبۆردا رێڤەبەری' },
  'admin.totalUsers': { en: 'Total Users', ar: 'إجمالي المستخدمين', ku: 'کۆما بەکارئینەران' },
  'admin.totalBakeries': { en: 'Total Bakeries', ar: 'إجمالي المخابز', ku: 'کۆما نانپێژان' },
  'admin.totalOrders': { en: 'Total Orders', ar: 'إجمالي الطلبات', ku: 'کۆما داخوازان' },
  'admin.revenue': { en: 'Revenue', ar: 'الأرباح', ku: 'داهات' },
  'admin.user': { en: 'User', ar: 'المستخدم', ku: 'بەکارئینەر' },
  'admin.role': { en: 'Role', ar: 'الصلاحية', ku: 'پۆلێن' },
  'admin.status': { en: 'Status', ar: 'الحالة', ku: 'بار' },
  'admin.action': { en: 'Action', ar: 'الإجراء', ku: 'کار' },
  'admin.active': { en: 'Active', ar: 'نشط', ku: 'چالاک' },
  'admin.inactive': { en: 'Inactive', ar: 'غير نشط', ku: 'نەچالاک' },
  'admin.bakery': { en: 'Bakery', ar: 'المخبز', ku: 'نانپێژ' },
  'admin.ownerId': { en: 'Owner ID', ar: 'معرف المالك', ku: 'پێناسەیا خودانی' },
  'admin.orderId': { en: 'Order ID', ar: 'رقم الطلب', ku: 'ژمارەیا داخوازێ' },
  'admin.total': { en: 'Total', ar: 'المجموع', ku: 'کۆم' },
  'admin.reports': { en: 'Reports', ar: 'التقارير', ku: 'ڕاپۆرت' },
  'admin.suspend': { en: 'Suspend', ar: 'تعليق', ku: 'ڕاگرتن' },
  'admin.activate': { en: 'Activate', ar: 'تفعيل', ku: 'چالاککرن' },
  'admin.addBakery': { en: 'Add Bakery', ar: 'إضافة مخبز', ku: 'زێدەکرنا نانپێژێ' },
  'admin.editBakery': { en: 'Edit Bakery', ar: 'تعديل المخبز', ku: 'دەستکاریا نانپێژێ' },
  'admin.viewOrder': { en: 'View Details', ar: 'عرض التفاصيل', ku: 'بینینا پێزانینان' },
  'admin.saveChanges': { en: 'Save Changes', ar: 'حفظ التغييرات', ku: 'پاراستنا گوهۆڕینان' },
  'admin.salesTrend': { en: 'Sales Trend', ar: 'اتجاه المبيعات', ku: 'ئاراستەیا فرۆتنێ' },
  'admin.resolveIssues': { en: 'Resolve Issues', ar: 'حل المشكلات', ku: 'چارەسەرکرنا کێشان' },
  'admin.generateReport': { en: 'Generate Sales Report', ar: 'إنشاء تقرير المبيعات', ku: 'چێکرنا ڕاپۆرتا فرۆتنێ' },
  'admin.reportSuccess': { en: 'Report generated successfully!', ar: 'تم إنشاء التقرير بنجاح!', ku: 'ڕاپۆرت ب سەرکەفتی هاتە چێکرن!' },
  'admin.updateStatus': { en: 'Update Status', ar: 'تحديث الحالة', ku: 'نووکرنا بارێ' },
  'admin.editRole': { en: 'Edit Role', ar: 'تعديل الصلاحية', ku: 'دەستکاریا پۆلێنێ' },

  // Errors
  'error.generic': { en: 'Something went wrong. Please try again.', ar: 'حدث خطأ ما. يرحى المحاولة مرة أخرى.', ku: 'تشتەکێ خەلەت چێبوو. تکایە جارەکا دی هەول بدە.' },
  'error.loginRequired': { en: 'Please login to use this feature.', ar: 'يرجى تسجيل الدخول لاستخدام هذه الميزة.', ku: 'تکایە بچە ژوورڤە بۆ بکارئینانا ڤێ خزمەتێ.' },
  'error.payment': { en: 'Payment failed. Please check your card.', ar: 'فشل الدفع. يرجى التحقق من بطاقتك.', ku: 'پارەدان ب سەرنەکەفت. تکایە کارتێ خۆ پشکنین بکە.' },
  'error.save': { en: 'Failed to save changes.', ar: 'فشل حفظ التغييرات.', ku: 'پاراستنا گوهۆڕینان ب سەرنەکەفت.' },
  'error.delete': { en: 'Failed to delete item.', ar: 'فشل حذف العنصر.', ku: 'ژێبرنا تشتى ب سەرنەکەفت.' },
  'error.invalidPhone': { en: 'Invalid phone number format.', ar: 'تنسيق رقم الهاتف غير صالح.', ku: 'شێوازێ ژمارەیا تەلەفۆنا نەدرۆستە.' },
  'error.noLocation': { en: 'Location access is required.', ar: 'مطلوب الوصول إلى الموقع.', ku: 'پێدڤی ب ناڤونیشانی یە.' },
  'error.minOrder': { en: 'Minimum order amount is', ar: 'الحد الأدنى للطلب هو', ku: 'کێمتریین پارەیێ داخوازێ' },
  'error.minOrderWarning': { en: 'Please add more items to reach the minimum order amount.', ar: 'يرجى إضافة المزيد من العناصر للوصول إلى الحد الأدنى للطلب.', ku: 'تکایە تشتێن دی زێدە بکە بۆ گەهشتنا ب کێمتریین پارەیێ داخوازێ.' },
  'error.outOfStock': { en: 'Item is out of stock.', ar: 'نفست الكمية.', ku: 'بەرهەم ب دووماهیک هات.' },
  'error.wrongPassword': { en: 'Incorrect password. Please try again.', ar: 'كلمة مرور غير صحيحة. يرجى المحاولة مرة أخرى.', ku: 'پەیڤا نهێنی یا نەدرۆستە. تکایە جارەکا دی هەول بدە.' },
  'error.userNotFound': { en: 'No account found with this email.', ar: 'لم يتم العثور على حساب بهذا البريد.', ku: 'چ ئەکاونت لسەر ڤی ئیمەیلی نەهاتنە دیتن.' },
  'error.emailInUse': { en: 'This email is already registered.', ar: 'هذا البريد مسجل بالفعل.', ku: 'ئەڤ ئیمەیلە یێ تۆمارکرییە.' },
  'error.tooManyRequests': { en: 'Too many attempts. Please wait a few minutes.', ar: 'محاولات كثيرة جداً. يرجى الانتظار بضع دقائق.', ku: 'هەولێن زێدە. تکایە چەند خۆلەکان ل هیڤیێ بە.' },
  'error.networkFailed': { en: 'Network error. Check your connection.', ar: 'خطأ في الشبكة. تحقق من اتصالك.', ku: 'خەلەتیەک د تۆڕا ئینتەرنێتێ دا هەیە. پەیوەندیا خۆ پشکنین بکە.' },
  'error.invalidCredential': { en: 'Invalid email or password.', ar: 'البريد أو كلمة المرور غير صالحة.', ku: 'ئیمەیل یان پەیڤا نهێنی نەدرۆستە.' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dir: 'ltr' | 'rtl';
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = React.useState<Language>(() => {
    const saved = localStorage.getItem('app_lang');
    return (saved as Language) || 'en';
  });

  React.useEffect(() => {
    localStorage.setItem('app_lang', language);
    document.documentElement.dir = language === 'en' ? 'ltr' : 'rtl';
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string) => {
    return (translations as any)[key]?.[language] || key;
  };

  const dir = language === 'en' ? 'ltr' : 'rtl';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
