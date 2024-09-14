'use client';

import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import PartnershipPrompt from '@/components/PartnershipPrompt';
import { Suspense } from 'react';

function PartnershipPromptContent() {
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const partnershipId = searchParams.get('id');

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-red-600 mb-2">Authentication Required</h1>
          <p className="text-gray-600">Please sign in to view this partnership invitation.</p>
        </div>
      </div>
    );
  }

  if (!partnershipId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">❓</div>
          <h1 className="text-2xl font-bold text-gray-600 mb-2">No Partnership ID</h1>
          <p className="text-gray-600">No partnership ID was provided in the URL.</p>
        </div>
      </div>
    );
  }

  return <PartnershipPrompt partnershipId={partnershipId} />;
}

export default function PartnershipPromptPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading partnership...</p>
        </div>
      </div>
    }>
      <PartnershipPromptContent />
    </Suspense>
  );
}