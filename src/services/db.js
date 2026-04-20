import {
  Timestamp,
  addDoc,
  setDoc,
  writeBatch,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { clamp, round1 } from '../utils/format.js'
import { toDateKey } from '../utils/date.js'

async function deleteWhereUserId({ colName, userId, pageSize = 200 }) {
  const colRef = collection(db, colName)
  while (true) {
    const snap = await getDocs(query(colRef, where('userId', '==', userId), limit(pageSize)))
    if (snap.empty) break

    const batch = writeBatch(db)
    snap.docs.forEach((d) => batch.delete(d.ref))
    await batch.commit()
  }
}

function normalizeMealInput(meal) {
  return {
    description: String(meal.description || '').trim(),
    image: meal.image || null,
    calories: round1(meal.calories),
    protein: round1(meal.protein),
    carbs: round1(meal.carbs),
    fats: round1(meal.fats),
    healthScore: clamp(Number(meal.healthScore) || 0, 0, 100),
    suggestions: Array.isArray(meal.suggestions) ? meal.suggestions : [],
  }
}

function normalizeTemplateInput(template) {
  const meal = normalizeMealInput(template)
  return {
    name: String(template.name || template.description || '').trim(),
    ...meal,
  }
}

function dailyLogDocId(userId, dateKey) {
  return `${userId}_${dateKey}`
}

async function applyDailyDelta({ userId, dateKey, delta, timestamp }) {
  const logId = dailyLogDocId(userId, dateKey)
  const ref = doc(db, 'nutrition_logs', logId)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const base = snap.exists() ? snap.data() : null

    const next = {
      userId,
      dateKey,
      calories: round1((base?.calories || 0) + (delta.calories || 0)),
      protein: round1((base?.protein || 0) + (delta.protein || 0)),
      carbs: round1((base?.carbs || 0) + (delta.carbs || 0)),
      fats: round1((base?.fats || 0) + (delta.fats || 0)),
      updatedAt: serverTimestamp(),
      timestamp: base?.timestamp || timestamp || Timestamp.now(),
    }

    tx.set(ref, next, { merge: true })
  })
}

export async function addMeal({ userId, meal }) {
  const normalized = normalizeMealInput(meal)
  if (!normalized.description) throw new Error('Description is required')

  const timestamp = Timestamp.now()
  const dateKey = toDateKey(timestamp.toDate())

  const docRef = await addDoc(collection(db, 'meals'), {
    userId,
    ...normalized,
    timestamp,
    dateKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  await applyDailyDelta({
    userId,
    dateKey,
    timestamp,
    delta: {
      calories: normalized.calories,
      protein: normalized.protein,
      carbs: normalized.carbs,
      fats: normalized.fats,
    },
  })

  return docRef.id
}

export async function getUserProfile({ userId }) {
  const ref = doc(db, 'users', userId)
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function upsertUserProfile({ userId, updates }) {
  const ref = doc(db, 'users', userId)
  await setDoc(ref, {
    uid: userId,
    ...updates,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function updateMeal({ userId, mealId, updates }) {
  const ref = doc(db, 'meals', mealId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Meal not found')

  const existing = snap.data()
  if (existing.userId !== userId) throw new Error('Not authorized')

  const normalized = normalizeMealInput({ ...existing, ...updates })
  if (!normalized.description) throw new Error('Description is required')

  // Adjust nutrition_logs by delta.
  const delta = {
    calories: normalized.calories - (existing.calories || 0),
    protein: normalized.protein - (existing.protein || 0),
    carbs: normalized.carbs - (existing.carbs || 0),
    fats: normalized.fats - (existing.fats || 0),
  }

  await updateDoc(ref, {
    ...normalized,
    updatedAt: serverTimestamp(),
  })

  await applyDailyDelta({
    userId,
    dateKey: existing.dateKey,
    timestamp: existing.timestamp,
    delta,
  })
}

export async function deleteMeal({ userId, mealId }) {
  const ref = doc(db, 'meals', mealId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return

  const existing = snap.data()
  if (existing.userId !== userId) throw new Error('Not authorized')

  await deleteDoc(ref)

  await applyDailyDelta({
    userId,
    dateKey: existing.dateKey,
    timestamp: existing.timestamp,
    delta: {
      calories: -(existing.calories || 0),
      protein: -(existing.protein || 0),
      carbs: -(existing.carbs || 0),
      fats: -(existing.fats || 0),
    },
  })
}

export async function listMeals({ userId, startDate, endDate, pageSize = 50 }) {
  const mealsRef = collection(db, 'meals')

  const constraints = [where('userId', '==', userId), orderBy('timestamp', 'desc'), limit(pageSize)]

  if (startDate) constraints.splice(1, 0, where('timestamp', '>=', Timestamp.fromDate(startDate)))
  if (endDate) constraints.splice(1, 0, where('timestamp', '<=', Timestamp.fromDate(endDate)))

  const q = query(mealsRef, ...constraints)
  const snapshot = await getDocs(q)

  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function getDailyLog({ userId, dateKey }) {
  const ref = doc(db, 'nutrition_logs', dailyLogDocId(userId, dateKey))
  const snap = await getDoc(ref)
  return snap.exists() ? snap.data() : null
}

export async function listWeeklyLogs({ userId, startDate, endDate }) {
  const logsRef = collection(db, 'nutrition_logs')

  const q = query(
    logsRef,
    where('userId', '==', userId),
    where('timestamp', '>=', Timestamp.fromDate(startDate)),
    where('timestamp', '<=', Timestamp.fromDate(endDate)),
    orderBy('timestamp', 'asc'),
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function listLogsRange({ userId, startDate, endDate }) {
  return listWeeklyLogs({ userId, startDate, endDate })
}

export async function setDailyWater({ userId, dateKey, waterMl }) {
  const logId = dailyLogDocId(userId, dateKey)
  const ref = doc(db, 'nutrition_logs', logId)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    const base = snap.exists() ? snap.data() : null

    tx.set(ref, {
      userId,
      dateKey,
      calories: round1(base?.calories || 0),
      protein: round1(base?.protein || 0),
      carbs: round1(base?.carbs || 0),
      fats: round1(base?.fats || 0),
      waterMl: Math.max(0, Math.round(Number(waterMl) || 0)),
      updatedAt: serverTimestamp(),
      timestamp: base?.timestamp || Timestamp.now(),
    }, { merge: true })
  })
}

export async function createMealTemplate({ userId, template }) {
  const normalized = normalizeTemplateInput(template)
  if (!normalized.name) throw new Error('Template name is required')
  if (!normalized.description) throw new Error('Template description is required')

  const ref = await addDoc(collection(db, 'meal_templates'), {
    userId,
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return ref.id
}

export async function listMealTemplates({ userId, pageSize = 20 }) {
  const q = query(
    collection(db, 'meal_templates'),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(pageSize),
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function deleteMealTemplate({ userId, templateId }) {
  const ref = doc(db, 'meal_templates', templateId)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  if (snap.data().userId !== userId) throw new Error('Not authorized')
  await deleteDoc(ref)
}

export async function deleteAllUserData({ userId }) {
  await Promise.all([
    deleteWhereUserId({ colName: 'meals', userId }),
    deleteWhereUserId({ colName: 'meal_templates', userId }),
    deleteWhereUserId({ colName: 'nutrition_logs', userId }),
  ])

  await deleteDoc(doc(db, 'users', userId))
}
