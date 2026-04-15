import React, { useEffect, useRef } from "react";

export const ForexHeatmap = () => {
  const widgetContainer = useRef(null);

  useEffect(() => {
    const script = document.createElement("script");

    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-forex-heat-map.js";
    script.async = true;

    script.innerHTML = JSON.stringify({ 
  "width": "100%",
  "height": "1072",
      currencies: [
        "EUR",
        "USD",
        "JPY",
        "GBP",
        "CHF",
        "AUD",
        "CAD",
        "NZD",
        "CNY",
        "TRY",
        "SEK",
        "NOK"
      ],
      isTransparent: true,
      colorTheme: "dark",
      locale: "en",
    });

    widgetContainer.current.appendChild(script);
  }, []);

  return (
    <div
      className="tradingview-widget-container"
      ref={widgetContainer}
      style={{ width: "100%", height: "500px" }}>
      {/* Loading fallback or spinner can go here if you wish */}
      
      
    </div>
  );
};

export default ForexHeatmap;
