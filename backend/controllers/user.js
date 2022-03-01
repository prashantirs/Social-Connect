const User=require('../models/User');


//register user (we will use this in Routes)
exports.register=async(req,res)=>{
    try {
        
        const {name,email,password}=req.body;

        let user=await User.findOne({email});
        //if user exist
        if(user){
            return res.status(400).json({
                success:false,
                message:"User already exists"
            });  
        }
        
        //if user dont exist
        user=await User.create({
            name,
            email,
            password,
            avatar:{public_id:"sample_id",url:"sampleurl"}
        });

           //generateToken() in Models user.js
           const token = await user.generateToken();

           const options = {
             expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
             httpOnly: true,
           };
           res.status(201).cookie("token", token, options).json({
             success: true,
             user,
             token,
           });

    } catch (error) {
        res.status(500).json({
            success:false,
            message:error.message
        })
    }
}


//login user (we will use this in Routes)
exports.login=async(req,res)=>{

    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select("+password");

        //if user is not found
        if (!user) {
            return res.status(400).json({
              success: false,
              message: "User does not exist",
            });
          }

          //compare password in Models user.js
          const isMatch = await user.matchPassword(password);

          if (!isMatch) {
            return res.status(400).json({
              success: false,
              message: "Incorrect password",
            });
          }
      
          //generateToken() in Models user.js
          const token = await user.generateToken();

          const options = {
            expires: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            httpOnly: true,
          };
          res.status(200).cookie("token", token, options).json({
            success: true,
            user,
            token,
          });


    } catch (error) {
        res.status(500).json({
            success:false,
            message:error.message
        })
    }
}