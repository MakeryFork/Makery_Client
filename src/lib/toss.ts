declare global {
  interface Window {
    TossPayments: (clientKey: string) => TossPaymentsInstance;
  }
}

interface TossPaymentsInstance {
  requestPayment: (
    method: string,
    options: {
      amount: number;
      orderId: string;
      orderName: string;
      successUrl: string;
      failUrl: string;
    }
  ) => Promise<void>;
}

function loadTossScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="tosspayments"]')) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.tosspayments.com/v1/payment";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Toss Payments"));
    document.head.appendChild(script);
  });
}

export async function requestTossPayment(options: {
  amount: number;
  orderId: string;
  orderName: string;
}) {
  await loadTossScript();
  const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY as string;
  const toss = window.TossPayments(clientKey);
  await toss.requestPayment("카드", {
    ...options,
    successUrl: `${window.location.origin}/payment/success`,
    failUrl: `${window.location.origin}/payment/fail`,
  });
}
