import React, { useEffect } from 'react';

interface PositionSizeCalculatorEmbedProps {
  className?: string;
}

export const PositionSizeCalculatorEmbed: React.FC<PositionSizeCalculatorEmbedProps> = ({ 
  className = "" 
}) => {
  useEffect(() => {
    // Load the remote widgets script if not already loaded
    const existingScript = document.querySelector('script[src="https://fxverify.com/Content/remote/remote-widgets.js"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = 'https://fxverify.com/Content/remote/remote-widgets.js';
      script.async = true;
      document.head.appendChild(script);
    }

    // Initialize the calculator when the script loads
    const initCalculator = () => {
      if (window.RemoteCalc) {
        window.RemoteCalc({
          "Url": "https://fxverify.com",
          "TopPaneStyle": "YmFja2dyb3VuZDogIzAwMDAwMDsKY29sb3I6IHdoaXRlOwpib3JkZXItYm90dG9tOiBub25lOw==",
          "BottomPaneStyle": "YmFja2dyb3VuZDogIzAwMDAwMDsKYm9yZGVyOiBub25lOwpjb2xvcjogd2hpdGU7",
          "ButtonStyle": "YmFja2dyb3VuZDogIzI0YjVmZjsgY29sb3I6IHdoaXRlOyBib3JkZXItcmFkaXVzOiAyMHB4Ow==",
          "TitleStyle": "dGV4dC1hbGlnbjogbGVmdDsgZm9udC1zaXplOiA0MHB4OyBmb250LXdlaWdodDogNTAwOw==",
          "TextboxStyle": "YmFja2dyb3VuZDogIzE1MTgxZDsgY29sb3I6ICM5MTk0YTE7IGJvcmRlcjogc29saWQgMHB4ICM5MTk0YTE7",
          "ContainerWidth": "665",
          "HighlightColor": "rgba(0,0,0,1.0)",
          "IsDisplayTitle": false,
          "IsShowChartLinks": false,
          "IsShowEmbedButton": false,
          "CompactType": "large",
          "Calculator": "position-size-calculator",
          "ContainerId": "position-size-calculator-868171"
        });
      }
    };

    // Check if script is already loaded
    if (window.RemoteCalc) {
      initCalculator();
    } else {
      // Wait for script to load
      const checkForScript = setInterval(() => {
        if (window.RemoteCalc) {
          clearInterval(checkForScript);
          initCalculator();
        }
      }, 100);

      // Cleanup interval after 10 seconds
      setTimeout(() => clearInterval(checkForScript), 10000);
    }

    return () => {
      // Cleanup function
      const container = document.getElementById('position-size-calculator-868171');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, []);

  return (
    <div className={`w-full ${className}`}>
      <div 
        id="position-size-calculator-868171"
        className="w-full max-w-4xl mx-auto overflow-hidden"
        style={{
          minHeight: '400px',
          width: '100%',
          maxWidth: '665px'
        }}
      />
    </div>
  );
};

// Extend the Window interface to include RemoteCalc
declare global {
  interface Window {
    RemoteCalc: (config: any) => void;
  }
}
