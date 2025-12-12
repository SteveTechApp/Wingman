import { TrainingModule } from '../../utils/types';

export const MODULE_6_VIDEOWALLS: TrainingModule = {
  id: 'module-6-videowalls',
  title: 'Video Wall Technologies',
  contentPages: [
    {
      title: 'What is a Video Wall?',
      content: 'A **video wall** is a large display surface made up of multiple smaller displays (panels) tiled together. They are used when a single display is not large enough or to create unique, high-impact visuals.',
      asset: {
        url: 'https://images.unsplash.com/photo-1618389353999-8051b4398b1b?w=800&q=80',
        title: 'A large video wall in a public space.',
        type: 'image',
      },
    },
    {
      title: 'Types of Video Walls',
      content:
        'There are two main types:\n\n- **LCD Video Wall**: Made from commercial display panels with very thin **bezels** (the border around the screen). They are tiled together to form a larger canvas. The lines between the panels (**mullions**) are visible.\n- **Direct-View LED (DV-LED)**: Made from smaller modules of LED pixels. These create a completely **seamless** image with no bezels, but are generally more expensive and complex.',
      asset: {
        url: 'https://i.imgur.com/xT5A8kP.png',
        title: 'Comparison between a tiled LCD wall with visible mullions and a seamless DV-LED wall.',
        type: 'diagram',
      },
    },
    {
      title: 'Driving a Video Wall',
      content:
        'You need a special processor to split a single video source across multiple displays.\n\n- **Standalone Processors**: A dedicated hardware box that takes one or more inputs and has multiple outputs, one for each display in the wall. Some switchers (like the WyreStorm **SW-0204-VW**) have this functionality built-in.\n- **AVoIP Systems**: AVoIP is a powerful way to drive video walls. You use one decoder per display. The AVoIP controller software manages the synchronization and layout. NetworkHD decoders have built-in **bezel correction** to compensate for the physical gaps between LCD panels.',
      asset: {
        url: 'https://i.imgur.com/W2B0l1x.png',
        title: 'Two methods for driving a video wall: a standalone processor vs. an AVoIP system.',
        type: 'diagram',
      }
    },
  ],
  quiz: [
    {
      question: 'What is the term for the visible gap between panels on an LCD video wall?',
      options: ['Bezel', 'Mullion', 'Gutter'],
      correctAnswer: 'Mullion',
      explanation: 'The mullion is the combined width of the bezels of adjacent displays.',
    },
    {
      question: 'Which technology creates a completely seamless video wall with no visible lines?',
      options: ['LCD', 'Direct-View LED', 'HDBaseT'],
      correctAnswer: 'Direct-View LED',
      explanation: 'DV-LED walls are made of pixel modules that join together without any bezels, creating a single, continuous image.',
    },
  ],
};
