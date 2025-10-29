import { adminDb } from "./firebase-admin"
import admin from "firebase-admin"
import { Timestamp } from "firebase-admin/firestore"

// Type definitions
export interface User {
  id: string
  username: string
  password?: string
  isAdmin: boolean
  discordId?: string
  email?: string
  isActive?: boolean // Active status - defaults to true for admins, false for new users
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

export interface Slot {
  id: string
  name: string
  bet: number
  win: number | null
  userId: string
  createdAt: Date | Timestamp
}

export interface UserSettings {
  id: string
  userId: string
  startBalance: string
  endBalance: string
  colourTheme: string
  selectedFont: string
  fontSize: number
  cornerRadius: string
  updatedAt: Date | Timestamp
}

// Firestore database operations using Admin SDK
export const firestoreAdmin = {
  // User operations
  users: {
    async findAll(): Promise<User[]> {
      const snapshot = await adminDb.collection("users").get()
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as User[]
    },
    async findOne(id: string): Promise<User | null> {
      const docRef = adminDb.collection("users").doc(id)
      const docSnap = await docRef.get()
      if (!docSnap.exists) return null
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data()?.createdAt?.toDate() || new Date(),
      } as User
    },
    async findByUsername(username: string): Promise<User | null> {
      const snapshot = await adminDb.collection("users").where("username", "==", username).get()
      if (snapshot.empty) return null
      const doc = snapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as User
    },
    async findByDiscordId(discordId: string): Promise<User | null> {
      const snapshot = await adminDb.collection("users").where("discordId", "==", discordId).get()
      if (snapshot.empty) return null
      const doc = snapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as User
    },
    async create(userData: Omit<User, "id" | "createdAt">): Promise<User> {
      const docRef = await adminDb.collection("users").add({
        ...userData,
        createdAt: admin.firestore.Timestamp.now(),
      })
      return {
        id: docRef.id,
        ...userData,
        createdAt: new Date(),
      }
    },
    async update(id: string, data: Partial<Omit<User, "id">>): Promise<void> {
      const docRef = adminDb.collection("users").doc(id)
      await docRef.update(data)
    },
    async delete(id: string): Promise<void> {
      const docRef = adminDb.collection("users").doc(id)
      await docRef.delete()
    },
  },

  // Bonus operations
  bonuses: {
    async findByHuntId(huntId: string): Promise<Bonus[]> {
      const snapshot = await adminDb.collection("bonuses")
        .where("huntId", "==", huntId)
        .orderBy("createdAt", "desc")
        .get()
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Bonus[]
    },
    async findAll(): Promise<Bonus[]> {
      const snapshot = await adminDb.collection("bonuses").get()
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Bonus[]
    },
    async create(bonusData: Omit<Bonus, "id" | "createdAt">): Promise<Bonus> {
      const docRef = await adminDb.collection("bonuses").add({
        ...bonusData,
        createdAt: admin.firestore.Timestamp.now(),
      })
      return {
        id: docRef.id,
        ...bonusData,
        createdAt: new Date(),
      }
    },
    async update(id: string, data: Partial<Omit<Bonus, "id">>): Promise<void> {
      const docRef = adminDb.collection("bonuses").doc(id)
      await docRef.update(data)
    },
    async delete(id: string): Promise<void> {
      const docRef = adminDb.collection("bonuses").doc(id)
      await docRef.delete()
    },
  },

  // Hunt operations
  hunts: {
    async findActive(): Promise<Hunt | null> {
      const snapshot = await adminDb.collection("hunts")
        .where("status", "==", "active")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get()
      
      if (snapshot.empty) return null
      const doc = snapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      } as Hunt
    },
    async findAll(): Promise<Hunt[]> {
      const snapshot = await adminDb.collection("hunts").orderBy("createdAt", "desc").get()
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Hunt[]
    },
    async create(huntData: Omit<Hunt, "id" | "createdAt">): Promise<Hunt> {
      const docRef = await adminDb.collection("hunts").add({
        ...huntData,
        createdAt: admin.firestore.Timestamp.now(),
      })
      return {
        id: docRef.id,
        ...huntData,
        createdAt: new Date(),
      }
    },
    async update(id: string, data: Partial<Omit<Hunt, "id">>): Promise<void> {
      const docRef = adminDb.collection("hunts").doc(id)
      await docRef.update(data)
    },
    async delete(id: string): Promise<void> {
      const docRef = adminDb.collection("hunts").doc(id)
      await docRef.delete()
    },
  },

  // Slot operations
  slots: {
    async findAll(): Promise<Slot[]> {
      const snapshot = await adminDb.collection("slots").get()
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Slot[]
    },
    async findByUserId(userId: string): Promise<Slot[]> {
      const snapshot = await adminDb.collection("slots")
        .where("userId", "==", userId)
        .get()
      const slots = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Slot[]
      // Sort by createdAt in JavaScript
      return slots.sort((a, b) => {
        const aDate = a.createdAt instanceof Date ? a.createdAt : (a.createdAt as any)?.toDate?.() || new Date()
        const bDate = b.createdAt instanceof Date ? b.createdAt : (b.createdAt as any)?.toDate?.() || new Date()
        return (aDate instanceof Date ? aDate : new Date(aDate)).getTime() - (bDate instanceof Date ? bDate : new Date(bDate)).getTime()
      })
    },
    async create(slotData: Omit<Slot, "id" | "createdAt">): Promise<Slot> {
      const docRef = await adminDb.collection("slots").add({
        ...slotData,
        createdAt: admin.firestore.Timestamp.now(),
      })
      return {
        id: docRef.id,
        ...slotData,
        createdAt: new Date(),
      }
    },
    async update(id: string, data: Partial<Omit<Slot, "id">>): Promise<void> {
      const docRef = adminDb.collection("slots").doc(id)
      await docRef.update(data)
    },
    async delete(id: string): Promise<void> {
      const docRef = adminDb.collection("slots").doc(id)
      await docRef.delete()
    },
    async deleteAllByUserId(userId: string): Promise<void> {
      const snapshot = await adminDb.collection("slots")
        .where("userId", "==", userId)
        .get()
      const batch = adminDb.batch()
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()
    },
  },

  // User Settings operations
  userSettings: {
    async findByUserId(userId: string): Promise<UserSettings | null> {
      const snapshot = await adminDb.collection("userSettings")
        .where("userId", "==", userId)
        .limit(1)
        .get()
      
      if (snapshot.empty) {
        return null
      }
      
      const doc = snapshot.docs[0]
      return {
        id: doc.id,
        ...doc.data(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      } as UserSettings
    },
    async create(settings: Omit<UserSettings, "id" | "updatedAt">): Promise<UserSettings> {
      const docRef = await adminDb.collection("userSettings").add({
        ...settings,
        updatedAt: admin.firestore.Timestamp.now(),
      })
      return {
        id: docRef.id,
        ...settings,
        updatedAt: new Date(),
      }
    },
    async update(userId: string, data: Partial<Omit<UserSettings, "id" | "userId" | "updatedAt">>): Promise<void> {
      // Find the user's settings document
      const snapshot = await adminDb.collection("userSettings")
        .where("userId", "==", userId)
        .limit(1)
        .get()
      
      if (snapshot.empty) {
        // Create settings if they don't exist
        await adminDb.collection("userSettings").add({
          userId,
          ...data,
          updatedAt: admin.firestore.Timestamp.now(),
        })
      } else {
        // Update existing settings
        const docRef = snapshot.docs[0].ref
        await docRef.update({
          ...data,
          updatedAt: admin.firestore.Timestamp.now(),
        })
      }
    },
  },
}
