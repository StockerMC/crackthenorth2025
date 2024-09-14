'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ConfirmPartnershipPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const partnershipId = searchParams.get('id');
  type Partnership = {
    company: { shop_name: string };
    short: { title: string };
    status: string;
  };

  const [partnership, setPartnership] = useState<Partnership | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (partnershipId) {
      fetch(`/api/partnerships/${partnershipId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
          } else {
            setPartnership(data);
          }
          setLoading(false);
        })
        .catch(() => {
          setError('Failed to fetch partnership details.');
          setLoading(false);
        });
    }
  }, [partnershipId]);

  const handleConfirm = async () => {
    if (!partnershipId) return;
    const res = await fetch(`/api/partnerships/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partnershipId }),
    });
    const data = await res.json();
    if (data.error) {
      setError(data.error);
    } else {
      router.push('/dashboard');
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!partnership) {
    return <div>No partnership found.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Confirm Partnership</h1>
      <div className="p-4 border rounded-lg">
        <p><strong>Company:</strong> {partnership.company.shop_name}</p>
        <p><strong>YouTube Short:</strong> {partnership.short.title}</p>
        <p><strong>Status:</strong> {partnership.status}</p>
        <Button onClick={handleConfirm} className="mt-4">
          Confirm Partnership
        </Button>
      </div>
    </div>
  );
}
