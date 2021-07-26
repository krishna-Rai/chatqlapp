const { gql } = require('apollo-server')

module.exports = gql`
  type User {
    username: String!
    email: String!
    createdAt: String!
    token: String
  }
  type Message {
    message: String!
    createdAt:String!
    group_id:String!
    user_id:String!
  }
  type Group {
    id: String!
    name: String!,
    description:String,
    members: [User]!
  }
  type Query {
    getUsers: [User]!
    login(email:String!,password:String!):User!
    getGroups: [Group]!
  }
  
  type Mutation {
      register(
          username:String!
          email:String!
          password:String!
          confirmPassword:String!
      ): User!
      postMessage(
        group_id:String!,
        message:String!
      ):Message
  }
  type Subscription {
    messageCreated: Message
  }
`