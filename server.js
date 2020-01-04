const session = require('express-session'),
  bodyParser = require('body-parser'),
  cookieParser = require('cookie-parser'),
  posts = require('./posts'),
  creds = require('../creds').creds

function fail(req, res, err) {
  res.status(500)
  res.render('error', err)
}

function login(req, res) {
  if(creds[req.body.name].pwd == req.body.pwd) {
    req.session.user = req.body.name
    req.session.auth = true
    req.session.addr = creds[req.body.name].addr
    req.session.pwd = req.body.pwd
    posts.unlockAccount(req.session.addr, req.body.pwd)
  }
}

function logout(req, res) {
  req.session.destroy(err => {
    if(err) fail(req, res, err)
    else res.send({})
  })
}

async function postPosts(req, res) {
  try {
    await posts.addPost(req.body.title, req.body.description, req.session.addr)
    res.send({ 'msg': 'Post created.' })
  } catch(err) { fail(req, res, err) }
}

async function getPosts(req, res) {
  try { res.send(await posts.getPosts()) }
  catch(err) { fail(req, res, err) }
}

async function getPost(req, res, postId) {
  try { res.send(await posts.getPost(postId)) }
  catch(err) { fail(req, res, err) }
}

async function postPostVotes(req, res, postId) {
  try {
    await posts.votePost(postId, req.body.up === 'true', req.session.addr)
    res.send({ 'msg': 'Vote received.' })
  } catch(err) { fail(req, res, err) }
}

async function postPostComments(req, res, postId) {
  try {
    await posts.commentPost(postId, req.body.comment, req.session.addr)
    res.send({ 'msg': 'Comment received.' })
  } catch(err) { fail(req, res, err) }
}

async function postCommentVotes(req, res, commentId) {
  try {
    await posts.voteComment(commentId, req.body.up === 'true', req.session.addr)
    res.send({ 'msg': 'Vote received.'})
  } catch(err) { fail(req, res, err) }
}

async function postCommentComments(req, res, commentId) {
  try {
    await posts.commentComment(commentId, req.body.comment, req.session.addr)
    res.send({ 'msg': 'Comment received.'})
  } catch(err) { fail(req, res, err) }
}

const app = express()
const port = 8888

app.use(bodyParser.urlencoded({ limit: '50mb', extended: false }))
app.use(bodyParser.json({ limit: '50mb' }))
app.use(cookieParser())
app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}))
app.use(bodyParser.urlencoded({extended: false}))

// Check user authentication - JBG
/*
app.use((req, res, next) => {
  let url = urlparser.parse(req.url, true)

  console.log(req.method, url.pathname, req.body)

  if(url.pathname == '/api/logout') {
    req.session = null
    sendRes(req, res, {})
    return
  } else if(url.pathname == '/api/login' &&
      } else if(req.session && req.session.auth == true) {
    next()
    return
  }

  res.writeHead(403)
  res.end('Not authorized.')
})
*/

/*
function processRequest(req, res) {
  const url = urlparser.parse(req.url, true)

  let m
  if(m = /\/api\/posts$/.exec(url.pathname))
    handlePosts(req, res)
  else if(m = /\/api\/posts\/(\d+)$/.exec(url.pathname))
    handlePost(req, res, m[1])
  else if(m = /\/api\/posts\/(\d+)\/votes/.exec(url.pathname))
    handlePostVotes(req, res, m[1])
  else if(m = /\/api\/posts\/(\d+)\/comments/.exec(url.pathname))
    handlePostComments(req, res, m[1])
  else if(m = /\/api\/comments\/(\d+)\/votes/.exec(url.pathname))
    handleCommentVotes(req, res, m[1])
  else if(m = /\/api\/comments\/(\d+)\/comments/.exec(url.pathname))
    handleCommentComments(req, res, m[1])
  else sendRes(req, res, { 'user': req.session.user })
}
*/

// Check user authentication - JBG
/*
app.use((req, res, next) => { 
  let url = urlparser.parse(req.url, true)

  console.log(req.method, url.pathname, req.body)

  if(url.pathname == '/api/logout') {
    req.session = null
    sendRes(req, res, {})
    return
  } else if(url.pathname == '/api/login' &&
    creds[req.body.name].pwd == req.body.pwd) {
      req.session.maxAge = 15 * 60 * 1000
      req.session.user = req.body.name
      req.session.auth = true
      req.session.addr = creds[req.body.name].addr 
      req.session.pwd = req.body.pwd 
      console.log(req.session.addr, req.body.pwd)
      posts.unlockAccount(req.session.addr, req.body.pwd)
      next()
      return
  } else if(req.session && req.session.auth == true) {
    next()
    return
  }

  res.writeHead(403)
  res.end('Not authorized.')
})
*/

/*
function processRequest(req, res) {
  const url = urlparser.parse(req.url, true)

  let m
  if(m = /\/api\/posts$/.exec(url.pathname))
    handlePosts(req, res)
  else if(m = /\/api\/posts\/(\d+)$/.exec(url.pathname))
    handlePost(req, res, m[1])
  else if(m = /\/api\/posts\/(\d+)\/votes/.exec(url.pathname))
    handlePostVotes(req, res, m[1])
  else if(m = /\/api\/posts\/(\d+)\/comments/.exec(url.pathname))
    handlePostComments(req, res, m[1])
  else if(m = /\/api\/comments\/(\d+)\/votes/.exec(url.pathname))
    handleCommentVotes(req, res, m[1])
  else if(m = /\/api\/comments\/(\d+)\/comments/.exec(url.pathname))
    handleCommentComments(req, res, m[1])
  else sendRes(req, res, { 'user': req.session.user })
}
*/

app.post('/login', login)

app.listen(port, () => console.log(`polls-api listening on port ${port}!`))

