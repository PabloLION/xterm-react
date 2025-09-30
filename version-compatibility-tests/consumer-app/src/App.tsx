import React from 'react'
import { XTerm } from '@pablo-lion/xterm-react'

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <h1>Consumer App</h1>
      <XTerm className="terminal" options={{ rows: 5, cols: 40 }} />
    </div>
  )
}

