import React, { useState, useEffect, useCallback } from 'react';
import { Gift, Hourglass, ArrowLeft, X, Headphones } from 'lucide-react';
import { AccessRequest } from '../../types/types';
import { auth, db } from '../../services/firebase';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInAnonymously,
  type User,
} from 'firebase/auth';

type AuthErrorLike = { code?: string };
import { getDoc, doc } from 'firebase/firestore';

const GOOGLE_AUTH_REDIRECT_KEY = 'google_auth_redirect';

const POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/popup-closed-by-user',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
  'auth/internal-error',
]);

function isEmbeddedContext(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function getGoogleAuthErrorMessage(error: unknown): string {
  const code = (error as AuthErrorLike)?.code ?? '';
  switch (code) {
    case 'auth/unauthorized-domain':
      return 'النطاق الحالي غير مسموح في Firebase. أضف localhost والنطاق في Authentication → Settings → Authorized domains.';
    case 'auth/popup-blocked':
      return 'المتصفح حظر النافذة المنبثقة. جرّب مرة أخرى أو افتح التطبيق في تبويب مستقل (ليس داخل معاينة مدمجة).';
    case 'auth/network-request-failed':
      return 'فشل الاتصال بالشبكة. تحقق من الإنترنت وحاول مجدداً.';
    default:
      return 'فشل تسجيل الدخول عبر Google. جرّب تبويباً مستقلاً أو اسمح بملفات تعريف الارتباط للطرف الثالث.';
  }
}

interface AuthPageProps {
  onLoginSuccess: (role: 'admin' | 'user') => void;
  onRequestAccess: (request: Partial<AccessRequest>) => void;
  onBackToWheel?: () => void;
  accessRequests: AccessRequest[];
}

export default function AuthPage({ onLoginSuccess, onRequestAccess, onBackToWheel, accessRequests }: AuthPageProps) {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [googleAccountStatus, setGoogleAccountStatus] = useState<'idle' | 'pending' | 'approved' | 'rejected'>('idle');
  const [selectedGoogleEmail, setSelectedGoogleEmail] = useState('');
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [activeDialog, setActiveDialog] = useState<'support' | null>(null);
  const [iframeErrorOccurred, setIframeErrorOccurred] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState('');

  const processGoogleUser = useCallback(async (user: User) => {
    const email = user.email ? user.email.trim().toLowerCase() : '';
    const displayName = user.displayName || 'عضو جوجل';

    setSelectedGoogleEmail(email);
    setIsSubmitted(true);
    setAuthErrorMessage('');
    setIframeErrorOccurred(false);

    if (email === 'Sbeihmorad07@gmail.com') {
      setGoogleAccountStatus('approved');
      setTimeout(() => {
        onLoginSuccess('admin');
      }, 800);
      return;
    }

    const reqDoc = await getDoc(doc(db, 'accessRequests', email));
    if (reqDoc.exists()) {
      const reqData = reqDoc.data() as AccessRequest;
      if (reqData.status === 'مقبول') {
        setGoogleAccountStatus('approved');
        setTimeout(() => {
          onLoginSuccess('user');
        }, 800);
      } else if (reqData.status === 'مرفوض') {
        setGoogleAccountStatus('rejected');
      } else {
        setGoogleAccountStatus('pending');
      }
    } else {
      const nameParts = displayName.split(' ');
      onRequestAccess({
        firstName: nameParts[0] || 'عضو',
        lastName: nameParts[1] || 'جوجل',
        email,
        purpose: 'تسجيل دخول وتفعيل سريع عبر Google Sign-In وتخزين السجلات بـ Firebase',
        status: 'قيد الانتظار',
        position: 'عضو كبار شخصيات معتمد',
      });
      setGoogleAccountStatus('pending');
    }
  }, [onLoginSuccess, onRequestAccess]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!sessionStorage.getItem(GOOGLE_AUTH_REDIRECT_KEY)) {
        return;
      }
      try {
        const result = await getRedirectResult(auth);
        sessionStorage.removeItem(GOOGLE_AUTH_REDIRECT_KEY);
        if (cancelled || !result?.user) {
          return;
        }
        await processGoogleUser(result.user);
      } catch (error) {
        sessionStorage.removeItem(GOOGLE_AUTH_REDIRECT_KEY);
        if (!cancelled) {
          console.error('Firebase Google redirect login failed:', error);
          setAuthErrorMessage(getGoogleAuthErrorMessage(error));
          setIframeErrorOccurred(true);
          setIsSubmitted(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [processGoogleUser]);

  const handleDemoBypassSignInAdmin = async () => {
    try {
      setIsSubmitted(true);
      setIframeErrorOccurred(false);
      localStorage.setItem('bypass_email', 'Sbeihmorad07@gmail.com');
      localStorage.setItem('bypass_name', 'مسؤول النظام (معاينة)');
      
      await signInAnonymously(auth);
      setGoogleAccountStatus('approved');
      setTimeout(() => {
        onLoginSuccess('admin');
      }, 800);
    } catch (error) {
      console.error("Demo Admin login failed:", error);
      resetForm();
    }
  };

  const handleDemoBypassSignInUser = async () => {
    try {
      setIsSubmitted(true);
      setIframeErrorOccurred(false);
      localStorage.setItem('bypass_email', 'vip.guest@goldspin.vip');
      localStorage.setItem('bypass_name', 'عضو VIP (معاينة)');
      
      await signInAnonymously(auth);
      setGoogleAccountStatus('approved');
      setTimeout(() => {
        onLoginSuccess('user');
      }, 800);
    } catch (error) {
      console.error("Demo User login failed:", error);
      resetForm();
    }
  };

  const startGoogleRedirect = async (provider: GoogleAuthProvider) => {
    sessionStorage.setItem(GOOGLE_AUTH_REDIRECT_KEY, '1');
    await signInWithRedirect(auth, provider);
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    setIframeErrorOccurred(false);
    setAuthErrorMessage('');

    if (isEmbeddedContext()) {
      try {
        await startGoogleRedirect(provider);
      } catch (error) {
        sessionStorage.removeItem(GOOGLE_AUTH_REDIRECT_KEY);
        console.error('Firebase Google redirect login failed:', error);
        setAuthErrorMessage(getGoogleAuthErrorMessage(error));
        setIframeErrorOccurred(true);
      }
      return;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      await processGoogleUser(result.user);
    } catch (error) {
      const code = (error as AuthErrorLike)?.code ?? '';
      if (POPUP_FALLBACK_CODES.has(code)) {
        try {
          await startGoogleRedirect(provider);
          return;
        } catch (redirectError) {
          console.error('Firebase Google redirect fallback failed:', redirectError);
          setAuthErrorMessage(getGoogleAuthErrorMessage(redirectError));
          setIframeErrorOccurred(true);
          setIsSubmitted(false);
          return;
        }
      }
      console.error('Firebase Google Auth login failed:', error);
      setAuthErrorMessage(getGoogleAuthErrorMessage(error));
      setIframeErrorOccurred(true);
      setIsSubmitted(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!selectedGoogleEmail) return;
    try {
      const snap = await getDoc(doc(db, 'accessRequests', selectedGoogleEmail));
      if (snap.exists()) {
        const reqData = snap.data() as AccessRequest;
        if (reqData.status === 'مقبول') {
          setGoogleAccountStatus('approved');
          setTimeout(() => {
            onLoginSuccess('user');
          }, 800);
        } else if (reqData.status === 'مرفوض') {
          setGoogleAccountStatus('rejected');
        } else {
          setGoogleAccountStatus('pending');
        }
      }
    } catch (error) {
      console.error("Error checking access status:", error);
    }
  };

  const resetForm = () => {
    setIsSubmitted(false);
    setSelectedGoogleEmail('');
    setGoogleAccountStatus('idle');
    setShowAccountSelector(false);
    setIframeErrorOccurred(false);
    setAuthErrorMessage('');
    sessionStorage.removeItem(GOOGLE_AUTH_REDIRECT_KEY);
  };

  return (
    <div className="w-full flex items-center justify-center min-h-[60vh] sm:min-h-[75vh] px-3 sm:px-4 py-4 sm:py-8">
      
      {/* Centered Premium Luxury Login Card */}
      <div className="w-full max-w-md sm:max-w-lg bg-white luxury-shadow rounded-2xl border border-[#d1c5b4]/40 overflow-hidden flex flex-col p-5 sm:p-8 md:p-12 text-center relative justify-between transition-all duration-300">
        
        {/* Subtle royal background radial glowing spot */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(197,160,89,0.06)_0%,transparent_70%)] pointer-events-none"></div>

        {/* Centered Gift Logo & Brand Title */}
        <div className="flex flex-col items-center mb-6 sm:mb-8 select-none">
          <div className="mb-3 sm:mb-4 p-3 sm:p-4 rounded-full bg-gradient-to-b from-[#775a19]/15 to-transparent border border-[#775a19]/25 flex items-center justify-center">
            <Gift className="text-[#775a19] w-10 h-10 sm:w-12 sm:h-12 animate-bounce" style={{ animationDuration: '3.5s' }} />
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#775a19] font-extrabold tracking-wider">angel perfum</h1>
        </div>

        {/* Content Area */}
        <div className="flex-grow flex flex-col justify-center my-2 sm:my-4">
          {!isSubmitted ? (
            <div className="space-y-4 sm:space-y-5 animate-fadeIn text-right" dir="rtl">
              
              {/* Google Sign-In Button */}
              <div className="py-1">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="w-full py-3.5 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-[#775a19] via-[#91722e] to-[#c5a059] hover:from-[#c5a059] hover:to-[#775a19] border border-[#ffdea5]/40 text-white rounded-xl flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-[0.98] group font-sans text-sm sm:text-base font-extrabold focus:outline-none select-none"
                >
                  <span>تسجيل الدخول باستخدام Google</span>
                </button>
              </div>

              {iframeErrorOccurred && (
                <div className="p-3 bg-red-50 border border-red-200/75 rounded-lg text-xs text-red-800 leading-relaxed font-semibold">
                  🔴 {authErrorMessage || 'فشل تسجيل الدخول عبر Google. افتح http://localhost:3000 في تبويب مستقل (Chrome/Edge) وتأكد من تفعيل Google في Firebase Console.'}
                </div>
              )}

            </div>
          ) : (
            /* Success & Google Status screen */
            <div className="flex flex-col items-center justify-center p-1 sm:p-2 space-y-4 sm:space-y-6 animate-fadeIn">
              {googleAccountStatus === 'approved' ? (
                <>
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-green-50 border border-green-400 flex items-center justify-center mb-1 shadow-sm animate-pulse">
                    <span className="text-[#c5a059] text-2xl sm:text-3xl font-bold">✓</span>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl text-green-700 font-bold">تم تسجيل الدخول بنجاح</h3>
                  <p className="font-sans text-sm sm:text-base text-[#1a1c1c] font-semibold">جاري توجيهك حالياً لعجلة الجوائز الفخمة...</p>
                </>
              ) : googleAccountStatus === 'rejected' ? (
                <>
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-red-50 border border-red-400 flex items-center justify-center mb-1 shadow-sm">
                    <span className="text-red-500 text-2xl sm:text-3xl font-bold">✕</span>
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl text-red-700 font-bold">تم رفض طلب الدخول</h3>
                  <p className="font-sans text-xs sm:text-sm text-[#1a1c1c] font-semibold">الحساب: {selectedGoogleEmail}</p>
                  <p className="text-[11px] sm:text-xs text-[#4e4639] leading-relaxed max-w-xs opacity-90 mx-auto">
                    تم رفض هذا الطلب بواسطة المسؤول. يرجى التواصل مع إدارة angel perfum للحصول على الموافقة اليدوية وتحديث الصلاحية.
                  </p>
                  <button
                    onClick={resetForm}
                    className="mt-3 px-4 py-2 hover:bg-gray-100 text-[#775a19] border border-[#d1c5b4]/85 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 mx-auto transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>العودة لشاشة الدخول</span>
                  </button>
                </>
              ) : selectedGoogleEmail ? (
                <>
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#4285F4]/10 border border-[#4285F4] flex items-center justify-center mb-1 shadow-sm relative">
                    <Hourglass className="text-[#4285F4] w-7 h-7 sm:w-8 sm:h-8 animate-spin" style={{ animationDuration: '3s' }} />
                    <span className="absolute -top-1 -right-1 bg-[#4285F4] text-white px-1.5 py-0.5 rounded-full text-[8px] font-sans font-bold">جوجل</span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl md:text-2xl text-[#1a1c1c] font-bold">بانتظار موافقة مسؤول النظام</h3>
                  <p className="font-mono text-sm sm:text-base text-[#775a19] font-bold break-all">{selectedGoogleEmail}</p>

                  <div className="flex gap-2 w-full justify-center pt-2">
                    <button
                      onClick={handleCheckStatus}
                      className="px-4 py-2 sm:py-2.5 bg-[#775a19] text-white hover:bg-[#5e4612] rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm animate-pulse"
                    >
                      <span>🔄 فحص وإعادة محاولة</span>
                    </button>
                    <button
                      onClick={resetForm}
                      className="px-4 py-2 sm:py-2.5 hover:bg-gray-100 text-[#4e4639] border border-[#d1c5b4]/85 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>تسجيل خروج</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#ffdea5]/35 border border-[#c5a059] flex items-center justify-center mb-1 shadow-sm">
                    <Hourglass className="text-[#775a19] w-7 h-7 sm:w-8 sm:h-8 animate-spin" style={{ animationDuration: '4s' }} />
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl text-[#775a19] font-bold">تم إرسال الطلب</h3>
                  <p className="font-sans text-sm sm:text-base text-[#1a1c1c] font-medium">بانتظار موافقة المدير المباشر</p>
                  <p className="text-[11px] sm:text-xs text-[#4e4639] leading-relaxed max-w-xs opacity-90 mx-auto">
                    ستقوم إدارة الكونسيرج بمراجعة صلاحية الحساب بشكل فوري وتفعيلك تلقائياً لبدء تدوير العجلة.
                  </p>
                  <button
                    onClick={resetForm}
                    className="mt-3 px-4 py-2 hover:bg-gray-100 text-[#775a19] border border-[#d1c5b4]/85 hover:border-[#775a19]/80 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>العودة للرئيسية</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>



        {/* Footer Info */}
        <footer className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-[#e2e2e2]/40 flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#4e4639]/70 gap-2 select-none">
          <p className="font-sans">© 2026 angel perfum Concierge</p>
          <div className="flex gap-4">
            <button
              onClick={() => setActiveDialog('support')}
              className="hover:text-[#775a19] transition-all cursor-pointer outline-none font-semibold text-right"
            >
              الدعم والمساعدة
            </button>
          </div>
        </footer>

      </div>



      {/* Privacy and Support Detailed Dialog Box Overlay */}
      {activeDialog && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-[60] animate-fadeIn select-none">
          <div className="bg-white rounded-2xl w-full max-w-md border border-[#d1c5b4]/50 overflow-hidden shadow-2xl relative animate-slideUp text-right" dir="rtl">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-[#775a19]/5 to-transparent">
              <div className="flex items-center gap-2">
                <Headphones className="text-[#775a19] w-6 h-6" />
                <h3 className="text-lg font-bold text-[#1a1c1c] font-sans">
                  مركز الدعم والمساعدة الفاخرة
                </h3>
              </div>
              <button 
                onClick={() => setActiveDialog(null)}
                className="text-gray-400 hover:text-gray-600 focus:outline-[#775a19] transition-colors cursor-pointer p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto leading-relaxed text-sm text-gray-700 font-sans">
              
              <div className="space-y-3.5">
                <p className="font-extrabold text-[#775a19] text-base mb-1">👑 كونسيرج الدعم والخدمة لكبار الشخصيات</p>
                
                <div className="space-y-3.5">
                  <div className="bg-gradient-to-l from-[#775a19]/5 to-transparent p-4 rounded-lg border-r-4 border-[#775a19] space-y-2">
                    <b className="block text-sm">📞 اتصل بنا للدعم والمساعدة فوراً:</b> 
                    <p className="text-xs text-gray-600 leading-relaxed">
                      فريق الدعم الفني وخدمة العملاء يسعده الرد على جميع استفساراتكم ومساعدتكم مباشرة عبر الأرقام التالية:
                    </p>
                    <div className="flex flex-col gap-2.5 pt-2">
                      <a href="tel:0777744189" className="font-mono font-extrabold text-[#775a19] text-lg hover:underline block bg-amber-50/50 p-2 rounded-md border border-amber-100 text-center">
                        0777744189
                      </a>
                      <a href="tel:0780090698" className="font-mono font-extrabold text-[#775a19] text-lg hover:underline block bg-amber-50/50 p-2 rounded-md border border-amber-100 text-center">
                        0780090698
                      </a>
                    </div>
                  </div>
                  
                  <p className="bg-gray-50 p-2.5 rounded-lg border-r-4 border-[#775a19] text-xs leading-relaxed">
                    <b>⏰ أوقات العمل والردود:</b> تتوفر خدمة كبار الشخصيات على مدار الساعة طوال أيام الأسبوع لضمان معالجة فورية لحساباتكم وجوائزكم الاستثنائية.
                  </p>
                </div>
              </div>

            </div>

            {/* Bottom Actions Bar */}
            <div className="bg-gray-50 p-4 flex justify-end gap-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setActiveDialog(null)}
                className="px-4 py-2 bg-gradient-to-r from-[#775a19] to-[#c5a059] hover:from-[#c5a059] hover:to-[#775a19] text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-[0.97]"
              >
                إغلاق التفاصيل
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
