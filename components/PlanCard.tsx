'use client'
import { motion } from 'framer-motion'

type Metric = {type:'metric'; title:string; value:string};
type Task = {type:'task'; title:string; items:string[]};
type Prompt = {type:'prompt'; title:string; items:string[]};
type Example = {type:'example'; title:string; items:string[]};
type Timebox = {type:'timebox'; title:string; value:string};
export type Block = Metric|Task|Prompt|Example|Timebox;

export default function PlanCard({ block }:{ block:Block }){
  return (
    <motion.div layout initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} className="rounded-2xl border p-4 shadow-sm bg-white">
      <div className="font-semibold mb-2">{(block as any).title}</div>
      {'value' in block && <div className="text-2xl">{(block as any).value}</div>}
      {'items' in block && (
        <ul className="grid gap-2">
          {(block as any).items.map((t:string, idx:number)=> (
            <li key={idx} className="flex items-start gap-2">
              <span className="mt-1 inline-block w-3 h-3 rounded-full border"></span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
