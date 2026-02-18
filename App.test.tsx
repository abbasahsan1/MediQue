import React from 'react';
import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Routes>
      <Route path="/" element={<div style={{ padding: '40px', fontSize: '24px' }}>Hello from App!</div>} />
      <Route path="*" element={<div style={{ padding: '40px', fontSize: '24px' }}>Not found</div>} />
    </Routes>
  );
}

export default App;
