import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import SubscriptionPage from './pages/SubscriptionPage.jsx';
import TrialPage from './pages/TrialPage.jsx';
import PayPage from './pages/PayPage.jsx';
import ReceiptPage from './pages/ReceiptPage.jsx';
import { I18nProvider } from './i18n/index.jsx';
import { AccountProvider } from './account/AccountProvider.jsx';
import { matchRoute, navigate, usePath } from './lib/router.jsx';
import './index.css';

function Root() {
  const route = matchRoute(usePath());

  useEffect(() => {
    if (route.name === 'notfound') navigate('/', { replace: true });
  }, [route.name]);

  switch (route.name) {
    case 'subscription':
      return <SubscriptionPage />;
    case 'trial':
      return <TrialPage key={route.token} token={route.token} />;
    case 'pay':
      return <PayPage key={route.token} token={route.token} />;
    case 'receipt':
      return <ReceiptPage key={route.token} token={route.token} />;
    default:
      return <App />;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <AccountProvider>
        <Root />
      </AccountProvider>
    </I18nProvider>
  </React.StrictMode>,
);
