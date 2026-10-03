// Portuguese guided-interview tables — lazy-loaded only when the capture
// language is selected (see discoveryGuidedInterviewI18n.loadInterviewLanguage),
// so the Discovery chunk does not ship every language's phrase data upfront.
import type { LanguageTable } from "./localeTypes";

const table: LanguageTable = {
  stopwords: new Set(["o","a","os","as","um","uma","uns","umas","de","do","da","dos","das","em","no","na","nos","nas","e","ou","para","com","sem","nós","eles","elas","é","são","temos","têm","tem","precisa","precisam","quer","querem","gostaria","só","apenas","somente","cerca","provavelmente","talvez","também","usar","usa","usam","usado","usada","vai","vão","ir","isto","isso","este","esta","estes","estas","esse","essa","esses","essas","que","como","faz","fazer","há","existe","existem","quero","queremos","vamos","preciso","precisamos"]),
  unknown: ["não sei","nao sei","não tenho a certeza","nao tenho a certeza","não estou certo","nao estou certo","não estou segura","incerto","indeciso","sem ideia","ainda não","ainda nao","não confirmado","nao confirmado","não decidido","nao decidido"],
  curated: {
    "opportunity": {
      "meeting-room": [
        "sala de reuniões",
        "sala de reunião",
        "sala da direção",
        "sala de conferências",
        "huddle",
        "sala executiva",
        "sala de seminários",
        "escritório",
        "reunião"
      ],
      "classroom": [
        "sala de aula",
        "ensino",
        "sala de palestras",
        "anfiteatro",
        "sala de formação",
        "aula",
        "escola",
        "universidade",
        "faculdade",
        "educação",
        "palestra"
      ],
      "hospitality": [
        "bar",
        "restaurante",
        "espaço",
        "pub",
        "hotel",
        "lounge",
        "hospitalidade",
        "café",
        "cafe",
        "receção",
        "recepção",
        "clube"
      ],
      "video-wall": [
        "videowall",
        "parede de vídeo",
        "parede de video",
        "mural de ecrãs",
        "parede de ecrãs",
        "sinalização digital",
        "ecrã led",
        "mural led"
      ],
      "av-over-ip": [
        "sobre ip",
        "rede ip",
        "vídeo distribuído",
        "video distribuido",
        "campus",
        "em rede",
        "várias salas",
        "multi sala",
        "vídeo ip",
        "distribuição em rede"
      ],
      "not-sure": [
        "não sei",
        "nao sei",
        "incerto",
        "indeciso",
        "não tenho a certeza",
        "sem ideia",
        "desconhecido"
      ]
    },
    "scale": {
      "single-small-room": [
        "sala pequena",
        "sala huddle",
        "uma sala",
        "sala única",
        "1 sala",
        "pequeno",
        "pequena"
      ],
      "single-large-room": [
        "sala grande",
        "sala ampla",
        "uma sala grande",
        "grande"
      ],
      "multi-room": [
        "várias salas",
        "varias salas",
        "multi sala",
        "duas salas",
        "três salas",
        "tres salas",
        "algumas salas",
        "vários"
      ],
      "building-wide": [
        "edifício",
        "edificio",
        "campus",
        "andar inteiro",
        "piso inteiro",
        "edifício inteiro",
        "todo o edifício",
        "todo o andar",
        "andar"
      ],
      "unknown-scale": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "sources": {
      "one-source": [
        "uma fonte",
        "fonte única",
        "fonte unica",
        "1 fonte",
        "um portátil",
        "um computador portátil"
      ],
      "two-four-sources": [
        "dois",
        "2",
        "quatro",
        "4",
        "um par",
        "duas fontes",
        "dois portáteis",
        "poucas fontes",
        "algumas fontes"
      ],
      "five-eight-sources": [
        "cinco",
        "5",
        "seis",
        "6",
        "sete",
        "7",
        "oito",
        "8"
      ],
      "nine-plus-sources": [
        "nove",
        "9",
        "dez",
        "10",
        "dúzia",
        "muitas fontes",
        "muitos",
        "onze",
        "doze"
      ],
      "unknown-sources": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "displays": {
      "one-display": [
        "um ecrã",
        "um monitor",
        "um único ecrã",
        "1 ecrã",
        "apenas um",
        "só um"
      ],
      "two-displays": [
        "dois ecrãs",
        "dois monitores",
        "duplo",
        "2 ecrãs",
        "par de ecrãs"
      ],
      "three-eight-displays": [
        "três",
        "tres",
        "3",
        "quatro",
        "4",
        "cinco",
        "5",
        "seis",
        "6",
        "sete",
        "7",
        "oito",
        "8",
        "alguns ecrãs"
      ],
      "nine-plus-displays": [
        "nove",
        "9",
        "dez",
        "10",
        "dúzia",
        "muitos ecrãs",
        "muitos monitores"
      ],
      "video-wall-output": [
        "videowall",
        "parede de vídeo",
        "mural led",
        "parede de ecrãs",
        "processador led"
      ]
    },
    "display-behaviour": {
      "same-content-all-displays": [
        "mesmo conteúdo",
        "mesmo conteudo",
        "igual em todos",
        "espelho",
        "espelhado",
        "todos os ecrãs",
        "tudo igual",
        "mesma imagem"
      ],
      "independent-routing-per-display": [
        "conteúdo diferente",
        "conteudo diferente",
        "independente",
        "cada ecrã",
        "cada monitor",
        "separado",
        "individual",
        "zona",
        "qualquer fonte"
      ],
      "video-wall-or-processor-feed": [
        "videowall",
        "parede de vídeo",
        "alimentação do processador",
        "ecrã completo",
        "processador de parede"
      ],
      "multiview-on-one-output": [
        "multiview",
        "multi vista",
        "várias fontes",
        "varias fontes",
        "várias fontes num",
        "composto",
        "janelas num",
        "uma saída",
        "uma saida"
      ],
      "unknown-display-behaviour": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "signal-standard": {
      "1080p-standard-hdmi": [
        "1080p",
        "1080",
        "hd padrão",
        "hd standard",
        "full hd",
        "imagem hd"
      ],
      "4k60-standard": [
        "4k padrão",
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
        "alta gama dinâmica",
        "4k com hdr"
      ],
      "legacy-edid-risk": [
        "edid",
        "antigo",
        "ecrãs antigos",
        "monitores antigos",
        "ecrãs mistos",
        "problemas de compatibilidade",
        "antigos e novos"
      ],
      "unknown-signal-standard": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "source-connection": {
      "fixed-hdmi-sources": [
        "leitor multimédia",
        "media player",
        "pc da sala",
        "leitor de sinalização",
        "set top box",
        "apple tv",
        "fixo",
        "fixa",
        "permanente",
        "box",
        "blu ray",
        "fontes fixas"
      ],
      "laptops-wireless-inputs": [
        "portátil",
        "portatil",
        "laptop",
        "usb c",
        "usb-c",
        "apresentação sem fios",
        "apresentação sem fio",
        "airplay",
        "miracast",
        "partilha de ecrã",
        "casting",
        "byod",
        "portáteis"
      ],
      "mixed-hdmi-usbc": [
        "misto",
        "mista",
        "ambos",
        "fixos e",
        "e portáteis",
        "portáteis e",
        "mistura"
      ],
      "network-video-sources": [
        "vídeo em rede",
        "video em rede",
        "ndi",
        "sobre ip",
        "streams",
        "fontes em rede",
        "câmaras ip",
        "cameras ip"
      ],
      "unknown-source-connectors": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "uc-purpose": {
      "video-conferencing": [
        "videoconferência",
        "videoconferencia",
        "conferência",
        "teams",
        "zoom",
        "chamadas",
        "chamada de vídeo",
        "skype",
        "webex",
        "reunião online",
        "chamadas telefónicas"
      ],
      "recording-streaming": [
        "gravação",
        "gravacao",
        "gravar",
        "streaming",
        "transmissão",
        "captura de aulas",
        "webcast",
        "transmissão em direto",
        "capturar"
      ],
      "camera-distribution-only": [
        "distribuição de câmara",
        "distribuicao de camera",
        "enviar câmara",
        "enviar camera",
        "câmara para o ecrã",
        "camera para o ecra",
        "câmara para a televisão",
        "routing de câmara"
      ],
      "microphones-only": [
        "apenas microphones",
        "só microphones",
        "so microphones",
        "apenas microfones",
        "sem câmara",
        "sem camera",
        "reforço de voz",
        "sonorização",
        "anúncio",
        "anuncio"
      ],
      "no-uc": [
        "sem câmara",
        "sem camera",
        "sem microfone",
        "sem câmaras",
        "sem cameras",
        "sem microfones",
        "sem conferência",
        "sem videoconferência",
        "nada",
        "nenhum"
      ],
      "unknown-uc": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "uc-camera": {
      "fixed-usb-camera": [
        "webcam",
        "câmara fixa",
        "camera fixa",
        "câmara usb",
        "camera usb",
        "meeting owl",
        "câmara integrada",
        "logitech",
        "usb fixa"
      ],
      "usb-ptz-camera": [
        "usb ptz",
        "câmara ptz",
        "camera ptz",
        "pan tilt",
        "câmara motorizada",
        "ptz"
      ],
      "hdmi-ptz-camera": [
        "hdmi ptz",
        "câmara hdmi",
        "camera hdmi",
        "câmara com hdmi"
      ],
      "ndi-network-camera": [
        "ndi",
        "câmara de rede",
        "camera de rede",
        "câmara ip",
        "camera ip",
        "ptz de rede"
      ],
      "other-camera": [
        "câmara existente",
        "camera existente",
        "sdi",
        "câmara antiga",
        "camera antiga",
        "câmara analógica",
        "camera analogica",
        "outra câmara"
      ],
      "unknown-camera": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "uc-camera-count": {
      "one-camera": [
        "uma câmara",
        "uma camera",
        "uma única câmara",
        "1 câmara",
        "apenas uma"
      ],
      "two-cameras": [
        "duas câmaras",
        "duas cameras",
        "2 câmaras",
        "par de câmaras",
        "câmaras duplas"
      ],
      "three-four-cameras": [
        "três",
        "tres",
        "3",
        "quatro",
        "4",
        "três câmaras",
        "tres cameras",
        "quatro câmaras"
      ],
      "five-plus-cameras": [
        "cinco",
        "5",
        "mais de quatro",
        "seis",
        "6",
        "várias câmaras",
        "varias cameras"
      ],
      "unknown-camera-count": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "uc-microphones": {
      "speakerphone": [
        "kit de conferência",
        "coluna de mesa",
        "barra de som",
        "jabra",
        "poly",
        "altifalante de mesa",
        "speakerphone"
      ],
      "table-microphone": [
        "microfone de mesa",
        "micro de mesa",
        "microfone de secretária",
        "pescoço de ganso",
        "gooseneck"
      ],
      "ceiling-microphone-array": [
        "teto",
        "tecto",
        "matriz de teto",
        "suspenso",
        "microfone de teto",
        "microfone de tecto",
        "array"
      ],
      "wireless-microphone": [
        "sem fios",
        "sem fio",
        "microfone de rádio",
        "lapela",
        "lavalier",
        "de mão",
        "de mao",
        "auscultador",
        "headset",
        "microfone sem fios"
      ],
      "lectern-microphone": [
        "púlpito",
        "pulpito",
        "pódio",
        "podio",
        "microfone de púlpito",
        "atril"
      ],
      "existing-microphone-system": [
        "existente",
        "já temos",
        "instalado",
        "sistema existente"
      ],
      "no-microphones": [
        "sem microfones",
        "sem microphones",
        "sem microfone",
        "nenhum",
        "não há microfones"
      ],
      "unknown-microphones": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "uc-microphone-count": {
      "one-microphone-feed": [
        "um",
        "único",
        "unico",
        "1",
        "um feed",
        "um microfone"
      ],
      "two-four-microphone-feeds": [
        "dois",
        "2",
        "três",
        "tres",
        "3",
        "quatro",
        "4",
        "um par",
        "dois feeds"
      ],
      "five-eight-microphone-feeds": [
        "cinco",
        "5",
        "seis",
        "6",
        "sete",
        "7",
        "oito",
        "8"
      ],
      "nine-plus-microphone-feeds": [
        "nove",
        "9",
        "dez",
        "10",
        "muitos",
        "muitos feeds"
      ],
      "unknown-microphone-count": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "usb": {
      "no-usb": [
        "sem usb",
        "não usb",
        "nao usb",
        "nenhum usb",
        "sem transporte usb"
      ],
      "byod-byom": [
        "portátil do visitante",
        "portatil do visitante",
        "o portátil é o host",
        "o laptop é o host",
        "o meu portátil",
        "o meu laptop",
        "portátil do utilizador",
        "ligar o portátil",
        "byod"
      ],
      "room-pc-uc": [
        "pc da sala",
        "a teams room é o host",
        "o equipamento é o host",
        "computador da sala",
        "pc fixo"
      ],
      "switchable-host-usb": [
        "alternar",
        "comutável",
        "comutavel",
        "comutação de host",
        "mudar de host",
        "assumir o controlo"
      ],
      "room-host-usb2": [
        "usb 2",
        "usb standard",
        "usb 2.0",
        "usb básico"
      ],
      "usb3-high-bandwidth-path": [
        "usb 3",
        "usb3",
        "alta largura de banda",
        "3.0",
        "usb rápido",
        "usb rapido"
      ],
      "usb-extension-required": [
        "estender",
        "extensão",
        "extensao",
        "longa distância",
        "longa distancia",
        "longe",
        "usb sobre",
        "usb ao longo"
      ],
      "interactive-usb": [
        "toque",
        "tátil",
        "tactil",
        "interativo",
        "interativa",
        "anotação",
        "anotacao",
        "touchback"
      ],
      "unknown-usb": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "audio": {
      "no-room-audio": [
        "sem áudio",
        "sem audio",
        "sem colunas",
        "sem altifalantes",
        "sem áudio na sala",
        "nenhum",
        "sem sistema de som"
      ],
      "display-audio": [
        "colunas do ecrã",
        "colunas do monitor",
        "colunas da televisão",
        "barra de som no ecrã",
        "áudio do ecrã",
        "som do ecrã"
      ],
      "source-audio-deembed": [
        "de-embed",
        "extrair áudio",
        "extrair audio",
        "áudio separado",
        "audio separado",
        "áudio para a mesa de mistura",
        "extrair"
      ],
      "room-audio": [
        "colunas da sala",
        "colunas de teto",
        "altifalantes",
        "amplificador",
        "amp",
        "colunas na sala",
        "áudio da sala",
        "audio da sala"
      ],
      "stereo-low-impedance": [
        "estéreo",
        "estereo",
        "baixa impedância",
        "baixa impedancia",
        "4 ohm",
        "8 ohm",
        "hi-fi"
      ],
      "multichannel-audio": [
        "surround",
        "5.1",
        "7.1",
        "multicanal"
      ],
      "distributed-70v-100v": [
        "70 volt",
        "70v",
        "100v",
        "colunas distribuídas",
        "música ambiente",
        "música de fundo",
        "zonas",
        "zonado",
        "tensão constante",
        "tensao constante"
      ],
      "separate-programme-voice": [
        "programa separado",
        "reforço de voz",
        "voz e música",
        "programa e voz"
      ],
      "analogue-audio-override": [
        "analógico",
        "analogico",
        "reserva",
        "anulação local",
        "anulacao local"
      ],
      "digital-audio-interface": [
        "áudio digital",
        "audio digital",
        "aes",
        "spdif",
        "saída spdif",
        "aes ebu"
      ],
      "dante-network-audio": [
        "dante",
        "áudio em rede",
        "audio em rede",
        "aes67"
      ],
      "unknown-audio": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    },
    "control": {
      "simple-auto": [
        "automático",
        "automatico",
        "auto",
        "simples",
        "um botão",
        "predefinição",
        "sem controlo",
        "funciona sozinho"
      ],
      "front-panel-remote": [
        "comando",
        "telecomando",
        "painel frontal",
        "comando ir",
        "comando à distância"
      ],
      "touch-panel": [
        "painel tátil",
        "painel tactil",
        "ecrã tátil",
        "ecra tactil",
        "painel de parede",
        "teclado",
        "toque"
      ],
      "software-app-control": [
        "aplicação",
        "aplicacao",
        "software",
        "navegador",
        "app de tablet",
        "app móvel",
        "app movel",
        "página web",
        "pagina web"
      ],
      "third-party-control": [
        "crestron",
        "control4",
        "qsys",
        "q-sys",
        "amx",
        "extron",
        "sistema de controlo",
        "integração",
        "integracao",
        "bms"
      ],
      "unknown-control": [
        "não sei",
        "nao sei",
        "desconhecido",
        "incerto"
      ]
    }
  },
  questionTranslations: {
    "opportunity": {
      "question": "Que tipo de projeto é este?",
      "prompt": "Selecione a aplicação de cliente mais próxima."
    },
    "scale": {
      "question": "Qual é a escala aproximada da sala ou do sistema?",
      "prompt": "Escolha a escala mais próxima. As dimensões exatas podem ser registadas na caixa de notas."
    },
    "sources": {
      "question": "Quantas posições de fonte são prováveis?",
      "prompt": "Pense em portáteis, PCs, leitores multimédia, leitores de sinalização e entradas de apresentação sem fios."
    },
    "source-connection": {
      "question": "Qual perfil de fontes descreve melhor a sala?",
      "prompt": "Escolha o fluxo de fontes global mais próximo. Os requisitos de câmaras e microfones são capturados separadamente nas Comunicações Unificadas."
    },
    "displays": {
      "question": "Quantos ecrãs ou saídas são necessários?",
      "prompt": "Inclua projetores, monitores de confiança, ecrãs de apoio, paredes de vídeo e processadores LED."
    },
    "display-behaviour": {
      "question": "Como devem os ecrãs comportar-se?",
      "prompt": "Indique se as saídas espelham, fazem roteamento independente, alimentam um processador de parede ou mostram várias fontes num único ecrã."
    },
    "signal-standard": {
      "question": "Qual deve ser a nitidez da imagem?",
      "prompt": "Escolha a qualidade de imagem mais próxima. Se os ecrãs forem uma mistura de antigos e novos, ou de gama muito alta, diga-o abaixo — as verificações técnicas (HDR, HDCP, EDID) são tratadas em segundo plano."
    },
    "uc-purpose": {
      "question": "Que fluxos de câmara, microfone ou captura são necessários?",
      "prompt": "Selecione cada fluxo aplicável. Videoconferência, gravação e distribuição de câmara podem ser necessários em conjunto."
    },
    "uc-platform": {
      "question": "O que vai executar a chamada ou o fluxo de captura?",
      "prompt": "Identifique a plataforma de conferência ou captura antes de decidir a propriedade USB e a comutação de host."
    },
    "mtr-av-integration": {
      "question": "Como deve a Sala Microsoft Teams ligar-se ao sistema AV?",
      "prompt": "Confirme ambos os sentidos do sinal. Uma Sala Teams normalmente precisa de um fluxo do sistema AV para o MTR para partilha ou captura, além de uma saída do MTR de volta para o sistema AV para distribuição nos ecrãs da sala."
    },
    "uc-camera": {
      "question": "Que tipos de câmara são necessários?",
      "prompt": "Selecione cada tipo de câmara aplicável. A quantidade, as posições e os modelos exatos podem ser registados nas notas."
    },
    "uc-camera-count": {
      "question": "Quantas câmaras deve a sala de videoconferência usar?",
      "prompt": "Uma sala com mais de uma câmara precisa de uma ponte de câmara ou caminho de composição para que o host de conferência receba um feed de programa utilizável."
    },
    "uc-multi-camera-path": {
      "question": "A sala com várias câmaras vai usar câmaras NDI?",
      "prompt": "Escolha o transporte da câmara para que a Wingman aplique a arquitetura de ponte correta."
    },
    "uc-camera-routing": {
      "question": "Onde devem ser usados os feeds de câmara?",
      "prompt": "Uma câmara só é contada como fonte AV com roteamento quando o seu feed precisa de sair do caminho do periférico de conferência."
    },
    "uc-microphones": {
      "question": "Que tipos de microfone são necessários?",
      "prompt": "Registe aqui as entradas de voz. Colunas, amplificação e áudio geral da sala permanecem no passo de Áudio separado."
    },
    "uc-microphone-connection": {
      "question": "Como vão os microfones ligar-se?",
      "prompt": "Selecione cada interface, alimentação e caminho de sinal de microfone aplicável."
    },
    "uc-microphone-count": {
      "question": "Quantos feeds de microfone ou zonas de captação são necessários?",
      "prompt": "Conte matrizes, canais e zonas independentes."
    },
    "usb": {
      "question": "Quem controla os dispositivos USB e como deve o USB viajar?",
      "prompt": "Selecione os requisitos de host, comutação e largura de banda para câmaras, kits de conferência, ecrãs táteis e dispositivos de captura."
    },
    "audio": {
      "question": "Como deve o áudio da sala ser ligado e controlado?",
      "prompt": "Selecione os requisitos de reprodução, amplificação, distribuição e reforço."
    },
    "control": {
      "question": "Como devem as pessoas na sala operar o sistema?",
      "prompt": "Pense em utilização por pessoal, controlo de parede, painéis táteis, controlo por software ou aplicação, controlo de terceiros, automação ou seleção simples de fonte."
    },
    "locations-connections": {
      "question": "Onde está o equipamento e até onde devem viajar os sinais?",
      "prompt": "Escolha posições amplas da sala, a rota de vídeo mais longa e o provável percurso do cabo. Capture apenas o que afeta a escolha do hardware — medidas exatas, altura de montagem do ecrã, contenção de cabos e posições do rack são confirmadas durante o levantamento no local, não aqui."
    },
    "avoip-profile": {
      "question": "Qual destas opções soa mais próxima do que o cliente precisa?",
      "prompt": "Mantenha em termos simples — escolha o que importa mais: custo, qualidade de imagem, ligação de dispositivos ou mostrar várias fontes num ecrã ao mesmo tempo."
    },
    "video-wall-technology": {
      "question": "Que tipo de parede de vídeo está a ser planeada?",
      "prompt": "Escolha a tecnologia física de ecrã. Se não estiver confirmada, a Wingman manterá os dois caminhos de design abertos."
    },
    "video-wall-purpose": {
      "question": "Como deve a parede apresentar o conteúdo?",
      "prompt": "Selecione o modelo operativo mais próximo. Esta decisão controla se são necessárias perguntas detalhadas de multiview."
    },
    "source-device-workflows": {
      "question": "Que dispositivos e feeds vão as pessoas usar?",
      "prompt": "Selecione cada família de fontes."
    },
    "wireless-presentation-operation": {
      "question": "Como deve funcionar a apresentação sem fios?",
      "prompt": "Escolha o comportamento de ligação, segurança e partilha."
    },
    "multiview-destination": {
      "question": "Onde deve aparecer o multiview?",
      "prompt": "Selecione cada destino."
    },
    "multiview-operation": {
      "question": "Como devem funcionar os layouts de multiview?",
      "prompt": "Defina o número de fontes, o layout e o controlo."
    },
    "uc-audio-processing": {
      "question": "Como devem funcionar o microfone e o áudio do programa?",
      "prompt": "Selecione os resultados de mistura, ponte, DSP e saídas."
    }
  },
  voicePreview: "Olá. Vou fazer-lhe algumas perguntas sobre esta sala, e a Wingman vai construindo o sistema à medida que avançamos.",
};

export default table;
