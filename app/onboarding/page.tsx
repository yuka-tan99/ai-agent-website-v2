'use client';

import { Suspense } from "react";
import App from '../../src/App';

export const dynamic = 'force-dynamic';

export default function OnboardingPage() {
  return (
    <Suspense fallback={null}>
      <App initialView="onboarding" />
    </Suspense>
  );
}
