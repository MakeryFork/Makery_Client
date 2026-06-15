import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const Index = lazy(() => import("./pages/Index"));
const Explore = lazy(() => import("./pages/Explore"));
const Create = lazy(() => import("./pages/Create"));
const CreatePost = lazy(() => import("./pages/CreatePost"));
const CreateEditorMediaPicker = lazy(() => import("./pages/CreateEditorMediaPicker"));
const CreateEditorStudio = lazy(() => import("./pages/CreateEditorStudio"));
const Source = lazy(() => import("./pages/Source"));
const MyPage = lazy(() => import("./pages/MyPage"));
const Login = lazy(() => import("./pages/Login"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("./pages/PaymentFail"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60_000,
    },
  },
});

const Spinner = () => (
  <div className="fixed inset-0 bg-white flex items-center justify-center">
    <div className="w-10 h-10 rounded-full border-4 border-[#FFCA1D] border-t-transparent animate-spin" />
  </div>
);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Suspense fallback={<Spinner />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/create" element={<Create />} />
            <Route path="/create/post" element={<CreatePost />} />
            <Route path="/create/editor" element={<CreateEditorMediaPicker />} />
            <Route path="/create/editor/studio" element={<CreateEditorStudio />} />
            <Route path="/source" element={<Source />} />
            <Route path="/mypage" element={<MyPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/payment/success" element={<PaymentSuccess />} />
            <Route path="/payment/fail" element={<PaymentFail />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
