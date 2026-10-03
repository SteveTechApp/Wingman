// English guided-interview tables — lazy-loaded only when the capture
// language is selected (see discoveryGuidedInterviewI18n.loadInterviewLanguage),
// so the Discovery chunk does not ship every language's phrase data upfront.
import type { LanguageTable } from "./localeTypes";

const table: LanguageTable = {
  stopwords: new Set(["the","a","an","and","or","of","to","in","on","for","with","we","they","it","is","are","have","has","had","need","needs","needed","want","wants","would","like","just","only","about","around","probably","maybe","should","can","could","also","plus","both","use","uses","using","used","will","going","get","got","there","their","this","that","these","those","what","how"]),
  unknown: ["not sure","don't know","dont know","do not know","unknown","unsure","undecided","not decided","no idea","haven't decided","hmm","not yet","not confirmed"],
  curated: {
    "opportunity": {
      "meeting-room": [
        "meeting room",
        "boardroom",
        "board room",
        "conference room",
        "huddle",
        "executive room",
        "seminar room",
        "office room",
        "meeting"
      ],
      "classroom": [
        "classroom",
        "teaching",
        "lecture room",
        "lecture theatre",
        "training room",
        "lesson",
        "school",
        "university",
        "college",
        "education",
        "lecture"
      ],
      "hospitality": [
        "bar",
        "restaurant",
        "venue",
        "pub",
        "hotel",
        "lounge",
        "hospitality",
        "cafe",
        "café",
        "reception",
        "club"
      ],
      "video-wall": [
        "video wall",
        "led wall",
        "videowall",
        "screen wall",
        "wall of screens",
        "digital signage wall",
        "led screen"
      ],
      "av-over-ip": [
        "over ip",
        "over ip network",
        "distributed video",
        "campus",
        "networked",
        "many rooms",
        "multiple rooms",
        "multi room",
        "ip video",
        "av over ip",
        "network distribution"
      ],
      "not-sure": [
        "not sure",
        "unsure",
        "undecided",
        "don't know",
        "no idea",
        "unknown"
      ]
    },
    "scale": {
      "single-small-room": [
        "small room",
        "huddle room",
        "one room",
        "single room",
        "1 room",
        "small"
      ],
      "single-large-room": [
        "large room",
        "big room",
        "one large room",
        "single large",
        "boardroom",
        "large"
      ],
      "multi-room": [
        "multiple rooms",
        "multi room",
        "several rooms",
        "two rooms",
        "three rooms",
        "few rooms",
        "several"
      ],
      "building-wide": [
        "building",
        "campus",
        "whole floor",
        "entire floor",
        "whole building",
        "entire building",
        "site wide",
        "floor"
      ],
      "unknown-scale": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "sources": {
      "one-source": [
        "one source",
        "single source",
        "1 source",
        "one laptop",
        "single laptop"
      ],
      "two-four-sources": [
        "two",
        "2",
        "four",
        "4",
        "a couple",
        "pair",
        "two laptops",
        "two sources",
        "few sources"
      ],
      "five-eight-sources": [
        "five",
        "5",
        "six",
        "6",
        "seven",
        "7",
        "eight",
        "8"
      ],
      "nine-plus-sources": [
        "nine",
        "9",
        "ten",
        "10",
        "dozen",
        "lots",
        "many sources",
        "eleven",
        "twelve"
      ],
      "unknown-sources": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "displays": {
      "one-display": [
        "one display",
        "single display",
        "one screen",
        "single screen",
        "1 screen",
        "just one"
      ],
      "two-displays": [
        "two displays",
        "two screens",
        "dual",
        "2 screens",
        "pair of screens"
      ],
      "three-eight-displays": [
        "three",
        "3",
        "four",
        "4",
        "five",
        "5",
        "six",
        "6",
        "seven",
        "7",
        "eight",
        "8",
        "a few screens"
      ],
      "nine-plus-displays": [
        "nine",
        "9",
        "ten",
        "10",
        "dozen",
        "many screens",
        "lots of screens"
      ],
      "video-wall-output": [
        "video wall",
        "led wall",
        "videowall",
        "wall of screens",
        "led processor"
      ]
    },
    "display-behaviour": {
      "same-content-all-displays": [
        "same content",
        "same on all",
        "mirror",
        "mirrored",
        "all screens",
        "all displays",
        "everything the same",
        "same picture"
      ],
      "independent-routing-per-display": [
        "different content",
        "independent",
        "any source",
        "each screen",
        "each display",
        "separate",
        "individual",
        "zone",
        "anywhere to anywhere"
      ],
      "video-wall-or-processor-feed": [
        "video wall",
        "led wall",
        "processor feed",
        "full canvas",
        "wall processor"
      ],
      "multiview-on-one-output": [
        "multiview",
        "multi view",
        "several sources",
        "multiple sources on one",
        "composed",
        "windows on one",
        "one output"
      ],
      "unknown-display-behaviour": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "signal-standard": {
      "1080p-standard-hdmi": [
        "1080p",
        "1080",
        "standard hd",
        "full hd",
        "hd picture"
      ],
      "4k60-standard": [
        "standard 4k",
        "4k60",
        "uhd",
        "3840",
        "normal 4k"
      ],
      "4k60-hdr-hdcp": [
        "4k hdr",
        "hdr",
        "hdcp",
        "premium 4k",
        "high dynamic range",
        "4k with hdr"
      ],
      "legacy-edid-risk": [
        "edid",
        "legacy",
        "older screens",
        "old screens",
        "mixed screens",
        "compatibility issues",
        "old and new"
      ],
      "unknown-signal-standard": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "source-connection": {
      "fixed-hdmi-sources": [
        "media player",
        "room pc",
        "signage player",
        "set top box",
        "set-top box",
        "apple tv",
        "fixed",
        "permanent",
        "cable box",
        "blu ray",
        "blu-ray",
        "fixed sources"
      ],
      "laptops-wireless-inputs": [
        "laptop",
        "usb c",
        "usb-c",
        "wireless presentation",
        "airplay",
        "miracast",
        "screen share",
        "casting",
        "byod",
        "laptops"
      ],
      "mixed-hdmi-usbc": [
        "mixed",
        "both",
        "fixed and",
        "and laptops",
        "laptops and",
        "mix of"
      ],
      "network-video-sources": [
        "network video",
        "ndi",
        "over ip",
        "streams",
        "networked sources",
        "ip cameras"
      ],
      "unknown-source-connectors": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "uc-purpose": {
      "video-conferencing": [
        "video conferencing",
        "conferencing",
        "teams",
        "zoom",
        "calls",
        "video call",
        "skype",
        "webex",
        "meet",
        "phone calls"
      ],
      "recording-streaming": [
        "recording",
        "record",
        "streaming",
        "stream",
        "lecture capture",
        "webcast",
        "live stream",
        "capture"
      ],
      "camera-distribution-only": [
        "camera distribution",
        "send camera",
        "route camera",
        "camera to display",
        "camera to the screen",
        "camera to the tv",
        "camera routing"
      ],
      "microphones-only": [
        "microphones only",
        "mic only",
        "just mics",
        "no camera",
        "speech reinforcement",
        "paging",
        "announcement",
        "sound reinforcement"
      ],
      "no-uc": [
        "no camera",
        "no microphone",
        "no cameras",
        "no mics",
        "no uc",
        "no conferencing",
        "no video conferencing",
        "nothing",
        "none"
      ],
      "unknown-uc": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "uc-camera": {
      "fixed-usb-camera": [
        "webcam",
        "fixed camera",
        "usb camera",
        "meeting owl",
        "built in camera",
        "logitech",
        "fixed usb"
      ],
      "usb-ptz-camera": [
        "usb ptz",
        "ptz camera",
        "pan tilt",
        "usb ptz camera",
        "ptz"
      ],
      "hdmi-ptz-camera": [
        "hdmi ptz",
        "hdmi camera",
        "camera with hdmi",
        "hdmi ptz camera"
      ],
      "ndi-network-camera": [
        "ndi",
        "network camera",
        "ip camera",
        "network ptz",
        "ndi ptz"
      ],
      "other-camera": [
        "existing camera",
        "sdi",
        "old camera",
        "analogue camera",
        "other camera"
      ],
      "unknown-camera": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "uc-camera-count": {
      "one-camera": [
        "one camera",
        "single camera",
        "1 camera",
        "just one"
      ],
      "two-cameras": [
        "two cameras",
        "2 cameras",
        "pair of cameras",
        "dual cameras"
      ],
      "three-four-cameras": [
        "three",
        "3",
        "four",
        "4",
        "three cameras",
        "four cameras"
      ],
      "five-plus-cameras": [
        "five",
        "5",
        "more than four",
        "six",
        "six plus",
        "several cameras"
      ],
      "unknown-camera-count": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "uc-microphones": {
      "speakerphone": [
        "speakerphone",
        "speaker phone",
        "soundbar",
        "jabra",
        "poly",
        "tabletop speaker"
      ],
      "table-microphone": [
        "table mic",
        "table microphone",
        "desk mic",
        "gooseneck",
        "tabletop mic"
      ],
      "ceiling-microphone-array": [
        "ceiling",
        "ceiling array",
        "overhead",
        "ceiling mic",
        "ceiling microphone",
        "array"
      ],
      "wireless-microphone": [
        "wireless",
        "radio mic",
        "lapel",
        "lavalier",
        "handheld",
        "headset",
        "wireless mic"
      ],
      "lectern-microphone": [
        "lectern",
        "podium",
        "pulpit",
        "lectern mic"
      ],
      "existing-microphone-system": [
        "existing",
        "already have",
        "installed",
        "existing system"
      ],
      "no-microphones": [
        "no microphones",
        "no mics",
        "no mic",
        "none",
        "no microphone"
      ],
      "unknown-microphones": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "uc-microphone-count": {
      "one-microphone-feed": [
        "one",
        "single",
        "1",
        "one feed",
        "one mic"
      ],
      "two-four-microphone-feeds": [
        "two",
        "2",
        "three",
        "3",
        "four",
        "4",
        "a couple",
        "pair"
      ],
      "five-eight-microphone-feeds": [
        "five",
        "5",
        "six",
        "6",
        "seven",
        "7",
        "eight",
        "8"
      ],
      "nine-plus-microphone-feeds": [
        "nine",
        "9",
        "ten",
        "10",
        "lots",
        "many"
      ],
      "unknown-microphone-count": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "usb": {
      "no-usb": [
        "no usb",
        "usb not",
        "none",
        "no usb transport"
      ],
      "byod-byom": [
        "visitor laptop",
        "laptop owns",
        "their laptop",
        "my laptop",
        "user laptop",
        "laptop uses",
        "plug their laptop",
        "byod"
      ],
      "room-pc-uc": [
        "room pc",
        "teams room owns",
        "appliance owns",
        "room computer",
        "the room owns",
        "fixed pc"
      ],
      "switchable-host-usb": [
        "switch between",
        "switchable",
        "host switch",
        "switches",
        "take over",
        "change host"
      ],
      "room-host-usb2": [
        "usb 2",
        "standard usb",
        "usb 2.0",
        "basic usb"
      ],
      "usb3-high-bandwidth-path": [
        "usb 3",
        "usb3",
        "high bandwidth",
        "3.0",
        "fast usb"
      ],
      "usb-extension-required": [
        "extend",
        "extension",
        "long run",
        "distance",
        "far away",
        "long distance",
        "over long",
        "usb over"
      ],
      "interactive-usb": [
        "touch",
        "interactive",
        "annotation",
        "touchback"
      ],
      "unknown-usb": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "audio": {
      "no-room-audio": [
        "no audio",
        "no speakers",
        "no room audio",
        "none",
        "no sound system"
      ],
      "display-audio": [
        "screen speakers",
        "display speakers",
        "tv speakers",
        "soundbar on the display",
        "display audio",
        "speakers in the screen"
      ],
      "source-audio-deembed": [
        "de embed",
        "de-embed",
        "pull audio",
        "separate audio out",
        "audio to the mixer",
        "extract audio"
      ],
      "room-audio": [
        "room speakers",
        "ceiling speakers",
        "amplifier",
        "amp",
        "loudspeakers",
        "speakers in the room",
        "powered speakers",
        "room audio"
      ],
      "stereo-low-impedance": [
        "stereo",
        "low impedance",
        "4 ohm",
        "8 ohm",
        "hi-fi"
      ],
      "multichannel-audio": [
        "surround",
        "5.1",
        "7.1",
        "multichannel",
        "multi channel"
      ],
      "distributed-70v-100v": [
        "70 volt",
        "70v",
        "100v",
        "distributed speakers",
        "background music",
        "zones",
        "zoned",
        "constant voltage"
      ],
      "separate-programme-voice": [
        "separate programme",
        "voice reinforcement",
        "speech and music",
        "programme and voice"
      ],
      "analogue-audio-override": [
        "analogue",
        "analog",
        "fallback",
        "local override"
      ],
      "digital-audio-interface": [
        "digital audio",
        "aes",
        "spdif",
        "spdif out",
        "aes ebu"
      ],
      "dante-network-audio": [
        "dante",
        "network audio",
        "aes67"
      ],
      "unknown-audio": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "control": {
      "simple-auto": [
        "automatic",
        "auto",
        "simple",
        "one button",
        "preset",
        "no control",
        "just works"
      ],
      "front-panel-remote": [
        "remote",
        "front panel",
        "ir remote",
        "handheld remote"
      ],
      "touch-panel": [
        "touch panel",
        "touchscreen",
        "touch screen",
        "wall panel",
        "keypad",
        "touch"
      ],
      "software-app-control": [
        "app",
        "software",
        "browser",
        "tablet app",
        "mobile app",
        "phone app",
        "web page"
      ],
      "third-party-control": [
        "crestron",
        "control4",
        "qsys",
        "q-sys",
        "amx",
        "extron",
        "control system",
        "integration",
        "bms"
      ],
      "unknown-control": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "source-device-workflows": {
      "user-laptops": [
        "laptop",
        "laptops",
        "visitor laptop",
        "staff laptop"
      ],
      "room-pc-uc-source": [
        "room pc",
        "uc appliance",
        "computer",
        "workstation"
      ],
      "signage-media-players": [
        "signage",
        "media player",
        "digital signage",
        "players"
      ],
      "broadcast-tv-feeds": [
        "broadcast",
        "tv",
        "live tv",
        "satellite",
        "cable tv",
        "sky"
      ],
      "teaching-visualisers": [
        "visualiser",
        "document camera",
        "lectern",
        "teaching",
        "elmo"
      ],
      "operational-workstations": [
        "operational",
        "dashboard",
        "control room",
        "workstation"
      ],
      "cameras-production": [
        "camera",
        "cameras",
        "production",
        "video feeds"
      ],
      "specialist-simulation-medical": [
        "simulation",
        "clinical",
        "medical",
        "specialist",
        "surgical"
      ],
      "network-remote-feeds": [
        "network feed",
        "remote room",
        "remote site",
        "streamed",
        "network video"
      ],
      "wireless-casting-source": [
        "wireless",
        "casting",
        "airplay",
        "screen share",
        "miracast",
        "chromecast"
      ],
      "unknown-source-devices": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "wireless-presentation-operation": {
      "guest-no-network": [
        "guest",
        "no network",
        "visitors",
        "without network",
        "guests"
      ],
      "managed-staff-casting": [
        "staff",
        "managed",
        "corporate",
        "employees"
      ],
      "button-dongle-workflow": [
        "button",
        "dongle",
        "click share",
        "click-share"
      ],
      "moderated-presenters": [
        "moderate",
        "moderation",
        "preview",
        "approve",
        "host controls"
      ],
      "simultaneous-wireless-multiview": [
        "simultaneous",
        "several contributors",
        "four way",
        "quad",
        "split screen"
      ],
      "wireless-touchback": [
        "touchback",
        "annotation",
        "touch"
      ],
      "wireless-room-routing": [
        "route",
        "beyond one display",
        "other displays",
        "anywhere in the room"
      ],
      "no-wireless-presentation": [
        "no wireless",
        "none",
        "no casting",
        "no screen share"
      ],
      "unknown-wireless-operation": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "multiview-destination": {
      "multiview-single-display": [
        "single display",
        "one display",
        "flat panel",
        "one screen",
        "single screen",
        "a tv"
      ],
      "multiview-projector": [
        "projector",
        "projection",
        "screen"
      ],
      "multiview-video-wall": [
        "video wall",
        "lcd wall",
        "wall of screens"
      ],
      "multiview-led-processor": [
        "led wall",
        "led processor",
        "led"
      ],
      "multiview-confidence-monitor": [
        "confidence",
        "operator monitor",
        "control room",
        "monitor"
      ],
      "multiview-record-stream": [
        "recording",
        "streaming",
        "record",
        "stream",
        "capture"
      ],
      "multiview-uc-return": [
        "teams",
        "zoom",
        "return",
        "back to the call",
        "uc return"
      ],
      "unknown-multiview-destination": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "multiview-operation": {
      "fixed-layout-presets": [
        "fixed",
        "preset",
        "named layouts",
        "saved layouts"
      ],
      "operator-dynamic-layout": [
        "operator",
        "dynamic",
        "builds layouts",
        "changes layouts"
      ],
      "automatic-layout": [
        "automatic",
        "auto",
        "active speaker",
        "auto layout"
      ],
      "two-four-simultaneous": [
        "2",
        "two",
        "3",
        "3",
        "four",
        "4",
        "a couple",
        "pair"
      ],
      "five-nine-simultaneous": [
        "five",
        "5",
        "six",
        "6",
        "seven",
        "7",
        "eight",
        "8",
        "nine",
        "9"
      ],
      "ten-plus-simultaneous": [
        "ten",
        "10",
        "lots",
        "many",
        "more than nine"
      ],
      "independent-compositions": [
        "different compositions",
        "independent",
        "separate outputs",
        "different outputs"
      ],
      "unknown-multiview-operation": [
        "not sure",
        "unknown",
        "don't know"
      ]
    },
    "uc-audio-processing": {
      "direct-integrated-audio": [
        "direct",
        "integrated",
        "no external dsp",
        "built in"
      ],
      "dsp-aec-automix": [
        "dsp",
        "aec",
        "automix",
        "echo cancellation",
        "processing"
      ],
      "local-voice-reinforcement": [
        "voice reinforcement",
        "local reinforcement",
        "hearing",
        "amplification"
      ],
      "independent-record-mix": [
        "recording mix",
        "streaming mix",
        "independent mix",
        "separate mix"
      ],
      "audio-bridge-usb-dante-analogue": [
        "bridge",
        "usb and dante",
        "analogue and",
        "audio bridge"
      ],
      "multiple-audio-zones": [
        "zones",
        "different outputs",
        "multiple zones",
        "separate zones"
      ],
      "operator-audio-control": [
        "operator",
        "mute control",
        "mixing",
        "djmix"
      ],
      "unknown-audio-processing": [
        "not sure",
        "unknown",
        "don't know"
      ]
    }
  },
  // English uses the governed question text directly (no stem table).
  voicePreview: "Hello. I'll ask you a few questions about this room, and Wingman will build the system as we go.",
};

export default table;
