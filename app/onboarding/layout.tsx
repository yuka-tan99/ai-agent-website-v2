// app/onboarding/layout.tsx
export const dynamic = 'force-dynamic';
export const revalidate = 0;                // ✅ must be a number or false
export const fetchCache = 'force-no-store'; // extra safety

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}