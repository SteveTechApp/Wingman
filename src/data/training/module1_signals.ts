import { TrainingModule } from '../../utils/types';

export const MODULE_1_SIGNALS: TrainingModule = {
  id: 'module-1-signals',
  title: 'Module 2: Core Signal Concepts',
  contentPages: [
    {
      title: 'Digital vs. Analog Signals',
      content:
        'At its core, AV is about moving signals from a source to a destination.\n\n- **Analog**: A continuous wave that is susceptible to noise and degradation over distance. Examples include VGA for video and RCA for audio. Analog is considered legacy technology.\n- **Digital**: A signal represented by binary code (1s and 0s). It is much more resistant to noise. If the data arrives, the picture is perfect. Examples include **HDMI, DisplayPort, and SDI**.',
      asset: {
        url: 'https://i.imgur.com/8f8sJ6W.png',
        title: 'An analog signal degrades with noise, while a digital signal remains perfect until it fails completely.',
        type: 'diagram',
      },
    },
    {
      title: 'Common Connection Types',
      content:
        'Modern AV systems use several types of digital connections. While they may look different, they all carry high-definition video and audio.\n\n- **HDMI (High-Definition Multimedia Interface)**: The most common standard for consumer and pro AV. A single cable carries video, audio, and sometimes control signals.\n- **DisplayPort (DP)**: Very common on PCs and monitors. Often supports higher refresh rates and resolutions than HDMI at a given time. Can be adapted to HDMI.\n- **USB-C**: The most versatile connector. A single USB-C cable can carry video (using DisplayPort Alternate Mode), data, network, and power to charge a laptop. This "one cable solution" is a key feature in modern meeting rooms.',
      asset: {
        url: 'https://images.unsplash.com/photo-1588695273632-613401569b76?w=800&q=80',
        title: 'From left to right: HDMI, DisplayPort, and USB-C connectors.',
        type: 'image',
      },
    },
    {
        title: 'The EDID Handshake',
        content:
          '**EDID (Extended Display Identification Data)** is a crucial piece of information that makes "plug and play" possible. It is the data a display sends to a source device to tell it what its capabilities are.\n\nWhen you plug in an HDMI cable, an **"EDID handshake"** occurs:\n1. The display says, "Hi, I\'m a 1080p TV and I support stereo audio."\n2. The source device reads this and says, "Okay, I will send you a 1080p signal with stereo audio."\n\nIf this handshake fails (due to a bad cable or incompatible device), you will often get a **black screen or "No Signal"** message, even if everything is plugged in correctly.',
        asset: {
          url: 'https://i.imgur.com/e2a2d4w.png',
          title: 'The EDID handshake is a two-way communication between a source and a display.',
          type: 'diagram',
        },
      },
      {
        title: 'Understanding Bandwidth',
        content:
          '**Bandwidth** is the data rate of a signal, measured in gigabits per second (Gbps). Higher resolution, higher frame rates, and less compression all require more bandwidth.\n\n- **1080p @ 60Hz** requires about 4.46 Gbps.\n- **4K @ 60Hz 4:4:4** requires **17.82 Gbps**.\n\nThis is why **18Gbps** is a critical number. All devices in a 4K60 signal chain (cables, switchers, extenders) must be rated to handle at least 18Gbps of bandwidth, or the signal will fail.',
        asset: {
          url: 'https://i.imgur.com/B1b1e9c.png',
          title: 'Higher quality video signals require significantly more bandwidth.',
          type: 'diagram',
        },
      },
    {
      title: 'Chroma Subsampling',
      content:
        "To save bandwidth, video signals often use chroma subsampling. It's expressed as a ratio like **4:4:4**, **4:2:2**, or **4:2:0**.\n\n- **4:4:4**: **No compression**. Every pixel gets full color information. This is **crucial** for sharp text and computer graphics.\n- **4:2:0**: **High compression**. Color information is shared across a 2x2 block of pixels. It\'s acceptable for movies and broadcast TV but can make text look blurry.\n\nFor most corporate and education applications, **4:4:4** support is preferred to ensure computer-generated content looks crisp.",
      asset: {
        url: 'https://i.imgur.com/qO5m3J6.png',
        title: 'A visual comparison of 4:4:4 vs 4:2:0 on fine text.',
        type: 'image',
      },
    },
    {
        title: 'Frame Rate & Refresh Rate',
        content:
          'These terms describe how quickly the image is updated, measured in **Hertz (Hz)**.\n\n- **Frame Rate (fps)**: How many frames per second a **source** (like a movie or game) is sending. Common rates are 24fps (cinema), 30fps, and 60fps.\n- **Refresh Rate (Hz)**: How many times per second the **display** redraws the image on the screen. Common rates are 60Hz, 120Hz, and higher for gaming.\n\nFor a smooth image, the display\'s refresh rate must be equal to or higher than the source\'s frame rate.',
        asset: {
            url: 'https://images.unsplash.com/photo-1559819225-82e7b1b35316?w=800&q=80',
            title: 'High refresh rates create smoother motion, which is especially important for gaming.',
            type: 'image',
        },
    },
    {
      title: 'Content Protection (HDCP)',
      content:
        '**HDCP** (High-bandwidth Digital Content Protection) is an encryption standard built into HDMI and other connections to prevent illegal copying of content from sources like Blu-ray players or streaming services.\n\n- Every device in the signal chain (source, switcher, extender, display) **must support the same version** of HDCP for the image to appear. A failure results in a black screen or an error message.\n- **HDCP 2.2** or higher is required for most **4K** content from streaming services and UHD Blu-ray.',
      asset: {
        url: 'https://images.unsplash.com/photo-1616453398348-772e09475149?w=800&q=80',
        title: 'HDCP protects content from sources like streaming services.',
        type: 'image',
      }
    },
  ],
  quiz: [
    {
      question: 'Which connector can carry video, data, and power for charging a laptop over a single cable?',
      options: ['HDMI', 'DisplayPort', 'USB-C'],
      correctAnswer: 'USB-C',
      explanation: 'USB-C is highly versatile and can handle video, data, and power delivery, making it ideal for "one cable" docking solutions.',
    },
    {
      question: 'What is the primary purpose of EDID?',
      options: ['To encrypt the video signal', 'To tell the source what the display\'s capabilities are', 'To extend the signal distance'],
      correctAnswer: 'To tell the source what the display\'s capabilities are',
      explanation: 'EDID allows a display to communicate its supported resolutions and audio formats to the source device.',
    },
    { question: 'What is the minimum required bandwidth for a 4K/60Hz 4:4:4 signal?', options: ['10Gbps', '18Gbps', '48Gbps'], correctAnswer: '18Gbps', explanation: 'A full 4K60 4:4:4 signal requires 17.82 Gbps, so all components in the chain must support at least 18Gbps.' },
    { question: 'Which signal type is considered "legacy" and is susceptible to noise?', options: ['HDMI', 'VGA', 'DisplayPort'], correctAnswer: 'VGA', explanation: 'VGA is an analog signal, which degrades over distance and is susceptible to electrical interference.' },
    { question: 'What does a chroma subsampling of 4:4:4 mean?', options: ['The color is highly compressed', 'There is no color compression', 'The signal is black and white'], correctAnswer: 'There is no color compression', explanation: '4:4:4 means every pixel has its own unique color information, which is best for text and computer graphics.' },
    { question: 'What version of HDCP is typically required for protected 4K content?', options: ['HDCP 1.4', 'HDCP 2.0', 'HDCP 2.2'], correctAnswer: 'HDCP 2.2', explanation: 'HDCP 2.2 was introduced specifically to protect 4K UHD content from sources like streaming services and 4K Blu-ray players.' },
    { question: 'What is the "Refresh Rate" of a display measured in?', options: ['Gbps', 'Hz', 'Meters'], correctAnswer: 'Hz', explanation: 'Refresh Rate is measured in Hertz (Hz), representing the number of times per second the display redraws the image.' },
    { question: 'A source is outputting 60fps. What is the minimum refresh rate the display should have for smooth motion?', options: ['30Hz', '60Hz', '120Hz'], correctAnswer: '60Hz', explanation: 'The display\'s refresh rate should be at least equal to the source\'s frame rate to display every frame.' },
    { question: 'If you see blurry text on a screen showing a computer desktop, what is a likely cause?', options: ['The screen is too small', 'A 4:2:0 chroma subsampling is being used', 'The EDID handshake failed'], correctAnswer: 'A 4:2:0 chroma subsampling is being used', explanation: '4:2:0 compression is great for motion video but can make fine details like text appear blurry or indistinct.' },
    { question: 'What does "plug and play" for an HDMI device rely on?', options: ['HDCP', 'EDID', 'Bandwidth'], correctAnswer: 'EDID', explanation: 'The EDID handshake is the automatic process where the source learns what the display can handle, making the connection seamless for the user.' }
  ],
};