import { TrainingModule } from '../../utils/types';

export const MODULE_3_AVOIP: TrainingModule = {
  id: 'module-3-avoip',
  title: 'Introduction to AVoIP',
  contentPages: [
    {
      title: 'What is AVoIP?',
      content:
        '**AVoIP** (Audio-Visual over Internet Protocol) is the technology for sending AV signals over a standard IP network (like an office LAN).\n\nInstead of a traditional matrix switcher, AVoIP uses a system of **Encoders** and **Decoders**.\n- An **Encoder** connects to a source (like a PC or camera) and converts its AV signal into network packets.\n- A **Decoder** connects to a display or speaker and converts the network packets back into an AV signal.\n\nA standard network switch handles the routing, making the system incredibly flexible and scalable.',
      asset: {
        url: 'https://i.imgur.com/eB3d3E7.png',
        title: 'Basic AVoIP topology: Encoders, a Network Switch, and Decoders.',
        type: 'diagram',
      },
    },
    {
      title: 'Unicast vs. Multicast',
      content:
        'AVoIP uses two main methods for sending signals:\n\n- **Unicast**: A **one-to-one** connection. The encoder sends a single stream directly to the IP address of one decoder. This is efficient for simple connections but not for distribution.\n- **Multicast**: A **one-to-many** connection. The encoder sends a single stream to a special multicast IP address. Any decoder on the network can subscribe to this address to receive the stream. This is incredibly efficient for sending one source to many displays (like in digital signage or a sports bar). **IGMP Snooping** on the network switch is required to manage multicast traffic effectively.',
      asset: {
        url: 'https://i.imgur.com/k2e4k1N.png',
        title: 'Unicast sends to one specific decoder, while Multicast sends to a group address that multiple decoders can listen to.',
        type: 'diagram',
      },
    },
    {
      title: 'Benefits of AVoIP',
      content:
        'AVoIP offers several key advantages over traditional AV distribution:\n\n- **Scalability**: You are not limited by a fixed number of inputs and outputs. You can add more encoders or decoders at any time.\n- **Distance**: The transmission distance is virtually unlimited, constrained only by the reach of the network itself.\n- **Flexibility**: Any source can be routed to any display, or even to multiple displays simultaneously (multicasting).\n- **Advanced Features**: AVoIP enables features like **video walls, multiview** (multiple sources on one screen), and integration with other network services.',
      asset: {
        url: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&q=80',
        title: 'AVoIP systems can scale from small to massive installations easily.',
        type: 'image',
      }
    },
    {
      title: 'WyreStorm NetworkHD Series',
      content:
        "WyreStorm's AVoIP product line is called **NetworkHD**. It includes several series based on different compression technologies (codecs):\n\n- **100/120 Series (H.264/H.265)**: A **low-bandwidth** solution ideal for large-scale deployments where network capacity is a concern. Good for digital signage and non-critical viewing.\n- **500 Series (JPEG-XS)**: A **high-quality, low-latency** solution that is visually lossless. Excellent for corporate boardrooms and command centers where quality is paramount.\n- **600 Series (Uncompressed)**: A **zero-latency, pixel-perfect** solution for the most demanding applications like medical imaging or broadcast, requiring a 10GbE network.\n\nAll NetworkHD systems are managed by the **NHD-CTL-PRO**, the system controller that provides a web interface and API for routing and configuration.",
      asset: {
        url: 'https://i.imgur.com/d9j3S4h.jpg',
        title: 'The NHD-CTL-PRO is the brain of a NetworkHD system.',
        type: 'image',
      }
    },
  ],
  quiz: [
    {
      question: 'Which transmission method is used to send a single source to multiple displays efficiently?',
      options: ['Unicast', 'Multicast', 'Broadcast'],
      correctAnswer: 'Multicast',
      explanation: 'Multicast allows an encoder to send a single stream that multiple decoders can subscribe to, saving network bandwidth.',
    },
    {
      question: 'Which NetworkHD series would you choose for a mission-critical command center where image quality and zero latency are the top priorities?',
      options: ['120 Series', '500 Series', '600 Series'],
      correctAnswer: '600 Series',
      explanation: 'The 600 Series sends uncompressed video over a 10GbE network, resulting in pixel-perfect quality and no transmission delay.',
    },
    { question: "In an AVoIP system, what is the role of the network switch?", options: ["It powers all the devices", "It acts as the virtual matrix, routing signals", "It compresses the video"], correctAnswer: "It acts as the virtual matrix, routing signals", explanation: "The network switch is the core of an AVoIP system, handling the distribution of network packets from encoders to decoders." },
    { question: "What is a primary benefit of AVoIP over traditional matrix switchers?", options: ["It's always cheaper", "It's highly scalable", "It requires no configuration"], correctAnswer: "It's highly scalable", explanation: "With AVoIP, you can expand a system by simply adding more encoders or decoders, whereas a matrix has a fixed number of inputs and outputs." },
    { question: "What does an AVoIP 'Decoder' do?", options: ["Connects to a source device", "Converts an AV signal into network packets", "Converts network packets back into an AV signal"], correctAnswer: "Converts network packets back into an AV signal", explanation: "The decoder is located at the destination (e.g., a display) and reconstructs the AV signal from the network stream." },
    { question: "Which NetworkHD series uses a low-bandwidth H.264/H.265 codec?", options: ["120 Series", "500 Series", "600 Series"], correctAnswer: "120 Series", explanation: "The 100/120 series is designed for situations where preserving network bandwidth is a high priority." },
    { question: "What is the function of the NHD-CTL-PRO?", options: ["It encodes the video signal", "It provides power to all devices", "It is the system controller for configuration and routing"], correctAnswer: "It is the system controller for configuration and routing", explanation: "The controller is the brain of the NetworkHD system, providing the user interface and API for control." },
    { question: "What is a 'codec'?", options: ["A type of cable", "An algorithm for compressing and decompressing data", "A network switch setting"], correctAnswer: "An algorithm for compressing and decompressing data", explanation: "Codecs are essential in AVoIP for reducing the bandwidth required to transmit video over the network." },
    { question: "What does 'visually lossless' mean?", options: ["The signal has zero latency", "The compression is so minimal it is undetectable to the human eye", "The signal is not compressed at all"], correctAnswer: "The compression is so minimal it is undetectable to the human eye", explanation: "Visually lossless codecs like JPEG-XS provide the quality of an uncompressed signal but use significantly less bandwidth." },
    { question: "An AVoIP system's distance is limited by...", options: ["The length of an HDMI cable (15m)", "The capability of the network infrastructure", "The size of the displays"], correctAnswer: "The capability of the network infrastructure", explanation: "As long as the network can reach, so can the AVoIP signal, making distance virtually unlimited within a LAN." }
  ],
};