import React from 'react'
import { XTerm } from '@pablo-lion/xterm-react'
import getBanner from './logger.js'

export default function App() {
  const banner = getBanner()
  return (
    <div style={{ padding: 16 }}>
      <h1>Consumer App</h1>
      <p>{banner}</p>
      <XTerm className="terminal" options={{ rows: 5, cols: 40 }} />
    </div>
  )
}
