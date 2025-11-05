'use client';

import { Suspense } from "react";
import App from '../../src/App';

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <App initialView="dashboard" />
    </Suspense>
  );
}
