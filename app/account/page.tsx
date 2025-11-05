'use client';

import { Suspense } from "react";
import App from '../../src/App';

export const dynamic = 'force-dynamic';

export default function AccountPage() {
  return (
    <Suspense fallback={null}>
      <App initialView="account" />
    </Suspense>
  );
}
