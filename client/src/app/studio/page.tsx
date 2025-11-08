'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function StudioPage() {
  const router = useRouter();

  // Redirect to text-to-image by default
  useEffect(() => {
    router.replace('/studio/text-to-image');
  }, [router]);

  return null;
}
