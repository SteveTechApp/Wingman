import React, { useState, useEffect } from 'react';
import { IOPoint } from '../../../utils/types';
import { useUserContext } from '../../../context/UserContext';
import { CONNECTION_TYPES, TRANSPORT_TYPES, LOCATION_TYPES } from '../../../data/wizardOptions';
import InfoTooltip from '../../InfoTooltip';
import { InformationCircleIcon } from '../../icons/UIIcons';

interface ConnectivityInputsProps {
  point: IOPoint;
  onUpdate: (newValues: Partial<IOPoint>) => void;
  errors?: Record<string, string>;
}

const METER_TO_FEET = 3.28084;

const ConnectivityInputs: React.FC<ConnectivityInputsProps> = ({ point, onUpdate, errors = {} }) => {
  const { userProfile } = useUserContext();
  const isImperial = userProfile.unitSystem === 'imperial';

  const toDisplay = (meters: number) => (isImperial ? (meters * METER_TO_FEET).toFixed(1) : String(meters));
  const fromDisplay = (value: string) => {
    const num = parseFloat(value) || 0;
    return isImperial ? num / METER_TO_FEET : num;
  };

  const [localDistance, setLocalDistance] = useState(() => toDisplay(point.distance));

  useEffect(() => {
    setLocalDistance(toDisplay(point.distance));
  }, [point.distance, isImperial]);

  const handleBlur = (value: string) => {
    onUpdate({ distance: fromDisplay(value) });
  };
  
  const unitLabel = isImperial ? 'ft' : 'm';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div>
        <InfoTooltip text="The physical connector used for the signal (e.g., HDMI for video, XLR for microphones, USB-C for modern laptops). This defines the port on the wall plate or device.">
          <label htmlFor="io-connection-type" className="flex items-center gap-1 text-sm font-medium">
            Connection Type
            <InformationCircleIcon className="h-4 w-4 text-text-secondary" />
          </label>
        </InfoTooltip>
        <select id="io-connection-type" value={point.connectionType} onChange={e => onUpdate({ connectionType: e.target.value })} className="w-full p-2 border border-border-color rounded-md bg-input-bg mt-1">
          {CONNECTION_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
      <div>
        <InfoTooltip text="How the signal travels from its source to its destination. 'Direct' means a simple cable run. 'HDBaseT' or 'AVoIP' are used to extend signals over long distances.">
            <label htmlFor="io-distribution" className="flex items-center gap-1 text-sm font-medium">
              Transport Type
               <InformationCircleIcon className="h-4 w-4 text-text-secondary" />
            </label>
        </InfoTooltip>
        <select id="io-distribution" value={point.distributionType} onChange={e => onUpdate({ distributionType: e.target.value })} className="w-full p-2 border border-border-color rounded-md bg-input-bg mt-1">
          {TRANSPORT_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
      <div>
        <InfoTooltip text="The physical place where the connection point will be installed (e.g., a wall plate, a pop-up box in a table, or directly on a piece of furniture like a lectern).">
           <label htmlFor="io-termination" className="flex items-center gap-1 text-sm font-medium">
            Location
            <InformationCircleIcon className="h-4 w-4 text-text-secondary" />
           </label>
        </InfoTooltip>
         <select id="io-termination" value={point.terminationType} onChange={e => onUpdate({ terminationType: e.target.value })} className="w-full p-2 border border-border-color rounded-md bg-input-bg mt-1">
          {LOCATION_TYPES.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
      <div>
        <InfoTooltip text="The estimated cable length from the connection point to the central equipment rack or the next device in the chain. This is critical for determining if signal extension is needed.">
            <label htmlFor="io-distance" className="flex items-center gap-1 text-sm font-medium">
              Distance ({unitLabel})
              <InformationCircleIcon className="h-4 w-4 text-text-secondary" />
            </label>
        </InfoTooltip>
        <input
          type="number"
          step="0.1"
          id="io-distance"
          value={localDistance}
          onChange={(e) => setLocalDistance(e.target.value)}
          onBlur={(e) => handleBlur(e.target.value)}
          className={`w-full p-2 border rounded-md bg-input-bg mt-1 ${errors['distance'] ? 'border-destructive' : 'border-border-color'}`}
        />
        {errors['distance'] && <p className="text-destructive text-sm mt-1">{errors['distance']}</p>}
      </div>
    </div>
  );
};

export default ConnectivityInputs;