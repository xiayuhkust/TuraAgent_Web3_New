import { useState, useEffect } from 'react';

export default function MinimalMicTest() {
  const [status, setStatus] = useState<string>('Checking MediaDevices API...');
  const [details, setDetails] = useState<string[]>([]);

  useEffect(() => {
    // Check environment capabilities
    const checkMediaDevices = () => {
      const results: string[] = [];

      // Check if navigator exists
      if (!navigator) {
        setStatus('Error: navigator object not available');
        return;
      }
      results.push('✓ navigator object available');

      // Check if mediaDevices exists
      if (!navigator.mediaDevices) {
        results.push('✗ navigator.mediaDevices not available');
        setStatus('Error: MediaDevices API not supported');
        setDetails(results);
        return;
      }
      results.push('✓ navigator.mediaDevices available');

      // Check if getUserMedia exists
      if (!navigator.mediaDevices.getUserMedia) {
        results.push('✗ getUserMedia not available');
        setStatus('Error: getUserMedia not supported');
        setDetails(results);
        return;
      }
      results.push('✓ getUserMedia available');

      // Check if MediaRecorder exists
      if (!window.MediaRecorder) {
        results.push('✗ MediaRecorder not available');
        setStatus('Error: MediaRecorder not supported');
        setDetails(results);
        return;
      }
      results.push('✓ MediaRecorder available');

      // Check MIME type support
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/wav'
      ];
      const supportedTypes = mimeTypes.filter(type => MediaRecorder.isTypeSupported(type));
      results.push(`Supported MIME types: ${supportedTypes.join(', ') || 'none'}`);

      setStatus('Environment check complete');
      setDetails(results);
    };

    checkMediaDevices();
  }, []);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Minimal MediaDevices Test</h1>
      <div className="space-y-2">
        <p className="font-semibold">Status: <span className="font-mono">{status}</span></p>
        <div className="space-y-1">
          {details.map((detail, index) => (
            <p key={index} className="font-mono text-sm">{detail}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
