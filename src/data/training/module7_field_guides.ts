import { TrainingModule } from '../../utils/types';

export const MODULE_7_FIELD_GUIDES: TrainingModule = {
  id: 'module-7-field-guides',
  title: 'Field Installation Guides',
  contentPages: [
    {
      title: 'Cable Best Practices',
      content: 'Proper cabling is the foundation of a reliable AV system.\n\n- Use **solid-core copper** category cable for HDBaseT and AVoIP.\n- Avoid running AV cables **parallel to high-voltage power lines** to prevent interference.\n- **Test and certify** every cable before connecting equipment.\n- **Label everything** clearly at both ends!',
      asset: {
        url: 'https://images.unsplash.com/photo-1581092921442-c6b8c8f0b483?w=800&q=80',
        title: 'Neat, well-labeled cabling is essential for serviceability.',
        type: 'image',
      },
    },
    {
      title: 'Rack Building Essentials',
      content: 'A well-built equipment rack is easier to service and more reliable.\n\n- **Ventilation**: Heat is the enemy of electronics. Ensure proper airflow, leaving at least **1U** of space between hot devices like amplifiers. Use fan trays if necessary.\n- **Power Management**: Use a professional power distribution unit (**PDU**) to protect equipment and sequence power-on.\n- **Cable Management**: Use horizontal and vertical managers to keep wiring neat and tidy. This prevents strain on connectors and makes troubleshooting much easier.',
      asset: {
        url: 'https://images.unsplash.com/photo-1601953935188-5179b0821b0b?w=800&q=80',
        title: 'A professional, well-managed equipment rack.',
        type: 'image',
      },
    },
  ],
  quiz: [
    {
      question: 'What type of category cable should be used for HDBaseT installations?',
      options: ['Copper Clad Aluminum (CCA)', 'Solid-core copper', 'Stranded patch cable'],
      correctAnswer: 'Solid-core copper',
      explanation: 'Solid-core copper provides the best performance and reliability for high-bandwidth data transmission over long distances.',
    },
    {
      question: 'What is the primary reason for good ventilation in an equipment rack?',
      options: ['To make it look tidy', 'To prevent equipment from overheating', 'To reduce noise'],
      correctAnswer: 'To prevent equipment from overheating',
      explanation: 'Excessive heat can cause equipment to fail prematurely. Proper airflow and thermal management are critical for long-term reliability.',
    },
  ],
};
