'use client';

import App from '../../src/App';

type CatchAllPageProps = {
  params: { segments: string[] };
};

export default function CatchAllPage(_props: CatchAllPageProps) {
  return <App />;
}
