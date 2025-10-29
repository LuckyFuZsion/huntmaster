import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, query, where, orderBy, Timestamp } from "firebase/firestore"
import { db } from "./firebase"
import { adminDb } from "./firebase-admin"

// Determine which Firestore instance to use (client or admin)
const getFirestoreDb = () => {
  // Check if we're on server side
  if (typeof window === 'undefined') {
    return adminDb
  }
  return db
}

// Type definitions
export interface User {
  id: string
  username: string
  password?: string
  isAdmin: boolean
  createdAt: Date | Timestamp
}

export interface Bonus {
  id: string
  huntId: string
  gameName: string
  buyPrice: number
  winAmount: number | null
  collected: boolean
  createdAt: Date | Timestamp
}

export interface Hunt {
  id: string
  startBalance: number
  currentBalance: number
  status: "active" | "completed"
  createdAt: Date | Timestamp
}

// Firestore database operations
export const firestoreDb = {
  // User operations
  users: {
    async findAll(): Promise<User[]> {
      const snapshot = await getDocs(collection(db, "users"))
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as User[]
    },
    async findOne(id: string): Promise<User | null> {
      const docRef = doc(db, "users", id)
      const docSnap = await getDoc(docRef)
      if (!docSnap.exists()) return null
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      } as User
    },
    async findByUsername(username: string): Promise<User | null> {
      const q = query(collection(db, "users"), where("username", "==", username))
      const snapshot = await getDocs(q)
      if (snapshot.empty) return null
      const doc = snapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as User
    },
    async create(userData: Omit<User, "id" | "createdAt">): Promise<User> {
      const docRef = await addDoc(collection(db, "users"), {
        ...userData,
        createdAt: Timestamp.now(),
      })
      return {
        id: docRef.id,
        ...userData,
        createdAt: new Date(),
      }
    },
    async update(id: string, data: Partial<Omit<User, "id">>): Promise<void> {
      const docRef = doc(db, "users", id)
      await updateDoc(docRef, data)
    },
    async delete(id: string): Promise<void> {
      const docRef = doc(db, "users", id)
      await deleteDoc(docRef)
    },
  },

  // Bonus operations
  bonuses: {
    async findByHuntId(huntId: string): Promise<Bonus[]> {
      const q = query(collection(db, "bonuses"), where("huntId", "==", huntId), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Bonus[]
    },
    async findAll(): Promise<Bonus[]> {
      const snapshot = await getDocs(collection(db, "bonuses"))
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Bonus[]
    },
    async create(bonusData: Omit<Bonus, "id" | "createdAt">): Promise<Bonus> {
      const docRef = await addDoc(collection(db, "bonuses"), {
        ...bonusData,
        createdAt: Timestamp.now(),
      })
      return {
        id: docRef.id,
        ...bonusData,
        createdAt: new Date(),
      }
    },
    async update(id: string, data: Partial<Omit<Bonus, "id">>): Promise<void> {
      const docRef = doc(db, "bonuses", id)
      await updateDoc(docRef, data)
    },
    async delete(id: string): Promise<void> {
      const docRef = doc(db, "bonuses", id)
      await deleteDoc(docRef)
    },
  },

  // Hunt operations
  hunts: {
    async findActive(): Promise<Hunt | null> {
      const q = query(collection(db, "hunts"), where("status", "==", "active"), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)
      if (snapshot.empty) return null
      const doc = snapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as Hunt
    },
    async findAll(): Promise<Hunt[]> {
      const q = query(collection(db, "hunts"), orderBy("createdAt", "desc"))
      const snapshot = await getDocs(q)
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Hunt[]
    },
    async create(huntData: Omit<Hunt, "id" | "createdAt">): Promise<Hunt> {
      const docRef = await addDoc(collection(db, "hunts"), {
        ...huntData,
        createdAt: Timestamp.now(),
      })
      return {
        id: docRef.id,
        ...huntData,
        createdAt: new Date(),
      }
    },
    async update(id: string, data: Partial<Omit<Hunt, "id">>): Promise<void> {
      const docRef = doc(db, "hunts", id)
      await updateDoc(docRef, data)
    },
    async delete(id: string): Promise<void> {
      const docRef = doc(db, "hunts", id)
      await deleteDoc(docRef)
    },
  },
}

