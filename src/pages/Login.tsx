export default function Login() {
  const login = (provider: string) => {
    window.location.href = `http://localhost:3000/api/v1/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <img src="/logomakery.png" alt="Makery" className="h-12 mb-4 object-contain" />
      <h1 className="font-paperlogy font-bold text-2xl text-black mb-2">Sign in to Makery</h1>
      <p className="font-paperlogy text-sm text-[#9E9E9E] mb-10">
        Discover and purchase creators' works.
      </p>

      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={() => login("instagram")}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl text-white font-paperlogy font-semibold bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] hover:opacity-90 transition-opacity"
        >
          <img src="/insta.png" alt="Instagram" className="w-5 h-5 object-contain" />
          Continue with Instagram
        </button>

        <button
          onClick={() => login("google")}
          className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-xl font-paperlogy font-semibold bg-white border-2 border-[#D8D8D8] text-black hover:bg-[#F4F5F7] transition-colors"
        >
          <img src="/google.png" alt="Google" className="w-5 h-5 object-contain" />
          Continue with Google
        </button>
      </div>
    </div>
  );
}
