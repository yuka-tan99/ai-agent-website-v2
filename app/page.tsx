'use client';

import App from "../src/App";

export const dynamic = 'force-dynamic';

export default function HomePage() {
  return <App initialView="landing" />;
}
