import React from 'react';
import { useUserContext } from '../../context/UserContext';

const WelcomeHeader: React.FC = () => {
    const { userProfile } = useUserContext();

    return (
        <div className="text-center">
            <h1 className="text-4xl font-extrabold text-text-primary mb-2">
                Welcome back, {userProfile.name}!
            </h1>
            <p className="text-lg text-text-secondary">
                Ready to design the next generation of AV systems?
            </p>
        </div>
    );
};

export default WelcomeHeader;