import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Loader2, MapPin, Truck, CreditCard, CheckCircle2, ArrowLeft, Coins, Sparkles, ShoppingBag, Shield, Tag, Check, AlertCircle } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import PaymentModal, { type PaymentConfirmData } from '../../components/common/PaymentModal';

const PAYMENT_METHODS = ['Card', 'UPI', 'NetBanking', 'Cash at Gym'];

const MemberCheckout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [fulfilmentType, setFulfilmentType] = useState<'Gym Pickup' | 'Delivery'>('Gym Pickup');
  const [paymentMethod, setPaymentMethod] = useState<'Card' | 'UPI' | 'NetBanking' | 'Cash at Gym'>('Card');
  const [bankName, setBankName] = useState('State Bank of India (SBI)');
  const [delivery, setDelivery] = useState({ name: '', phone: '', address: '', city: '', state: '', pinCode: '' });
  const [placedOrder, setPlacedOrder] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalError, setPaymentModalError] = useState<string | null>(null);

  // Rewards & Points State
  const [pointsBalance, setPointsBalance] = useState<number>(0);
  const [rewardSettings, setRewardSettings] = useState<any>(null);
  const [usePoints, setUsePoints] = useState<boolean>(false);
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);

  // Reward Vouchers State
  const [voucherCodeInput, setVoucherCodeInput] = useState<string>('');
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [validatingVoucher, setValidatingVoucher] = useState<boolean>(false);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);

  const isPremium = user?.subscriptionPlan?.toLowerCase().includes('premium');
  const discountAmount = isPremium ? Math.round(subtotal * 0.3) : 0;

  // Conversion calculation
  const convUnit = rewardSettings?.pointsPerConversionUnit || 100;
  const rupeeUnit = rewardSettings?.currencyValuePerUnit || 50;
  const rate = rupeeUnit / convUnit;
  const maxPossibleDiscount = Math.max(0, subtotal - discountAmount);
  const rawPointsDiscount = usePoints ? Math.round(pointsToRedeem * rate) : 0;
  const pointsDiscount = Math.min(rawPointsDiscount, maxPossibleDiscount);

  // Voucher discount calculation
  const voucherDiscount = appliedVoucher
    ? Math.min(appliedVoucher.discount ?? 0, Math.max(0, subtotal - discountAmount - pointsDiscount))
    : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount - pointsDiscount - voucherDiscount);

  const availableStoreVouchers = myVouchers.filter((v: any) =>
    v.claimStatus === 'Approved' &&
    (v.reward?.category === 'Free Product / Gift' ||
     v.reward?.category === 'Discount Coupon' ||
     v.reward?.applicableService === 'Products' ||
     v.reward?.applicableService === 'All Services')
  );

  const load = async () => {
    try {
      setLoading(true);
      const [cartRes, walletRes, settingsRes, vouchersRes] = await Promise.all([
        api.get('/store/customer/cart'),
        api.get('/referrals/my-rewards-ledger').catch(() => ({ data: { pointsBalance: 0 } })),
        api.get('/referrals/settings').catch(() => ({ data: { settings: null } })),
        api.get('/rewards/my-vouchers').catch(() => ({ data: { vouchers: [] } }))
      ]);

      const cart = cartRes.data.cart || [];
      setItems(cart);
      setSubtotal(cartRes.data.subtotal || 0);
      if (cart.length && cart.every((row: any) => row.product?.fulfilmentType === 'Delivery')) {
        setFulfilmentType('Delivery');
      }

      const pts = walletRes.data?.pointsBalance || 0;
      setPointsBalance(pts);
      const st = settingsRes.data?.settings;
      setRewardSettings(st);

      if (vouchersRes.data?.vouchers) {
        setMyVouchers(vouchersRes.data.vouchers);
      }

      // Auto-set initial points if eligible
      if (st && st.enableStorePurchase && pts >= (st.minPointsForRedemption || 100)) {
        setPointsToRedeem(pts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleApplyVoucher = async (codeToApply?: string) => {
    const code = (codeToApply || voucherCodeInput).trim().toUpperCase();
    if (!code) {
      setVoucherError('Please enter or select a voucher code');
      return;
    }
    try {
      setValidatingVoucher(true);
      setVoucherError(null);
      const res = await api.post('/rewards/validate-voucher', {
        voucherCode: code,
        context: 'store',
        amount: Math.max(0, subtotal - discountAmount - pointsDiscount),
        items
      });
      if (res.data.success && res.data.valid) {
        setAppliedVoucher(res.data);
        setVoucherCodeInput(code);
      }
    } catch (err: any) {
      setVoucherError(err.response?.data?.message || 'Invalid or ineligible voucher code');
      setAppliedVoucher(null);
    } finally {
      setValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput('');
    setVoucherError(null);
  };

  const handleInitiatePayment = () => {
    if (items.length === 0) { alert('Your cart is empty.'); return; }
    if (fulfilmentType === 'Delivery') {
      for (const key of ['name', 'phone', 'address', 'city', 'state', 'pinCode'] as const) {
        if (!delivery[key].trim()) {
          alert(`Please fill in the delivery ${key === 'pinCode' ? 'pincode' : key}.`);
          return;
        }
      }
    }
    if (finalTotal === 0) {
      executeCheckout('Reward Voucher');
      return;
    }
    if (paymentMethod === 'Cash at Gym') {
      executeCheckout('Cash at Gym');
      return;
    }
    setPaymentModalError(null);
    setShowPaymentModal(true);
  };

  const executeCheckout = async (chosenMethod: string, chosenBank?: string) => {
    try {
      setPlacing(true);
      setPaymentModalError(null);
      const res = await api.post('/store/customer/checkout', {
        fulfilmentType,
        deliveryDetails: fulfilmentType === 'Delivery' ? delivery : undefined,
        paymentMethod: chosenMethod,
        bankName: chosenBank || (chosenMethod === 'NetBanking' ? bankName : undefined),
        discount: discountAmount,
        pointsToRedeem: usePoints ? pointsToRedeem : 0,
        voucherCode: appliedVoucher ? appliedVoucher.voucherCode : undefined
      });
      setShowPaymentModal(false);
      setPlacedOrder(res.data.order);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Checkout failed. Please try again.';
      setPaymentModalError(msg);
      if (!showPaymentModal) alert(msg);
    } finally {
      setPlacing(false);
    }
  };

  const handleModalConfirm = async (data: PaymentConfirmData) => {
    await executeCheckout(data.paymentMethod, data.bankName);
  };

  if (placedOrder) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-10">
        <CheckCircle2 className="mx-auto text-[#EA580C] mb-4" size={64} />
        <h1 className="text-3xl font-bold text-[#111827] mb-2">Order Placed!</h1>
        <p className="text-[#64748B] mb-2">
          Order <span className="font-bold text-[#111827]">{placedOrder.orderNumber}</span> is confirmed.
        </p>
        <p className="text-[#64748B] mb-6">
          Paid <span className="font-black text-[#EA580C]">₹{placedOrder.total}</span> via {placedOrder.paymentMethod}. Track it under My Orders.
        </p>
        <button onClick={() => navigate('/member/store/orders')} className="w-full py-3 bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-[#FFFFFF] font-bold font-bold rounded-xl shadow-lg shadow-orange-500/15 hover:opacity-90 transition-opacity">
          Go to My Orders
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-[#EA580C]" size={40} /></div>;
  }

  if (items.length === 0) {
    return (
      <div className="max-w-lg mx-auto mt-20 text-center bg-[#FFFFFF] border border-[#E2E8F0] rounded-3xl p-10">
        <h1 className="text-2xl font-bold text-[#111827] mb-2">Nothing to checkout</h1>
        <p className="text-[#64748B] mb-6">Your cart is empty.</p>
        <Link to="/member/store" className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-[#FFFFFF] font-bold font-bold rounded-xl shadow-lg shadow-orange-500/15">
          <ArrowLeft size={17} /> Browse Store
        </Link>
      </div>
    );
  }

  const inputCls = 'w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl px-3 py-2 text-sm text-[#111827] focus:border-[#FDBA74] outline-none';

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/member/store/cart')} className="flex items-center gap-1 text-sm font-bold text-[#9A3412] hover:underline mb-2">
          <ArrowLeft size={15} /> Back to cart
        </button>
        <h1 className="text-3xl font-bold text-[#111827] tracking-tight">Checkout</h1>
        <p className="text-[#64748B] mt-1">Confirm your order and payment.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Fulfilment */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6">
            <h3 className="text-lg font-bold text-[#111827] mb-4">How would you like to receive it?</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFulfilmentType('Gym Pickup')}
                className={`border-2 rounded-2xl p-4 text-left transition-colors ${fulfilmentType === 'Gym Pickup' ? 'border-[#FDBA74] bg-[#F8FAFC]' : 'border-[#E2E8F0] hover:border-[#FFEDD5]'}`}
              >
                <MapPin className="text-[#EA580C]" size={22} />
                <p className="font-bold text-[#111827] mt-2">Gym Pickup</p>
                <p className="text-xs text-[#64748B]">Collect from the gym at your convenience.</p>
              </button>
              <button
                onClick={() => setFulfilmentType('Delivery')}
                className={`border-2 rounded-2xl p-4 text-left transition-colors ${fulfilmentType === 'Delivery' ? 'border-[#FDBA74] bg-[#F8FAFC]' : 'border-[#E2E8F0] hover:border-[#FFEDD5]'}`}
              >
                <Truck className="text-[#EA580C]" size={22} />
                <p className="font-bold text-[#111827] mt-2">Delivery</p>
                <p className="text-xs text-[#64748B]">Get it delivered to your address.</p>
              </button>
            </div>

            {fulfilmentType === 'Delivery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="text-xs font-bold text-[#64748B] uppercase mb-1 block">Full Name *</label>
                  <input value={delivery.name} onChange={(e) => setDelivery({ ...delivery, name: e.target.value })} className={inputCls} placeholder="Receiver name" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] uppercase mb-1 block">Phone *</label>
                  <input value={delivery.phone} onChange={(e) => setDelivery({ ...delivery, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} maxLength={10} className={inputCls} placeholder="10-digit mobile" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#64748B] uppercase mb-1 block">Address *</label>
                  <input value={delivery.address} onChange={(e) => setDelivery({ ...delivery, address: e.target.value })} className={inputCls} placeholder="House no, street, area" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] uppercase mb-1 block">City *</label>
                  <input value={delivery.city} onChange={(e) => setDelivery({ ...delivery, city: e.target.value })} className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#64748B] uppercase mb-1 block">State *</label>
                  <input value={delivery.state} onChange={(e) => setDelivery({ ...delivery, state: e.target.value })} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-[#64748B] uppercase mb-1 block">Pincode *</label>
                  <input value={delivery.pinCode} onChange={(e) => setDelivery({ ...delivery, pinCode: e.target.value.replace(/\D/g, '').slice(0, 6) })} maxLength={6} className={`${inputCls} sm:max-w-48`} placeholder="6-digit pincode" />
                </div>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#111827] flex items-center gap-2">
                <CreditCard size={19} className="text-[#EA580C]" /> Payment Selection
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                <Shield size={14} className="text-[#EA580C]" />
                <span>256-bit TLS Encrypted</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#64748B] uppercase tracking-wider block mb-2">
                SELECT PAYMENT METHOD
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PAYMENT_METHODS.filter(m => fulfilmentType === 'Delivery' ? m !== 'Cash at Gym' : true).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method as any)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-[#C2410C] text-white border-[#FDBA74]'
                        : 'bg-[#F8FAFC] text-[#64748B] border-[#E2E8F0] hover:border-[#FDBA74]'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs text-[#64748B]">
              {paymentMethod === 'Card' && (
                <p>Securely enter your Card Number, Expiry, and CVV in the payment confirmation dialog.</p>
              )}
              {paymentMethod === 'UPI' && (
                <p>Pay via Google Pay, PhonePe, Paytm, BHIM, UPI ID or Scan QR in the payment dialog.</p>
              )}
              {paymentMethod === 'NetBanking' && (
                <p>Transfer directly via your online bank portal securely with instant confirmation.</p>
              )}
              {paymentMethod === 'Cash at Gym' && (
                <p>Pay directly at the gym reception desk when collecting your reserved products.</p>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="lg:sticky lg:top-24 self-start bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl p-6">
          <h3 className="text-lg font-bold text-[#111827] mb-4">Order Summary</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {items.map((row, idx) => {
              const p = row.product;
              const v = row.variant;
              const price = v ? (v.price - (v.discountPrice || 0)) : (p.sellingPrice - (p.discountPrice || 0));
              const attrs = v && v.attributes ? Object.values(v.attributes).join(' / ') : '';
              const baseAttrs = !v && p.attributes ? Object.values(p.attributes).slice(0, 2).join(' / ') : '';
              return (
                <div key={`${p._id}-${idx}`} className="flex justify-between items-center text-sm">
                  <span className="text-[#64748B]">{p.name} {attrs ? `(${attrs})` : baseAttrs ? `(${baseAttrs})` : ''} <span className="text-[#64748B]">× {row.quantity}</span></span>
                  <span className="font-bold text-[#111827]">₹{price * row.quantity}</span>
                </div>
              );
            })}
          </div>

          {/* Referral Points Redemption Box */}
          {rewardSettings?.enableStorePurchase && pointsBalance > 0 && (
            <div className="mt-4 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePoints}
                    onChange={(e) => setUsePoints(e.target.checked)}
                    className="w-4 h-4 rounded text-[#EA580C] bg-[#FFFFFF] border-[#E2E8F0] focus:ring-0 cursor-pointer"
                  />
                  <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                    <Coins size={14} className="text-[#EA580C]" />
                    Use Referral Points
                  </span>
                </label>
                <span className="text-[11px] font-bold text-[#EA580C]">
                  {pointsBalance} pts available
                </span>
              </div>

              {usePoints && (
                <div className="space-y-2 pt-2 border-t border-[#E2E8F0]/60">
                  <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                    <span>Points to Redeem:</span>
                    <span className="font-bold text-[#111827]">{pointsToRedeem} pts</span>
                  </div>
                  <input
                    type="range"
                    min={Math.min(rewardSettings.minPointsForRedemption || 100, pointsBalance)}
                    max={pointsBalance}
                    step={10}
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                    className="w-full h-1.5 bg-[#E2E8F0] rounded-lg appearance-none cursor-pointer accent-[#F97316]"
                  />
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#64748B]">
                      Rate: {convUnit} pts = ₹{rupeeUnit}
                    </span>
                    <span className="text-[#15803D] font-bold flex items-center gap-1">
                      <Sparkles size={11} /> Discount: ₹{pointsDiscount}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reward Voucher / Coupon Box */}
          <div className="mt-4 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#111827] flex items-center gap-1.5">
                <Tag size={14} className="text-[#EA580C]" />
                Reward Voucher / Coupon
              </span>
              {availableStoreVouchers.length > 0 && !appliedVoucher && (
                <span className="text-[11px] font-bold text-[#EA580C]">
                  {availableStoreVouchers.length} available
                </span>
              )}
            </div>

            {appliedVoucher ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check size={16} className="text-emerald-600 shrink-0" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-800 font-mono tracking-wider">{appliedVoucher.voucherCode}</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold uppercase">{appliedVoucher.category}</span>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-medium">{appliedVoucher.benefitDescription || appliedVoucher.rewardTitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  className="text-xs font-bold text-red-600 hover:text-red-700 cursor-pointer ml-2 hover:underline"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={voucherCodeInput}
                    onChange={(e) => {
                      setVoucherCodeInput(e.target.value.toUpperCase());
                      setVoucherError(null);
                    }}
                    placeholder="Enter Voucher (e.g. RWD-V48QPT)"
                    className="flex-1 bg-[#FFFFFF] border border-[#E2E8F0] rounded-xl px-3 py-2 text-xs font-mono uppercase text-[#111827] focus:border-[#EA580C] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyVoucher()}
                    disabled={validatingVoucher || !voucherCodeInput.trim()}
                    className="px-4 py-2 bg-[#EA580C] text-white text-xs font-bold rounded-xl hover:bg-[#C2410C] transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {validatingVoucher ? 'Checking...' : 'Apply'}
                  </button>
                </div>

                {voucherError && (
                  <p className="text-[11px] text-red-600 font-medium flex items-center gap-1">
                    <AlertCircle size={12} /> {voucherError}
                  </p>
                )}

                {/* Quick Selection for Claimed Vouchers */}
                {availableStoreVouchers.length > 0 && (
                  <div className="pt-2 border-t border-[#E2E8F0]/60 space-y-1.5">
                    <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Your Claimed Vouchers:</p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {availableStoreVouchers.map((v: any) => (
                        <button
                          key={v.claimId || v.voucherCode}
                          type="button"
                          onClick={() => handleApplyVoucher(v.voucherCode)}
                          className="px-2.5 py-1.5 bg-[#FFFFFF] border border-[#E2E8F0] hover:border-[#EA580C] rounded-lg text-left text-xs transition-colors cursor-pointer group flex items-center gap-1.5 shadow-2xs"
                        >
                          <span className="font-mono font-bold text-[#EA580C] group-hover:underline">{v.voucherCode}</span>
                          <span className="text-[11px] text-[#64748B] truncate max-w-[130px]">• {v.reward?.title || v.reward?.category}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-[#E2E8F0] pt-3 mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-[#64748B]">
              <span>Subtotal</span>
              <span className="font-bold text-[#111827]">₹{subtotal}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Premium Discount (30%)</span>
                <span className="font-bold">-₹{discountAmount}</span>
              </div>
            )}
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-[#15803D]">
                <span className="flex items-center gap-1"><Coins size={13} /> Referral Points Discount</span>
                <span className="font-bold">-₹{pointsDiscount}</span>
              </div>
            )}
            {voucherDiscount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span className="flex items-center gap-1"><Tag size={13} /> Reward Voucher ({appliedVoucher?.voucherCode})</span>
                <span className="font-bold">-₹{voucherDiscount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="font-bold text-[#111827]">Total</span>
              <span className="font-black text-[#EA580C] text-lg">₹{finalTotal}</span>
            </div>
          </div>
          <button
            onClick={handleInitiatePayment}
            disabled={placing}
            className="mt-6 w-full py-3 bg-gradient-to-r from-[#EA580C] to-[#C2410C] text-[#FFFFFF] font-bold rounded-xl shadow-lg shadow-orange-500/15 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            {placing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            {placing ? 'Placing Order...' : finalTotal === 0 ? 'Confirm Free Order with Voucher' : `Pay ₹${finalTotal} & Place Order`}
          </button>
        </div>
      </div>

      {/* Confirmation & Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        title="Confirm Store Order"
        subtitle="Complete secure payment for your gym store items"
        icon={<ShoppingBag size={24} />}
        summaryItems={[
          {
            label: 'Selected Items',
            value: `${items.length} item${items.length > 1 ? 's' : ''}`
          },
          {
            label: 'Fulfilment Method',
            value: fulfilmentType
          },
          {
            label: fulfilmentType === 'Delivery' ? 'Delivery Address' : 'Pickup Desk',
            value: fulfilmentType === 'Delivery' ? `${delivery.name || 'Member'}, ${delivery.city || 'Address'}` : 'Gym Front Desk'
          }
        ]}
        totalAmount={finalTotal}
        onConfirm={handleModalConfirm}
        loading={placing}
        error={paymentModalError}
      />
    </div>
  );
};

export default MemberCheckout;