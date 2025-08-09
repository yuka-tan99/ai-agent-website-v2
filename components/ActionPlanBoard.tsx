'use client'
import PlanCard, { Block } from '@/components/PlanCard'
import Stepper from '@/components/Stepper'

export default function ActionPlanBoard({ stepTitle, blocks, stepCount }:{ stepTitle:string; blocks:Block[]; stepCount:number }){
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{stepTitle}</h2>
        <Stepper total={stepCount} onNext={()=>{/* TODO: call api to advance */}} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {blocks.map((b,i)=> <PlanCard key={i} block={b}/>) }
      </div>
    </div>
  );
}
