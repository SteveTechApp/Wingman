export interface TrainingAsset {
    url: string;
    title: string;
    type: 'image' | 'diagram' | 'video';
}

export interface TrainingLink {
    url: string;
    text: string;
}

export interface TrainingContentPage {
    title: string;
    content: string;
    asset?: TrainingAsset;
    links?: TrainingLink[];
}

export interface QuizQuestion {
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
}

export interface TrainingModule {
    id: string;
    title: string;
    contentPages: TrainingContentPage[];
    quiz: QuizQuestion[];
}

export interface QuizAnswer {
    questionIndex: number;
    answer: string;
    isCorrect: boolean;
}