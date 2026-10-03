// Spanish guided-interview tables — lazy-loaded only when the capture
// language is selected (see discoveryGuidedInterviewI18n.loadInterviewLanguage),
// so the Discovery chunk does not ship every language's phrase data upfront.
import type { LanguageTable } from "./localeTypes";

const table: LanguageTable = {
  stopwords: new Set(["el","la","los","las","un","una","unos","unas","de","del","y","o","a","al","para","con","en","sobre","nosotros","ellos","ellas","es","son","tener","tenemos","tienen","necesita","necesitan","quiere","quieren","quisiera","solo","solamente","alrededor","probablemente","quizas","quizá","quizás","también","tambien","ambos","usar","usa","usan","usado","va","ir","esto","eso","este","esta","estos","estas","qué","que","cómo","como","hace","hacer","hay"]),
  unknown: ["no sé","no se","no estoy seguro","no estoy segura","inseguro","no decidido","sin idea","todavía no","todavia no","no confirmado","aún no","aun no"],
  curated: {
    "opportunity": {
      "meeting-room": [
        "sala de reuniones",
        "sala de juntas",
        "sala de conferencias",
        "huddle",
        "sala ejecutiva",
        "sala de seminarios",
        "oficina",
        "reunión"
      ],
      "classroom": [
        "aula",
        "clase",
        "enseñanza",
        "salón de clases",
        "sala de formación",
        "lección",
        "escuela",
        "universidad",
        "colegio",
        "educación",
        "clase magistral"
      ],
      "hospitality": [
        "bar",
        "restaurante",
        "local",
        "pub",
        "hotel",
        "salón",
        "hostelería",
        "cafetería",
        "café",
        "recepción",
        "club"
      ],
      "video-wall": [
        "videowall",
        "muro de video",
        "muro led",
        "pared de pantallas",
        "mural digital",
        "pantalla led"
      ],
      "av-over-ip": [
        "sobre ip",
        "por red",
        "video distribuido",
        "campus",
        "en red",
        "varias salas",
        "multi sala",
        "video por ip",
        "distribución en red"
      ],
      "not-sure": [
        "no estoy seguro",
        "no estoy segura",
        "inseguro",
        "indeciso",
        "no sé",
        "sin idea",
        "desconocido"
      ]
    },
    "scale": {
      "single-small-room": [
        "sala pequeña",
        "sala huddle",
        "una sola sala",
        "una habitación",
        "1 sala",
        "pequeño"
      ],
      "single-large-room": [
        "sala grande",
        "espacio grande",
        "una sala grande",
        "habitación grande",
        "grande"
      ],
      "multi-room": [
        "varias salas",
        "multi sala",
        "dos salas",
        "tres salas",
        "unas pocas salas",
        "varios"
      ],
      "building-wide": [
        "edificio",
        "campus",
        "toda la planta",
        "planta entera",
        "todo el edificio",
        "edificio entero",
        "sitio",
        "planta"
      ],
      "unknown-scale": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "sources": {
      "one-source": [
        "una fuente",
        "fuente única",
        "1 fuente",
        "un portátil",
        "un solo portátil"
      ],
      "two-four-sources": [
        "dos",
        "2",
        "cuatro",
        "4",
        "un par",
        "dos portátiles",
        "dos fuentes",
        "pocas fuentes"
      ],
      "five-eight-sources": [
        "cinco",
        "5",
        "seis",
        "6",
        "siete",
        "7",
        "ocho",
        "8"
      ],
      "nine-plus-sources": [
        "nueve",
        "9",
        "diez",
        "10",
        "docena",
        "muchas",
        "muchas fuentes",
        "once",
        "doce"
      ],
      "unknown-sources": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "displays": {
      "one-display": [
        "una pantalla",
        "pantalla única",
        "una sola pantalla",
        "1 pantalla",
        "solo una"
      ],
      "two-displays": [
        "dos pantallas",
        "doble",
        "2 pantallas",
        "par de pantallas"
      ],
      "three-eight-displays": [
        "tres",
        "3",
        "cuatro",
        "4",
        "cinco",
        "5",
        "seis",
        "6",
        "siete",
        "7",
        "ocho",
        "8",
        "unas pocas pantallas"
      ],
      "nine-plus-displays": [
        "nueve",
        "9",
        "diez",
        "10",
        "docena",
        "muchas pantallas"
      ],
      "video-wall-output": [
        "videowall",
        "muro led",
        "muro de video",
        "pared de pantallas",
        "procesador led"
      ]
    },
    "display-behaviour": {
      "same-content-all-displays": [
        "mismo contenido",
        "igual en todas",
        "espejo",
        "espejado",
        "todas las pantallas",
        "todo igual",
        "misma imagen"
      ],
      "independent-routing-per-display": [
        "contenido diferente",
        "independiente",
        "cada pantalla",
        "cada display",
        "separado",
        "individual",
        "zona",
        "en cualquier lugar"
      ],
      "video-wall-or-processor-feed": [
        "videowall",
        "muro led",
        "alimentación del procesador",
        "lienzo completo",
        "procesador de pared"
      ],
      "multiview-on-one-output": [
        "multivista",
        "multi vista",
        "varias fuentes",
        "compuesto",
        "ventanas en una",
        "una salida"
      ],
      "unknown-display-behaviour": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "signal-standard": {
      "1080p-standard-hdmi": [
        "1080p",
        "1080",
        "hd estándar",
        "full hd",
        "imagen hd"
      ],
      "4k60-standard": [
        "4k estándar",
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
        "alto rango dinámico",
        "4k con hdr"
      ],
      "legacy-edid-risk": [
        "edid",
        "legado",
        "pantallas antiguas",
        "pantallas viejas",
        "pantallas mixtas",
        "problemas de compatibilidad",
        "antiguas y nuevas"
      ],
      "unknown-signal-standard": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "source-connection": {
      "fixed-hdmi-sources": [
        "reproductor multimedia",
        "pc de sala",
        "reproductor de señalización",
        "decodificador",
        "apple tv",
        "fijo",
        "permanente",
        "decodificador de cable",
        "blu ray",
        "fuentes fijas"
      ],
      "laptops-wireless-inputs": [
        "portátil",
        "laptop",
        "usb c",
        "usb-c",
        "presentación inalámbrica",
        "airplay",
        "miracast",
        "compartir pantalla",
        "casting",
        "byod",
        "portátiles"
      ],
      "mixed-hdmi-usbc": [
        "mixto",
        "ambos",
        "fijos y",
        "y portátiles",
        "mezcla"
      ],
      "network-video-sources": [
        "video por red",
        "ndi",
        "sobre ip",
        "streams",
        "fuentes en red",
        "cámaras ip"
      ],
      "unknown-source-connectors": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "uc-purpose": {
      "video-conferencing": [
        "videoconferencia",
        "conferencia",
        "teams",
        "zoom",
        "llamadas",
        "videollamada",
        "skype",
        "webex",
        "reunión en línea",
        "llamadas telefónicas"
      ],
      "recording-streaming": [
        "grabación",
        "grabar",
        "streaming",
        "transmisión",
        "captura de clases",
        "webcast",
        "en directo",
        "capturar"
      ],
      "camera-distribution-only": [
        "distribución de cámara",
        "enviar cámara",
        "enrutar cámara",
        "cámara a la pantalla",
        "cámara a la tele",
        "routing de cámara"
      ],
      "microphones-only": [
        "solo micrófonos",
        "solo micros",
        "solo mics",
        "sin cámara",
        "refuerzo de voz",
        "megafonía",
        "anuncio",
        "sonorización"
      ],
      "no-uc": [
        "sin cámara",
        "sin micrófono",
        "sin cámaras",
        "sin micros",
        "sin conferencia",
        "sin videoconferencia",
        "nada",
        "ninguno"
      ],
      "unknown-uc": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "uc-camera": {
      "fixed-usb-camera": [
        "webcam",
        "cámara fija",
        "cámara usb",
        "meeting owl",
        "cámara integrada",
        "logitech",
        "usb fija"
      ],
      "usb-ptz-camera": [
        "usb ptz",
        "cámara ptz",
        "pan tilt",
        "cámara motorizada",
        "ptz"
      ],
      "hdmi-ptz-camera": [
        "hdmi ptz",
        "cámara hdmi",
        "cámara con hdmi"
      ],
      "ndi-network-camera": [
        "ndi",
        "cámara de red",
        "cámara ip",
        "ptz de red",
        "ndi ptz"
      ],
      "other-camera": [
        "cámara existente",
        "sdi",
        "cámara antigua",
        "cámara analógica",
        "otra cámara"
      ],
      "unknown-camera": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "uc-camera-count": {
      "one-camera": [
        "una cámara",
        "una sola cámara",
        "1 cámara",
        "solo una"
      ],
      "two-cameras": [
        "dos cámaras",
        "2 cámaras",
        "par de cámaras",
        "doble cámara"
      ],
      "three-four-cameras": [
        "tres",
        "3",
        "cuatro",
        "4",
        "tres cámaras",
        "cuatro cámaras"
      ],
      "five-plus-cameras": [
        "cinco",
        "5",
        "más de cuatro",
        "seis",
        "6",
        "varias cámaras"
      ],
      "unknown-camera-count": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "uc-microphones": {
      "speakerphone": [
        "altavoz de conferencia",
        "manos libres",
        "barra de sonido",
        "jabra",
        "poly",
        "altavoz de mesa"
      ],
      "table-microphone": [
        "micro de mesa",
        "micrófono de mesa",
        "micro de escritorio",
        "cuello de ganso",
        "micro de sobremesa"
      ],
      "ceiling-microphone-array": [
        "techo",
        "conjunto de techo",
        "suspendido",
        "micro de techo",
        "micrófono de techo",
        "array"
      ],
      "wireless-microphone": [
        "inalámbrico",
        "micro de radio",
        "diadema",
        "lavalier",
        "de mano",
        "auricular",
        "micro inalámbrico"
      ],
      "lectern-microphone": [
        "atril",
        "púlpito",
        "podio",
        "micro de atril"
      ],
      "existing-microphone-system": [
        "existente",
        "ya tenemos",
        "instalado",
        "sistema existente"
      ],
      "no-microphones": [
        "sin micrófonos",
        "sin micros",
        "sin micro",
        "ninguno",
        "sin micrófono"
      ],
      "unknown-microphones": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "uc-microphone-count": {
      "one-microphone-feed": [
        "uno",
        "único",
        "1",
        "un flujo",
        "un micro"
      ],
      "two-four-microphone-feeds": [
        "dos",
        "2",
        "tres",
        "3",
        "cuatro",
        "4",
        "un par",
        "pareja"
      ],
      "five-eight-microphone-feeds": [
        "cinco",
        "5",
        "seis",
        "6",
        "siete",
        "7",
        "ocho",
        "8"
      ],
      "nine-plus-microphone-feeds": [
        "nueve",
        "9",
        "diez",
        "10",
        "muchos",
        "numerosos"
      ],
      "unknown-microphone-count": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "usb": {
      "no-usb": [
        "sin usb",
        "no usb",
        "ningún usb",
        "sin transporte usb"
      ],
      "byod-byom": [
        "portátil invitado",
        "el portátil posee",
        "su portátil",
        "mi portátil",
        "portátil del usuario",
        "el portátil usa",
        "conectar su portátil",
        "byod"
      ],
      "room-pc-uc": [
        "pc de sala",
        "la sala teams posee",
        "el equipo posee",
        "ordenador de la sala",
        "la sala posee",
        "pc fijo"
      ],
      "switchable-host-usb": [
        "cambiar",
        "conmutable",
        "conmutación de host",
        "cambiar de host",
        "tomar el control"
      ],
      "room-host-usb2": [
        "usb 2",
        "usb estándar",
        "usb 2.0",
        "usb básico"
      ],
      "usb3-high-bandwidth-path": [
        "usb 3",
        "usb3",
        "alto ancho de banda",
        "3.0",
        "usb rápido"
      ],
      "usb-extension-required": [
        "extender",
        "extensión",
        "larga distancia",
        "distancia",
        "lejos",
        "larga tirada",
        "usb sobre"
      ],
      "interactive-usb": [
        "táctil",
        "interactivo",
        "anotación",
        "touchback"
      ],
      "unknown-usb": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "audio": {
      "no-room-audio": [
        "sin audio",
        "sin altavoces",
        "sin audio de sala",
        "ninguno",
        "sin sonido"
      ],
      "display-audio": [
        "altavoces de la pantalla",
        "altavoces del monitor",
        "altavoces de la tele",
        "barra de sonido en la pantalla",
        "audio de la pantalla"
      ],
      "source-audio-deembed": [
        "de-embed",
        "extraer audio",
        "salida de audio separada",
        "audio al mezclador",
        "extraer"
      ],
      "room-audio": [
        "altavoces de sala",
        "altavoces de techo",
        "amplificador",
        "ampli",
        "bocinas",
        "altavoces en la sala",
        "altavoces amplificados",
        "audio de sala"
      ],
      "stereo-low-impedance": [
        "estéreo",
        "baja impedancia",
        "4 ohmios",
        "8 ohmios",
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
        "70 voltios",
        "70v",
        "100v",
        "altavoces distribuidos",
        "música ambiental",
        "zonas",
        "zonificado",
        "voltaje constante"
      ],
      "separate-programme-voice": [
        "programa separado",
        "refuerzo de voz",
        "voz y música",
        "programa y voz"
      ],
      "analogue-audio-override": [
        "analógico",
        "respaldo",
        "anulación local"
      ],
      "digital-audio-interface": [
        "audio digital",
        "aes",
        "spdif",
        "salida spdif",
        "aes ebu"
      ],
      "dante-network-audio": [
        "dante",
        "audio de red",
        "aes67"
      ],
      "unknown-audio": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    },
    "control": {
      "simple-auto": [
        "automático",
        "auto",
        "simple",
        "un botón",
        "preajuste",
        "sin control",
        "funciona solo"
      ],
      "front-panel-remote": [
        "mando",
        "panel frontal",
        "mando ir",
        "mando a distancia"
      ],
      "touch-panel": [
        "panel táctil",
        "pantalla táctil",
        "panel de pared",
        "teclado",
        "táctil"
      ],
      "software-app-control": [
        "aplicación",
        "software",
        "navegador",
        "app de tablet",
        "app móvil",
        "página web"
      ],
      "third-party-control": [
        "crestron",
        "control4",
        "qsys",
        "q-sys",
        "amx",
        "extron",
        "sistema de control",
        "integración",
        "gtc"
      ],
      "unknown-control": [
        "no sé",
        "desconocido",
        "no estoy seguro"
      ]
    }
  },
  questionTranslations: {
    "opportunity": {
      "question": "¿Qué tipo de proyecto es este?",
      "prompt": "Seleccione la aplicación de cliente más cercana."
    },
    "scale": {
      "question": "¿Cuál es la escala aproximada de la sala o del sistema?",
      "prompt": "Elija la escala más cercana. Las dimensiones exactas pueden anotarse en el cuadro de notas."
    },
    "sources": {
      "question": "¿Cuántas fuentes se prevén?",
      "prompt": "Piense en portátiles, PC, reproductores multimedia, reproductores de señalización y entradas de presentación inalámbrica."
    },
    "source-connection": {
      "question": "¿Qué perfil de fuentes describe mejor la sala?",
      "prompt": "Elija el flujo de fuentes global más cercano. Los requisitos de cámaras y micrófonos se capturan por separado en Comunicaciones unificadas."
    },
    "displays": {
      "question": "¿Cuántas pantallas o salidas se necesitan?",
      "prompt": "Incluya proyectores, monitores de confianza, pantallas de desbordamiento, videowalls y procesadores LED."
    },
    "display-behaviour": {
      "question": "¿Cómo deben comportarse las pantallas?",
      "prompt": "Indique si las salidas se reflejan, se enrutan de forma independiente, alimentan un procesador de pared o muestran varias fuentes en un solo lienzo."
    },
    "signal-standard": {
      "question": "¿Qué calidad de imagen se necesita?",
      "prompt": "Elija la calidad de imagen más cercana. Si las pantallas son una mezcla de antiguas y nuevas, o muy premium, dígalo — las comprobaciones técnicas (HDR, HDCP, EDID) se gestionan en segundo plano."
    },
    "uc-purpose": {
      "question": "¿Qué flujos de cámara, micrófono o grabación se requieren?",
      "prompt": "Seleccione cada flujo aplicable. La videoconferencia, la grabación y la distribución de cámara pueden requerirse juntas."
    },
    "uc-platform": {
      "question": "¿Qué sistema ejecutará la videoconferencia o la captura?",
      "prompt": "Identifique la plataforma de conferencia o captura antes de decidir la propiedad USB y la conmutación de host."
    },
    "mtr-av-integration": {
      "question": "¿Cómo debe conectarse la sala de Microsoft Teams al sistema AV?",
      "prompt": "Confirme ambos sentidos de la señal. Una sala Teams normalmente necesita una entrada AV al MTR para compartir o capturar, más una salida del MTR de vuelta al sistema AV para distribución a las pantallas de la sala."
    },
    "uc-camera": {
      "question": "¿Qué tipos de cámara se requieren?",
      "prompt": "Seleccione cada tipo de cámara aplicable. La cantidad, las posiciones y los modelos exactos pueden anotarse."
    },
    "uc-camera-count": {
      "question": "¿Cuántas cámaras debe usar la sala de videoconferencia?",
      "prompt": "Una sala con más de una cámara necesita un puente de cámaras o una vía de composición para que el host de videoconferencia reciba un flujo de programa utilizable."
    },
    "uc-multi-camera-path": {
      "question": "¿La sala multicámara usará cámaras NDI?",
      "prompt": "Elija el transporte de cámaras para que Wingman aplique la arquitectura de puente correcta."
    },
    "uc-camera-routing": {
      "question": "¿Dónde deben utilizarse los flujos de cámara?",
      "prompt": "Una cámara solo se cuenta como fuente AV enrutada cuando su flujo debe salir de la vía periférica de conferencia."
    },
    "uc-microphones": {
      "question": "¿Qué tipos de micrófono se requieren?",
      "prompt": "Capture aquí las entradas de voz. Los altavoces, la amplificación y el audio general de la sala permanecen en el paso de Audio separado."
    },
    "uc-microphone-connection": {
      "question": "¿Cómo se conectarán los micrófonos?",
      "prompt": "Seleccione cada interfaz, alimentación y vía de señal aplicable."
    },
    "uc-microphone-count": {
      "question": "¿Cuántos flujos de micrófono o zonas de captación se requieren?",
      "prompt": "Cuente los conjuntos, canales y zonas independientes."
    },
    "usb": {
      "question": "¿Quién posee los dispositivos USB y cómo debe viajar el USB?",
      "prompt": "Seleccione los requisitos de host, conmutación y ancho de banda para cámaras, altavoces de conferencia, pantallas táctiles y dispositivos de captura."
    },
    "audio": {
      "question": "¿Cómo debe conectarse y operarse el audio de la sala?",
      "prompt": "Seleccione los requisitos de reproducción, amplificación, distribución y refuerzo."
    },
    "control": {
      "question": "¿Cómo deben operar el sistema las personas de la sala?",
      "prompt": "Piense en el uso del personal, el control de pared, los paneles táctiles, el control por software o aplicación, el control de terceros, la automatización o la simple selección de fuente."
    },
    "locations-connections": {
      "question": "¿Dónde está el equipo y qué distancia deben recorrer las señales?",
      "prompt": "Elija las posiciones generales de la sala, la ruta de vídeo más larga y el trazado de cable probable. Las medidas exactas se confirman durante la visita técnica."
    },
    "avoip-profile": {
      "question": "¿Cuál de estas opciones se acerca más a lo que necesita el cliente?",
      "prompt": "Manténgalo sencillo — elija lo que más importe: coste, calidad de imagen, conexión de dispositivos o mostrar varias fuentes en una sola pantalla."
    },
    "video-wall-technology": {
      "question": "¿Qué tipo de videowall se está planificando?",
      "prompt": "Elija la tecnología de pantalla física. Si no está confirmada, Wingman mantendrá abiertas ambas vías de diseño."
    },
    "video-wall-purpose": {
      "question": "¿Cómo debe presentar el contenido la pared?",
      "prompt": "Seleccione el modelo operativo más cercano. Esta decisión controla si son necesarias preguntas detalladas de multivista."
    },
    "source-device-workflows": {
      "question": "¿Qué dispositivos y señales usarán las personas?",
      "prompt": "Seleccione cada familia de fuentes."
    },
    "wireless-presentation-operation": {
      "question": "¿Cómo debe funcionar la presentación inalámbrica?",
      "prompt": "Elija el comportamiento de conexión, seguridad y uso compartido."
    },
    "multiview-destination": {
      "question": "¿Dónde debe aparecer la multivista?",
      "prompt": "Seleccione cada destino."
    },
    "multiview-operation": {
      "question": "¿Cómo deben funcionar las distribuciones multivista?",
      "prompt": "Defina el número de fuentes, la distribución y el control."
    },
    "uc-audio-processing": {
      "question": "¿Cómo debe operar el audio de micrófonos y programa?",
      "prompt": "Seleccione los resultados de mezcla, puente, DSP y salidas."
    }
  },
  voicePreview: "Hola. Le haré algunas preguntas sobre esta sala y Wingman irá montando el sistema poco a poco.",
};

export default table;
