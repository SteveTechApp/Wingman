import { useState, useCallback, useEffect } from 'react';
import { RoomData, RoomWizardAnswers, DisplayType } from '../utils/types';
import { createNewRoom } from '../utils/utils';
import { v4 as uuidv4 } from 'uuid';

const createInitialAnswers = (initialData: RoomData | null): RoomWizardAnswers => {
    if (initialData) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { systemDiagram, manuallyAddedEquipment, ...rest } = initialData;
        return rest;
    }
    const newRoomBase = createNewRoom();
    return {
        ...newRoomBase,
        id: uuidv4(),
        roomName: 'New Room',
        roomType: 'Conference Room',
        designTier: 'Silver',
    };
};

export const useWizardState = (initialData: RoomData | null) => {
    const [answers, setAnswers] = useState<RoomWizardAnswers>(() => createInitialAnswers(initialData));

    const updateAnswers = useCallback((newAnswers: Partial<RoomWizardAnswers>) => {
        setAnswers(prev => ({ ...prev, ...newAnswers }));
    }, []);

    // Effect to keep video wall config and display properties in sync
    useEffect(() => {
        const { videoWallConfig, displayType, displayCount } = answers;
        if (videoWallConfig) {
            const newType: DisplayType = videoWallConfig.type === 'led' ? 'led_video_wall' : 'lcd_video_wall';
            const newCount = videoWallConfig.type === 'lcd' ? (videoWallConfig.layout.rows * videoWallConfig.layout.cols) : 1;
            if (displayType !== newType || displayCount !== newCount) {
                updateAnswers({ displayType: newType, displayCount: newCount });
            }
        }
    }, [answers.videoWallConfig, answers.displayType, answers.displayCount, updateAnswers]);

    return { answers, updateAnswers, createInitialAnswers };
};