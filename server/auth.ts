
import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

export interface AuthenticatedRequest extends Request {
  user?: any;
  session?: any;
}

export async function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (req.url.includes('/attachments')) {
    console.log("=== ATTACHMENT AUTH DEBUG ===");
    console.log("Auth Header:", authHeader);
    console.log("Extracted Token:", token ? `${token.substring(0, 10)}...` : 'null');
  }

  if (!token) {
    if (req.url.includes('/attachments')) {
      console.log("No token found in request");
    }
    return res.status(401).json({ message: "Access token required" });
  }

  try {
    const sessionData = await storage.getSessionById(token);
    
    if (req.url.includes('/attachments')) {
      console.log("Session Data Found:", !!sessionData);
      console.log("User Org ID:", sessionData?.user?.organizationId);
    }
    
    if (!sessionData) {
      if (req.url.includes('/attachments')) {
        console.log("Session not found for token");
      }
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    req.user = sessionData.user;
    req.session = sessionData;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(403).json({ message: "Invalid token" });
  }
}

export function requireRole(roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }

    next();
  };
}

export function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  storage.getSessionById(token)
    .then(sessionData => {
      if (sessionData) {
        req.user = sessionData.user;
        req.session = sessionData;
      }
      next();
    })
    .catch(() => {
      next();
    });
}
