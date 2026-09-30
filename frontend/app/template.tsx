'use client'
 
import { motion } from 'motion/react'
import type { ReactNode } from 'react'

export default function Template({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 17 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex-1 flex flex-col w-full"
    >
      {children}
    </motion.div>
  )
}