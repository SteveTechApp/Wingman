import { TrainingModule } from '../../utils/types';

export const MODULE_11_INSTALLATION: TrainingModule = {
  id: 'module-11-installation',
  title: 'Product Installation Best Practices',
  contentPages: [
    {
      title: 'Pre-Installation & Site Survey',
      content:
        "A successful installation begins long before any equipment is unboxed. The pre-installation phase is critical for avoiding costly mistakes and delays.\n\n**Key Steps**:\n1.  **Site Survey**: Visit the site to **verify all measurements**. Ensure the physical space matches the plans and check for obstructions.\n2.  **Verify Services**: Confirm the location and availability of **power and network ports**. Coordinate with electricians and IT departments early.\n3.  **Inspect Equipment**: Unpack and inspect all equipment for **shipping damage** as soon as it arrives on site.\n4.  **Coordinate with Other Trades**: Talk to the electricians, builders, and furniture installers to avoid conflicts.",
      asset: {
          url: 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=800&q=80',
          title: 'Pre-installation coordination with all trades is essential.',
          type: 'image',
      },
    },
    {
      title: 'Rack Building & Thermal Management',
      content:
        "The equipment rack is the heart of the system. A well-organized, properly ventilated rack is reliable and easy to service.\n\n**Best Practices**:\n- **Layout**: Place the **heaviest items** (amplifiers, UPS) at the **bottom** for stability.\n- **Signal Flow**: Arrange equipment logically (e.g., sources at top, processing middle, amps bottom).\n- **Cable Management**: **Separate power cables from signal cables** to prevent electromagnetic interference (EMI).\n- **Thermal Management**: Leave at least **1U (1.75 inches) of space** above hot devices. Use **blanking panels** to force cool air through equipment.",
      asset: {
          url: 'https://images.unsplash.com/photo-1601953935188-5179b0821b0b?w=800&q=80',
          title: 'Proper ventilation and cable management are hallmarks of a professional rack build.',
          type: 'image',
      },
    },
    {
      title: 'Cable Termination & Testing',
      content:
        "Your AV system is only as reliable as its weakest link, and that is often a poorly made cable.\n\n**Termination**:\n- **Use Quality Cable**: For infrastructure, always use **solid-core copper** category cable, not Copper Clad Aluminum (CCA).\n- **Follow Standards**: The **T568B** wiring standard is the most common for terminating RJ45 connectors in AV.\n\n**Testing**:\n- **Test Every Cable**: Before connecting equipment, every single cable must be tested. A simple continuity tester is good, but a **cable certifier** is better as it tests for performance at different frequencies.",
      asset: {
          url: 'https://images.unsplash.com/photo-1615962846185-321b67a3f2d3?w=800&q=80',
          title: 'Testing and certifying every cable prevents future headaches.',
          type: 'image',
      },
    },
    {
      title: 'Mounting Displays & Peripherals',
      content:
        "The physical installation of in-room hardware requires precision and a focus on safety.\n\n- **Displays**: Always use a mount that is rated for the **size and weight** of the display. Use a **spirit level** to ensure it's straight.\n- **Projectors**: Carefully calculate the **throw distance** to ensure the image is the correct size for the screen.\n- **Speakers**: Position speakers according to the audio plan for optimal coverage.\n- **Cameras & Microphones**: Place cameras to get the desired field of view and microphones to achieve the best audio pickup, avoiding noise sources like HVAC vents.",
      asset: {
          url: 'https://images.unsplash.com/photo-1593361394595-c541b5695689?w=800&q=80',
          title: 'Always use the correct mounting hardware and a spirit level.',
          type: 'image',
      },
    },
    {
      title: 'System Power-Up & Commissioning',
      content:
        "Commissioning is the final step where you bring the system to life and verify its functionality. The correct power-on sequence for an HDMI system is from the **end of the signal chain to the beginning**:\n\n1.  **Displays / Projectors FIRST**\n2.  AVR / Audio System\n3.  Matrix Switcher / Extenders\n4.  **Source Devices LAST**\n\nThis allows the display to report its capabilities (**EDID**) to the system before the source starts sending a signal.",
      asset: {
          url: 'https://i.imgur.com/s6n5F4p.jpg',
          title: 'Use a signal generator with test patterns to verify every signal path.',
          type: 'image',
      },
    },
  ],
  quiz: [
    { question: "When running cables in a rack, what is a crucial best practice to prevent interference?", options: ["Run all cables together for tidiness", "Separate power cables from signal cables", "Use the shortest cables possible"], correctAnswer: "Separate power cables from signal cables", explanation: "Power cables can create electromagnetic interference (EMI) that can corrupt AV and data signals if they are run in parallel over long distances." },
    { question: "What is the recommended power-up sequence for an HDMI system to ensure a proper 'handshake'?", options: ["Source, Switcher, Display", "Display, Switcher, Source", "All at once"], correctAnswer: "Display, Switcher, Source", explanation: "Powering on the display first allows it to report its capabilities (EDID) to the system, so the source knows what signal format to send." },
    { question: "What does the term '1U' refer to in an equipment rack?", options: ["1 inch of vertical space", "1.75 inches of vertical space", "1 foot of depth"], correctAnswer: "1.75 inches of vertical space", explanation: "A 'rack unit' or 'U' is a standard measure of height, equal to 1.75 inches. Leaving 1U is recommended for ventilation." },
    { question: "What wiring standard is most commonly used for terminating RJ45 connectors in AV installations?", options: ["T568A", "T568B", "Both are equally common"], correctAnswer: "T568B", explanation: "While both A and B are valid, T568B has become the de facto standard in commercial AV for consistency." },
    { question: "Before connecting equipment, what should be done with every newly installed infrastructure cable?", options: ["It should be cleaned", "It should be tested and certified", "It should be warmed up"], correctAnswer: "It should be tested and certified", explanation: "Testing every cable is a critical step to prevent hours of troubleshooting later. A simple continuity test is good, but a certification test is best." },
    { question: "When building a rack, where should the heaviest equipment like amplifiers be placed?", options: ["At the top for easy access", "In the middle for weight distribution", "At the bottom for stability"], correctAnswer: "At the bottom for stability", explanation: "Placing heavy items at the bottom lowers the rack's center of gravity, making it more stable and safer." },
    { question: "What do blanking panels do in an equipment rack?", options: ["They hide messy cables", "They are just for decoration", "They manage airflow by forcing cool air through equipment"], correctAnswer: "They manage airflow by forcing cool air through equipment", explanation: "Blanking panels prevent 'short cycling' of air, ensuring that cool air from the front is drawn through the hot equipment rather than around it." },
    { question: "What is the primary reason to visit a site for a survey before installation?", options: ["To meet the client", "To verify measurements and check for obstructions", "To take pictures for marketing"], correctAnswer: "To verify measurements and check for obstructions", explanation: "A site survey ensures that the designed system will physically fit in the space and that there are no unexpected surprises during installation." },
    { question: "What does 'throw distance' refer to in an installation?", options: ["How far you can throw a piece of equipment", "The distance from a projector's lens to the screen to create a certain image size", "The maximum length of an HDMI cable"], correctAnswer: "The distance from a projector's lens to the screen to create a certain image size", explanation: "Calculating the throw distance is critical to ensure the projected image fits the screen perfectly." },
    { question: "When testing a newly terminated category cable, what tool provides the most comprehensive results?", options: ["A simple continuity tester", "A cable certifier", "A multimeter"], correctAnswer: "A cable certifier", explanation: "While a continuity tester checks for basic wiring faults, a certifier tests for performance metrics like bandwidth and crosstalk, ensuring the cable can handle high-speed signals." }
  ],
};
