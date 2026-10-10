const { MongoClient } = require('mongodb');
const libExpress = require("express")
const libRandomString = require("randomstring");
const cors = require('cors')
const server = libExpress()
server.use(cors())
server.use(libExpress.json()) //incoming data will be converted into json
const { ObjectId } = require('mongodb');

const connection = new MongoClient("mongodb://ims_app_user:password123@localhost:27017/ims?authSource=ims")
const DB = "ims"
//signup 
server.post("/users", async (req, res) => {

    if (req.body.name && req.body.email && req.body.password && req.body.phone) {

        await connection.connect()
        const db = await connection.db(DB)
        const collection = await db.collection('users')
        const result = await collection.find({ "email": req.body.email }).toArray()

        if (result.length > 0) {
            res.json({ error: "User Already Exist" })
        }
        else {
            await collection.insertOne({
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                phone: req.body.phone,
            })
            res.json({ message: "Success" })
        }

        connection.close()


    }
    else {
        res.json({ error: "Missing Required Fields" })
    }

})

server.get("/users/roles", async (req, res) => {

    if (req.headers.token) {

        //go into db
        await connection.connect()
        const db = await connection.db(DB)
        const collection = await db.collection('users')
        const result = await collection.find({ "token": req.headers.token }).toArray()

        if (result.length > 0) {
            const currentUser = result[0]

            res.status(200).json({
                admin: currentUser?.is_admin === true,
                team_owner: !!currentUser?.owner_of,
                cricket_player: !!currentUser?.playing_for
            })



        }
        else {
            res.status(400).json({ error: "Unable to find user" })
        }

        connection.close()
        //find user with token
        //get the user
        //decide role
        //player = user.playing_for == true or false
        //team owner = user.owner_of

        //admin - user.is_admin = true or false

        //fan =  no player , no team onwer and no admin
    }
    else {
        res.status(400).json({ error: "Missing Token" })
    }

})

//post method , login
server.post("/tokens", async (req, res) => {

    if (req.body.email && req.body.password) {

        await connection.connect()
        const db = await connection.db(DB)
        const collection = await db.collection('users')
        const result = await collection.find({ "email": req.body.email, "password": req.body.password }).toArray()

        if (result.length > 0) {

            //create token - randomg string
            const generatedToken = libRandomString.generate(7);

            //register this token against that user
            const user = result[0]

            await collection.updateOne(
                { _id: user._id },
                { $set: { token: generatedToken } }
            );


            //give back the token
            res.status(200).json({ token: generatedToken })

        }
        else {
            res.status(401).json({ error: "Invalid Credentials" })
        }

        connection.close()

    }
    else {
        res.status(400).json({ error: "Missing Email or password" })
    }

})

//players
server.get("/players", async (req, res) => {

    await connection.connect()
    const db = await connection.db(DB)
    const collection = await db.collection('users')
    const result = await collection.find({ "playing_for": { $exists: true } }).toArray()

    res.status(200).json(result)
    connection.close()

})

server.get("/players/:id/stats", async (req, res) => {

    if (req.params.id) {

        try {
            await connection.connect();
            const db = await connection.db(DB);
            const collection = db.collection('users');
            const result = await collection.findOne({ _id: new ObjectId(req.params.id) });

            res.status(200).json(result)
            connection.close()
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server Error" });
        }



    } else {
        return res.status(400).json({ error: "Missing Player Id" })
    }



})

server.get("/users/teams", async (req, res) => {

    if (req.headers.token) {
        try {
            await connection.connect();
            const db = await connection.db(DB);
            const collection = await db.collection('users');
            const owner = await collection.findOne({ token: req.headers.token });


            if (!!owner.owner_of) {


                const teamCollection = await db.collection('teams')
                const team = await teamCollection.findOne({ _id: new ObjectId(owner.owner_of) })

                res.status(200).json(team)

            } else {
                res.status(400).json({ error: "User Does not own any team" })
            }

            connection.close()


        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server Error" });
        }



    } else {
        return res.status(400).json({ error: "Missing User Token" })
    }


})

server.put("/users/teams/:id", async (req, res) => {


    if (req.params.id && req.body.name && req.body.image && req.body.state && req.body.color) {


        try {
            await connection.connect();
            const db = await connection.db(DB);
            const collection = await db.collection('teams');
            const owner = await collection.updateOne({ _id: new ObjectId(req.params.id) },
                { $set: { name: req.body.name, image: req.body.image, state: req.body.state, color: req.body.color } });

            connection.close()

            res.status(200).json({message:"Updated"})
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Server Error" });
        }

    }
    else {
        res.status(400).json({ error: "Missing Required Fields" })
    }


})


server.listen(8000, () => {
    console.log("Server is Ready and listening over port 8000")
})