declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export function gtagReportConversion(url?: string): false {
  const callback = () => {
    if (url !== undefined) {
      window.location.href = url;
    }
  };
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'conversion', {
      send_to: 'AW-18167915654/zaFFCNrlp64cEIbJkddD',
      value: 1.0,
      currency: 'USD',
      transaction_id: '',
      event_callback: callback,
    });
  }
  return false;
}
