const express = require('express');
const { register, login } = require('../controllers/user');

const router=express.Router();

//register
router.route("/register").post(register);
//login
router.route("/login").post(login);

module.exports=router; //we will use in app.js