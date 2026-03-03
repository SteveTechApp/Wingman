
import { TechnologyRequirement, CableType } from './types';
import { CABLE_SPECS } from './cableSpecs';

/**
 * Analyze technology requirements based on use case and determine optimal specs
 */
export function analyzeTechnologyRequirements(
  roomType: string,
  displaySize: number,  // inches
  viewingDistance: number,  // meters
  contentType: 'presentation' | 'video-conference' | 'digital-signage' | 'broadcast' | 'training'
): TechnologyRequirement {
  // Start with baseline requirements
  let resolution: TechnologyRequirement['resolution'] = '4K';
  let refreshRate: TechnologyRequirement['refreshRate'] = 30;
  let colorSubsampling: TechnologyRequirement['colorSubsampling'] = '4:2:0';
  let hdr = false;

  // Adjust based on content type
  switch (contentType) {
    case 'presentation':
      // Presentations need good color accuracy for charts/graphs
      colorSubsampling = '4:4:4';  // Sharp text
      refreshRate = 30;  // No motion, save cost
      hdr = false;
      break;

    case 'video-conference':
      // Video conferencing is typically 1080p or 4K at 30fps
      resolution = displaySize > 65 ? '4K' : '1080p';
      colorSubsampling = '4:2:0';  // Motion video is fine with this
      refreshRate = 30;
      hdr = false;
      break;

    case 'digital-signage':
      // Signage needs vibrant colors but not high refresh
      resolution = '4K';
      colorSubsampling = '4:2:2';  // Good color
      refreshRate = 30;
      hdr = true;  // HDR makes signage pop
      break;

    case 'broadcast':
      // Broadcast quality needs everything
      resolution = '4K';
      colorSubsampling = '4:4:4';
      refreshRate = 60;
      hdr = true;
      break;

    case 'training':
      // Training rooms need clear text but can save on other specs
      resolution = '4K';
      colorSubsampling = '4:4:4';
      refreshRate = 30;
      hdr = false;
      break;
  }

  // Calculate recommended cables
  const recommendedCables: CableType[] = [];
  if ((resolution as unknown as string) === '8K') {
    recommendedCables.push('HDMI-2.1', 'Fiber-OM4');
  } else if (resolution === '4K' && refreshRate === 60 && colorSubsampling === '4:4:4') {
    recommendedCables.push('HDMI-2.1', 'HDBaseT', 'DisplayPort-1.4');
  } else if (resolution === '4K' && refreshRate === 30 && colorSubsampling === '4:4:4') {
    recommendedCables.push('HDMI-2.0', 'HDBaseT');
  } else {
    recommendedCables.push('HDMI-2.0', 'HDBaseT');
  }

  // Determine max distance based on cable type
  const maxDistance = Math.max(...recommendedCables.map(cable => CABLE_SPECS[cable].maxDistance));

  // Generate notes
  const notes = `For ${contentType} in a ${roomType}, ${resolution} at ${refreshRate}Hz with ${colorSubsampling} color provides optimal quality-to-cost ratio. ${
    colorSubsampling === '4:4:4' ? 'Full chroma sampling ensures sharp text and graphics.' :
    colorSubsampling === '4:2:2' ? 'Good color reproduction for video content.' :
    'Efficient compression suitable for motion video.'
  }`;

  return {
    resolution,
    refreshRate,
    colorSubsampling,
    hdr,
    maxDistance,
    recommendedCables,
    notes
  };
}



