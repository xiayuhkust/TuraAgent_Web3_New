import { useState, useEffect } from 'react';

export default function BrowserCapabilityTest() {
  const [capabilities, setCapabilities] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkBrowserCapabilities = () => {
      const results: string[] = [];

      // Check basic browser APIs
      results.push(`Window API: ${typeof window !== 'undefined' ? '✓' : '✗'}`);
      results.push(`Navigator API: ${typeof navigator !== 'undefined' ? '✓' : '✗'}`);
      
      // Check MediaDevices API and its components
      if (navigator?.mediaDevices) {
        results.push('MediaDevices API: ✓');
        results.push(`getUserMedia: ${typeof navigator.mediaDevices.getUserMedia === 'function' ? '✓' : '✗'}`);
        results.push(`enumerateDevices: ${typeof navigator.mediaDevices.enumerateDevices === 'function' ? '✓' : '✗'}`);
      } else {
        results.push('MediaDevices API: ✗');
        setError('MediaDevices API not available. This could be due to:');
        results.push('- Non-secure context (requires HTTPS)');
        results.push('- Browser permissions not granted');
        results.push('- Browser compatibility issues');
      }

      // Check MediaRecorder API
      if (typeof window !== 'undefined') {
        results.push(`MediaRecorder API: ${typeof window.MediaRecorder !== 'undefined' ? '✓' : '✗'}`);
      }

      setCapabilities(results);
    };

    checkBrowserCapabilities();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Browser Capability Test</h1>
      
      <div className="space-y-2">
        <h2 className="text-lg font-semibold">API Availability:</h2>
        <div className="space-y-1 font-mono">
          {capabilities.map((capability, index) => (
            <p key={index}>{capability}</p>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg space-y-2">
          <p className="font-semibold">{error}</p>
        </div>
      )}
    </div>
  );
}
