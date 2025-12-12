import { TrainingModule } from '../../utils/types';

export const MODULE_2_HDBASET: TrainingModule = {
  id: 'module-2-hdbaset',
  title: 'HDBaseT Fundamentals',
  contentPages: [
    {
      title: 'What is HDBaseT?',
      content:
        "**HDBaseT** is a global standard for transmitting video, audio, USB, control signals, and power over a single standard category cable (like Cat6).\n\nIt solves the primary problem of modern AV: **distance**. Standard HDMI cables become unreliable over 15 meters, but HDBaseT allows for robust long-distance transmission, making it a cornerstone of professional AV installations.",
      asset: {
        url: 'https://i.imgur.com/1mYqf8F.png',
        title: 'A typical HDBaseT setup uses a Transmitter (TX) and a Receiver (RX).',
        type: 'diagram',
      },
    },
    {
      title: 'The 5-Play Feature Set',
      content:
        'HDBaseT is famous for its **5-Play** feature set, which describes the five types of signals it can carry simultaneously:\n\n1.  **Uncompressed Video & Audio**: Transmit high-definition video and audio without loss of quality.\n2.  **USB**: Extend USB 2.0 for devices like interactive displays, cameras, and keyboards/mice (KVM).\n3.  **Ethernet**: Pass through a 100Mbps Ethernet connection.\n4.  **Control**: Send control signals like IR (Infrared) and RS-232.\n5.  **Power**: Deliver power to the remote device using **PoH** (Power over HDBaseT), eliminating the need for a power supply at the display end.',
      asset: {
        url: 'https://i.imgur.com/YdK0fJj.png',
        title: 'The five components of the HDBaseT 5-Play feature set.',
        type: 'diagram',
      },
    },
    {
      title: 'HDBaseT Versions & Classes',
      content:
        "HDBaseT has evolved, with different versions offering different capabilities.\n\n- **HDBaseT 1.0/2.0**: These are the most common versions and are categorized by distance into **Class A** (up to 100m) and **Class B** (up to 70m for 1080p). They support up to 4K30 video.\n- **HDBaseT 3.0**: The latest generation. It supports **uncompressed 4K60 4:4:4** video up to **100m** over a single Cat6a cable, along with 1Gb Ethernet and USB 2.0.\n\n**Note**: Always use high-quality, solid-core Cat6a cable for the best performance, especially with HDBaseT 3.0.",
      asset: {
          url: 'https://i.imgur.com/pB3yC5K.png',
          title: 'HDBaseT transmission distance comparison by class and resolution.',
          type: 'diagram',
      },
    },
    {
      title: 'HDBaseT vs. Other Technologies',
      content:
        "How does HDBaseT compare to other signal extension methods?\n\n- **vs. Long HDMI Cables**: HDBaseT is far more reliable over distances greater than 15m.\n- **vs. Fiber Optic**: Fiber can go much longer distances (kilometers) and is immune to electrical interference, but is typically more expensive and fragile.\n- **vs. AVoIP**: AVoIP runs over a standard network and is more scalable and flexible for routing (many-to-many), whereas HDBaseT is a point-to-point connection (one-to-one).",
      asset: {
        url: 'https://i.imgur.com/rXf1b1s.png',
        title: 'HDBaseT is a point-to-point technology, while AVoIP is a networked, many-to-many technology.',
        type: 'diagram',
      },
    },
    {
      title: 'Cabling is Critical',
      content: "The performance of HDBaseT is highly dependent on the quality of the category cable used. Using the wrong cable is the #1 cause of HDBaseT failures.\n\n- **Use Solid Core Copper**: Never use Copper Clad Aluminum (CCA) or patch cables for infrastructure wiring.\n- **CAT6a is Recommended**: For all new installations, especially for HDBaseT 3.0, CAT6a is the recommended standard.\n- **Termination Matters**: Both ends of the cable must be terminated correctly, usually to the **T568B** standard. Poor termination is a major source of signal loss.",
      asset: {
        url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80',
        title: 'High-quality, well-terminated CAT6a cable is essential for HDBaseT reliability.',
        type: 'image',
      },
    },
    {
      title: 'Power over HDBaseT (PoH)',
      content: "**PoH** is similar to PoE but is a specific part of the HDBaseT standard. It allows a transmitter (TX) to send power up the category cable to the receiver (RX), or vice-versa.\n\nThis is a huge advantage as it means you don't need to install a power outlet behind the display. One end of the extender pair powers the other.\n\n**Important**: Always check the datasheet to see if the PoH is **two-way** (either unit can power the other) or **one-way** (only the TX can power the RX).",
      asset: {
        url: 'https://i.imgur.com/7jL5x3d.png',
        title: 'PoH simplifies installation by removing the need for a power outlet at one end.',
        type: 'diagram',
      },
    },
  ],
  quiz: [
    {
      question: 'What is the main advantage of HDBaseT 3.0 over previous versions?',
      options: ['It is cheaper', 'It supports uncompressed 4K60 4:4:4 up to 100m', 'It only works with fiber optic cable'],
      correctAnswer: 'It supports uncompressed 4K60 4:4:4 up to 100m',
      explanation: 'HDBaseT 3.0 provides a significant bandwidth increase, allowing for the transmission of full-spec 4K video over long distances.',
    },
    {
      question: 'Which technology is best for a flexible, many-to-many distribution system?',
      options: ['HDBaseT', 'AVoIP', 'Long HDMI Cable'],
      correctAnswer: 'AVoIP',
      explanation: 'AVoIP uses a network switch as a virtual matrix, allowing any source to be sent to any number of displays, making it ideal for flexible routing.',
    },
    { question: 'What does "PoH" stand for?', options: ['Power over HDMI', 'Power over HDBaseT', 'Power on Handshake'], correctAnswer: 'Power over HDBaseT', explanation: 'PoH is the HDBaseT standard for sending power over the same category cable as the AV signals.' },
    { question: 'What is the maximum distance for HDBaseT Class A transmitting a 1080p signal?', options: ['70m', '100m', '40m'], correctAnswer: '100m', explanation: 'Class A can transmit 1080p signals up to 100 meters (328 feet).' },
    { question: 'You are running an HDBaseT link and see sparkles on the screen. What is the most likely cause?', options: ['A failed EDID handshake', 'An HDCP error', 'A low-quality or poorly terminated cable'], correctAnswer: 'A low-quality or poorly terminated cable', explanation: 'Sparkles and signal dropouts are classic signs of poor signal integrity, usually caused by issues with the cable.' },
    { question: 'HDBaseT is what type of connection topology?', options: ['Point-to-point', 'Point-to-multipoint', 'Mesh network'], correctAnswer: 'Point-to-point', explanation: 'HDBaseT connects a single transmitter (TX) to a single receiver (RX). It is not a networked technology.' },
    { question: 'Which of the 5-Play features allows you to control a display from the transmitter side?', options: ['Video', 'Power', 'Control (IR/RS-232)'], correctAnswer: 'Control (IR/RS-232)', explanation: 'The control channel allows signals like IR and RS-232 to be passed through the extender pair.' },
    { question: 'Which cable type is recommended for all new HDBaseT installations?', options: ['CAT5e', 'CAT6a', 'Coaxial'], correctAnswer: 'CAT6a', explanation: 'CAT6a provides the best performance and future-proofing, and is required for HDBaseT 3.0.' },
    { question: 'What does "5-Play" refer to?', options: ['The number of displays you can connect', 'The five types of signals HDBaseT can carry', 'A five-year warranty'], correctAnswer: 'The five types of signals HDBaseT can carry', explanation: 'The 5-Play feature set includes Video/Audio, USB, Ethernet, Control, and Power.' },
    { question: 'You have a 4K source. An HDBaseT Class B extender will transmit this signal up to what distance?', options: ['100m', '70m', '35m'], correctAnswer: '35m', explanation: 'Class B extenders support 4K signals up to 35 meters. They support 1080p up to 70 meters.' }
  ],
};