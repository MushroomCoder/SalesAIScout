import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, loginUserSchema } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends User {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "ai-sdr-platform-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: 'email' },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !user.password || !(await comparePasswords(password, user.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          
          // For admin login, check if the user is an admin
          if (user.role !== 'admin') {
            return done(null, false, { message: "Not authorized as admin" });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register a new user
  app.post("/api/register", async (req, res, next) => {
    try {
      const parseResult = loginUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "Invalid input data", errors: parseResult.error.errors });
      }

      const { email, password } = req.body;
      
      // Check if email is already taken
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Create a new user (default role: sdr, status: pending)
      const hashedPassword = await hashPassword(password);
      const newUser = await storage.createUser({
        email,
        password: hashedPassword,
        username: email.split('@')[0], // Use email prefix as username
        role: "admin", // Change this to "admin" for admin registration
        status: "approved" // Admins are auto-approved
      });

      // Auto-login the new user
      req.login(newUser, (err) => {
        if (err) return next(err);
        
        // Don't send the password in the response
        const { password, ...userWithoutPassword } = newUser;
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  // Login
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't send the password in the response
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Register or login SDR via Google OAuth (simplified for now)
  app.post("/api/sdr/auth", async (req, res, next) => {
    try {
      // This would validate a Google token in a real implementation
      const { googleId, email, name } = req.body;
      
      // Check if user exists
      let user = await storage.getUserByGoogleId(googleId);
      
      if (!user) {
        // Create new SDR user (pending approval)
        user = await storage.createUser({
          username: name,
          email,
          googleId,
          role: "sdr",
          status: "pending"
        });
      }
      
      // If user exists but isn't approved yet
      if (user.status === "pending") {
        return res.status(403).json({ message: "Your account is pending admin approval" });
      }
      
      if (user.status === "rejected") {
        return res.status(403).json({ message: "Your account has been rejected" });
      }
      
      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Don't send the password in the response
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  // Logout
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Don't send the password in the response
    const { password, ...userWithoutPassword } = req.user as User;
    res.json(userWithoutPassword);
  });

  // Middleware to check if user is admin
  app.use("/api/admin/*", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as User;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    next();
  });

  // Middleware to check if user is SDR and approved
  app.use("/api/sdr/*", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as User;
    if (user.role !== "sdr" || user.status !== "approved") {
      return res.status(403).json({ message: "Not authorized" });
    }
    
    next();
  });
}
