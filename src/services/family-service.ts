import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  serverTimestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

export interface FamilyMember {
  uid: string
  email: string
  displayName: string
  photoURL?: string
  role: 'admin' | 'parent' | 'child'
  avatar: string
  joinedAt: Date
}

export interface Family {
  id: string
  name: string
  createdBy: string
  createdAt: Date
  memberIds: string[]
  members: FamilyMember[]
  settings: {
    allowChildrenToCreateTasks: boolean
    allowChildrenToDeleteTasks: boolean
    pointsSystem: boolean
    soundEffects: boolean
  }
}

export interface CreateFamilyRequest {
  name: string
  settings?: Partial<Family['settings']>
}

interface UserData {
  uid: string
  email: string | null
  displayName: string | null
  photoURL?: string | null
}

class FamilyService {
  // Create a new family
  async createFamily(familyId: string, userId: string, userData: UserData, request: CreateFamilyRequest): Promise<Family> {
    try {
      const familyData: Omit<Family, 'id'> = {
        name: request.name,
        createdBy: userId,
        createdAt: new Date(),
        memberIds: [userId],
        members: [{
          uid: userId,
          email: userData.email || 'sem-email@exemplo.com',
          displayName: userData.displayName || 'Usuário',
          photoURL: userData.photoURL || undefined,
          role: 'admin',
          avatar: this.generateAvatar(userData.displayName || 'Usuário'),
          joinedAt: new Date()
        }],
        settings: {
          allowChildrenToCreateTasks: false,
          allowChildrenToDeleteTasks: false,
          pointsSystem: true,
          soundEffects: true,
          ...request.settings
        }
      }

      await setDoc(doc(db, 'families', familyId), {
        ...familyData,
        createdAt: serverTimestamp(),
        members: familyData.members.map(member => ({
          ...member,
          joinedAt: new Date()
        }))
      })

      return {
        id: familyId,
        ...familyData
      }
    } catch (error) {
      console.error('Error creating family:', error)
      throw error
    }
  }

  // Get family by ID
  async getFamily(familyId: string): Promise<Family | null> {
    try {
      const familyRef = doc(db, 'families', familyId)
      const familyDoc = await getDoc(familyRef)

      if (!familyDoc.exists()) {
        return null
      }

      const data = familyDoc.data()
      return {
        id: familyDoc.id,
        name: data.name,
        createdBy: data.createdBy,
        createdAt: data.createdAt.toDate(),
        memberIds: data.memberIds,
        members: data.members.map((member: { joinedAt: { toDate: () => Date } }) => ({
          ...member,
          joinedAt: member.joinedAt.toDate()
        })),
        settings: data.settings
      }
    } catch (error) {
      console.error('Error getting family:', error)
      throw error
    }
  }

  // Add member to family
  async addFamilyMember(familyId: string, userData: UserData, role: 'parent' | 'child' = 'parent'): Promise<void> {
    try {
      const familyRef = doc(db, 'families', familyId)

      const newMember: FamilyMember = {
        uid: userData.uid,
        email: userData.email || 'sem-email@exemplo.com',
        displayName: userData.displayName || 'Usuário',
        photoURL: userData.photoURL || undefined,
        role: role,
        avatar: this.generateAvatar(userData.displayName || 'Usuário'),
        joinedAt: new Date()
      }

      await updateDoc(familyRef, {
        memberIds: arrayUnion(userData.uid),
        members: arrayUnion({
          ...newMember,
          joinedAt: new Date()
        })
      })
    } catch (error) {
      console.error('Error adding family member:', error)
      throw error
    }
  }

  // Remove member from family
  async removeFamilyMember(familyId: string, userId: string): Promise<void> {
    try {
      const familyRef = doc(db, 'families', familyId)
      const family = await this.getFamily(familyId)

      if (!family) {
        throw new Error('Family not found')
      }

      const memberToRemove = family.members.find(m => m.uid === userId)
      if (!memberToRemove) {
        throw new Error('Member not found')
      }

      await updateDoc(familyRef, {
        memberIds: arrayRemove(userId),
        members: arrayRemove(memberToRemove)
      })
    } catch (error) {
      console.error('Error removing family member:', error)
      throw error
    }
  }

  // Update family settings
  async updateFamilySettings(familyId: string, settings: Partial<Family['settings']>): Promise<void> {
    try {
      const familyRef = doc(db, 'families', familyId)

      await updateDoc(familyRef, {
        settings: settings,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating family settings:', error)
      throw error
    }
  }

  // Update member role
  async updateMemberRole(familyId: string, userId: string, newRole: 'admin' | 'parent' | 'child'): Promise<void> {
    try {
      const family = await this.getFamily(familyId)
      if (!family) {
        throw new Error('Family not found')
      }

      const updatedMembers = family.members.map(member =>
        member.uid === userId ? { ...member, role: newRole } : member
      )

      const familyRef = doc(db, 'families', familyId)
      await updateDoc(familyRef, {
        members: updatedMembers
      })
    } catch (error) {
      console.error('Error updating member role:', error)
      throw error
    }
  }

  // Generate avatar emoji based on name
  private generateAvatar(name: string): string {
    const avatars = ['👨', '👩', '👦', '👧', '🧑', '👴', '👵', '🧓']
    const index = name ? name.charCodeAt(0) % avatars.length : 0
    return avatars[index]
  }

  // Generate a simple family ID
  generateFamilyId(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }

  // Check if user can manage family
  async canManageFamily(familyId: string, userId: string): Promise<boolean> {
    try {
      const family = await this.getFamily(familyId)
      if (!family) return false

      const member = family.members.find(m => m.uid === userId)
      return member?.role === 'admin' || member?.role === 'parent'
    } catch (error) {
      console.error('Error checking family permissions:', error)
      return false
    }
  }

  // Check if user can create tasks
  async canCreateTasks(familyId: string, userId: string): Promise<boolean> {
    try {
      const family = await this.getFamily(familyId)
      if (!family) return false

      const member = family.members.find(m => m.uid === userId)
      if (!member) return false

      // Admin and parents can always create tasks
      if (member.role === 'admin' || member.role === 'parent') {
        return true
      }

      // Children can create tasks only if allowed by family settings
      if (member.role === 'child') {
        return family.settings.allowChildrenToCreateTasks
      }

      return false
    } catch (error) {
      console.error('Error checking task creation permissions:', error)
      return false
    }
  }

  // Check if user can delete tasks
  async canDeleteTasks(familyId: string, userId: string): Promise<boolean> {
    try {
      const family = await this.getFamily(familyId)
      if (!family) return false

      const member = family.members.find(m => m.uid === userId)
      if (!member) return false

      // Admin and parents can always delete tasks
      if (member.role === 'admin' || member.role === 'parent') {
        return true
      }

      // Children can delete tasks only if allowed by family settings
      if (member.role === 'child') {
        return family.settings.allowChildrenToDeleteTasks
      }

      return false
    } catch (error) {
      console.error('Error checking task deletion permissions:', error)
      return false
    }
  }
}

export const familyService = new FamilyService()