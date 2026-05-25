import React, { useState, useRef, useEffect } from 'react';
import { Gift, RefreshCw, Sparkles, User, Award, Check } from 'lucide-react';
import { Prize } from '../types';

interface UserWheelPageProps {
  prizes: Prize[];
  onLogout: () => void;
  onRecordWin: (prizeLabel: string, valueAssumed: number, customerName?: string, customerPhone?: string) => void;
  onAdminLoginClick?: () => void;
  userDisplayName?: string;
  userEmail?: string;
}

export default function UserWheelPage({ 
  prizes, 
  onLogout, 
  onRecordWin, 
  onAdminLoginClick,
  userDisplayName = 'عضو كونسيرج مميز',
  userEmail = ''
}: UserWheelPageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [showWinModal, setShowWinModal] = useState(false);
  const [winningPrize, setWinningPrize] = useState<Prize | null>(null);
  const [confetti, setConfetti] = useState<{ id: number; left: string; color: string; delay: string; duration: string; size: string }[]>([]);

  // Customer information collection states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerError, setCustomerError] = useState('');

  const [spinDuration, setSpinDuration] = useState(() => {
    const saved = localStorage.getItem('spin_duration');
    return saved ? parseFloat(saved) : 4.1;
  });

  useEffect(() => {
    const saved = localStorage.getItem('spin_duration');
    if (saved) {
      setSpinDuration(parseFloat(saved));
    }
  }, []);

  const activePrizes = prizes.filter(p => p.status === 'نشط');

  // Trigger drawing the wheel whenever list of active prizes changes
  useEffect(() => {
    drawWheel();
  }, [activePrizes]);

  const drawWheel = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = width / 2 - 10;
    const numSlices = activePrizes.length;

    if (numSlices === 0) {
      ctx.clearRect(0, 0, width, height);
      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#775a19';
      ctx.textAlign = 'center';
      ctx.fillText('لا توجد جوائز نشطة حالياً', centerX, centerY);
      return;
    }

    const sliceAngle = (2 * Math.PI) / numSlices;

    ctx.clearRect(0, 0, width, height);

    activePrizes.forEach((prize, i) => {
      const angle = i * sliceAngle;

      // Draw Slice Background
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, angle, angle + sliceAngle);
      ctx.fillStyle = prize.color;
      ctx.fill();

      // Outer golden border
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#c5a059';
      ctx.stroke();

      // Draw text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(angle + sliceAngle / 2);
      ctx.textAlign = 'right';
      
      // Use white for font color in spinner as requested by user
      ctx.fillStyle = '#ffffff';
      
      // Add subtle canvas text shadow of high-contrast readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 1.5;
      ctx.shadowOffsetY = 1.5;

      // Clean, premium, larger system sans-serif font for gorgeous, distinct Arabic letters
      ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
      const labelToShow = prize.label.length > 18 ? prize.label.substring(0, 16) + '..' : prize.label;
      ctx.fillText(labelToShow, radius - 30, 6);
      ctx.restore();
    });

    // Outer circle container border
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#775a19';
    ctx.stroke();
  };

  const handleSpinClick = () => {
    if (isSpinning || activePrizes.length === 0) return;
    setCustomerError('');
    setShowCustomerModal(true);
  };

  const handleConfirmCustomerDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || customerName.trim().length < 3) {
      setCustomerError('الرجاء إدخال الاسم الكامل للعميل (3 أحرف على الأقل).');
      return;
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 6) {
      setCustomerError('الرجاء إدخال رقم هاتف صحيح للعميل (6 أرقام على الأقل).');
      return;
    }
    setCustomerError('');
    setShowCustomerModal(false);
    spinTheWheel();
  };

  const spinTheWheel = () => {
    if (isSpinning || activePrizes.length === 0) return;

    setIsSpinning(true);

    // Calculate dynamic win based on probability distribution!
    // We filter out any prizes with 0% probability to ensure they are never selected.
    const spinPrizes = activePrizes.filter(p => p.probability > 0);
    const prizesToChooseFrom = spinPrizes.length > 0 ? spinPrizes : activePrizes;

    // Calculate sum of probabilities of the active selection pool
    const totalSpinProb = prizesToChooseFrom.reduce((sum, p) => sum + p.probability, 0);
    const randomValue = Math.random() * (totalSpinProb || 100);

    let accumulatedProb = 0;
    let selectedPrize = prizesToChooseFrom[0];

    for (let i = 0; i < prizesToChooseFrom.length; i++) {
      accumulatedProb += prizesToChooseFrom[i].probability;
      if (randomValue <= accumulatedProb) {
        selectedPrize = prizesToChooseFrom[i];
        break;
      }
    }

    // Now find the index of the selected prize in the full activePrizes list for rotation alignment
    let selectedPrizeIndex = activePrizes.findIndex(p => p.id === selectedPrize.id);
    if (selectedPrizeIndex === -1) selectedPrizeIndex = 0;

    const prize = activePrizes[selectedPrizeIndex];
    setWinningPrize(prize);

    // Find target angle in degrees for selected slice
    // Pointer is at the top (-90 degrees / 270 degrees in canvas space)
    // Canvas runs clockwise, so slice index starts at 0 (3 o'clock / 0 radians) and advances clockwise.
    const sliceDegWidth = 360 / activePrizes.length;
    // Calculate mid-angle for slice
    const sliceMidDeg = (selectedPrizeIndex * sliceDegWidth) + (sliceDegWidth / 2);
    // Determine degrees required to rotate so that sliceMidDeg points straight UP (270 degrees)
    // formula: targetRotationOffset = (270 - sliceMidDeg + 360) % 360
    const targetOffset = (270 - sliceMidDeg + 360) % 360;

    // Add 8 to 12 full rotations for a high-speed luxury feel
    const randomRotations = 360 * (6 + Math.floor(Math.random() * 4));
    const nextRotation = currentRotation + randomRotations + targetOffset - (currentRotation % 360);

    setCurrentRotation(nextRotation);

    // Dynamic rotation wait time based on saved admin preferences
    const actualDurationMs = Math.round(spinDuration * 1000);

    // Wait for transition completion
    setTimeout(() => {
      setIsSpinning(false);
      setShowWinModal(true);
      generateConfetti();
      
      // Assumed money value or constant value or points for stats tracking
      let assumedValue = prize.cost ?? 50;
      if (prize.cost === undefined || prize.cost === null || prize.cost === 0) {
        if (prize.label.includes('$')) {
          const val = parseInt(prize.label.replace(/[^0-9]/g, ''));
          if (!isNaN(val)) assumedValue = val;
        } else if (prize.label.toLowerCase().includes('rolex') || prize.label.includes('ساعة')) {
          assumedValue = 12000;
        } else if (prize.label.toLowerCase().includes('hotel') || prize.label.includes('إقامة')) {
          assumedValue = 1500;
        } else if (prize.label.toLowerCase().includes('vip') || prize.label.includes('ممر')) {
          assumedValue = 400;
        }
      }
      
      onRecordWin(prize.label, assumedValue, customerName, customerPhone);
    }, actualDurationMs);
  };

  const generateConfetti = () => {
    const list = Array.from({ length: 65 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}vw`,
      color: i % 2 === 0 ? '#c5a059' : '#ffdea5',
      delay: `${Math.random() * 2}s`,
      duration: `${Math.random() * 2.5 + 2}s`,
      size: `${Math.random() * 8 + 6}px`
    }));
    setConfetti(list);
  };

  const handleReset = () => {
    if (isSpinning) return;
    setCurrentRotation(0);
    setShowWinModal(false);
    setWinningPrize(null);
    setConfetti([]);
    setCustomerName('');
    setCustomerPhone('');
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#1a1c1c] flex flex-col items-center justify-between relative overflow-x-hidden pt-24 pb-12 select-none font-sans">
      
      {/* Top Luxury Navigation */}
      <nav className="bg-white/80 backdrop-blur-md fixed top-0 w-full z-45 h-20 shadow-[0px_4px_20px_rgba(197,160,89,0.08)] border-b border-[#F4EBD0]/50" dir="rtl">
        <div className="flex justify-between items-center w-full px-6 md:px-16 max-w-7xl mx-auto h-full">
          {/* Logo on the right for RTL layout */}
          <div className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#775a19] select-none">Gold Spin</div>

          {/* User Display: Display name of the user using my program in above */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden sm:flex flex-col text-right font-sans leading-tight">
              <span className="text-[10px] uppercase font-bold text-gray-400">الموظف الحالي</span>
              <span className="text-sm font-extrabold text-[#775a19]">{userDisplayName}</span>
            </div>
            
            <div className="h-8 w-px bg-gray-200 hidden sm:block" />

            <button
              onClick={handleReset}
              className="text-xs font-semibold text-[#4e4639] hover:text-[#775a19] transition-colors flex items-center gap-1.5 py-2 px-3 hover:bg-[#F4EBD0]/20 rounded-lg cursor-pointer"
              title="إعادة ضبط العجلة والبيانات"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden xs:inline">إعادة ضبط</span>
            </button>

            <button
              onClick={onLogout}
              className="w-10 h-10 rounded-full bg-[#f3f3f4] hover:bg-[#ebe2c8] flex items-center justify-center text-[#775a19] transition-colors cursor-pointer"
              title="تسجيل الخروج"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Decorative Blur Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[20%] left-[15%] w-96 h-96 bg-[#ffdea5]/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[20%] right-[15%] w-[450px] h-[450px] bg-[#ebe2c8]/25 rounded-full blur-3xl"></div>
      </div>

      {/* Confetti container */}
      {confetti.length > 0 && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confetti.map((c) => (
            <div
              key={c.id}
              className="absolute top-0 rounded-full animate-confettiFall"
              style={{
                left: c.left,
                backgroundColor: c.color,
                width: c.size,
                height: c.size,
                animationDelay: c.delay,
                animationDuration: c.duration,
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Interactive Wheel Section */}
      <div className="flex-grow w-full max-w-4xl px-4 flex flex-col items-center justify-center z-10 space-y-8">
        
        {/* The Wheel */}
        <div className="relative flex flex-col items-center">
          
          {/* The Golden Pointer Indicator */}
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-30 drop-shadow-md">
            <div 
              className="w-7 h-10 gold-gradient-soft border border-[#f3f3f4]/10 shadow-md"
              style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }}
            ></div>
          </div>

          {/* Sizing Wrapper */}
          <div className="relative w-[340px] h-[340px] xs:w-[410px] xs:h-[410px] sm:w-[480px] sm:h-[480px] md:w-[500px] md:h-[500px] rounded-full border-12 border-[#ffdea5]/25 p-2 wheel-shadow bg-[#ffffff] flex items-center justify-center transition-all">
            
            {/* Rotating Container */}
            <div
              id="wheel-container"
              style={{
                transform: `rotate(${currentRotation}deg)`,
                transition: isSpinning ? `transform ${spinDuration}s cubic-bezier(0.15, 0, 0.1, 1)` : 'none',
              }}
              className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#775a19]"
            >
              <canvas
                ref={canvasRef}
                width={500}
                height={500}
                className="w-full h-full block"
              />
            </div>

            {/* Center Action Spin Button */}
            <button
              onClick={handleSpinClick}
              disabled={isSpinning || activePrizes.length === 0}
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-[#775a19] via-[#a3803b] to-[#d4af37] border-4 border-amber-50 text-white flex flex-col items-center justify-center z-20 shadow-[0_0_30px_rgba(119,90,25,0.45)] transition-all active:scale-95 group cursor-pointer ${
                isSpinning ? 'opacity-90 scale-95 pointer-events-none' : 'hover:scale-[1.06] hover:shadow-[0_0_40px_rgba(212,175,55,0.7)]'
              }`}
              title="اضغط للسحب"
            >
              {!isSpinning && (
                <div className="absolute -inset-2 rounded-full border-2 border-[#d4af37]/45 animate-ping pointer-events-none" />
              )}
              <Gift className={`w-10 h-10 text-amber-100 ${!isSpinning ? 'animate-bounce' : 'animate-pulse'}`} />
            </button>

          </div>

        </div>

      </div>

      {/* Win Modal Dialog */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm transition-opacity duration-500 p-4 ${
          showWinModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div 
          className={`bg-white p-8 md:p-10 rounded-2xl shadow-2xl max-w-md w-full text-center border-2 border-[#ffdea5] transform transition-all duration-500 ${
            showWinModal ? 'scale-100 translate-y-0' : 'scale-90 translate-y-12'
          }`}
        >
          <div className="w-20 h-20 gold-gradient rounded-full flex items-center justify-center mx-auto mb-6 shadow-md shadow-[#775a19]/20 relative">
            <Gift className="w-10 h-10 text-white animate-bounce" />
            <div className="absolute inset-0 rounded-full border border-white/50 animate-ping opacity-35" />
          </div>

          <h2 className="font-serif text-2xl text-[#775a19] font-bold mb-2">تهانينا! لقد فزت بـ</h2>
          
          <div className="font-serif text-3xl font-extrabold text-[#1a1c1c] my-4 tracking-wide border-y border-[#F4EBD0]/80 py-3 bg-[#fbfbf9]">
            {winningPrize?.label}
          </div>

          <p className="font-sans text-sm text-[#4e4639] leading-relaxed mb-8">
            تم تسجيل هذه الجائزة الحصرية وحفظها بنجاح ضمن حسابك الخاص في قاعدة كونسيرج LuxeSpin.
          </p>

          <button
            onClick={() => setShowWinModal(false)}
            className="w-full py-3.5 gold-gradient text-white font-bold rounded-lg hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 btn-hover-effect"
          >
            <Check className="w-5 h-5" />
            <span>تأكيد واستلام الجائزة</span>
          </button>
        </div>
      </div>

      {/* Customer Information Collection Modal */}
      <div 
        className={`fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-xs transition-opacity duration-300 p-4 ${
          showCustomerModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        dir="rtl"
      >
        <div 
          className={`bg-white p-6 sm:p-8 rounded-2xl shadow-2xl max-w-md w-full text-right border border-[#ffdea5]/50 transform transition-all duration-300 ${
            showCustomerModal ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
          }`}
        >
          <div className="flex justify-between items-center border-b border-[#F4EBD0]/70 pb-3 mb-5">
            <h3 className="font-serif text-lg font-bold text-[#775a19] flex items-center gap-2">
              <User className="w-5 h-5 text-[#c5a059]" />
              <span>تسجيل بيانات العميل للتدوير</span>
            </h3>
            <button 
              type="button"
              onClick={() => {
                if (!isSpinning) {
                  setShowCustomerModal(false);
                  setCustomerError('');
                }
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer text-lg font-bold"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleConfirmCustomerDetails} className="space-y-4">
            <div className="bg-[#775a19]/5 border border-[#c5a059]/20 p-3.5 rounded-xl text-xs text-[#775a19] font-medium leading-relaxed mb-4">
              ✨ يرجى إدخال اسم ورقم هاتف العميل لتتمكن من تدوير عجلة الجوائز. سيتم ربط الجائزة ببياناته وتوثيقها في لوحة التحكم تلقائياً.
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 text-right">اسم العميل ثنائياً على الأقل *</label>
              <input 
                type="text" 
                required
                placeholder="مثال: يوسف خالد"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-sm font-semibold p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#775a19]/30 focus:bg-white transition-all text-right"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5 text-right">رقم هاتف العميل *</label>
              <input 
                type="tel" 
                required
                placeholder="مثال: 05XXXXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-sm font-semibold p-3 border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#775a19]/30 focus:bg-white transition-all text-right"
              />
            </div>

            {customerError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-bold text-right" dir="rtl">
                ⚠️ {customerError}
              </div>
            )}

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3.5 gold-gradient text-white font-extrabold rounded-xl hover:shadow-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Gift className="w-5 h-5 text-[#ffdea5]" />
                <span>تأكيد البيانات وعمل السحب 🎰</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  );
}
