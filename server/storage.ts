// Simple in-memory storage for development
// In production, you'd want to use a proper database

interface User {
  id: number;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  createdAt: Date;
}

interface Session {
  id: string;
  userId: number;
  user: User;
  createdAt: Date;
}

class Storage {
  private users: User[] = [];
  private sessions: Map<string, Session> = new Map();
  private nextUserId = 1;

  async createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: this.nextUserId++,
      createdAt: new Date(),
    };
    this.users.push(user);
    return user;
  }

  async getUserById(id: number): Promise<User | null> {
    return this.users.find(user => user.id === id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.users.find(user => user.email === email) || null;
  }

  async createSession(sessionId: string, user: User): Promise<Session> {
    const session: Session = {
      id: sessionId,
      userId: user.id,
      user,
      createdAt: new Date(),
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  async getSessionById(sessionId: string): Promise<Session | null> {
    return this.sessions.get(sessionId) || null;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}

export const storage = new Storage();