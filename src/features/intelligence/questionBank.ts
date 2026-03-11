import type { QuestionGroup } from "./types";

export const questionBank: QuestionGroup[] = [
  {
    id: "display",
    questions: [
      "How many displays or screens do you expect in the space?",
      "Do they need to show the same content, different content, or either?",
      "Will this be a display, projector, video wall, or LED wall?"
    ]
  },
  {
    id: "sources",
    questions: [
      "What will users connect from most often: laptop, in-room PC, camera source, TV source, or something else?",
      "Will they plug in with HDMI, USB-C, wireless sharing, or a mix of those?",
      "Do you need to show more than one source at the same time?"
    ]
  },
  {
    id: "conferencing",
    questions: [
      "Does the space need to support video meetings?",
      "Is that mainly Teams, Zoom, or a bring-your-own-laptop style setup?",
      "Do users need the room camera, microphones, and audio to work with their own laptops?"
    ]
  },
  {
    id: "audio",
    questions: [
      "Do you just need basic audio, or does speech need to be clearly heard across the space?",
      "Will microphones be needed for presenters, table participants, or audience questions?",
      "Is there any need for background music or distributed audio?"
    ]
  },
  {
    id: "capture",
    questions: [
      "Does anything need to be recorded or streamed?",
      "Do you need lecture capture, overflow viewing, confidence monitoring, or remote observation?"
    ]
  },
  {
    id: "control",
    questions: [
      "Does this need to be very easy for non-technical users?",
      "Would a simple touch panel or one-button start experience help?",
      "Do you want users to choose room modes such as presentation, meeting, or divided-room mode?"
    ]
  },
  {
    id: "installation",
    questions: [
      "Will equipment sit in the room, under the table, or back in a rack or comms room?",
      "Roughly how far is it from the user connection point to the display location?",
      "Is there already a network infrastructure you want to make use of?"
    ]
  },
  {
    id: "content-management",
    questions: [
      "Who will update the content and how often?",
      "Do you need central management across one site or multiple sites?",
      "Should local staff be able to override centrally scheduled content?"
    ]
  }
];