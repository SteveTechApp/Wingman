// French guided-interview tables — lazy-loaded only when the capture
// language is selected (see discoveryGuidedInterviewI18n.loadInterviewLanguage),
// so the Discovery chunk does not ship every language's phrase data upfront.
import type { LanguageTable } from "./localeTypes";

const table: LanguageTable = {
  stopwords: new Set(["le","la","les","un","une","des","de","du","et","ou","a","à","au","aux","pour","avec","dans","sur","nous","ils","elles","est","sont","avoir","avons","ont","besoin","veut","veulent","voudrais","juste","seulement","environ","probablement","peut","tre","aussi","utiliser","utilise","utilisent","utilisé","utilisée","va","aller","cela","ce","cette","ces","quel","quelle","comment","fait","faire","faut","doit","doivent"]),
  unknown: ["je ne sais pas","pas sûr","pas sur","incertain","pas décidé","pas decidé","pas decide","aucune idée","aucune idee","pas encore","pas confirmé","pas confirme","indécis","indeci"],
  curated: {
    "opportunity": {
      "meeting-room": [
        "salle de réunion",
        "salle du conseil",
        "salle de conférence",
        "huddle",
        "salle exécutive",
        "salle de séminaire",
        "bureau",
        "réunion"
      ],
      "classroom": [
        "salle de classe",
        "enseignement",
        "salle de cours",
        "amphithéâtre",
        "salle de formation",
        "cours",
        "école",
        "université",
        "collège",
        "éducation",
        "cours magistral"
      ],
      "hospitality": [
        "bar",
        "restaurant",
        "lieu",
        "pub",
        "hôtel",
        "lounge",
        "hospitalité",
        "café",
        "réception",
        "club"
      ],
      "video-wall": [
        "mur vidéo",
        "mur led",
        "videowall",
        "mur d'écrans",
        "écran mural",
        "signalétique",
        "écran led"
      ],
      "av-over-ip": [
        "sur ip",
        "sur le réseau",
        "vidéo distribuée",
        "campus",
        "réseau",
        "plusieurs salles",
        "multi salle",
        "vidéo sur ip",
        "distribution réseau"
      ],
      "not-sure": [
        "pas sûr",
        "incertain",
        "indécis",
        "je ne sais pas",
        "aucune idée",
        "inconnu"
      ]
    },
    "scale": {
      "single-small-room": [
        "petite salle",
        "salle huddle",
        "une seule salle",
        "une pièce",
        "1 salle",
        "petit"
      ],
      "single-large-room": [
        "grande salle",
        "grand espace",
        "une grande salle",
        "grande pièce",
        "grand"
      ],
      "multi-room": [
        "plusieurs salles",
        "multi salle",
        "deux salles",
        "trois salles",
        "quelques salles",
        "plusieurs"
      ],
      "building-wide": [
        "bâtiment",
        "campus",
        "tout l'étage",
        "étage entier",
        "tout le bâtiment",
        "bâtiment entier",
        "site",
        "étage"
      ],
      "unknown-scale": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "sources": {
      "one-source": [
        "une source",
        "source unique",
        "1 source",
        "un ordinateur portable",
        "un seul portable"
      ],
      "two-four-sources": [
        "deux",
        "2",
        "quatre",
        "4",
        "un couple",
        "paire",
        "deux portables",
        "deux sources",
        "peu de sources"
      ],
      "five-eight-sources": [
        "cinq",
        "5",
        "six",
        "6",
        "sept",
        "7",
        "huit",
        "8"
      ],
      "nine-plus-sources": [
        "neuf",
        "9",
        "dix",
        "10",
        "douzaine",
        "beaucoup",
        "de nombreuses sources",
        "onze",
        "douze"
      ],
      "unknown-sources": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "displays": {
      "one-display": [
        "un écran",
        "écran unique",
        "un seul écran",
        "1 écran",
        "juste un"
      ],
      "two-displays": [
        "deux écrans",
        "double",
        "2 écrans",
        "paire d'écrans"
      ],
      "three-eight-displays": [
        "trois",
        "3",
        "quatre",
        "4",
        "cinq",
        "5",
        "six",
        "6",
        "sept",
        "7",
        "huit",
        "8",
        "quelques écrans"
      ],
      "nine-plus-displays": [
        "neuf",
        "9",
        "dix",
        "10",
        "douzaine",
        "beaucoup d'écrans"
      ],
      "video-wall-output": [
        "mur vidéo",
        "mur led",
        "videowall",
        "mur d'écrans",
        "processeur led"
      ]
    },
    "display-behaviour": {
      "same-content-all-displays": [
        "même contenu",
        "identique sur tous",
        "miroir",
        "en miroir",
        "tous les écrans",
        "tout pareil",
        "même image"
      ],
      "independent-routing-per-display": [
        "contenus différents",
        "indépendant",
        "chaque écran",
        "chaque affichage",
        "séparé",
        "individuel",
        "zone",
        "partout"
      ],
      "video-wall-or-processor-feed": [
        "mur vidéo",
        "mur led",
        "flux processeur",
        "toile complète",
        "processeur mural"
      ],
      "multiview-on-one-output": [
        "multiview",
        "multi vue",
        "plusieurs sources",
        "composé",
        "fenêtres sur un",
        "une sortie"
      ],
      "unknown-display-behaviour": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "signal-standard": {
      "1080p-standard-hdmi": [
        "1080p",
        "1080",
        "hd standard",
        "full hd",
        "image hd"
      ],
      "4k60-standard": [
        "4k standard",
        "4k60",
        "uhd",
        "3840",
        "4k normal"
      ],
      "4k60-hdr-hdcp": [
        "4k hdr",
        "hdr",
        "hdcp",
        "4k premium",
        "plage dynamique élevée",
        "4k avec hdr"
      ],
      "legacy-edid-risk": [
        "edid",
        "ancien",
        "vieux écrans",
        "écrans mixtes",
        "problèmes de compatibilité",
        "ancien et nouveau"
      ],
      "unknown-signal-standard": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "source-connection": {
      "fixed-hdmi-sources": [
        "lecteur multimédia",
        "pc de salle",
        "lecteur de signalétique",
        "décodeur",
        "apple tv",
        "fixe",
        "permanent",
        "décodeur câble",
        "blu ray",
        "sources fixes"
      ],
      "laptops-wireless-inputs": [
        "ordinateur portable",
        "portable",
        "usb c",
        "usb-c",
        "présentation sans fil",
        "airplay",
        "miracast",
        "partage d'écran",
        "casting",
        "byod",
        "portables"
      ],
      "mixed-hdmi-usbc": [
        "mixte",
        "les deux",
        "fixes et",
        "et des portables",
        "mélange"
      ],
      "network-video-sources": [
        "vidéo réseau",
        "ndi",
        "sur ip",
        "flux",
        "sources réseau",
        "caméras ip"
      ],
      "unknown-source-connectors": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "uc-purpose": {
      "video-conferencing": [
        "visioconférence",
        "conférence",
        "teams",
        "zoom",
        "appels",
        "appel vidéo",
        "skype",
        "webex",
        "réunion en ligne",
        "appels téléphoniques"
      ],
      "recording-streaming": [
        "enregistrement",
        "enregistrer",
        "streaming",
        "diffusion",
        "capture de cours",
        "webcast",
        "direct",
        "capturer"
      ],
      "camera-distribution-only": [
        "distribution de caméra",
        "envoyer la caméra",
        "router la caméra",
        "caméra vers l'écran",
        "caméra vers la télé",
        "routage de caméra"
      ],
      "microphones-only": [
        "microphones uniquement",
        "micros seulement",
        "juste des micros",
        "sans caméra",
        "renforcement vocal",
        "sonorisation",
        "annonce",
        "amplification"
      ],
      "no-uc": [
        "pas de caméra",
        "pas de microphone",
        "pas de caméras",
        "pas de micros",
        "pas de visioconférence",
        "rien",
        "aucun"
      ],
      "unknown-uc": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "uc-camera": {
      "fixed-usb-camera": [
        "webcam",
        "caméra fixe",
        "caméra usb",
        "meeting owl",
        "caméra intégrée",
        "logitech",
        "usb fixe"
      ],
      "usb-ptz-camera": [
        "usb ptz",
        "caméra ptz",
        "pan tilt",
        "caméra motorisée",
        "ptz"
      ],
      "hdmi-ptz-camera": [
        "hdmi ptz",
        "caméra hdmi",
        "caméra avec hdmi"
      ],
      "ndi-network-camera": [
        "ndi",
        "caméra réseau",
        "caméra ip",
        "ptz réseau",
        "ndi ptz"
      ],
      "other-camera": [
        "caméra existante",
        "sdi",
        "vieille caméra",
        "caméra analogique",
        "autre caméra"
      ],
      "unknown-camera": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "uc-camera-count": {
      "one-camera": [
        "une caméra",
        "une seule caméra",
        "1 caméra",
        "juste une"
      ],
      "two-cameras": [
        "deux caméras",
        "2 caméras",
        "paire de caméras",
        "double caméra"
      ],
      "three-four-cameras": [
        "trois",
        "3",
        "quatre",
        "4",
        "trois caméras",
        "quatre caméras"
      ],
      "five-plus-cameras": [
        "cinq",
        "5",
        "plus de quatre",
        "six",
        "6",
        "plusieurs caméras"
      ],
      "unknown-camera-count": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "uc-microphones": {
      "speakerphone": [
        "kit mains libres",
        "haut parleur de conférence",
        "barre de son",
        "jabra",
        "poly",
        "haut parleur de table"
      ],
      "table-microphone": [
        "micro de table",
        "microphone de table",
        "micro de bureau",
        "col de cygne",
        "micro posé sur la table"
      ],
      "ceiling-microphone-array": [
        "plafond",
        "réseau de plafond",
        "suspendu",
        "micro de plafond",
        "microphone de plafond",
        "réseau"
      ],
      "wireless-microphone": [
        "sans fil",
        "micro radio",
        "cravate",
        "lavalier",
        "main",
        "casque",
        "micro sans fil"
      ],
      "lectern-microphone": [
        "pupitre",
        "podium",
        "lutrin",
        "micro de pupitre"
      ],
      "existing-microphone-system": [
        "existant",
        "déjà en place",
        "installé",
        "système existant"
      ],
      "no-microphones": [
        "pas de microphones",
        "pas de micros",
        "pas de micro",
        "aucun",
        "pas de microphone"
      ],
      "unknown-microphones": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "uc-microphone-count": {
      "one-microphone-feed": [
        "un",
        "unique",
        "1",
        "un flux",
        "un micro"
      ],
      "two-four-microphone-feeds": [
        "deux",
        "2",
        "trois",
        "3",
        "quatre",
        "4",
        "un couple",
        "paire"
      ],
      "five-eight-microphone-feeds": [
        "cinq",
        "5",
        "six",
        "6",
        "sept",
        "7",
        "huit",
        "8"
      ],
      "nine-plus-microphone-feeds": [
        "neuf",
        "9",
        "dix",
        "10",
        "beaucoup",
        "nombreux"
      ],
      "unknown-microphone-count": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "usb": {
      "no-usb": [
        "pas d'usb",
        "sans usb",
        "aucun usb",
        "pas de transport usb"
      ],
      "byod-byom": [
        "portable invité",
        "le portable possède",
        "leur portable",
        "mon portable",
        "portable de l'utilisateur",
        "le portable utilise",
        "brancher leur portable",
        "byod"
      ],
      "room-pc-uc": [
        "pc de salle",
        "la salle teams possède",
        "l'appareil possède",
        "ordinateur de la salle",
        "la salle possède",
        "pc fixe"
      ],
      "switchable-host-usb": [
        "commuter",
        "commutable",
        "commutation d'hôte",
        "changer d'hôte",
        "prendre le contrôle"
      ],
      "room-host-usb2": [
        "usb 2",
        "usb standard",
        "usb 2.0",
        "usb basique"
      ],
      "usb3-high-bandwidth-path": [
        "usb 3",
        "usb3",
        "haute bande passante",
        "3.0",
        "usb rapide"
      ],
      "usb-extension-required": [
        "étendre",
        "extension",
        "longue distance",
        "distance",
        "loin",
        "longue portée",
        "usb sur"
      ],
      "interactive-usb": [
        "tactile",
        "interactif",
        "annotation",
        "touchback"
      ],
      "unknown-usb": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "audio": {
      "no-room-audio": [
        "pas d'audio",
        "pas de haut parleurs",
        "pas d'audio de salle",
        "aucun",
        "pas de son"
      ],
      "display-audio": [
        "haut parleurs de l'écran",
        "haut parleurs du moniteur",
        "haut parleurs de la télé",
        "barre de son sur l'écran",
        "audio de l'écran"
      ],
      "source-audio-deembed": [
        "désintégrer",
        "extraire l'audio",
        "sortie audio séparée",
        "audio vers la table de mixage",
        "extraire"
      ],
      "room-audio": [
        "haut parleurs de la salle",
        "haut parleurs de plafond",
        "amplificateur",
        "ampli",
        "enceintes",
        "haut parleurs dans la salle",
        "enceintes amplifiées",
        "audio de salle"
      ],
      "stereo-low-impedance": [
        "stéréo",
        "basse impédance",
        "4 ohms",
        "8 ohms",
        "hifi"
      ],
      "multichannel-audio": [
        "surround",
        "5.1",
        "7.1",
        "multicanal",
        "multi canal"
      ],
      "distributed-70v-100v": [
        "70 volts",
        "70v",
        "100v",
        "haut parleurs distribués",
        "musique d'ambiance",
        "zones",
        "zoné",
        "tension constante"
      ],
      "separate-programme-voice": [
        "programme séparé",
        "renforcement vocal",
        "parole et musique",
        "programme et voix"
      ],
      "analogue-audio-override": [
        "analogique",
        "repli",
        "commande locale"
      ],
      "digital-audio-interface": [
        "audio numérique",
        "aes",
        "spdif",
        "sortie spdif",
        "aes ebu"
      ],
      "dante-network-audio": [
        "dante",
        "audio réseau",
        "aes67"
      ],
      "unknown-audio": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    },
    "control": {
      "simple-auto": [
        "automatique",
        "auto",
        "simple",
        "un bouton",
        "préréglage",
        "sans commande",
        "ça marche tout seul"
      ],
      "front-panel-remote": [
        "télécommande",
        "panneau avant",
        "télécommande ir",
        "télécommande à main"
      ],
      "touch-panel": [
        "panneau tactile",
        "écran tactile",
        "panneau mural",
        "clavier",
        "tactile"
      ],
      "software-app-control": [
        "application",
        "logiciel",
        "navigateur",
        "application tablette",
        "application mobile",
        "page web"
      ],
      "third-party-control": [
        "crestron",
        "control4",
        "qsys",
        "q-sys",
        "amx",
        "extron",
        "système de contrôle",
        "intégration",
        "gtc"
      ],
      "unknown-control": [
        "pas sûr",
        "inconnu",
        "je ne sais pas"
      ]
    }
  },
  questionTranslations: {
    "opportunity": {
      "question": "Quel type de projet est-ce ?",
      "prompt": "Sélectionnez l'application client la plus proche."
    },
    "scale": {
      "question": "Quelle est l'échelle approximative de la salle ou du système ?",
      "prompt": "Choisissez l'échelle la plus proche. Les dimensions exactes peuvent être notées dans la zone de notes."
    },
    "sources": {
      "question": "Combien de sources sont prévues ?",
      "prompt": "Pensez aux ordinateurs portables, PC, lecteurs multimédia, lecteurs de signalétique et entrées de présentation sans fil."
    },
    "source-connection": {
      "question": "Quel profil de sources correspond le mieux à la salle ?",
      "prompt": "Choisissez le flux de sources global le plus proche. Les besoins en caméras et microphones sont saisis séparément dans la section Communications unifiées."
    },
    "displays": {
      "question": "Combien d'écrans ou de sorties sont nécessaires ?",
      "prompt": "Incluez les vidéoprojecteurs, moniteurs de contrôle, écrans de débordement, murs vidéo et processeurs LED."
    },
    "display-behaviour": {
      "question": "Comment les écrans doivent-ils se comporter ?",
      "prompt": "Précisez si les sorties sont en miroir, routées indépendamment, alimentent un processeur mural ou affichent plusieurs sources sur un seul écran."
    },
    "signal-standard": {
      "question": "Quelle qualité d'image est requise ?",
      "prompt": "Choisissez la qualité d'image la plus proche. Si les écrans sont un mélange d'anciens et de récents, ou très haut de gamme, indiquez-le — les vérifications techniques (HDR, HDCP, EDID) sont gérées en arrière-plan."
    },
    "uc-purpose": {
      "question": "Quels flux de caméra, microphone ou enregistrement sont requis ?",
      "prompt": "Sélectionnez chaque flux applicable. Conférence, enregistrement et distribution de caméra peuvent être requis ensemble."
    },
    "uc-platform": {
      "question": "Quel système exécutera la visioconférence ou la capture ?",
      "prompt": "Identifiez la plateforme de visioconférence ou de capture avant de décider de la propriété USB et de la commutation d'hôte."
    },
    "mtr-av-integration": {
      "question": "Comment la salle Microsoft Teams doit-elle se connecter au système AV ?",
      "prompt": "Confirmez les deux sens du signal. Une salle Teams a généralement besoin d'un flux AV vers le MTR pour le partage ou la capture, plus une sortie MTR vers le système AV pour la distribution aux écrans de la salle."
    },
    "uc-camera": {
      "question": "Quels types de caméras sont requis ?",
      "prompt": "Sélectionnez chaque type de caméra applicable. La quantité, les positions et les modèles exacts peuvent être notés."
    },
    "uc-camera-count": {
      "question": "Combien de caméras la salle de visioconférence doit-elle utiliser ?",
      "prompt": "Une salle avec plus d'une caméra nécessite un pont de caméras ou un chemin de composition afin que l'hôte de visioconférence reçoive un flux programme utilisable."
    },
    "uc-multi-camera-path": {
      "question": "La salle multi-caméras utilisera-t-elle des caméras NDI ?",
      "prompt": "Choisissez le transport des caméras afin que Wingman applique la bonne architecture de pont."
    },
    "uc-camera-routing": {
      "question": "Où les flux de caméra doivent-ils être utilisés ?",
      "prompt": "Une caméra n'est comptée comme source AV routée que lorsque son flux doit quitter le chemin périphérique de visioconférence."
    },
    "uc-microphones": {
      "question": "Quels types de microphones sont requis ?",
      "prompt": "Saisissez ici les entrées vocales. Haut-parleurs, amplification et audio général de la salle restent dans l'étape Audio distincte."
    },
    "uc-microphone-connection": {
      "question": "Comment les microphones seront-ils connectés ?",
      "prompt": "Sélectionnez chaque interface, alimentation et chemin de signal applicable."
    },
    "uc-microphone-count": {
      "question": "Combien de flux de microphones ou de zones de captation sont requis ?",
      "prompt": "Comptez les réseaux, canaux et zones indépendants."
    },
    "usb": {
      "question": "Qui possède les périphériques USB, et comment l'USB doit-il circuler ?",
      "prompt": "Sélectionnez les exigences d'hôte, de commutation et de bande passante pour caméras, kits mains-libres, écrans tactiles et dispositifs de capture."
    },
    "audio": {
      "question": "Comment l'audio de la salle doit-il être connecté et exploité ?",
      "prompt": "Sélectionnez les exigences de lecture, amplification, distribution et renforcement."
    },
    "control": {
      "question": "Comment les personnes dans la salle doivent-elles piloter le système ?",
      "prompt": "Pensez à l'usage par le personnel, la commande murale, les panneaux tactiles, le logiciel ou l'application, la commande tiers, l'automatisation ou la simple sélection de source."
    },
    "locations-connections": {
      "question": "Où se trouve l'équipement, et quelle distance les signaux doivent-ils parcourir ?",
      "prompt": "Choisissez les grandes positions dans la salle, le plus long trajet vidéo et le chemin de câble probable. Les mesures exactes seront confirmées lors de la visite technique."
    },
    "avoip-profile": {
      "question": "Laquelle de ces options correspond le mieux aux besoins du client ?",
      "prompt": "Restez simple — choisissez ce qui compte le plus : coût, qualité d'image, connexion d'appareils, ou affichage de plusieurs sources sur un seul écran."
    },
    "video-wall-technology": {
      "question": "Quel type de mur vidéo est prévu ?",
      "prompt": "Choisissez la technologie d'affichage physique. Si elle n'est pas confirmée, Wingman gardera les deux chemins de conception ouverts."
    },
    "video-wall-purpose": {
      "question": "Comment le mur doit-il présenter le contenu ?",
      "prompt": "Sélectionnez le modèle d'exploitation le plus proche. Cette décision détermine si des questions détaillées sur le multiview sont nécessaires."
    },
    "source-device-workflows": {
      "question": "Quels appareils et flux les utilisateurs utiliseront-ils ?",
      "prompt": "Sélectionnez chaque famille de sources."
    },
    "wireless-presentation-operation": {
      "question": "Comment la présentation sans fil doit-elle fonctionner ?",
      "prompt": "Choisissez le comportement de connexion, de sécurité et de partage."
    },
    "multiview-destination": {
      "question": "Où le multiview doit-il apparaître ?",
      "prompt": "Sélectionnez chaque destination."
    },
    "multiview-operation": {
      "question": "Comment les mises en page multiview doivent-elles fonctionner ?",
      "prompt": "Définissez le nombre de sources, la mise en page et le contrôle."
    },
    "uc-audio-processing": {
      "question": "Comment l'audio des microphones et du programme doit-il fonctionner ?",
      "prompt": "Sélectionnez les résultats de mixage, pontage, DSP et sorties."
    }
  },
  voicePreview: "Bonjour. Je vais vous poser quelques questions sur cette salle, et Wingman construira le système au fur et à mesure.",
};

export default table;
