
import { CableType, CableSpec } from './types';

/**
 * Cable specifications and costs per meter
 */
export const CABLE_SPECS: Record<CableType, CableSpec> = {
  'HDMI-2.0': {
    maxDistance: 15,
    costPerMeter: 2.5,
    bandwidth: '18 Gbps',
    notes: 'Supports 4K@60Hz 4:2:0 or 4K@30Hz 4:4:4'
  },
  'HDMI-2.1': {
    maxDistance: 10,
    costPerMeter: 8.5,
    bandwidth: '48 Gbps',
    notes: 'Supports 4K@120Hz, 8K@60Hz, 4:4:4'
  },
  'HDBaseT': {
    maxDistance: 100,
    costPerMeter: 1.2,
    bandwidth: '10.2 Gbps',
    notes: 'Extends HDMI over Cat6a, includes power and control'
  },
  'Cat6': {
    maxDistance: 100,
    costPerMeter: 0.5,
    bandwidth: '1 Gbps',
    notes: 'Standard network cable'
  },
  'Cat6a': {
    maxDistance: 100,
    costPerMeter: 0.8,
    bandwidth: '10 Gbps',
    notes: 'Required for HDBaseT'
  },
  'Fiber-OM3': {
    maxDistance: 300,
    costPerMeter: 3.0,
    bandwidth: '10 Gbps',
    notes: 'Multi-mode fiber, long distance'
  },
  'Fiber-OM4': {
    maxDistance: 550,
    costPerMeter: 4.5,
    bandwidth: '40 Gbps',
    notes: 'High-performance fiber'
  },
  'Speaker-16AWG': {
    maxDistance: 30,
    costPerMeter: 0.6,
    bandwidth: 'N/A',
    notes: 'Standard speaker wire'
  },
  'Speaker-14AWG': {
    maxDistance: 60,
    costPerMeter: 0.9,
    bandwidth: 'N/A',
    notes: 'Lower resistance for longer runs'
  },
  'XLR': {
    maxDistance: 100,
    costPerMeter: 1.8,
    bandwidth: 'Analog Audio',
    notes: 'Balanced audio, professional'
  },
  'USB-3.0': {
    maxDistance: 5,
    costPerMeter: 2.0,
    bandwidth: '5 Gbps',
    notes: 'Very short runs only'
  },
  'DisplayPort-1.4': {
    maxDistance: 15,
    costPerMeter: 3.5,
    bandwidth: '32.4 Gbps',
    notes: 'Supports 4K@120Hz, 8K@60Hz'
  }
};

/**
 * Get cable specification details
 */
export function getCableSpecs(cableType: CableType): CableSpec {
  return CABLE_SPECS[cableType];
}



