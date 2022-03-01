const Post=require('../models/Post');
const User=require('../models/User');

//creating post
exports.createPost=async(req,res)=>{

    try {
        const newPostData={
            caption:req.body.caption,
            image:{
                public_id:"req.body.public_id",
                url:"req.body.url"
            },

            //all the information is saved in owner
            owner:req.user._id,
        };

        const post=await Post.create(newPostData);

        //find user
        const user=await User.findById(req.user._id);

        //in models user there is an array of posts so we push thing into that array
        user.posts.push(post._id);

        //save it
        await user.save();

        res.status(201).json({
            success:true,
            post
        });
        
    } catch (error) {
        res.status(500).json({
            success:false,
            message:error.message
        })
    }
}