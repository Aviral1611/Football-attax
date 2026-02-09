// Quiz Service - Handles daily quiz logic

import { doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import {
    QuizQuestion,
    UserQuizData,
    QUIZ_CONSTANTS,
    getTodayDateString,
    seededRandom,
    hashString
} from '@/types/quizTypes';
import quizQuestionsData from '@/data/quizQuestions.json';

const allQuestions: QuizQuestion[] = quizQuestionsData as QuizQuestion[];

// Get today's 10 questions (consistent for all users)
export function getTodayQuestions(): QuizQuestion[] {
    const dateString = getTodayDateString();
    const seed = hashString(dateString);
    const random = seededRandom(seed);

    // Shuffle all questions using seeded random
    const shuffled = [...allQuestions].sort(() => random() - 0.5);

    // Return first 10
    return shuffled.slice(0, QUIZ_CONSTANTS.QUESTIONS_PER_DAY);
}

// Get or create user quiz data
export async function getUserQuizData(userId: string): Promise<UserQuizData> {
    const quizRef = doc(db, 'userQuiz', userId);
    const quizDoc = await getDoc(quizRef);

    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayTimestamp = todayStart.getTime();

    if (quizDoc.exists()) {
        const data = quizDoc.data() as UserQuizData;

        // Check if we need to reset for a new day
        if (data.lastQuizReset < todayTimestamp) {
            const resetData: UserQuizData = {
                questionsAnsweredToday: [],
                lastQuizReset: todayTimestamp,
                totalCorrect: data.totalCorrect || 0,
            };
            await setDoc(quizRef, resetData);
            return resetData;
        }

        return data;
    }

    // Create new quiz data
    const newData: UserQuizData = {
        questionsAnsweredToday: [],
        lastQuizReset: todayTimestamp,
        totalCorrect: 0,
    };
    await setDoc(quizRef, newData);
    return newData;
}

// Check and submit an answer
export async function submitQuizAnswer(
    userId: string,
    questionId: string,
    answerIndex: number
): Promise<{
    success: boolean;
    correct: boolean;
    pointsEarned: number;
    error?: string;
}> {
    // Get fresh quiz data
    const quizData = await getUserQuizData(userId);

    // Check if already answered this question today
    if (quizData.questionsAnsweredToday.includes(questionId)) {
        return {
            success: false,
            correct: false,
            pointsEarned: 0,
            error: 'Already answered this question today',
        };
    }

    // Find the question
    const question = allQuestions.find(q => q.id === questionId);
    if (!question) {
        return {
            success: false,
            correct: false,
            pointsEarned: 0,
            error: 'Question not found',
        };
    }

    const isCorrect = answerIndex === question.correctIndex;
    const pointsEarned = isCorrect ? QUIZ_CONSTANTS.POINTS_PER_CORRECT : 0;

    // Update quiz data
    const quizRef = doc(db, 'userQuiz', userId);
    await updateDoc(quizRef, {
        questionsAnsweredToday: [...quizData.questionsAnsweredToday, questionId],
        totalCorrect: quizData.totalCorrect + (isCorrect ? 1 : 0),
    });

    // Award points if correct
    if (isCorrect) {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
            const currentPoints = userDoc.data().points || 0;
            await updateDoc(userRef, {
                points: currentPoints + pointsEarned,
            });
        }
    }

    return {
        success: true,
        correct: isCorrect,
        pointsEarned,
    };
}

// Get quiz progress for today
export function getQuizProgress(quizData: UserQuizData): {
    completed: number;
    total: number;
    remaining: number;
} {
    return {
        completed: quizData.questionsAnsweredToday.length,
        total: QUIZ_CONSTANTS.QUESTIONS_PER_DAY,
        remaining: QUIZ_CONSTANTS.QUESTIONS_PER_DAY - quizData.questionsAnsweredToday.length,
    };
}

// Get unanswered questions for today
export function getUnansweredQuestions(quizData: UserQuizData): QuizQuestion[] {
    const todayQuestions = getTodayQuestions();
    return todayQuestions.filter(q => !quizData.questionsAnsweredToday.includes(q.id));
}
