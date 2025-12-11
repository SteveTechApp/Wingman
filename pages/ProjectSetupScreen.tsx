
// DEPRECATED: This component is obsolete and has been fully replaced by the more advanced `pages/GuidedProjectWizard.tsx`.
// This file is kept to prevent breaking imports but should not be used in new development.

import React from 'react';
import { Link } from 'react-router-dom';

const ObsoleteProjectSetupScreen: React.FC = () => {
    return (
        <div className="text-center p-8">
            <h1 className="text-2xl font-bold text-destructive">This Page is Obsolete</h1>
            <p className="text-text-secondary mt-2">
                This manual project setup has been replaced by the new Guided Project Wizard.
            </p>
            <Link to="/setup" className="mt-6 btn btn-primary">
                Go to the New Wizard
            </Link>
        </div>
    );
};

export default ObsoleteProjectSetupScreen;
