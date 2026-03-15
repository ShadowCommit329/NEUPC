'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailClient({ token, initialValid, user, verifyAction }) {
  const [status, setStatus] = useState(initialValid ? 'idle' : 'invalid');
  const [message, setMessage] = useState('');

  const handleVerify = async () => {
    setStatus('loading');
    const result = await verifyAction(token);
    if (result.ok) {
      setStatus('success');
      setMessage(result.message);
    } else {
      setStatus('error');
      setMessage(result.message);
    }
  };

  if (status === 'invalid') {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl text-center">
        <AlertCircle className="mx-auto mb-4 h-10 w-10 text-yellow-400" />
        <h1 className="mb-2 text-xl font-semibold text-white">Link Expired or Invalid</h1>
        <p className="mb-6 text-gray-300">This link may have already been used to verify an account, or the token is incorrect.</p>
        <Link href="/login" className="inline-block rounded-xl bg-blue-600 px-6 py-2 text-white transition hover:bg-blue-500">Go to Login</Link>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-6 shadow-xl text-center flex flex-col items-center">
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
        <h1 className="mb-2 text-2xl font-semibold text-white">Email Verified!</h1>
        <p className="mb-8 text-gray-300">{message || 'Your account is now fully verified.'}</p>
        <Link href="/login" className="rounded-xl bg-blue-600 px-8 py-3 font-medium text-white transition hover:bg-blue-500">
          Go to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-white/5 p-8 shadow-xl text-center flex flex-col items-center">
      {status === 'error' ? (
        <XCircle className="mx-auto mb-4 h-12 w-12 text-red-400" />
      ) : status === 'idle' ? (
        <CheckCircle2 className="mx-auto mb-4 h-12 w-12 text-blue-400" />
      ) : (
        <Loader2 className="mx-auto mb-4 h-12 w-12 text-blue-400 animate-spin" />
      )}
      
      <h1 className="text-2xl font-semibold text-white mb-2">
        {status === 'error' ? 'Verification Failed' 
          : status === 'idle' ? 'Ready to Verify' 
          : 'Verifying Account...'}
      </h1>
      
      <p className="text-gray-300 mb-8 max-w-md mx-auto">
        {status === 'error' 
          ? message 
          : status === 'idle'
          ? `Welcome, ${user?.full_name || 'User'}! Click the button below to verify your email and activate your account.`
          : `Please wait while we verify your email address.`}
      </p>

      {status === 'idle' && (
        <button
          onClick={handleVerify}
          className="rounded-xl bg-blue-600 px-8 py-3 font-medium text-white transition hover:bg-blue-500 flex items-center gap-2"
        >
          Verify My Email
        </button>
      )}
      
      {status === 'error' && (
        <Link href="/" className="inline-block rounded-xl border border-white/15 bg-white/5 px-6 py-2 text-gray-200 transition hover:bg-white/10">
          Go Home
        </Link>
      )}
    </div>
  );
}
