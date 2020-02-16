const express = require('express'),
  session = require('express-session'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  posts = require('./posts'),
  creds = require('../creds').creds,
  config = require('../config').config

const port = config['port'] 
const pathPrefix = config['pathPrefix'] 

function auth(req, res, next) {
  if(!req.session.user) {
    res.status(403).json({ 'msg': 'Unauthorized'})
  } else next()
}

function fail(req, res, err) {
  console.error(err.stack)  
  res.status(500).json({ 'msg': 'Server error' })
}

function getUser(req, res) {
  res.json({'user': req.session.user})
}

function login(req, res) {
  console.log("LOGIN?", req.body)
  if(creds[req.body.name].pwd == req.body.pwd) {
    req.session.user = req.body.name
    req.session.auth = true
    req.session.addr = creds[req.body.name].addr
    req.session.pwd = req.body.pwd
    posts.unlockAccount(req.session.addr, req.body.pwd)
    res.json({ 'msg': 'Success' })
  } else res.status(403).json({ 'msg': 'Unauthorized'})
}

function logout(req, res) {
  req.session.destroy(err => {
    if(err) fail(req, res, err)
    else res.json({ 'msg': 'Success' })
  })
}

async function createAccount(req, res) {
  try {
    const a = await posts.createAccount(req.body.pwd)
    res.json(a)
  } catch(err) { fail(req, res, err) }
}

async function postPosts(req, res) {
  try {
    await posts.addPost(req.body.title, req.body.description, req.session.addr)
    res.json({ 'msg': 'Post created.' })
  } catch(err) { fail(req, res, err) }
}

async function getPosts(req, res) {
  try { res.json(await posts.getPosts()) }
  catch(err) { fail(req, res, err) }
}

async function getPost(req, res) {
  try { res.json(await posts.getPost(req.params.id)) }
  catch(err) { fail(req, res, err) }
}

async function postPostVotes(req, res) {
  try {
    await posts.votePost(req.params.id, req.body.up === 'true', req.session.addr)
    res.json({ 'msg': 'Vote received.' })
  } catch(err) { fail(req, res, err) }
}

async function postPostComments(req, res) {
  console.log(req.params.id, req.body.comment)
  try {
    await posts.commentPost(req.params.id, req.body.comment, req.session.addr)
    res.json({ 'msg': 'Comment received.' })
  } catch(err) { fail(req, res, err) }
}

async function postCommentVotes(req, res) {
  try {
    await posts.voteComment(req.params.id, req.body.up === 'true', req.session.addr)
    res.json({ 'msg': 'Vote received.'})
  } catch(err) { fail(req, res, err) }
}

async function postCommentComments(req, res) {
  try {
    await posts.commentComment(req.params.id, req.body.comment, req.session.addr)
    res.json({ 'msg': 'Comment received.'})
  } catch(err) { fail(req, res, err) }
}

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
app.get(`${pathPrefix}/me`, auth, getUser)
app.post(`${pathPrefix}/login`, login)
app.post(`${pathPrefix}/logout`, auth, logout)
app.post(`${pathPrefix}/users`, createAccount)
app.post(`${pathPrefix}/posts`, auth, postPosts)
app.get(`${pathPrefix}/posts`, auth, getPosts)
app.get(`${pathPrefix}/posts/:id`, auth, getPost)
app.post(`${pathPrefix}/posts/:id/votes`, auth, postPostVotes)
app.post(`${pathPrefix}/posts/:id/comments`, auth, postPostComments)
app.post(`${pathPrefix}/comments/:id/votes`, auth, postCommentVotes)
app.post(`${pathPrefix}/comments/:id/comments`, auth, postCommentComments)

app.listen(port, () => console.log(`polls-api listening on port ${port}!`))

