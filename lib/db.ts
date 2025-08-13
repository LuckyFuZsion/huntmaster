import { encrypt, decrypt } from "./protection"

// Database Tables
interface Tables {
  users: User[]
  bonuses: Bonus[]
  hunts: Hunt[]
}

interface User {
  id: number
  username: string
  password: string
  isAdmin: boolean
  created_at: string
}

interface Bonus {
  id: number
  hunt_id: number
  game_name: string
  buy_price: number
  win_amount: number | null
  collected: boolean
  created_at: string
}

interface Hunt {
  id: number
  start_balance: number
  current_balance: number
  status: "active" | "completed"
  created_at: string
}

// Initialize empty database
export function initDB() {
  const db = localStorage.getItem("huntmaster_db")
  if (!db) {
    const initialDB: Tables = {
      users: [],
      bonuses: [],
      hunts: [],
    }
    localStorage.setItem("huntmaster_db", encrypt(JSON.stringify(initialDB)))
  }
}

// Database operations
export const db = {
  // SELECT operations
  select: {
    users: () => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      return db.users
    },
    bonuses: () => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      return db.bonuses
    },
    hunts: () => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      return db.hunts
    },
  },

  // INSERT operations
  insert: {
    user: (user: Omit<User, "id" | "created_at">) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      const newUser = {
        ...user,
        id: db.users.length + 1,
        created_at: new Date().toISOString(),
      }
      db.users.push(newUser)
      localStorage.setItem("huntmaster_db", encrypt(JSON.stringify(db)))
      return newUser
    },
    bonus: (bonus: Omit<Bonus, "id" | "created_at">) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      const newBonus = {
        ...bonus,
        id: db.bonuses.length + 1,
        created_at: new Date().toISOString(),
      }
      db.bonuses.push(newBonus)
      localStorage.setItem("huntmaster_db", encrypt(JSON.stringify(db)))
      return newBonus
    },
    hunt: (hunt: Omit<Hunt, "id" | "created_at">) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      const newHunt = {
        ...hunt,
        id: db.hunts.length + 1,
        created_at: new Date().toISOString(),
      }
      db.hunts.push(newHunt)
      localStorage.setItem("huntmaster_db", encrypt(JSON.stringify(db)))
      return newHunt
    },
  },

  // UPDATE operations
  update: {
    user: (id: number, data: Partial<User>) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      const index = db.users.findIndex((u: User) => u.id === id)
      if (index !== -1) {
        db.users[index] = { ...db.users[index], ...data }
        localStorage.setItem("huntmaster_db", encrypt(JSON.stringify(db)))
        return true
      }
      return false
    },
    bonus: (id: number, data: Partial<Bonus>) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      const index = db.bonuses.findIndex((b: Bonus) => b.id === id)
      if (index !== -1) {
        db.bonuses[index] = { ...db.bonuses[index], ...data }
        localStorage.setItem("huntmaster_db", encrypt(JSON.stringify(db)))
        return true
      }
      return false
    },
    hunt: (id: number, data: Partial<Hunt>) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      const index = db.hunts.findIndex((h: Hunt) => h.id === id)
      if (index !== -1) {
        db.hunts[index] = { ...db.hunts[index], ...data }
        localStorage.setItem("huntmaster_db", encrypt(JSON.stringify(db)))
        return true
      }
      return false
    },
  },

  // DELETE operations
  delete: {
    user: (id: number) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      db.users = db.users.filter((u: User) => u.id !== id)
      localStorage.setItem("huntmaster_db", encrypt(JSON.stringify(db)))
      return true
    },
    bonus: (id: number) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      db.bonuses = db.bonuses.filter((b: Bonus) => b.id !== id)
      localStorage.setItem("huntmaster_db", encrypt(JSON.stringify(db)))
      return true
    },
    hunt: (id: number) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      db.hunts = db.hunts.filter((h: Hunt) => h.id !== id)
      localStorage.setItem("huntmaster_db", encrypt(JSON.stringify(db)))
      return true
    },
  },

  // Query operations
  query: {
    huntBonuses: (huntId: number) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      return db.bonuses.filter((b: Bonus) => b.hunt_id === huntId)
    },
    activeHunt: () => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      return db.hunts.find((h: Hunt) => h.status === "active")
    },
    findUser: (username: string) => {
      const db = JSON.parse(decrypt(localStorage.getItem("huntmaster_db") || ""))
      return db.users.find((u: User) => u.username === username)
    },
  },
}
