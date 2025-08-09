'use client'
import { useState } from 'react'

export default function Stepper({ total, initial=1, onNext }:{ total:number; initial?:number; onNext?:(i:number)=>void }){
  const [i,setI] = useState(initial);
  const next = () => { if(i<total){ const n=i+1; setI(n); onNext?.(n);} };
  return (
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-full border flex items-center justify-center text-lg font-semibold">{String(i).padStart(2,'0')}</div>
      <button className="px-4 py-2 rounded-2xl border shadow-sm" onClick={next}>Continue</button>
      <div className="text-sm opacity-70">of {String(total).padStart(2,'0')}</div>
    </div>
  );
}
