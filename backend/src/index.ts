import  Express from "express";
import userRouter from "./routers/user"
import workerRouter from "./routers/worker"

const app = Express();

app.use('/v1/user',userRouter);
app.use('/v1/worker',workerRouter);


app.listen(3000);
