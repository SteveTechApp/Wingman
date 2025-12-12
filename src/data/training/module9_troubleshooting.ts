import { TrainingModule } from '../../utils/types';

export const MODULE_9_TROUBLESHOOTING: TrainingModule = {
  id: 'module-9-troubleshooting',
  title: 'Troubleshooting Common Issues',
  contentPages: [
    {
      title: 'The Troubleshooting Mindset',
      content:
        "Effective troubleshooting is a methodical process, not guesswork. The golden rule is **'Check the Physical Layer First!'** Over 80% of AV issues are related to cables and connections.\n\nAdopt this workflow:\n1.  **Verify Signal Flow**: Trace the path from the source to the destination.\n2.  **Isolate the Problem**: Use the 'divide and conquer' method to pinpoint the faulty component.\n3.  **Check the Simple Stuff**: Are devices powered on? Are they on the correct input?\n4.  **Make One Change at a Time**: Change one thing, test, and observe the result.",
      asset: {
        url: 'https://i.imgur.com/G4V8z8M.png',
        title: 'A logical troubleshooting workflow.',
        type: 'diagram',
      },
    },
    {
      title: 'Problem 1: "No Signal"',
      content:
        "This is the most common field issue. It means the display is not receiving a valid video signal.\n\n**Troubleshooting Steps**:\n- **Confirm the Source**: Is the source device powered on and outputting a signal?\n- **Check the Display**: Is the display powered on and set to the correct input (e.g., HDMI 1)?\n- **Inspect Cables**: Check that all cables are securely plugged in at both ends.\n- **The Handshake**: Power cycling all devices in the signal chain (source, extenders, switcher, display) can force a new **HDMI handshake** and often resolves the issue.",
      asset: {
        url: 'https://i.imgur.com/kH8eU3W.png',
        title: 'The dreaded "No Signal" message.',
        type: 'image',
      },
    },
    {
      title: 'Problem 2: HDCP Errors',
      content:
        "An **HDCP error** (often a blank screen, flashing, or an explicit error message) occurs when the content protection handshake fails.\n\n**Common Causes**:\n- **Version Mismatch**: A source requiring HDCP 2.2 is connected to a display that only supports HDCP 1.4.\n- **Non-Compliant Device**: A device in the chain (like a cheap splitter) does not support HDCP.\n\n**Resolution**:\n- Ensure **every device** in the signal path supports the required HDCP version.",
      asset: {
        url: 'https://i.imgur.com/f9c8f8L.png',
        title: 'An example of an HDCP error message.',
        type: 'image',
      },
    },
    {
      title: 'Problem 3: Sparkles, "Snow", or Dropouts',
      content:
        "These visual artifacts indicate a poor quality signal, often called **'signal integrity'** issues. The data is arriving, but it's corrupted.\n\n**Key Causes**:\n- **Cable Length**: The HDMI or category cable is too long for the signal bandwidth.\n- **Cable Quality**: The cable is low quality, damaged, or has a poor termination.\n- **Interference**: The AV cable is running too close to high-voltage power lines (EMI).\n\n**Solutions**:\n- Use shorter, higher-quality certified cables or an appropriate extender.",
      asset: {
        url: 'https://i.imgur.com/zW3b9hJ.jpg',
        title: 'Video "snow" is a classic sign of poor signal integrity.',
        type: 'image',
      },
    },
    {
      title: 'Problem 4: Audio & Control Issues',
      content:
        "**Audio Problems**:\n- **No Audio**: Check for mutes. Verify audio de-embedding settings. Check **EDID** settings to ensure the source is sending a compatible format.\n\n**Control Problems**:\n- **RS-232**: Verify **TX (transmit) and RX (receive)** connections are correct (TX from controller goes to RX on device). Ensure baud rate settings match.\n- **IP Control**: Confirm the device and controller are on the same network. Use a **'ping'** command to verify basic network connectivity.",
      asset: {
        url: 'https://i.imgur.com/Q6D8n3b.png',
        title: 'A common mistake is connecting TX-to-TX and RX-to-RX.',
        type: 'diagram',
      },
    },
  ],
  quiz: [
    { question: "What is the first thing you should always check when troubleshooting an AV system?", options: ["Software settings", "The physical layer (cables & connections)", "The warranty status"], correctAnswer: "The physical layer (cables & connections)", explanation: "Most AV issues are caused by simple physical problems like loose, damaged, or incorrect cables." },
    { question: "What is the 'divide and conquer' method?", options: ["Trying all settings at once", "Systematically bypassing components to isolate a fault", "Asking the client to fix it"], correctAnswer: "Systematically bypassing components to isolate a fault", explanation: "This method helps you efficiently narrow down which part of the signal chain is causing the problem." },
    { question: "What is a common way to force a new HDMI 'handshake'?", options: ["Re-terminating the cable", "Power cycling all devices in the signal chain", "Changing the display's input name"], correctAnswer: "Power cycling all devices in the signal chain", explanation: "Turning devices off and on in the correct order (display first, source last) forces them to re-negotiate their connection." },
    { question: "An HDCP error typically occurs because of what?", options: ["A network failure", "A content protection mismatch", "Incorrect audio settings"], correctAnswer: "A content protection mismatch", explanation: "HDCP is an encryption standard. If any device in the chain doesn't support the required version, the handshake will fail." },
    { question: "Visual artifacts like sparkles or 'snow' are symptoms of...", options: ["Poor signal integrity", "An HDCP error", "A software bug"], correctAnswer: "Poor signal integrity", explanation: "These issues mean the signal is getting corrupted, often due to long or low-quality cables." },
    { question: "What is a common source of signal interference for AV cables?", options: ["Running them next to other data cables", "Running them parallel to high-voltage power lines", "Enclosing them in conduit"], correctAnswer: "Running them parallel to high-voltage power lines", explanation: "Power cables can induce electromagnetic interference (EMI) into AV cables, corrupting the signal." },
    { question: "What does EDID stand for?", options: ["Enhanced Digital Information Display", "External Device Information Data", "Extended Display Identification Data"], correctAnswer: "Extended Display Identification Data", explanation: "EDID is how a display tells a source what resolutions and audio formats it can accept." },
    { question: "If you have no audio, where should you check the de-embedding settings?", options: ["On the source device", "On the matrix switcher or extender receiver", "In the display's user menu"], correctAnswer: "On the matrix switcher or extender receiver", explanation: "These devices are often responsible for stripping audio from the HDMI signal and sending it to an amplifier." },
    { question: "In RS-232, the TX pin of a controller should connect to which pin on the controlled device?", options: ["TX", "RX", "GND"], correctAnswer: "RX", explanation: "Transmit (TX) must always connect to Receive (RX) for communication to occur." },
    { question: "What is the first step when troubleshooting IP control?", options: ["Checking the serial command", "Pinging the device's IP address", "Restarting the control processor"], correctAnswer: "Pinging the device's IP address", explanation: "Pinging confirms basic network connectivity between the controller and the device." },
    { question: "Which troubleshooting step involves testing a source directly with a display?", options: ["Isolating the problem", "Checking the handshake", "Verifying signal flow"], correctAnswer: "Isolating the problem", explanation: "By bypassing the AV system, you can quickly determine if the source or display itself is the problem." },
    { question: "A 4K signal is more susceptible to integrity issues than a 1080p signal because it requires more...", options: ["HDCP", "EDID", "Bandwidth"], correctAnswer: "Bandwidth", explanation: "Higher resolution signals require much more data, making them more sensitive to cable length and quality." },
    { question: "What is the correct power-up sequence to encourage a successful HDMI handshake?", options: ["Source, Switcher, Display", "Display, Switcher, Source", "All at once"], correctAnswer: "Display, Switcher, Source", explanation: "Powering on the display first allows it to be ready to tell the source what its capabilities are via EDID." },
    { question: "If a specific 4K source doesn't work, but other 1080p sources do, what is a likely culprit?", options: ["The display is broken", "The switcher's power supply has failed", "An HDCP version mismatch or bandwidth limitation"], correctAnswer: "An HDCP version mismatch or bandwidth limitation", explanation: "This points to an issue specific to the demands of 4K content, like HDCP 2.2 or 18Gbps bandwidth." },
    { question: "What is a simple, effective tool for testing category cables?", options: ["A multimeter", "A dedicated cable tester/certifier", "A laptop"], correctAnswer: "A dedicated cable tester/certifier", explanation: "A proper cable tester can verify all pairs are correctly terminated and can test for performance." },
    { question: "Mismatched baud rate settings would affect which type of control?", options: ["IP Control", "RS-232 Control", "IR Control"], correctAnswer: "RS-232 Control", explanation: "Baud rate is a fundamental setting for serial communication that must match on both the controller and the device." },
    { question: "If audio is distorted, what is a likely cause?", options: ["Incorrect IP address", "Amplifier gain is set too high", "Cable is too short"], correctAnswer: "Amplifier gain is set too high", explanation: "Setting the amplifier's gain level too high can cause the signal to 'clip', resulting in distortion." },
    { question: "When tracing signal flow, where should you start?", options: ["At the display", "At the source", "At the matrix switcher"], correctAnswer: "At the source", explanation: "Always start at the beginning of the path to ensure a valid signal is being sent from the source device." },
    { question: "What does 'making one change at a time' prevent?", options: ["Wasting time", "Not knowing what the actual fix was", "Damaging the equipment"], correctAnswer: "Not knowing what the actual fix was", explanation: "If you change multiple things and it works, you haven't learned what the root cause was." },
    { question: "What do status LEDs on extenders and switchers often indicate?", options: ["The product's age", "Power status and signal/link presence", "The current firmware version"], correctAnswer: "Power status and signal/link presence", explanation: "LEDs are a vital first-look diagnostic tool to see if devices are powered and if they are detecting a signal or link." },
  ],
};
