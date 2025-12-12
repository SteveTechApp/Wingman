import { TrainingModule } from '../../utils/types';

export const MODULE_5_DATASHEETS: TrainingModule = {
  id: 'module-5-datasheets',
  title: 'Reading a Datasheet',
  contentPages: [
    {
      title: 'The Source of Truth',
      content:
        "A product **datasheet** is the most important document for a system designer. It contains the official specifications and capabilities of a device. Never rely on marketing brochures alone; always verify the details in the datasheet.\n\nIt is your **single source of truth** for what a product can and cannot do.",
      asset: {
        url: 'https://i.imgur.com/6c6W7yJ.png',
        title: 'A product datasheet contains all critical technical information.',
        type: 'image',
      },
    },
    {
      title: 'Key Specifications to Check',
      content:
        'When evaluating a product, look for these key specs:\n\n- **Video Resolution**: Find the maximum supported resolution, refresh rate, and chroma subsampling (e.g., **"4K/60Hz 4:4:4"**).\n- **HDCP Version**: Ensure it matches the requirements of the content and other devices (e.g., **"HDCP 2.2 compliant"**).\n- **Bandwidth**: For switchers and extenders, this is often listed in Gbps (e.g., **"18Gbps"**).\n- **Inputs/Outputs**: Note the type and number of connections (e.g., **"3x HDMI In, 1x HDBaseT Out"**).\n- **Audio Formats**: Check for support of formats like PCM, Dolby, or DTS, and features like **audio de-embedding**.\n- **Control Ports**: Look for **RS-232, IR, or Ethernet** ports for control.\n- **Power**: Check the power consumption (in Watts) and whether it supports **PoE or PoH**.',
      asset: {
        url: 'https://i.imgur.com/N7O4m4E.png',
        title: 'The specifications table is the most important part of the datasheet.',
        type: 'image',
      },
    },
  ],
  quiz: [
    {
      question: 'Where would you find the maximum supported video bandwidth of a matrix switcher?',
      options: ['The product box', 'A marketing email', 'The product datasheet'],
      correctAnswer: 'The product datasheet',
      explanation: 'The datasheet is the official source for detailed technical specifications like bandwidth.',
    },
  ],
};
