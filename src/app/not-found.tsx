export default function NotFound() {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black text-yellow-400">
        <h1 className="text-4xl font-bold mb-4">404 — Not found</h1>
        <a href="/login" className="text-cyan-400 underline">Back to Login</a>
      </div>
    );
  }
  