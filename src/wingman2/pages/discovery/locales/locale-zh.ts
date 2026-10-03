// Chinese guided-interview tables — lazy-loaded only when the capture
// language is selected (see discoveryGuidedInterviewI18n.loadInterviewLanguage),
// so the Discovery chunk does not ship every language's phrase data upfront.
import type { LanguageTable } from "./localeTypes";

const table: LanguageTable = {
  stopwords: new Set(["的","和","或","与","要","需要","用","使用","一个","这个","那个","这些","那些","我们","他们","是","有","想要","想","只","仅","大约","可能","大概","也","还","会","去","什么","怎么","如何","做","吗","呢","在","对","把","给","为","就","都","很"]),
  unknown: ["不知道","不确定","还不确定","没决定","还没决定","不清楚","尚未确认","没有主意","还没想好","还没定"],
  curated: {
    "opportunity": {
      "meeting-room": [
        "会议室",
        "董事会议室",
        "董事会会议室",
        "会议厅",
        "小型会议室",
        "行政会议室",
        "办公室",
        "会议"
      ],
      "classroom": [
        "教室",
        "教学",
        "讲堂",
        "阶梯教室",
        "培训室",
        "课堂",
        "学校",
        "大学",
        "学院",
        "教育",
        "讲座"
      ],
      "hospitality": [
        "酒吧",
        "餐厅",
        "场所",
        "酒馆",
        "酒店",
        "休息室",
        "接待",
        "咖啡厅",
        "咖啡馆",
        "前台",
        "俱乐部"
      ],
      "video-wall": [
        "视频墙",
        "电视墙",
        "led墙",
        "led屏幕墙",
        "屏幕墙",
        "多屏墙",
        "数字标牌墙"
      ],
      "av-over-ip": [
        "基于ip",
        "通过ip网络",
        "分布式视频",
        "园区",
        "联网",
        "多房间",
        "多个房间",
        "ip视频",
        "网络分布"
      ],
      "not-sure": [
        "不确定",
        "不清楚",
        "还没定",
        "不知道",
        "没主意",
        "未知"
      ]
    },
    "scale": {
      "single-small-room": [
        "小房间",
        "小型房间",
        "一个房间",
        "单间",
        "1个房间",
        "小"
      ],
      "single-large-room": [
        "大房间",
        "大型房间",
        "一个大房间",
        "大"
      ],
      "multi-room": [
        "多个房间",
        "多房间",
        "两个房间",
        "三个房间",
        "几个房间",
        "多个"
      ],
      "building-wide": [
        "整栋楼",
        "整个楼层",
        "整层",
        "整栋建筑",
        "整幢楼",
        "园区",
        "楼层"
      ],
      "unknown-scale": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "sources": {
      "one-source": [
        "一个信号源",
        "单一信号源",
        "1个信号源",
        "一台笔记本",
        "一个笔记本"
      ],
      "two-four-sources": [
        "两个",
        "2",
        "四个",
        "4",
        "一对",
        "两台笔记本",
        "两个信号源",
        "几个信号源"
      ],
      "five-eight-sources": [
        "五个",
        "5",
        "六个",
        "6",
        "七个",
        "7",
        "八个",
        "8"
      ],
      "nine-plus-sources": [
        "九个",
        "9",
        "十个",
        "10",
        "十几个",
        "很多信号源",
        "十一个",
        "十二个"
      ],
      "unknown-sources": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "displays": {
      "one-display": [
        "一个屏幕",
        "一台显示器",
        "单个屏幕",
        "1个屏幕",
        "只有一个",
        "一块屏"
      ],
      "two-displays": [
        "两个屏幕",
        "两台显示器",
        "双屏",
        "2个屏幕",
        "一对屏幕"
      ],
      "three-eight-displays": [
        "三个",
        "3",
        "四个",
        "4",
        "五个",
        "5",
        "六个",
        "6",
        "七个",
        "7",
        "八个",
        "8",
        "几个屏幕"
      ],
      "nine-plus-displays": [
        "九个",
        "9",
        "十个",
        "10",
        "十几个",
        "很多屏幕"
      ],
      "video-wall-output": [
        "视频墙",
        "电视墙",
        "led墙",
        "屏幕墙",
        "led处理器"
      ]
    },
    "display-behaviour": {
      "same-content-all-displays": [
        "相同内容",
        "同样内容",
        "全部相同",
        "镜像",
        "所有屏幕一样",
        "全部一样",
        "相同画面"
      ],
      "independent-routing-per-display": [
        "不同内容",
        "独立",
        "每个屏幕",
        "单独",
        "独立路由",
        "分区",
        "任意信号源"
      ],
      "video-wall-or-processor-feed": [
        "视频墙",
        "电视墙",
        "处理器信号",
        "整墙画面",
        "墙面处理器"
      ],
      "multiview-on-one-output": [
        "多画面",
        "分屏",
        "多个信号源",
        "多个信号源在一个",
        "组合",
        "多窗口",
        "一个输出"
      ],
      "unknown-display-behaviour": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "signal-standard": {
      "1080p-standard-hdmi": [
        "1080p",
        "1080",
        "标准高清",
        "全高清",
        "高清画面"
      ],
      "4k60-standard": [
        "标准4k",
        "4k60",
        "超高清",
        "3840",
        "普通4k"
      ],
      "4k60-hdr-hdcp": [
        "4k hdr",
        "hdr",
        "hdcp",
        "高端4k",
        "高动态范围",
        "带hdr的4k"
      ],
      "legacy-edid-risk": [
        "edid",
        "旧屏幕",
        "老屏幕",
        "新旧混合",
        "兼容性问题",
        "新旧都有"
      ],
      "unknown-signal-standard": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "source-connection": {
      "fixed-hdmi-sources": [
        "媒体播放器",
        "房间电脑",
        "数字标牌播放器",
        "机顶盒",
        "苹果电视",
        "固定",
        "永久",
        "蓝光",
        "固定信号源"
      ],
      "laptops-wireless-inputs": [
        "笔记本",
        "笔记本电脑",
        "usb c",
        "usb-c",
        "无线投屏",
        "无线演示",
        "airplay",
        "miracast",
        "屏幕共享",
        "投屏",
        "byod",
        "自带设备"
      ],
      "mixed-hdmi-usbc": [
        "混合",
        "两者都有",
        "固定和",
        "和笔记本",
        "笔记本和",
        "混合的"
      ],
      "network-video-sources": [
        "网络视频",
        "ndi",
        "基于ip",
        "网络信号源",
        "ip摄像头"
      ],
      "unknown-source-connectors": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "uc-purpose": {
      "video-conferencing": [
        "视频会议",
        "会议",
        "teams",
        "zoom",
        "通话",
        "视频通话",
        "skype",
        "webex",
        "在线会议",
        "电话会议"
      ],
      "recording-streaming": [
        "录制",
        "录播",
        "流媒体",
        "直播",
        "课堂录制",
        "网络直播",
        "采集"
      ],
      "camera-distribution-only": [
        "摄像头分发",
        "发送摄像头",
        "路由摄像头",
        "摄像头到屏幕",
        "摄像头到电视",
        "摄像头路由"
      ],
      "microphones-only": [
        "仅麦克风",
        "只要麦克风",
        "需要麦克风",
        "没有摄像头",
        "语音增强",
        "广播",
        "通知",
        "扩声"
      ],
      "no-uc": [
        "没有摄像头",
        "没有麦克风",
        "无摄像头",
        "无麦克风",
        "没有会议",
        "无视频会议",
        "没有"
      ],
      "unknown-uc": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "uc-camera": {
      "fixed-usb-camera": [
        "电脑摄像头",
        "固定摄像头",
        "usb摄像头",
        "meeting owl",
        "内置摄像头",
        "logitech",
        "固定usb"
      ],
      "usb-ptz-camera": [
        "usb ptz",
        "ptz摄像头",
        "云台摄像头",
        "电动摄像头",
        "ptz"
      ],
      "hdmi-ptz-camera": [
        "hdmi ptz",
        "hdmi摄像头",
        "带hdmi的摄像头"
      ],
      "ndi-network-camera": [
        "ndi",
        "网络摄像头",
        "ip摄像头",
        "网络ptz",
        "ndi ptz"
      ],
      "other-camera": [
        "现有摄像头",
        "sdi",
        "旧摄像头",
        "模拟摄像头",
        "其他摄像头"
      ],
      "unknown-camera": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "uc-camera-count": {
      "one-camera": [
        "一个摄像头",
        "单摄像头",
        "1个摄像头",
        "只有一个"
      ],
      "two-cameras": [
        "两个摄像头",
        "2个摄像头",
        "一对摄像头",
        "双摄像头"
      ],
      "three-four-cameras": [
        "三个",
        "3",
        "四个",
        "4",
        "三个摄像头",
        "四个摄像头"
      ],
      "five-plus-cameras": [
        "五个",
        "5",
        "超过四个",
        "六个",
        "6",
        "多个摄像头"
      ],
      "unknown-camera-count": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "uc-microphones": {
      "speakerphone": [
        "会议电话",
        "免提电话",
        "回音壁",
        "条形音箱",
        "桌面音箱",
        "jabra",
        "poly",
        "桌面扬声器"
      ],
      "table-microphone": [
        "桌面麦克风",
        "台式麦克风",
        "鹅颈麦克风",
        "桌面mic"
      ],
      "ceiling-microphone-array": [
        "天花板",
        "吊顶",
        "天花麦克风",
        "吸顶麦克风",
        "阵列",
        "阵列麦克风"
      ],
      "wireless-microphone": [
        "无线",
        "无线麦克风",
        "领夹",
        "领夹麦",
        "手持",
        "耳麦",
        "头戴"
      ],
      "lectern-microphone": [
        "讲台",
        "讲台麦克风",
        "演讲台",
        "讲坛"
      ],
      "existing-microphone-system": [
        "现有",
        "已有",
        "已安装",
        "现有系统"
      ],
      "no-microphones": [
        "没有麦克风",
        "无麦克风",
        "没有mic",
        "没有"
      ],
      "unknown-microphones": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "uc-microphone-count": {
      "one-microphone-feed": [
        "一个",
        "单个",
        "1",
        "一路",
        "一个麦克风"
      ],
      "two-four-microphone-feeds": [
        "两个",
        "2",
        "三个",
        "3",
        "四个",
        "4",
        "一对",
        "两路"
      ],
      "five-eight-microphone-feeds": [
        "五个",
        "5",
        "六个",
        "6",
        "七个",
        "7",
        "八个",
        "8"
      ],
      "nine-plus-microphone-feeds": [
        "九个",
        "9",
        "十个",
        "10",
        "很多",
        "多路"
      ],
      "unknown-microphone-count": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "usb": {
      "no-usb": [
        "没有usb",
        "无usb",
        "不用usb",
        "无usb传输"
      ],
      "byod-byom": [
        "访客笔记本",
        "客人的笔记本",
        "笔记本是主机",
        "我的笔记本",
        "用户笔记本",
        "插入自己的笔记本",
        "byod"
      ],
      "room-pc-uc": [
        "房间电脑",
        "teams房间是主机",
        "设备是主机",
        "房间主机",
        "固定电脑"
      ],
      "switchable-host-usb": [
        "切换",
        "可切换",
        "主机切换",
        "切换主机",
        "接管"
      ],
      "room-host-usb2": [
        "usb 2",
        "标准usb",
        "usb 2.0",
        "基础usb"
      ],
      "usb3-high-bandwidth-path": [
        "usb 3",
        "usb3",
        "高带宽",
        "3.0",
        "高速usb"
      ],
      "usb-extension-required": [
        "延长",
        "扩展",
        "长距离",
        "很远",
        "长距离传输",
        "usb延长"
      ],
      "interactive-usb": [
        "触摸",
        "触控",
        "交互",
        "批注",
        "touchback"
      ],
      "unknown-usb": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "audio": {
      "no-room-audio": [
        "没有音频",
        "无音频",
        "没有音箱",
        "没有扬声器",
        "无音响系统",
        "没有"
      ],
      "display-audio": [
        "屏幕音箱",
        "显示器音箱",
        "电视音箱",
        "屏幕上的回音壁",
        "屏幕音频"
      ],
      "source-audio-deembed": [
        "音频解嵌",
        "分离音频",
        "单独音频输出",
        "音频到调音台",
        "提取音频"
      ],
      "room-audio": [
        "房间音箱",
        "天花音箱",
        "吸顶音箱",
        "功放",
        "放大器",
        "房间扬声器",
        "房间音频"
      ],
      "stereo-low-impedance": [
        "立体声",
        "低阻抗",
        "4欧",
        "8欧",
        "高保真"
      ],
      "multichannel-audio": [
        "环绕声",
        "5.1",
        "7.1",
        "多声道"
      ],
      "distributed-70v-100v": [
        "70伏",
        "70v",
        "100v",
        "分布式音箱",
        "背景音乐",
        "分区",
        "分区播放",
        "定压"
      ],
      "separate-programme-voice": [
        "独立节目",
        "语音增强",
        "语音和音乐",
        "节目和人声"
      ],
      "analogue-audio-override": [
        "模拟",
        "备用",
        "本地优先",
        "本地直通"
      ],
      "digital-audio-interface": [
        "数字音频",
        "aes",
        "spdif",
        "spdif输出",
        "aes ebu"
      ],
      "dante-network-audio": [
        "dante",
        "网络音频",
        "aes67"
      ],
      "unknown-audio": [
        "不确定",
        "未知",
        "不知道"
      ]
    },
    "control": {
      "simple-auto": [
        "自动",
        "简单",
        "一个按钮",
        "预设",
        "无需控制",
        "自动工作"
      ],
      "front-panel-remote": [
        "遥控器",
        "前面板",
        "红外遥控",
        "手持遥控"
      ],
      "touch-panel": [
        "触摸面板",
        "触控屏",
        "触摸屏",
        "墙面板",
        "按键面板",
        "触摸"
      ],
      "software-app-control": [
        "应用程序",
        "软件",
        "浏览器",
        "平板应用",
        "手机应用",
        "网页"
      ],
      "third-party-control": [
        "crestron",
        "control4",
        "qsys",
        "q-sys",
        "amx",
        "extron",
        "控制系统",
        "集成",
        "楼宇管理系统",
        "bms"
      ],
      "unknown-control": [
        "不确定",
        "未知",
        "不知道"
      ]
    }
  },
  questionTranslations: {
    "opportunity": {
      "question": "这是什么类型的项目？",
      "prompt": "选择最接近的客户应用场景。"
    },
    "scale": {
      "question": "房间或系统的大致规模是什么？",
      "prompt": "选择最接近的规模。精确尺寸可以记录在备注框中。"
    },
    "sources": {
      "question": "大概有多少路信号源？",
      "prompt": "考虑笔记本电脑、电脑、媒体播放器、数字标牌播放器和无线投屏输入。"
    },
    "source-connection": {
      "question": "哪个信号源类型最符合这个房间？",
      "prompt": "选择最接近的整体信号源场景。摄像头和麦克风需求在统一通信部分单独记录。"
    },
    "displays": {
      "question": "需要多少个屏幕或输出？",
      "prompt": "包括投影机、监看屏、扩展屏、视频墙和LED处理器。"
    },
    "display-behaviour": {
      "question": "屏幕应该如何工作？",
      "prompt": "说明输出是镜像、独立路由、馈送墙面处理器，还是在一个画面上显示多个信号源。"
    },
    "signal-standard": {
      "question": "画面需要多清晰？",
      "prompt": "选择最接近的画面质量。如果屏幕新旧混合，或非常高端，请在下面说明——技术检查（HDR、HDCP、EDID）会在后台处理。"
    },
    "uc-purpose": {
      "question": "需要哪些摄像头、麦克风或录制功能？",
      "prompt": "选择所有适用的功能。会议、录制和摄像头分发可能需要同时使用。"
    },
    "uc-platform": {
      "question": "什么来运行通话或录制功能？",
      "prompt": "在决定USB所有权和主机切换之前，先确定会议或录制平台。"
    },
    "mtr-av-integration": {
      "question": "Microsoft Teams Room 应如何连接到AV系统？",
      "prompt": "确认两个信号方向。Teams Room 通常需要将AV系统信号馈入MTR用于共享或录制，再加上MTR输出返回到AV系统，分发到房间屏幕。"
    },
    "uc-camera": {
      "question": "需要哪些类型的摄像头？",
      "prompt": "选择所有适用的摄像头类型。数量、位置和确切型号可以记录在备注中。"
    },
    "uc-camera-count": {
      "question": "视频会议室需要使用多少个摄像头？",
      "prompt": "拥有多个摄像头的房间需要摄像头桥接或合成路径，以便会议主机收到可用的节目信号。"
    },
    "uc-multi-camera-path": {
      "question": "多摄像头房间会使用NDI摄像头吗？",
      "prompt": "选择摄像头传输方式，以便Wingman应用正确的桥接架构。"
    },
    "uc-camera-routing": {
      "question": "摄像头信号需要在哪些地方使用？",
      "prompt": "只有当摄像头的信号需要离开会议外设路径时，它才被计为路由AV信号源。"
    },
    "uc-microphones": {
      "question": "需要哪些类型的麦克风？",
      "prompt": "在此记录语音输入。音箱、功放和房间一般音频保留在单独的音频步骤中。"
    },
    "uc-microphone-connection": {
      "question": "麦克风将如何连接？",
      "prompt": "选择所有适用的麦克风接口、电源和信号路径。"
    },
    "uc-microphone-count": {
      "question": "需要多少个麦克风通道或拾音区域？",
      "prompt": "统计独立的阵列、通道和区域。"
    },
    "usb": {
      "question": "谁控制USB设备，USB应如何传输？",
      "prompt": "为摄像头、会议电话、触摸屏和录制设备选择主机、切换和带宽需求。"
    },
    "audio": {
      "question": "房间音频应如何连接和操作？",
      "prompt": "选择播放、放大、分布和增强需求。"
    },
    "control": {
      "question": "房间里的人应如何操作系统？",
      "prompt": "考虑员工使用、墙面控制、触摸面板、软件或应用控制、第三方控制、自动化或简单信号源选择。"
    },
    "locations-connections": {
      "question": "设备在哪里，信号需要传输多远？",
      "prompt": "选择大致的房间位置、最长的视频路径和可能的线缆走向。只记录影响硬件选择的内容——精确测量、屏幕安装高度、线缆收纳和机柜位置在现场勘测时确认，不在这里。"
    },
    "avoip-profile": {
      "question": "以下哪一项最接近客户的需求？",
      "prompt": "用简单的话说——选择最关键的：成本、图像质量、连接设备，还是同时在一个屏幕上显示多个信号源。"
    },
    "video-wall-technology": {
      "question": "计划建造什么样的视频墙？",
      "prompt": "选择物理显示技术。如果尚未确认，Wingman将保持两种设计方案开放。"
    },
    "video-wall-purpose": {
      "question": "视频墙应如何呈现内容？",
      "prompt": "选择最接近的运营模式。这个决定控制是否需要详细的多画面问题。"
    },
    "source-device-workflows": {
      "question": "人们会使用哪些设备和信号？",
      "prompt": "选择每个信号源类别。"
    },
    "wireless-presentation-operation": {
      "question": "无线投屏应如何工作？",
      "prompt": "选择接入、安全和共享行为。"
    },
    "multiview-destination": {
      "question": "多画面应在哪里显示？",
      "prompt": "选择每个目标位置。"
    },
    "multiview-operation": {
      "question": "多画面布局应如何工作？",
      "prompt": "定义信号源数量、布局和控制。"
    },
    "uc-audio-processing": {
      "question": "麦克风和节目音频应如何处理？",
      "prompt": "选择混音、桥接、DSP和输出结果。"
    }
  },
  voicePreview: "您好。我会问您几个关于这个房间的问题，Wingman会随着对话逐步构建系统。",
};

export default table;
