import mixpanel from "mixpanel-browser";

const isProd = import.meta.env.PROD;

// Initialize Mixpanel with the provided project token
mixpanel.init("b7b27a20cbbcc087cdcc6656aa7ea472", {
  debug: !isProd,
  track_pageview: true,
  persistence: "localStorage",
  ignore_dnt: true, // Bypass DNT settings in browsers like Safari to ensure local testing works
  api_transport: "XHR", // Force standard XHR requests so Capacitor's native bridge intercepts and bypasses webview CORS/tracking blocks
  cross_subdomain_cookie: false, // Prevent cross-subdomain cookie issues under custom protocols like capacitor://
});

export { mixpanel };


