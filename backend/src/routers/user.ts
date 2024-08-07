import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from 'jsonwebtoken'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { authMiddleware } from "../middlewares";
import { createTaskInput, getTaskInput } from "../types";


const JWT_SECRET = process.env.JWT_SECRET as string;
const accessKeyId = process.env.AMAZON_ACCESS_KEY_ID as string;
const secretAccessKey = process.env.AMAZON_SECRET_ACCESS_KEY as string;
const DEFAULT_TITLE = 'Pick the most suitable thumbnai';

const s3Client = new S3Client({
    credentials:{
        accessKeyId:accessKeyId,
        secretAccessKey:secretAccessKey,
    },
    region:'ap-southeast-2'
})


const router = Router();


const prismaClient = new PrismaClient();

router.get('/presignedUrl',authMiddleware,async (req,res)=>{
    // @ts-ignore
    const userId = req.userId;
    const { url, fields } = await createPresignedPost(s3Client, {
        Bucket: 'smart--touch',
        Key: `Photos${userId}/${Math.random}/image.jpg`,
        Conditions: [
          ['content-length-range', 0, 5 * 1024 * 1024] // 5 MB max
        ],
        Fields: {
          success_action_status: '201',
          'Content-Type': 'image/png'
        },
        Expires: 3600
      })
      return res.json({
        presignedUrl:url,
        fields
      })

})

router.post('/signin',async (req,res)=>{
        const hardCodedaddress = '82dzy1D3afWtstLfNeuzHoUmAyLXPz8iuDCBjTj2wkVY' ;
        try {
            const existingUser = await prismaClient.user.findFirst({
                where:{
                    address:hardCodedaddress
                }
            })
                
            if(existingUser){
               const token =  jwt.sign({
                    userId:existingUser.id
                },JWT_SECRET);
                res.json({
                    token
                })
            } else{
                const user = await prismaClient.user.create({
                    data:{
                        address:hardCodedaddress,
                    }
                })
                const token  = jwt.sign({
                    userId:user.id
                },JWT_SECRET);
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

router.post('/task',authMiddleware,async (req,res)=>{
    const userId = req.userId;
    const body = req.body;
    const parseData = createTaskInput.safeParse(body);

    if(!parseData.success){
        return res.status(411).json({
            message:'You have sent wrong inputs'
        })
    }

   let response =  await prismaClient.$transaction(async tx =>{

       const response =  await tx.task.create({
            data:{
                title:parseData.data.title ?? DEFAULT_TITLE,
                amount:'1',
                signature:parseData.data.signature,
                user_id:parseInt(userId ?? '')
            }
        })

        await tx.option.createMany({
            data: parseData.data.options.map(option =>({
                image_url:option.imageUrl,
                task_id:response.id
            }))
        })
        return response
    })

    res.json({
        id:response.id
    })

})

router.get('/task',authMiddleware, async(req,res)=>{
    const parsedData = getTaskInput.safeParse(req.query.taskId);
    const userId = req.userId || "";
    if(!parsedData.success){
        res.status(411).json({
            message:'Wrong query parameter'
        })
    }
    const taskId = parsedData.data ?? "";
    const taskDetail = await prismaClient.task.findFirst({
        where:{
            user_id:Number(userId),
            id:Number(taskId)
        },
        include:{
            options:true
        }
    })

    if(!taskDetail){
        return res.status(411).json({
                message:"You don't have access to this task or task id is invalid"
        })
    }

    const responses = await prismaClient.submission.findMany({
        where:{
            task_id:Number(taskId)
        },
        include:{
            option:true
        }
    })

    const result : Record<string,{
        count:number,
        option:{
            imageUrl:string
        }
    }>= {};

    taskDetail.options.forEach(option=>{
        result[option.id] = {
            count:0,
            option:{
                imageUrl:option.image_url
            }
        }
    })

    responses.forEach(r =>{
        result[r.option_id].count++;   
    })
    res.json({
        result
    })
})

export default router;