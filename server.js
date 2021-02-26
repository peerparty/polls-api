const express = require('express'),
  session = require('express-session'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  posts = require('./posts'),
  controllers = require('./controllers'),
  auth = require('./middleware').auth,
  creds = require('../creds').creds,
  config = require('../config').config

const port = config['port'] 
const pathPrefix = config['pathPrefix'] 

const app = express()

app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(cookieParser())
app.use(session({
  secret: creds['secret'],
  cookie: { maxAge: 600000 },
  resave: false,
  saveUninitialized: true
}))

app.use(bodyParser.urlencoded({ extended: false }))
app.get(`${pathPrefix}/me`, auth, controllers.getUser)
app.post(`${pathPrefix}/login`, controllers.login)
app.post(`${pathPrefix}/logout`, auth, controllers.logout)
app.post(`${pathPrefix}/users`, controllers.createAccount)
app.post(`${pathPrefix}/posts`, auth, controllers.postPosts)
app.get(`${pathPrefix}/posts`, auth, controllers.getPosts)
app.get(`${pathPrefix}/posts/:id`, auth, controllers.getPost)
app.post(`${pathPrefix}/posts/:id/votes`, auth, controllers.postPostVotes)
app.post(`${pathPrefix}/posts/:id/comments`, auth, controllers.postPostComments)
app.post(`${pathPrefix}/comments/:id/votes`, auth, controllers.postCommentVotes)
app.post(`${pathPrefix}/comments/:id/comments`, auth, controllers.postCommentComments)

app.listen(port, () => console.log(`polls-api listening on port ${port}!`))

