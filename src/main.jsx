import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// State Versioning & Proactive Service Worker Cleanup
const APP_VERSION = '1.0.1';
try {
	const storedVersion = localStorage.getItem('appVersion');
	if (storedVersion !== APP_VERSION) {
		localStorage.clear();
		localStorage.setItem('appVersion', APP_VERSION);
	}

	// Cleanup service workers
	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.getRegistrations().then((registrations) => {
			for (const registration of registrations) {
				registration.unregister();
			}
		});
	}
} catch (e) {
	console.error('Failed to run state version check/service worker cleanup:', e);
}

ReactDOM.createRoot(document.getElementById('root')).render(
	<React.StrictMode>
		<ErrorBoundary>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</ErrorBoundary>
	</React.StrictMode>,
)
