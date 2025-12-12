import { TrainingModule } from '../../utils/types';

export const MODULE_8B_SALES_INQUIRY: TrainingModule = {
  id: 'module-8b-sales-inquiry',
  title: 'Sales Inquiry Cheat Sheet',
  contentPages: [
    {
      title: 'The Goal: Listen, Don\'t Solve',
      content:
        "When you first speak with a client, your primary goal is to **understand their needs**, not to design a system on the spot. This cheat sheet provides questions to help you gather the critical information needed to build a thoughtful, accurate proposal.\n\nFocus on understanding the **'what'** and the **'why'** before you jump to the **'how'**. Use these questions to guide the conversation and position yourself as a consultant, not just a salesperson.",
    },
    {
      title: 'Understanding the Big Picture (The "Why")',
      content:
        "These questions help uncover the core business drivers behind the project.\n\n- **Question**: \"What is the main purpose of this space? What are you trying to achieve or improve?\"\n  - *Note: This reveals the core business need. Is it for better internal collaboration, impressing visiting clients, or improving training outcomes?*\n\n- **Question**: \"Who are the primary users of this room? How would you describe their technical skill level?\"\n  - *Note: This dictates the required simplicity of the control system. An executive boardroom needs a foolproof interface, whereas a tech company's huddle space might tolerate more complexity.*\n\n- **Question**: \"What does success look like for this project?\"\n  - *Note: This helps you understand their most important metric. Is it reliability, ease of use, a 'wow' factor, or staying under budget?*",
    },
    {
      title: 'Uncovering Functional Needs (The "What")',
      content:
        "These questions get into the specific technical requirements.\n\n- **Question**: \"What types of devices will people need to connect? (e.g., Laptops, guest devices, room PCs)\"\n  - *Note: This determines the required physical inputs: HDMI, USB-C, DisplayPort, etc.*\n\n- **Question**: \"What kind of content will be shown on the main display(s)? (e.g., Presentations, video calls, live video, data dashboards)\"\n  - *Note: This defines the video performance requirements. Static presentations are less demanding than full-motion video. Fine text requires better color reproduction (4:4:4 chroma subsampling).*\n\n- **Question**: \"Is video conferencing a key part of how this room will be used? If so, which platforms do you use (Teams, Zoom, etc.)?\"\n  - *Note: This is a critical fork in the design. If yes, we must consider cameras, microphones, and a strategy for connecting to the UC platform (BYOM vs. dedicated room computer).*",
    },
    {
      title: 'The BANT Questions (The "How Much & When")',
      content:
        "These are the classic sales qualification questions to ensure this is a real, actionable opportunity.\n\n- **Budget**: \"To ensure we propose a solution that aligns with your expectations, have you allocated a budget for this project? Is there a rough range you're working within?\"\n  - *Note: This is the most important qualifier. It immediately frames the solution within Bronze, Silver, or Gold design tiers.*\n\n- **Authority**: \"Who, besides yourself, will be involved in the final decision-making process for this project?\"\n  - *Note: This confirms you're speaking to the right person, or helps you identify the key stakeholder with final authority.*\n\n- **Timeline**: \"What is your ideal timeline for having this system fully installed and operational?\"\n  - *Note: This helps you understand the urgency and prioritize the lead. It also uncovers dependencies on other construction or renovation work.*",
    },
    {
      title: 'Wrapping Up & Next Steps',
      content:
        "End the call by summarizing what you've learned and setting clear expectations for the next step.\n\n**Example Closing**: *\"Thank you, this has been very helpful. Based on what we've discussed, it sounds like you need a reliable, dual-screen conferencing room that's easy for anyone to use, and you're looking to have it completed by the end of Q3. The next step for us is to schedule a brief site survey to confirm some physical details. After that, I can put together a formal proposal for you. How does that sound?\"*\n\nThis confirms you were listening and positions the site survey as the logical next step in a professional process.",
    },
  ],
  quiz: [
    {
      question: "What is the primary goal of an initial sales inquiry call?",
      options: ["To design a complete AV system on the spot", "To understand the client's needs and qualify the opportunity", "To get the client to sign a contract immediately"],
      correctAnswer: "To understand the client's needs and qualify the opportunity",
      explanation: "The initial call is for discovery and qualification. A detailed design can only be created after gathering all the necessary information.",
    },
    {
      question: "Asking about the users' technical skill level helps determine what?",
      options: ["The required video resolution", "The required simplicity of the control system", "The number of inputs needed"],
      correctAnswer: "The required simplicity of the control system",
      explanation: "A room for non-technical users (like executives) requires a much simpler, more intuitive control interface than a room for IT professionals.",
    },
  ],
};