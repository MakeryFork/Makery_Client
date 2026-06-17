import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const called = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const paymentKey = params.get("paymentKey") ?? "";
    const orderId = params.get("orderId") ?? "";
    const amount = Number(params.get("amount") ?? 0);

    api
      .post("/purchases/confirm", { paymentKey, orderId, amount })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["purchases"] });
        setStatus("done");
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : "Payment confirmation failed.");
        setStatus("error");
      });
  }, [params]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 gap-6">
      {status === "loading" && (
        <>
          <div className="w-12 h-12 rounded-full border-4 border-[#FFCA1D] border-t-transparent animate-spin" />
          <p className="font-paperlogy text-[#757575]">Confirming payment...</p>
        </>
      )}
      {status === "done" && (
        <>
          <div className="w-16 h-16 rounded-full bg-[#FFCA1D]/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-[#FFCA1D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="font-paperlogy font-bold text-2xl text-black mb-1">Payment Complete!</h1>
            <p className="font-paperlogy text-sm text-[#9E9E9E]">Your purchase was successful.</p>
          </div>
          <button
            onClick={() => navigate("/source")}
            className="px-8 py-3 bg-[#FFCA1D] text-white font-paperlogy font-semibold rounded-xl hover:bg-[#e6b800] transition-colors"
          >
            View My Purchases
          </button>
        </>
      )}
      {status === "error" && (
        <>
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="font-paperlogy font-bold text-2xl text-black mb-1">Payment Failed</h1>
            <p className="font-paperlogy text-sm text-red-500">{errorMsg}</p>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-8 py-3 border-2 border-[#D8D8D8] text-[#757575] font-paperlogy font-semibold rounded-xl hover:bg-[#F4F5F7] transition-colors"
          >
            Back to Home
          </button>
        </>
      )}
    </div>
  );
}
