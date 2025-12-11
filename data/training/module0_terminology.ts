import { TrainingModule } from '../../utils/types';

export const MODULE_0_TERMINOLOGY: TrainingModule = {
  id: 'module-0-terminology',
  title: 'Module 1: Foundational AV Terminology',
  contentPages: [
    {
      title: 'Common Network Acronyms',
      content: 'Understanding these terms is fundamental to working with modern AV systems, which are heavily reliant on networks.\n\n- **LAN (Local Area Network)**: The private network within a single building or campus, like an office or school network. It connects all the local computers, printers, and AV devices.\n- **CAT Cable (Category Cable)**: Standard network cabling used for Ethernet, HDBaseT, and AVoIP. "CAT" is followed by a number indicating its performance (e.g., CAT6, CAT6a). Higher numbers mean better performance.\n- **DHCP (Dynamic Host Configuration Protocol)**: A service that runs on a network router or server. It automatically assigns IP addresses to devices when they connect to the network. This saves you from having to manually configure every device.',
      asset: {
        url: 'https://i.imgur.com/3c8i8tK.png',
        title: 'A simple Local Area Network (LAN) with a DHCP server assigning IP addresses.',
        type: 'diagram',
      },
    },
    {
      title: 'Common AV Acronyms',
      content: 'These acronyms describe key technologies and concepts in AV signal distribution.\n\n- **BYOD/BYOM (Bring Your Own Device/Meeting)**: A room system designed to let users connect their own laptop (the device) and use it to run a video conference call (the meeting) with the room\'s camera and microphone.\n- **HDCP (High-bandwidth Digital Content Protection)**: An encryption standard built into HDMI to prevent copying of protected content like movies.\n- **AVoIP (AV over IP)**: A technology for sending audio and video signals over a standard network switch. It uses encoders and decoders.\n- **EDID (Extended Display Identification Data)**: The information a display sends to a source to tell it what its capabilities are. A failed "EDID handshake" is a common cause of "no signal" issues.',
      asset: {
        url: 'https://i.imgur.com/4hJ1bYF.png',
        title: 'In a BYOM scenario, a user\'s laptop connects to the room\'s AV peripherals.',
        type: 'diagram',
      },
    },
    {
      title: 'Hardware Terminology',
      content: 'Knowing the role of each piece of hardware is key to understanding a system.\n\n- **Source**: Where the signal begins (e.g., laptop, media player, camera).\n- **Destination / Sink**: Where the signal ends (e.g., display, projector, speaker).\n- **Switcher / Matrix**: A device that routes multiple sources to one or more destinations.\n- **Extender**: A pair of devices (Transmitter and Receiver) that sends an AV signal over a long distance, typically using HDBaseT.\n- **DSP (Digital Signal Processor)**: An audio device that processes sound. It can mix microphones, cancel echo (AEC), and tune the room\'s acoustics.',
      asset: {
        url: 'https://i.imgur.com/1mYqf8F.png',
        title: 'A basic signal path showing the roles of different hardware types.',
        type: 'diagram',
      },
    },
    {
      title: 'Deep Dive: IP Address & Subnet',
      content: 'An **IP Address** is a unique identifier for a device on a network, like `192.168.1.100`. No two devices on the same LAN can have the same IP address.\n\nA **Subnet Mask** (e.g., `255.255.255.0`) tells devices which part of the IP address is the "network" part and which is the "host" part. This allows them to know if another device is on the same local network (and can be talked to directly) or on a different network (and needs to go through a router).',
      asset: {
        url: 'https://i.imgur.com/sY8fJ0a.png',
        title: 'An IP address is broken into a network portion and a host portion by the subnet mask.',
        type: 'diagram',
      },
    },
    {
      title: 'Key Technology: HDBaseT',
      content: 'You will hear **HDBaseT** constantly in pro AV. It is a technology standard for transmitting video, audio, control, and power over a single category cable (like Cat6).\n\nThink of it as a supercharged, long-distance HDMI cable. It solves the problem of HDMI signals becoming unreliable over about 15 meters. It always works as a **Transmitter (TX)** and **Receiver (RX)** pair.',
      asset: {
        url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80',
        title: 'HDBaseT uses standard network cabling to extend AV signals.',
        type: 'image',
      },
    },
    {
      title: 'Deep Dive: Codecs',
      content: 'A **Codec** (Coder-Decoder) is an algorithm used to compress and decompress data, especially video. AVoIP systems use codecs to reduce the amount of network bandwidth a video stream requires.\n\n- **H.264/H.265**: Highly compressed. Uses low bandwidth, but adds more latency (delay) and can reduce image quality. Good for streaming over the internet or on congested networks. (e.g., NetworkHD 100/200 Series)\n- **JPEG-XS**: Lightly compressed. Visually lossless with very low latency. A great balance of quality and bandwidth for pro AV use over 1GbE networks. (e.g., NetworkHD 500 Series)',
      asset: {
        url: 'https://i.imgur.com/2Xy3l5b.png',
        title: 'There is a trade-off between video quality, latency, and the network bandwidth required.',
        type: 'diagram',
      },
    },
  ],
  quiz: [
    {
      question: 'What is the function of a DHCP server on a network?',
      options: ['To block unauthorized websites', 'To automatically assign IP addresses to devices', 'To encrypt video signals'],
      correctAnswer: 'To automatically assign IP addresses to devices',
      explanation: 'DHCP simplifies network management by automatically providing devices with a unique IP address when they connect.',
    },
    {
      question: 'What does BYOM stand for?',
      options: ['Bring Your Own Microphone', 'Build Your Own Matrix', 'Bring Your Own Meeting'],
      correctAnswer: 'Bring Your Own Meeting',
      explanation: 'BYOM refers to a room system that allows users to run a video call from their own laptop using the room\'s high-quality AV peripherals.',
    },
    { question: 'What does a DSP primarily process?', options: ['Video Signals', 'Network Data', 'Audio Signals'], correctAnswer: 'Audio Signals', explanation: 'A Digital Signal Processor (DSP) is used for mixing, routing, and optimizing audio in a system.' },
    { question: 'Which of these is a unique identifier for a device on a network?', options: ['CAT6', 'IP Address', 'LAN'], correctAnswer: 'IP Address', explanation: 'An IP Address serves as a unique address for a device, allowing other devices to communicate with it.' },
    { question: 'What problem does an HDBaseT extender solve?', options: ['Poor audio quality', 'Lack of inputs on a display', 'HDMI signal loss over long distance'], correctAnswer: 'HDMI signal loss over long distance', explanation: 'HDBaseT is a technology specifically designed to extend AV signals reliably over long distances using category cable.' },
    { question: 'In AVoIP, what is the role of an Encoder?', options: ['To convert network packets back into an AV signal', 'To route traffic between sources and displays', 'To convert an AV signal from a source into network packets'], correctAnswer: 'To convert an AV signal from a source into network packets', explanation: 'The Encoder sits at the source and "encodes" the AV signal for transmission over the network.' },
    { question: 'A failed "EDID handshake" will most likely result in what?', options: ['Distorted audio', 'No signal on the display', 'Slow network speeds'], correctAnswer: 'No signal on the display', explanation: 'If the source does not know what the display is capable of, it often won\'t send a signal at all.' },
    { question: 'What does a Matrix Switcher do?', options: ['Combines multiple video signals into one', 'Routes multiple inputs to multiple outputs', 'Powers all the devices in a rack'], correctAnswer: 'Routes multiple inputs to multiple outputs', explanation: 'A matrix allows any connected input to be shown on any connected output.' },
    { question: 'Which codec offers the best balance of high quality and low latency for 1GbE networks?', options: ['H.264', 'JPEG-XS', 'MP3'], correctAnswer: 'JPEG-XS', explanation: 'JPEG-XS is a visually lossless codec with very low latency, making it ideal for professional AV applications over standard 1GbE networks.' },
    { question: 'What does "HDCP" stand for?', options: ['High-Definition Color Profile', 'High-bandwidth Digital Content Protection', 'Hardware Device Control Protocol'], correctAnswer: 'High-bandwidth Digital Content Protection', explanation: 'HDCP is the encryption standard used on HDMI and other connections to prevent unauthorized copying of content.' }
  ],
};