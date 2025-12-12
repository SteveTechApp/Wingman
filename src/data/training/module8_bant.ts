import { TrainingModule } from '../../utils/types';

export const MODULE_8_BANT: TrainingModule = {
  id: 'module-8-bant',
  title: 'Qualifying with BANT',
  contentPages: [
    {
      title: 'What is BANT?',
      content:
        '**BANT** is a sales qualification framework used to identify and assess potential leads. It helps you determine if a prospect is a good fit before you invest too much time.\n\nIt stands for:\n- **B**udget\n- **A**uthority\n- **N**eed\n- **T**imeline',
      asset: {
        url: 'https://i.imgur.com/mX7rD4C.png',
        title: 'BANT: Budget, Authority, Need, Timeline.',
        type: 'diagram',
      },
    },
    {
      title: 'The Four Pillars',
      content:
        '- **Budget**: Does the client have the financial resources for this project? It might not be a specific number, but a range or an understanding of the investment required.\n- **Authority**: Are you speaking with the person who has the power to make the final purchasing decision? If not, who is, and how can you get in touch with them?\n- **Need**: What is the core business problem the client is trying to solve? Understanding their pain points is key to proposing the right solution.\n- **Timeline**: When does the client need the solution to be implemented? This helps you prioritize opportunities and manage resources.',
      asset: {
        url: 'https://i.imgur.com/pL0m0aY.png',
        title: 'Each pillar of BANT helps you qualify a sales lead.',
        type: 'diagram',
      },
    },
    {
      title: 'Using BANT with Wingman',
      content:
        'When you receive a client brief, try to identify the BANT elements. For example:\n- *"Our budget for this is around $25,000"* clearly defines the **Budget**.\n- *"We need to improve our video conferencing experience"* establishes the **Need**.\n- *"The project needs to be completed by the end of Q3"* sets the **Timeline**.\n\nWingman can use this information to select appropriate products within the Bronze, Silver, or Gold design tiers that align with the client\'s budget and needs.',
      asset: {
        url: 'https://i.imgur.com/kS9R1xT.png',
        title: 'Finding BANT clues within a client\'s email.',
        type: 'image',
      },
    },
  ],
  quiz: [
    {
      question: 'In BANT, what does "Authority" refer to?',
      options: [
        'The technical specifications of the project',
        'The person who can make the buying decision',
        'The company\'s brand guidelines',
      ],
      correctAnswer: 'The person who can make the buying decision',
      explanation: 'Authority is about identifying the key decision-maker to ensure you are talking to the right person.',
    },
  ],
};