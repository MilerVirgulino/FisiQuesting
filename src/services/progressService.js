import {
  collection,
  doc,
  getDocs,
  increment,
  arrayUnion,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where
} from "firebase/firestore";
import { db } from "../firebase-init";
import { todayKey } from "../utils/date";

export async function listDailyQuests() {
  const snapshot = await getDocs(query(collection(db, "dailyQuests"), where("active", "==", true)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function listSubmittedMissionAttemptIds(userId) {
  if (!userId) return new Set();

  const snapshot = await getDocs(
    query(
      collection(db, "missionAttempts"),
      where("userId", "==", userId)
    )
  );

  return new Set(snapshot.docs.map((item) => item.data().missionId).filter(Boolean));
}

export async function submitAnswer({ userId, question, selectedIndex, missionId = "free" }) {
  const correct = Number(selectedIndex) === Number(question.correctIndex);
  const xpEarned = correct ? Number(question.xp || 0) : 0;
  const dateKey = todayKey();
  const progressId = `${userId}_${dateKey}`;
  const progressRef = doc(db, "userProgress", progressId);
  const userRef = doc(db, "users", userId);
  const answerRef = doc(db, "userProgress", progressId, "answers", `${missionId}_${question.id}`);

  return runTransaction(db, async (transaction) => {
    const progressSnapshot = await transaction.get(progressRef);
    const userSnapshot = await transaction.get(userRef);
    const answerSnapshot = await transaction.get(answerRef);

    if (answerSnapshot.exists()) {
      const previous = answerSnapshot.data();
      return {
        correct: previous.correct,
        xpEarned: 0,
        alreadyAnswered: true
      };
    }

    const currentCombo = progressSnapshot.exists() ? progressSnapshot.data().currentCombo || 0 : 0;
    const nextCombo = correct ? currentCombo + 1 : 0;
    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    const nextUserStreak = correct ? (userData.streak || 0) + 1 : 0;
    const nextBestStreak = Math.max(userData.bestStreak || 0, nextUserStreak);

    transaction.set(
      progressRef,
      {
        userId,
      dateKey,
      missionIds: {
        [missionId]: true
      },
      solved: increment(1),
        correct: increment(correct ? 1 : 0),
        xpEarned: increment(xpEarned),
        currentCombo: nextCombo,
        bestCombo: Math.max(nextCombo, progressSnapshot.data()?.bestCombo || 0),
        areas: {
          [question.area]: increment(1)
        },
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    transaction.set(answerRef, {
      questionId: question.id,
      missionId,
      selectedIndex: Number(selectedIndex),
      correct,
      xpEarned,
      area: question.area,
      difficulty: question.difficulty,
      answeredAt: serverTimestamp()
    });

    transaction.set(
      userRef,
      {
        totalXp: increment(xpEarned),
        streak: nextUserStreak,
        bestStreak: nextBestStreak,
        solvedCount: increment(1),
        correctCount: increment(correct ? 1 : 0),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return { correct, xpEarned, alreadyAnswered: false };
  });
}

export async function submitMissionAttempt({ userId, mission, questions, answers }) {
  const dateKey = todayKey();
  const progressId = `${userId}_${dateKey}`;
  const attemptId = `${userId}_${mission.id}`;
  const progressRef = doc(db, "userProgress", progressId);
  const userRef = doc(db, "users", userId);
  const attemptRef = doc(db, "missionAttempts", attemptId);

  const answerList = questions
    .map((question, order) => {
      const answer = answers[question.id];
      if (!answer) return null;
      const correct = Number(answer.selectedIndex) === Number(question.correctIndex);
      return {
        questionId: question.id,
        order,
        selectedIndex: Number(answer.selectedIndex),
        correct,
        xpEarned: correct ? Number(question.xp || 0) : 0,
        area: question.area,
        difficulty: question.difficulty
      };
    })
    .filter(Boolean);

  const solved = answerList.length;
  const correct = answerList.filter((answer) => answer.correct).length;
  const questionXp = answerList.reduce((total, answer) => total + answer.xpEarned, 0);
  const completed = solved === questions.length && questions.length > 0;
  const bonusXp = completed ? Number(mission.rewardXp || 0) : 0;
  const rewardCoins = completed ? Number(mission.rewardCoins || 0) : 0;
  const coinsEarned = completed && questions.length > 0
    ? Math.max(0, Math.round((rewardCoins * correct) / questions.length))
    : 0;
  const missed = Math.max(0, questions.length - correct);
  const coinsLost = Math.max(0, rewardCoins - coinsEarned);
  const xpEarned = questionXp + bonusXp;
  const areas = answerList.reduce((accumulator, answer) => {
    accumulator[answer.area] = (accumulator[answer.area] || 0) + 1;
    return accumulator;
  }, {});

  return runTransaction(db, async (transaction) => {
    const attemptSnapshot = await transaction.get(attemptRef);
    const progressSnapshot = await transaction.get(progressRef);
    const userSnapshot = await transaction.get(userRef);

    if (attemptSnapshot.exists()) {
      return {
        alreadySubmitted: true,
        ...attemptSnapshot.data()
      };
    }

    const userData = userSnapshot.exists() ? userSnapshot.data() : {};
    let nextStreak = userData.streak || 0;
    let nextBestStreak = userData.bestStreak || 0;
    let dailyCombo = progressSnapshot.exists() ? progressSnapshot.data().currentCombo || 0 : 0;
    let dailyBestCombo = progressSnapshot.exists() ? progressSnapshot.data().bestCombo || 0 : 0;

    answerList.forEach((answer) => {
      nextStreak = answer.correct ? nextStreak + 1 : 0;
      dailyCombo = answer.correct ? dailyCombo + 1 : 0;
      nextBestStreak = Math.max(nextBestStreak, nextStreak);
      dailyBestCombo = Math.max(dailyBestCombo, dailyCombo);
    });

    transaction.set(attemptRef, {
      userId,
      missionId: mission.id,
      dateKey,
      solved,
      correct,
      questionXp,
      bonusXp,
      xpEarned,
      rewardCoins,
      coinsEarned,
      coinsLost,
      missed,
      completed,
      answers: answerList,
      submittedAt: serverTimestamp()
    });

    const areaIncrements = {};
    Object.entries(areas).forEach(([area, amount]) => {
      areaIncrements[area] = increment(amount);
    });

    transaction.set(
      progressRef,
      {
        userId,
        dateKey,
        missionIds: {
          [mission.id]: true
        },
        solved: increment(solved),
        correct: increment(correct),
        xpEarned: increment(xpEarned),
        currentCombo: dailyCombo,
        bestCombo: dailyBestCombo,
        areas: areaIncrements,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    transaction.set(
      userRef,
      {
        totalXp: increment(xpEarned),
        coins: increment(coinsEarned),
        completedMissionIds: arrayUnion(mission.id),
        streak: nextStreak,
        bestStreak: nextBestStreak,
        solvedCount: increment(solved),
        correctCount: increment(correct),
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    return {
      alreadySubmitted: false,
      solved,
      correct,
      questionXp,
      bonusXp,
      xpEarned,
      rewardCoins,
      coinsEarned,
      coinsLost,
      missed,
      completed
    };
  });
}

export function createDailyProgress(userId) {
  const dateKey = todayKey();
  return setDoc(
    doc(db, "userProgress", `${userId}_${dateKey}`),
    {
      userId,
      dateKey,
      solved: 0,
      correct: 0,
      xpEarned: 0,
      currentCombo: 0,
      bestCombo: 0,
      areas: {},
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}
