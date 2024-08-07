import { NextFunction, Request, Response } from "express";
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET as string
const JWT_SECRET_FOR_WORKER = process.env.JWT_SECRET_FOR_WORKER as string

interface JwtPayload {
    userId: string
}

export function authMiddleware(req:Request,res:Response,next:NextFunction){
        const authHeader = (req.headers['authorization'] as string) ?? "";
        try {
            const decoded = jwt.verify(authHeader,JWT_SECRET) as JwtPayload

            if(decoded.userId){
                req.userId = decoded.userId;

               return next(); 
            } else{
                return res.status(403).json({
                    message:"You are not logged in"
                })
            }
        } catch (error) {
            return res.status(403).json({
                message:"You are not logged in from catch"
            })
        } 
        
}

export function workerMiddleware(req:Request,res:Response,next:NextFunction){
    const authHeader = (req.headers['authorization'] as string) ?? "";
    try {
        const decoded = jwt.verify(authHeader,JWT_SECRET_FOR_WORKER) as JwtPayload

        if(decoded.userId){
            req.userId = decoded.userId;

           return next(); 
        } else{
            return res.status(403).json({
                message:"You are not logged in"
            })
        }
    } catch (error) {
        return res.status(403).json({
            message:"You are not logged in from catch"
        })
    } 
    
}