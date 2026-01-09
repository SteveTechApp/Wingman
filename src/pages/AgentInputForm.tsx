import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGenerationContext } from '../context/GenerationContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

const AgentInputForm: React.FC = () => {
    const [documentText, setDocumentText] = useLocalStorage<string>('agent_intel_draft', '');
    const { handleAgentSubmit } = useGenerationContext();
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!documentText.trim()) return;
        handleAgentSubmit(documentText, navigate);
    };

    const loadSampleBrief = () => {
        setDocumentText(`
Client: Acme Corp
Project: Boardroom Tech Refresh

Hi team,

We need to upgrade our main boardroom. It seats 16 people. 
The main requirement is to improve our video conferencing experience. We use Zoom primarily.
We need a dual-display setup, probably 85-inch screens. 
It's crucial that people can easily share content from their laptops, both Apple and Windows devices. A simple, one-cable connection like USB-C would be ideal. Wireless sharing is a nice-to-have.
Audio is also a big problem right now; people on the far end can't hear everyone clearly. We need better microphones and speakers.
The room should be controlled by a simple touch panel on the table.
Our budget for this is around $25,000.
We want a high-end, reliable 'Gold' tier solution.

Thanks,
John Smith
        `);
    };

    return (
        <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 md:p-6 flex flex-col">
            <div className="max-w-5xl mx-auto w-full animate-fade-in-fast flex flex-col h-full pb-6">
                <div className="text-center mb-6 flex-shrink-0">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-accent mb-2 uppercase tracking-widest">Analyze Intel</h1>
                    <p className="text-lg text-text-secondary">Paste your client's RFQ, email, or field notes. The AI will parse the intel and build a project plan.</p>
                </div>

                {/* Main Form Container with Current Process Header */}
                <div className="bg-background-secondary border-2 border-border-color rounded-xl shadow-xl flex flex-col flex-grow min-h-0 overflow-hidden">
                    {/* Current Process Header */}
                    <div className="bg-accent text-white px-4 py-3 flex-shrink-0">
                        <h2 className="text-lg font-bold uppercase tracking-wide">
                            Current Process: Intel Analysis
                        </h2>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4 flex-grow min-h-0">
                        {/* Text Input Container */}
                        <div className="border border-border-color rounded-lg p-4 bg-background flex flex-col flex-grow min-h-0">
                            <label htmlFor="intel-input" className="block text-xs font-bold mb-2 text-text-secondary uppercase tracking-wide">
                                Client Brief / RFQ / Email Content
                            </label>
                            <textarea
                                id="intel-input"
                                value={documentText}
                                onChange={(e) => setDocumentText(e.target.value)}
                                placeholder="Paste client brief, RFQ, email, or field notes here..."
                                className="w-full flex-grow p-4 border border-border-color rounded-lg bg-input-bg focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent resize-none font-mono text-sm leading-relaxed"
                            />
                            <p className="text-xs text-text-secondary mt-2">
                                The AI will extract project requirements, room specifications, and budget information.
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 flex-shrink-0 pt-2">
                            <button type="button" onClick={loadSampleBrief} className="text-sm font-medium text-accent hover:underline uppercase">
                                Load Sample Intel
                            </button>
                            <button type="submit" className="btn btn-primary text-lg px-8 w-full sm:w-auto">
                                Analyze & Build Project
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AgentInputForm;