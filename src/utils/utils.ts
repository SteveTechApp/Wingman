import { RoomData, Feature } from './types';

export const createNewRoom = (): Omit<RoomData, 'id' | 'roomName' | 'roomType' | 'designTier'> => ({
    dimensions: { length: 8, width: 5, height: 2.7 },
    maxParticipants: 10,
    ioRequirements: [],
    displayType: 'single',
    displayCount: 1,
    displaySize: 75,
    features: [],
    functionalityStatement: 'A standard meeting space.',
    manuallyAddedEquipment: [],
    constructionDetails: {
        wallConstruction: 'drywall',
        cableContainment: 'trunking',
        furnitureType: 'fixed',
    },
    audioSystemDetails: {
        speakerLayout: 'none',
        systemType: 'low_impedance',
        useCases: [],
        microphoneType: 'none',
        ucCompatibility: false,
    },
    technicalDetails: {
        primaryVideoResolution: '1080p',
        videoSignalTypes: ['HDMI'],
        controlSystem: 'None (Auto-switching)',
        cameraType: 'none',
        cameraCount: 0,
        roomPc: false,
        avoipSystem: 'None',
        avoipNetworkDetails: {
            useDedicatedNetwork: true,
            poeAvailable: true,
            switchFeatures: ['igmp_snooping'],
        },
    },
});

/**
 * Strips markdown and safely parses a JSON string from an AI response.
 * @param text The raw text response.
 * @returns The parsed JSON object.
 */
export const safeParseJson = (text: string): any => {
  const cleaned = text.trim().replace(/^`{3}(?:json)?|`{3}$/g, '');
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('JSON parsing error:', err, 'Raw text:', text);
    throw new Error('AI response was not valid JSON.');
  }
};

/**
 * Adds an item to an array if it doesn't exist, or removes it if it does.
 * @param array The source array.
 * @param item The item to toggle.
 * @returns A new array with the item toggled.
 */
export const toggleArrayItem = <T>(array: T[], item: T): T[] => {
    const index = array.indexOf(item);
    if (index === -1) {
        return [...array, item];
    } else {
        const newArray = [...array];
        newArray.splice(index, 1);
        return newArray;
    }
};

/**
 * Adds or removes a feature from an array of Feature objects.
 * @param features The array of features.
 * @param featureName The name of the feature to toggle.
 * @param isEnabled If true, adds the feature; if false, removes it.
 * @returns A new array with the feature toggled.
 */
export const toggleFeature = (features: Feature[], featureName: string, isEnabled: boolean): Feature[] => {
    const featureExists = features.some(f => f.name === featureName);
    if (isEnabled && !featureExists) {
        // Defaults to 'nice-to-have' when toggled on, can be changed later.
        return [...features, { name: featureName, priority: 'nice-to-have' }];
    }
    if (!isEnabled && featureExists) {
        return features.filter(f => f.name !== featureName);
    }
    return features;
};