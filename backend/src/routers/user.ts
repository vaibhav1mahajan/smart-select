import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import jwt from 'jsonwebtoken'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { createPresignedPost } from '@aws-sdk/s3-presigned-post'
import { authMiddleware } from "../middlewares";


const JWT_SECRET = process.env.JWT_SECRET as string;
const accessKeyId = process.env.AMAZON_ACCESS_KEY_ID as string;
const secretAccessKey = process.env.AMAZON_SECRET_ACCESS_KEY as string;

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


export default router;