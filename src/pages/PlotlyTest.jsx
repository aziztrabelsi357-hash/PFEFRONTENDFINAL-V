import { useState, useEffect } from 'react';

const PlotlyTest = () => {
  const [status, setStatus] = useState('Loading...');
  const [PlotComponent, setPlotComponent] = useState(null);

  useEffect(() => {
    const testPlotly = async () => {
      try {
        console.log('Attempting to load react-plotly.js...');
        const plotlyModule = await import('react-plotly.js');
        console.log('Plotly module loaded:', plotlyModule);
        
        setPlotComponent(() => plotlyModule.default);
        setStatus('✅ Plotly loaded successfully!');
      } catch (error) {
        console.error('Plotly loading error:', error);
        setStatus(`❌ Error: ${error.message}`);
      }
    };

    testPlotly();
  }, []);

  const testData = [
    {
      x: ['Jan', 'Feb', 'Mar'],
      y: [1, 2, 3],
      type: 'scatter',
      mode: 'lines+markers',
      line: { color: '#16a34a' }
    }
  ];

  const testLayout = {
    title: 'Test Chart',
    autosize: true,
    margin: { l: 40, r: 20, t: 40, b: 40 }
  };

  return (
    <div className="p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Plotly Integration Test</h2>
      <div className="mb-4">
        <strong>Status:</strong> {status}
      </div>
      
      {PlotComponent ? (
        <div className="w-full h-64 border rounded">
          <PlotComponent
            data={testData}
            layout={testLayout}
            config={{ displayModeBar: false }}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      ) : (
        <div className="w-full h-64 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-2">📊</div>
            <div>Waiting for Plotly...</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlotlyTest;
