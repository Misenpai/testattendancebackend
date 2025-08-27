import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;
const TOKEN_EXPIRY = '30m'; 

export interface TokenPayload {
  userKey: string;
  empCode: string;
  username: string;
  email: string;
  iat?: number;
  exp?: number;
}

export const generateToken = (payload: Omit<TokenPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { 
    expiresIn: TOKEN_EXPIRY 
  });
};

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

export const decodeToken = (token: string): TokenPayload | null => {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch {
    return null;
  }
};