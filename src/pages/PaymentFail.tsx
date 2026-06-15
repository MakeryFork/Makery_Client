import { useNavigate, useSearchParams } from "react-router-dom";

export default function PaymentFail() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const code = params.get("code");
  const message = params.get("message") ?? "Payment was cancelled.";

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 gap-6">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <div className="text-center">
        <h1 className="font-paperlogy font-bold text-2xl text-black mb-1">Payment Failed</h1>
        <p className="font-paperlogy text-sm text-[#757575] mb-1">{message}</p>
        {code && <p className="font-paperlogy text-xs text-[#BDBDBD]">({code})</p>}
      </div>
      <button
        onClick={() => navigate(-1)}
        className="px-8 py-3 border-2 border-[#D8D8D8] text-[#757575] font-paperlogy font-semibold rounded-xl hover:bg-[#F4F5F7] transition-colors"
      >
        Go Back
      </button>
    </div>
  );
}
