'use client';

import { Suspense } from "react";
import App from '../../src/App';

export const dynamic = 'force-dynamic';

type CatchAllPageProps = {
  params: { segments: string[] };
};

export default function CatchAllPage(_props: CatchAllPageProps) {
  return (
    <Suspense fallback={null}>
      <App />
    </Suspense>
  );
}
