import React, { useEffect, useRef, useState } from "react";
import { getBrowserInfo } from "@/utils/browserCompat";

const TradingView = () => {
  const containerRef = useRef(null);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const browserInfo = getBrowserInfo();

  useEffect(() => {
    const loadWidget = async () => {
      try {
        const script = document.createElement("script");

        script.src =
          "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;

        // Add error handling for Safari
        if (browserInfo.isSafari) {
          script.onerror = () => {
            console.error('TradingView widget failed to load on Safari');
            setLoadError('Widget failed to load. Please refresh the page.');
          };
        }

        script.innerHTML = JSON.stringify({
          width: "100%",
          height: 1072,
          symbol: "NASDAQ:AAPL",
          interval: "D",
          timezone: "exchange",
          theme: "dark",
          backgroundColor: "#0A1114",
          style: "1",
          withdateranges: true,
          hide_side_toolbar: false,
          allow_symbol_change: true,
          save_image: false,
          studies: [
            "ROC@tv-basicstudies",
            "StochasticRSI@tv-basicstudies",
            "MASimple@tv-basicstudies",
          ],
          locale: "en",
          show_popup_button: true,
          popup_width: "1000",
          popup_height: "650",
          calendar: false,
          support_host: "https://www.tradingview.com",
        });

        if (containerRef.current) {
          containerRef.current.appendChild(script);
          
          // Set a timeout to detect if widget loaded successfully
          setTimeout(() => {
            if (!loadError) {
              setWidgetLoaded(true);
            }
          }, 5000);
        }
      } catch (error) {
        console.error('Error loading TradingView widget:', error);
        setLoadError('Failed to load trading widget');
      }
    };

    loadWidget();
  }, [browserInfo.isSafari, loadError]);

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64 bg-[#0A1114] rounded-lg">
        <div className="text-center">
          <p className="text-red-400 mb-4">{loadError}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="tradingview-widget-container"
      ref={containerRef}
      style={{ width: "100%", height: "1072px" }}
    >
      {!widgetLoaded && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading TradingView widget...</p>
          </div>
        </div>
      )}
      <div
        className="tradingview-widget-container__widget"
        style={{ width: "100%", height: "100%" }}
      />
      <div className="tradingview-widget-copyright">
        <a
          href="https://www.tradingview.com/"
          rel="noopener nofollow"
          target="_blank"
        >
          <span className="blue-text">Track all markets on TradingView</span>
        </a>
      </div>
    </div>
  );
};

export default TradingView;
