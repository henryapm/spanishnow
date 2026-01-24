const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 relative transform transition-all max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label="Close modal"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                
                {title && (
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4 pr-8">
                        {title}
                    </h2>
                )}
                
                <div className="text-gray-600 dark:text-gray-300 mb-8 text-lg leading-relaxed">
                    {children}
                </div>
                
                <div className="flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-teal-600 text-white font-bold rounded-xl shadow-md hover:bg-teal-700 transition-transform transform hover:scale-105 active:scale-95"
                    >
                        Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;