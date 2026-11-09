import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import AuthPage from './pages/AuthPage.jsx';
import VerifyPage from './pages/VerifyPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import SubscriptionPage from './pages/SubscriptionPage.jsx';
import TrialPage from './pages/TrialPage.jsx';
import PayPage from './pages/PayPage.jsx';
import ReceiptPage from './pages/ReceiptPage.jsx';
import { I18nProvider, useI18n } from './i18n/index.jsx';
import { AccountProvider, useAccount } from './account/AccountProvider.jsx';
import { matchRoute, navigate, usePath } from './lib/router.jsx';
import './index.css';

function Splash() {
  const { t } = useI18n();
  return <div className="flex min-h-dvh items-center justify-center text-slate-500">{t('common.loading')}</div>;
}

function Root() {
  const route = matchRoute(usePath());
  const account = useAccount();
  const loggedIn = account.status === 'user' || account.devUnlock;

  useEffect(() => {
    if (route.name === 'notfound') navigate('/', { replace: true });
    // The app itself requires a confirmed, logged-in account.
    if (route.name === 'home' && (account.status === 'guest' || (account.status === 'offline' && !account.devUnlock))) {
      navigate('/login', { replace: true });
    }
    // Already logged in: skip the login/sign-up pages.
    if ((route.name === 'login' || route.name === 'signup') && account.status === 'user') {
      navigate('/', { replace: true });
    }
  }, [route.name, account.status, account.devUnlock]);

  switch (route.name) {
    case 'login':
    case 'signup':
      return <AuthPage mode={route.name} />;
    case 'privacy':
      return <PrivacyPage />;
    case 'verify':
      return <VerifyPage key={route.token} token={route.token} />;
    case 'subscription':
      return <SubscriptionPage />;
    case 'trial':
      return <TrialPage key={route.token} token={route.token} />;
    case 'pay':
      return <PayPage key={route.token} token={route.token} />;
    case 'receipt':
      return <ReceiptPage key={route.token} token={route.token} />;
    default:
      return loggedIn ? <App key={account.user?.id || 'dev'} /> : <Splash />;
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
