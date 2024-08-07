import { Router } from "express";
import jwt from 'jsonwebtoken'
import { PrismaClient } from "@prisma/client";
import { workerMiddleware } from "../middlewares";
import { getNextTask } from "../db";
import { submissionInput } from "../types";

const prismaClient = new PrismaClient();
const JWT_SECRET_FOR_WORKER = process.env.JWT_SECRET_FOR_WORKER as string

const TOTAL_SUBMISSION =100

const router = Router();

router.post('/signin',async(req,res)=>{
    const hardCodedaddress = '82dzy1D3afWtstLfgdfgfNeuzHoUmAyLXPz8iuDCBjTj2wkVY' ;
        try {
            const existingUser = await prismaClient.worker.findFirst({
                where:{
                    address:hardCodedaddress
                }
            })
                
            if(existingUser){
               const token =  jwt.sign({
                    userId:existingUser.id
                },JWT_SECRET_FOR_WORKER);
                res.json({
                    token
                })
            } else{
                const user = await prismaClient.worker.create({
                    data:{
                        address:hardCodedaddress,
                        pending_amount:0,
                        locked_amount:0
                    }
                })
                const token  = jwt.sign({
                    userId:user.id
                },JWT_SECRET_FOR_WORKER);
                res.json({
                    token
                })
            }
        } catch (error) {
            console.log(error);
            res.status(404).json({
                msg:"User not created. Try again later"
            })
        }
})

router.get('/nextTask',workerMiddleware,async(req,res)=>{
    const userId = req.userId;
    const task = await getNextTask(Number(userId)); 
    if(!task){
        return res.status(411).json({
            message:'No more task for you'
        })
    }

    res.json({
        task
    })
})


router.post('/submission',workerMiddleware,async(req,res)=>{
    const userId = req.userId
    const body = req.body;
    const parsedData = submissionInput.safeParse(body);
    if(!parsedData.success){
        return res.status(411).json({
            message:"You have sent wrong inputs"
        })
    }
    const task = await getNextTask(Number(userId));
    if(!task || task?.id !== Number(parsedData.data.taskId)){
        return res.status(411).json({
            message:"Incorrect task id"
        })
    }
        const amount = (Number(task.amount) / TOTAL_SUBMISSION).toString();
       const submission = await prismaClient.$transaction(async tx =>{
           const submission =  await tx.submission.create({
                data:{
                    option_id:Number(parsedData.data.selection),
                    worker_id:Number(userId),
                    task_id:Number(parsedData.data.taskId),
                    amouont:amount
                }
            })
            await tx.worker.update({
                where:{
                    id:Number(userId)
                },
                data:{
                    pending_amount:{
                        increment:Number(amount)
                    }
                }
            })
            return submission
        })

        const nextTask =   await getNextTask(Number(userId));
        res.json({
            nextTask,
            amount
        })
})

export default router;



/*
{
    "title":"Select the thumbnai",
    "signature":"0x125dfasfasfe",
    "options":[
        {
            "imageUrl":"xyz.com"
        },
        {
            "imageUrl":"abx.com"
        }
    ]
}
*/ 