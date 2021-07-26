const User = require('../models/User')
const Group = require('../models/Group')
const Member = require('../models/Member')
const Message = require('../models/Message')
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();
const  { withFilter } = require('graphql-subscriptions');


const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const { UserInputError, AuthenticationError} = require('apollo-server')
const jwt = require('jsonwebtoken')
require('dotenv').config()
module.exports = {
  Query: {
    getUsers: async (_, __, context) => {
      try {
        if (context.req && context.req.headers.authorization) {
          const token = context.req.headers.authorization.split('Bearer ')[1]
          console.log(token)
          const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
          const user = decodedToken
          console.log(user)
          const users = await User.find(
            { _id: { "$ne": user.id }}
          )
          return users
        }else{
          throw new AuthenticationError('Please provide jwt token')
        }
      } catch (err) {
        console.log(err)
        throw err
      }
    },
    login: async (_, args) => {
      const { email, password } = args
      let errors = {}

      try {
        if (email.trim() === '')
          errors.email = 'username must not be empty'
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if(!email.toLowerCase().match(re))
          errors.email = 'email syntax not correct'
        if (password === '') errors.password = 'password must not be empty'

        if (Object.keys(errors).length > 0) {
          throw new UserInputError('bad input', { errors })
        }

        const user = await User.findOne({email })

        if (!user) {
          errors.email = 'user not found'
          throw new UserInputError('user not found', { errors })
        }

        const correctPassword = await bcrypt.compare(password, user.password)

        if (!correctPassword) {
          errors.password = 'password is incorrect'
          throw new AuthenticationError('password is incorrect', { errors })
        }

        const token = jwt.sign({ id:user._id }, process.env.JWT_SECRET, {
          expiresIn: 60 * 60,
        })

        return {
          ...user.toJSON(),
          createdAt: user.createdAt.toISOString(),
          token,
        }
      } catch (err) {
        console.log(err)
        throw err
      }
    },
    getGroups: async(_,args,context) => {
      try {
        if (context.req && context.req.headers.authorization) {
          const token = context.req.headers.authorization.split('Bearer ')[1]
          console.log(token)
          const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
          const user = decodedToken
          console.log(user)
          const pageOptions = {
            page: parseInt(args.page, 10) || 0,
            limit: parseInt(args.limit, 10) || 10
          }
          let groups = await Member.find({user_id:user.id})
          .skip(pageOptions.page * pageOptions.limit)
          .limit(pageOptions.limit)
          .populate("group_id").select("group_id -_id")
          groups = groups.map((group)=>{
            return group.group_id
          })
          console.log(groups)
          return groups
        }else{
          throw new AuthenticationError('Please provide jwt token')
        }
      } catch (error) {
        console.log(error)
        throw error
      }
    }
  },

  Mutation: {
    register: async (_, args) => {
      let { username, email, password, confirmPassword } = args
      let errors = {}

      try {
        // Validate input data
        if (email.trim() === '') errors.email = 'email must not be empty'
        if (username.trim() === '')
          errors.username = 'username must not be empty'
        if (password.trim() === '')
          errors.password = 'password must not be empty'
        if (confirmPassword.trim() === '')
          errors.confirmPassword = 'repeat password must not be empty'
        const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        if(!email.toLowerCase().match(re))
          errors.email = 'email syntax not correct'

        if (password !== confirmPassword)
          errors.confirmPassword = 'passwords must match'

        // Check if username / email exists
        const userByUsername = await User.findOne({ username })
        const userByEmail = await User.findOne({ email })

        if (userByUsername) errors.username = 'Username is taken'
        if (userByEmail) errors.email = 'Email is taken'

        if (Object.keys(errors).length > 0) {
          throw errors
        }

        // Hash password
        password = await bcrypt.hash(password, 6)

        // Create user
        const user = await User.create({
          username,
          email,
          password,
        })

        // Return user
        return user
      } catch (err) {
        console.log(err)
        throw new UserInputError('Bad input', { errors })
      }
    },
    postMessage: async (_,args,context) => {
      const { group_id , message } = args
      try {
        if (context.req && context.req.headers.authorization) {
          const token = context.req.headers.authorization.split('Bearer ')[1]
          console.log(token)
          const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
          const user = decodedToken
          console.log(user)
          const member = await Member.find({user_id:user.id, group_id})
          console.log(member)
          if(!member){
            throw new AuthenticationError('Not a member of the group')
          }
          const new_message = new Message({
            message,
            user_id:user.id,
            group_id
          })
          
          await new_message.save()
          pubsub.publish('MESSAGE_CREATED', { messageCreated: new_message });
          return new_message
        }else{
          throw new AuthenticationError('Please provide jwt token')
        }
      } catch (error) {
        console.log(error)
        throw error
      }
    }
  },
  Subscription: {
    messageCreated: {
    
      subscribe: withFilter(
        (_,args,context) => pubsub.asyncIterator('MESSAGE_CREATED'),
        async (payload, variables,context) => {
          
          try{
            const member = await Member.find({user_id:context.user.id, group_id: payload.messageCreated.group_id})
            if(member.length>0) return true
            else return false;
          }catch(err){
            console.log(err)
          }  
        },
      ),
    },
  },
}