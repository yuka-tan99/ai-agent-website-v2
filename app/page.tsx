'use client';

import { Suspense } from "react";
import App from "../src/App";

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <App initialView="landing" />
    </Suspense>
  );
}
