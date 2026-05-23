import React, { useEffect, useState } from 'react';
import { useDecksStore } from '../store';
import { FaFire } from 'react-icons/fa'; // Using react-icons for the fire icon

const StreakNotification = () => {
    const showNotification = useDecksStore(state => state.showStreakConfetti);
    const hideNotification = useDecksStore(state => state.hideStreakConfetti);
    const streak = useDecksStore(state => state.streak);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (showNotification) {
            setIsVisible(true); // Make it visible to trigger the animation

            // Timer to start the fade-out animation
            const fadeOutTimer = setTimeout(() => {
                setIsVisible(false);
            }, 4000); // Stay on screen for 4 seconds

            // Timer to fully hide and reset the state after the animation
            const hideTimer = setTimeout(() => {
                hideNotification();
            }, 4500); // 4s display + 0.5s fade-out

            return () => {
                clearTimeout(fadeOutTimer);
                clearTimeout(hideTimer);
            };
        }
    }, [showNotification, hideNotification]);

    if (!showNotification) {
        return null;
    }

    return (
        <div
            style={{
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: isVisible ? 'translate(-50%, 0)' : 'translate(-50%, -150%)',
                transition: 'transform 0.5s ease-in-out',
                zIndex: 2000,
            }}
            className="flex items-center gap-4 bg-white dark:bg-gray-800 border-2 border-orange-400 rounded-xl shadow-2xl p-4"
        >
            <FaFire className="text-5xl text-orange-500 animate-pulse" />
            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Streak Extended!</h3>
                <p className="text-gray-700 dark:text-gray-300">
                    You're on a <span className="font-bold text-orange-500">{streak}-day</span> streak! Keep it up!
                </p>
            </div>
        </div>
    );
};

export default StreakNotification;
