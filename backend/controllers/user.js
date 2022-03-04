const User=require('../models/User');
const Post=require('../models/Post');
const { sendEmail } = require('../middlewares/sendEmail');
const crypto=require('crypto');
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
        const { email, password } = req.body; //we will send from body

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

//logout User
exports.logout=async(req,res)=>{
  try {
    res.status(200).cookie("token",null,{expires: new Date(Date.now()),httpOnly:true}).json({
      success:true,
      message:"Logged Out"
    })
    
  } catch (error) {
    res.status(500).json({
      success:false,
      message:error.message
    })
  }
}

//update password
exports.updatePassword=async(req,res)=>{
  try {
    //find user
    const user =await User.findById(req.user._id).select("+password");
    const {oldPassword,newPassword}=req.body; //we will send in body

    //if user send blank
    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Please provide old and new password",
      });
    }

    //compare password in Models user.js
    const isMatch = await user.matchPassword(oldPassword);

    //if password dont match
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }
    //if matches
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password Updated",
    });
  } catch (error) {
    res.status(500).json({
      success:false,
      message:error.message
    })
  }
}

//update profile
exports.updateProfile = async (req, res) => {
  try {
    //find user from database
    const user = await User.findById(req.user._id);

    //take name & email from body
    const { name, email} = req.body;

    if (name) {
      user.name = name;
    }
    if (email) {
      user.email = email;
    }

    //User Avatar TODO

    //save user
    await user.save();

    res.status(200).json({
      success: true,
      message: "Profile Updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

//follow and unfollow user
exports.followUser=async(req,res)=>{
  try {
    //Find both users
    const userToFollow = await User.findById(req.params.id);
    const loggedInUser = await User.findById(req.user._id);

    //if that userToFollow Dont exist
    if (!userToFollow) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    //if logged in user already follows
    if (loggedInUser.following.includes(userToFollow._id)) {

      //change in both follower and following
      const indexfollowing = loggedInUser.following.indexOf(userToFollow._id);
      const indexfollowers = userToFollow.followers.indexOf(loggedInUser._id);

      //if already follow then unfollow by clicking again
      loggedInUser.following.splice(indexfollowing, 1);
      userToFollow.followers.splice(indexfollowers, 1);

      await loggedInUser.save();
      await userToFollow.save();

      res.status(200).json({
        success: true,
        message: "User Unfollowed",
      });
    } else {

      //if not followed then just follow
      loggedInUser.following.push(userToFollow._id);
      userToFollow.followers.push(loggedInUser._id);

      await loggedInUser.save();
      await userToFollow.save();

      res.status(200).json({
        success: true,
        message: "User followed",
      });
    }
  } catch (error) {
    res.status(500).json({
      success:false,
      message:error.message
    })
  }
}

//delete profile
exports.deleteMyProfile = async (req, res) => {
  try {
    //find user
    const user = await User.findById(req.user._id);
    const posts = user.posts; //posts[] array
    const followers = user.followers;
    const following = user.following;
    const userId = user._id;

    
    //delete user
    await user.remove();

    // Logout user after deleting profile
    res.cookie("token",null,{expires: new Date(Date.now()),httpOnly: true});

  
    // Delete all posts of the user
    for (let i = 0; i < posts.length; i++) {
      const post = await Post.findById(posts[i]);

      await post.remove();
    }

    // Removing User from Followers Following
    for (let i = 0; i < followers.length; i++) {
      const follower = await User.findById(followers[i]);

      const index = follower.following.indexOf(userId);
      follower.following.splice(index, 1);
      await follower.save();
    }

    // Removing User from Following's Followers
    for (let i = 0; i < following.length; i++) {
      const follows = await User.findById(following[i]);

      const index = follows.followers.indexOf(userId);
      follows.followers.splice(index, 1);
      await follows.save();
    }

    // removing all comments of the user from all posts
    const allPosts = await Post.find();

    for (let i = 0; i < allPosts.length; i++) {
      const post = await Post.findById(allPosts[i]._id);

      for (let j = 0; j < post.comments.length; j++) {
        if (post.comments[j].user === userId) {
          post.comments.splice(j, 1);
        }
      }
      await post.save();
    }
    // removing all likes of the user from all posts

    for (let i = 0; i < allPosts.length; i++) {
      const post = await Post.findById(allPosts[i]._id);

      for (let j = 0; j < post.likes.length; j++) {
        if (post.likes[j] === userId) {
          post.likes.splice(j, 1);
        }
      }
      await post.save();
    }

    res.status(200).json({
      success: true,
      message: "Profile Deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


//Show My Profile
exports.myProfile=async(req,res)=>{
  try {
    //find user
    const user=await User.findById(req.user._id).populate("posts"); //populate from schema of user find it
    res.status(200).json({
      success:true,
      user
    })
  } catch (error) {
    res.status(500).json({
      success:false,
      message:error.message
    })
  }
}

//Show other user profile
exports.getUserProfile=async(req,res)=>{
  try {
    
    //we will pass id
    const user=await User.findById(req.params.id).populate("posts");

    //if user not found
    if(!user){
      return res.status(404).json({
        success:false,
        message:"User Not Found"
      })
    }

    //if user found  
    res.status(200).json({
      success:true,
      user
    })
  } catch (error) {
    res.status(500).json({
      success:false,
      message:error.message
    })
  }
}

//Show All user on Social Media
exports.getAllUsers=async(req,res)=>{
  try {
    //find user
    const users=await User.find({});//give all user
    res.status(200).json({
      success:true,
      users
    })
  } catch (error) {
    res.status(500).json({
      success:false,
      message:error.message
    })
  }
}

//forgot password
exports.forgotPassword=async(req,res)=>{
  try {
    //find user
    const user=await User.findOne({email:req.body.email}); //we will send email in body

    //if user dont exist
    if(!user){
      res.status(404).json({
        success:false,
        message:"User dont exist with this Email"
      })
    }

    //if user exist
    const resetPasswordToken = user.getResetPasswordToken();

    await user.save();

    const resetUrl = `${req.protocol}://${req.get("host")}/password/reset/${resetPasswordToken}`;

    const message = `Reset Your Password by clicking on the link below: \n\n ${resetUrl}`;

    //send mail to user
    try {
      await sendEmail({
        email: user.email,
        subject: "Reset Password",
        message,
      });

      res.status(200).json({
        success: true,
        message: `Email sent to ${user.email}`,
      });
    } catch (error) {
      //if mail is not sent to user
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success:false,
      message:error.message
    })
  }
}

//now reset it
exports.resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Token is invalid or has expired",
      });
    }

    user.password = req.body.password;

    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password Updated",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};