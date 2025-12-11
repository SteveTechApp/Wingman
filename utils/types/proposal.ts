import { DesignTier } from './common';
import type { StructuredSystemDiagram } from './project';

export interface UpgradeDowngradePath {
    roomName: string;
    currentTier: DesignTier;
    upgrade?: {
        toTier: DesignTier;
        description: string;
    };
    downgrade?: {
        toTier: DesignTier;
        description: string;
    };
}

export interface Proposal {
    proposalId: string;
    version: number;
    createdAt: string;
    executiveSummary: string;
    scopeOfWork: string;
    systemDiagram?: StructuredSystemDiagram;
    equipmentList: { sku: string; name: string; quantity: number }[];
    installationPlan: { phase: string; tasks: string[] }[];
    suggestedImprovements?: {
        roomName: string;
        improvement: string;
    }[];
    upgradeDowngradePaths?: UpgradeDowngradePath[];
    cableInformation?: string;
}