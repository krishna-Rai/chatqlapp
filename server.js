const { ApolloServer } = require('apollo-server-express')
const mongoose = require('mongoose')
const resolvers = require('./graphql/resolvers')
const typeDefs = require('./graphql/typeDefs')
const { createServer } = require('http')
const { execute, subscribe } = require('graphql')
const { SubscriptionServer } = require('subscriptions-transport-ws')
const { makeExecutableSchema } =require('@graphql-tools/schema')
const express = require('express')
const jwt = require('jsonwebtoken')

async function startServer() {
  const app = express();
  app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "YOUR-DOMAIN.TLD"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
  const corsOptions = {
    origin: "http://localhost:3000",
    credentials: true
  };
  const httpServer = createServer(app);

  const schema = makeExecutableSchema({
    typeDefs,
    resolvers,
  });

  const server = new ApolloServer({
    schema,
    context: (ctx) => ctx,
  });
  await server.start();
  server.applyMiddleware({ app });

  SubscriptionServer.create(
    { schema, execute, subscribe,
      onConnect: (connectionParams, webSocket) => {
        console.log(connectionParams)
        if (connectionParams.authToken) {
          const token = connectionParams.authToken
          console.log(token)
          const decodedToken = jwt.verify(token, process.env.JWT_SECRET)
          const user = decodedToken
          console.log(user)
          return {user}
        }
        else throw new Error('Missing auth token!');
     }
    },
    { server: httpServer, path: server.graphqlPath }
  );

  const PORT = process.env.PORT || 4000;
  httpServer.listen(PORT, () => {
    console.log(`Server is now running on http://localhost:${PORT}/graphql`)
    mongoose.connect('mongodb+srv://krishna:O9GKeziiIjQ047M4@cluster0.y41ha.mongodb.net/chatDB?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true})
    .then(()=>{
        console.log("db connected");
    })
  });
}
startServer()

// const server = new ApolloServer({
//   typeDefs,
//   resolvers,
//   context: (ctx) => ctx,
// })

// server.listen().then(({ url }) => {
//   console.log(`🚀 Server ready at ${url}`)
//   mongoose.connect('mongodb+srv://krishna:O9GKeziiIjQ047M4@cluster0.y41ha.mongodb.net/chatDB?retryWrites=true&w=majority', {useNewUrlParser: true, useUnifiedTopology: true})
//   .then(()=>{
//       console.log("db connected");
//   })
// })