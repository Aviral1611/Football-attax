'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import {
    getUserQuizData,
    getTodayQuestions,
    submitQuizAnswer,
    getQuizProgress,
    getUnansweredQuestions
} from '@/lib/quizService';
import { QuizQuestion, UserQuizData, QUIZ_CONSTANTS } from '@/types/quizTypes';
import Link from 'next/link';

export default function QuizPage() {
    return (
        <ProtectedRoute>
            <QuizContent />
        </ProtectedRoute>
    );
}

type QuizState = 'loading' | 'intro' | 'playing' | 'answered' | 'complete';

function QuizContent() {
    const { user } = useAuth();
    const [quizState, setQuizState] = useState<QuizState>('loading');
    const [quizData, setQuizData] = useState<UserQuizData | null>(null);
    const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(null);
    const [unansweredQuestions, setUnansweredQuestions] = useState<QuizQuestion[]>([]);
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [pointsEarned, setPointsEarned] = useState(0);
    const [totalPointsToday, setTotalPointsToday] = useState(0);
    const [loading, setLoading] = useState(false);

    // Load quiz data on mount
    useEffect(() => {
        async function loadQuizData() {
            if (!user) return;

            try {
                const data = await getUserQuizData(user.uid);
                setQuizData(data);

                const unanswered = getUnansweredQuestions(data);
                setUnansweredQuestions(unanswered);

                const progress = getQuizProgress(data);
                setTotalPointsToday(progress.completed * QUIZ_CONSTANTS.POINTS_PER_CORRECT);

                if (unanswered.length === 0) {
                    setQuizState('complete');
                } else {
                    setQuizState('intro');
                }
            } catch (error) {
                console.error('Error loading quiz data:', error);
            }
        }

        loadQuizData();
    }, [user]);

    // Start the quiz
    const startQuiz = () => {
        if (unansweredQuestions.length > 0) {
            setCurrentQuestion(unansweredQuestions[0]);
            setQuizState('playing');
            setSelectedAnswer(null);
            setIsCorrect(null);
        }
    };

    // Handle answer selection
    const handleAnswer = async (answerIndex: number) => {
        if (!user || !currentQuestion || loading) return;

        setLoading(true);
        setSelectedAnswer(answerIndex);

        try {
            const result = await submitQuizAnswer(user.uid, currentQuestion.id, answerIndex);

            setIsCorrect(result.correct);
            setPointsEarned(result.pointsEarned);

            if (result.correct) {
                setTotalPointsToday(prev => prev + result.pointsEarned);
            }

            // Refresh quiz data
            const data = await getUserQuizData(user.uid);
            setQuizData(data);

            const unanswered = getUnansweredQuestions(data);
            setUnansweredQuestions(unanswered);

            setQuizState('answered');
        } catch (error) {
            console.error('Error submitting answer:', error);
        } finally {
            setLoading(false);
        }
    };

    // Move to next question
    const nextQuestion = () => {
        if (unansweredQuestions.length === 0) {
            setQuizState('complete');
        } else {
            setCurrentQuestion(unansweredQuestions[0]);
            setSelectedAnswer(null);
            setIsCorrect(null);
            setQuizState('playing');
        }
    };

    const progress = quizData ? getQuizProgress(quizData) : { completed: 0, total: 10, remaining: 10 };

    if (quizState === 'loading') {
        return (
            <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl animate-pulse mb-4">🧠</div>
                    <p className="text-gray-400">Loading quiz...</p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">

                {/* INTRO STATE */}
                {quizState === 'intro' && (
                    <div className="text-center py-12">
                        <div className="text-8xl mb-6">🧠</div>
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
                            Daily Football Quiz
                        </h1>
                        <p className="text-gray-400 mb-8 text-lg">
                            Test your football knowledge!
                        </p>

                        {/* Progress */}
                        <div className="bg-gray-800/50 rounded-xl p-6 mb-8 border border-gray-700">
                            <div className="flex justify-between text-lg mb-2">
                                <span className="text-gray-400">Today's Progress</span>
                                <span className="text-white font-bold">{progress.completed}/{progress.total}</span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
                                <div
                                    className="bg-gradient-to-r from-green-500 to-emerald-600 h-3 rounded-full transition-all"
                                    style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                                />
                            </div>
                            <p className="text-amber-400 text-xl font-bold">
                                Points earned today: {totalPointsToday}
                            </p>
                        </div>

                        {/* Rules */}
                        <div className="bg-gray-800/30 rounded-xl p-6 mb-8 text-left border border-gray-700/50">
                            <h3 className="text-xl font-bold text-white mb-4">📋 How to Play</h3>
                            <ul className="space-y-2 text-gray-300">
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400">1.</span>
                                    Answer {QUIZ_CONSTANTS.QUESTIONS_PER_DAY} football trivia questions daily
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400">2.</span>
                                    Earn <span className="text-green-400 font-bold">{QUIZ_CONSTANTS.POINTS_PER_CORRECT} points</span> for each correct answer
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400">3.</span>
                                    New questions every day at midnight UTC
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="text-amber-400">4.</span>
                                    Max daily earnings: <span className="text-amber-400 font-bold">{QUIZ_CONSTANTS.QUESTIONS_PER_DAY * QUIZ_CONSTANTS.POINTS_PER_CORRECT} points</span>
                                </li>
                            </ul>
                        </div>

                        {progress.remaining > 0 ? (
                            <button
                                onClick={startQuiz}
                                className="px-12 py-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-2xl text-white hover:scale-105 transition-transform shadow-lg shadow-green-500/25"
                            >
                                {progress.completed > 0 ? 'Continue Quiz' : 'Start Quiz'} 🚀
                            </button>
                        ) : (
                            <div className="text-center">
                                <p className="text-green-400 text-xl mb-4">✅ All done for today!</p>
                                <Link href="/" className="text-amber-400 hover:underline">
                                    ← Back to Home
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* PLAYING STATE */}
                {quizState === 'playing' && currentQuestion && (
                    <div className="py-8">
                        {/* Progress bar */}
                        <div className="flex justify-between items-center mb-6">
                            <span className="text-gray-400">Question {progress.completed + 1} of {progress.total}</span>
                            <span className="text-amber-400 font-bold">{totalPointsToday} pts</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2 mb-8">
                            <div
                                className="bg-gradient-to-r from-amber-500 to-orange-600 h-2 rounded-full transition-all"
                                style={{ width: `${((progress.completed + 1) / progress.total) * 100}%` }}
                            />
                        </div>

                        {/* Question */}
                        <div className="bg-gray-800/50 rounded-2xl p-6 md:p-8 mb-6 border border-gray-700">
                            <span className="text-xs text-gray-500 uppercase tracking-wider">{currentQuestion.category}</span>
                            <h2 className="text-xl md:text-2xl font-bold text-white mt-2">
                                {currentQuestion.question}
                            </h2>
                        </div>

                        {/* Options */}
                        <div className="space-y-3">
                            {currentQuestion.options.map((option, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleAnswer(index)}
                                    disabled={loading}
                                    className={`
                                        w-full p-4 md:p-5 rounded-xl text-left font-medium text-lg
                                        transition-all border-2
                                        ${loading
                                            ? 'opacity-50 cursor-not-allowed'
                                            : 'hover:scale-[1.02] hover:border-amber-500/50 cursor-pointer'}
                                        bg-gray-800/50 border-gray-700 text-white
                                    `}
                                >
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-700 text-amber-400 text-sm font-bold mr-3">
                                        {String.fromCharCode(65 + index)}
                                    </span>
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ANSWERED STATE */}
                {quizState === 'answered' && currentQuestion && (
                    <div className="py-8 text-center">
                        {/* Result */}
                        <div className={`text-8xl mb-6 ${isCorrect ? 'animate-bounce' : 'animate-pulse'}`}>
                            {isCorrect ? '✅' : '❌'}
                        </div>

                        <h2 className={`text-4xl font-black mb-4 ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                            {isCorrect ? 'Correct!' : 'Wrong!'}
                        </h2>

                        {isCorrect && (
                            <p className="text-2xl text-amber-400 mb-6">
                                +{pointsEarned} Points!
                            </p>
                        )}

                        {/* Show correct answer if wrong */}
                        {!isCorrect && (
                            <div className="bg-gray-800/50 rounded-xl p-4 mb-6 border border-gray-700">
                                <p className="text-gray-400 text-sm mb-2">Correct Answer:</p>
                                <p className="text-green-400 text-xl font-bold">
                                    {currentQuestion.options[currentQuestion.correctIndex]}
                                </p>
                            </div>
                        )}

                        {/* Progress */}
                        <div className="bg-gray-800/30 rounded-xl p-4 mb-8 border border-gray-700/50">
                            <p className="text-gray-400">
                                Progress: <span className="text-white font-bold">{progress.completed}/{progress.total}</span>
                            </p>
                            <p className="text-amber-400 font-bold">
                                Total earned today: {totalPointsToday} pts
                            </p>
                        </div>

                        <button
                            onClick={nextQuestion}
                            className="px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl font-bold text-xl text-white hover:scale-105 transition-transform"
                        >
                            {unansweredQuestions.length > 0 ? 'Next Question →' : 'See Results'}
                        </button>
                    </div>
                )}

                {/* COMPLETE STATE */}
                {quizState === 'complete' && (
                    <div className="py-12 text-center">
                        <div className="text-8xl mb-6">🏆</div>

                        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
                            Quiz Complete!
                        </h1>

                        <p className="text-gray-400 text-lg mb-8">
                            You've completed today's football quiz!
                        </p>

                        <div className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 rounded-2xl p-8 mb-8 border border-amber-500/30">
                            <p className="text-gray-400 mb-2">Points Earned Today</p>
                            <p className="text-5xl font-black text-amber-400">
                                {totalPointsToday}
                            </p>
                            <p className="text-gray-500 text-sm mt-2">
                                out of {QUIZ_CONSTANTS.QUESTIONS_PER_DAY * QUIZ_CONSTANTS.POINTS_PER_CORRECT} possible
                            </p>
                        </div>

                        <p className="text-gray-500 mb-8">
                            Come back tomorrow for new questions!
                        </p>

                        <div className="flex gap-4 justify-center flex-wrap">
                            <Link
                                href="/shop"
                                className="px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold text-lg text-white hover:scale-105 transition-transform"
                            >
                                🛒 Spend Points
                            </Link>
                            <Link
                                href="/"
                                className="px-8 py-4 bg-gray-700 rounded-xl font-bold text-lg text-white hover:bg-gray-600 transition-colors"
                            >
                                🏠 Home
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
