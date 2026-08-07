import React from 'react';

class ErrorBoundary extends React.Component {
	constructor(props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error) {
		return { hasError: true, error };
	}

	componentDidCatch(error, errorInfo) {
		console.error("ErrorBoundary caught an error:", error, errorInfo);
	}

	handleFixApp = async () => {
		try {
			// 1. Clear local storage
			localStorage.clear();

			// 2. Unregister any service workers
			if ('serviceWorker' in navigator) {
				const registrations = await navigator.serviceWorker.getRegistrations();
				for (const registration of registrations) {
					await registration.unregister();
				}
			}

			// 3. Reload the page
			window.location.reload();
		} catch (e) {
			console.error("Failed to perform recovery actions:", e);
			// Fallback reload anyway
			window.location.reload();
		}
	};

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex flex-col items-center justify-center w-full max-w-md mx-auto p-4 md:p-6 font-sans">
					<div className="text-center mb-8">
						<h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white tracking-tight">
							The Spanish <span className="text-teal-600 dark:text-teal-400">Suite</span>
						</h1>
					</div>

					<div className="w-full bg-white dark:bg-gray-800 rounded-2xl p-6 md:p-8 shadow-xl border border-gray-200 dark:border-gray-700 text-center">
						<div className="mb-6">
							<span className="inline-block p-3 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4">
								<svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
							</span>
							<h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">¡Lo sentimos! (Oops, sorry!)</h3>
							<p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
								Something went wrong and the application encountered a temporary issue. Don't worry, your progress is safe.
							</p>
						</div>

						<button
							onClick={this.handleFixApp}
							className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-semibold rounded-xl shadow-lg transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
						>
							Click here to fix the app
						</button>

						<p className="text-xs text-gray-400 dark:text-gray-500 mt-4 leading-normal">
							This resets the local cache, unregisters background scripts, and reloads the app.
						</p>

						{this.state.error && (
							<details className="mt-6 text-left border-t border-gray-200 dark:border-gray-700 pt-4">
								<summary className="text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none font-medium hover:text-gray-700 dark:hover:text-gray-200">
									Technical Details
								</summary>
								<div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800 text-[10px] font-mono text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap max-h-32">
									{this.state.error.toString()}
								</div>
							</details>
						)}
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}

export default ErrorBoundary;
