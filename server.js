const connect = require('connect'),
  http = require('http'),
  compression = require('compression'),
  session = require('cookie-session'),
  bodyParser = require('body-parser'),
  urlparser = require('url'),
  posts = require('./posts'),
  credents = require('../creds')

function fail(req, res, obj) {
  res.writeHead(500, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(obj))
}

function sendRes(req, res, obj) {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(obj))
}

async function handlePosts(req, res) {
  if(req.method == 'POST') {
    if(await posts.addPost(req.body.title, req.body.description, req.session.addr)) {
      sendRes(req, res, { 'msg': 'Post created.'})
    } else {
      fail(req, res, err)
    }
  } else {
    sendRes(req, res, await posts.getPosts())
  }
}

async function handlePostVotes(req, res, postId) {
  if(req.method == 'POST') {
    if(await posts.votePost(postId, req.body.up === 'true', req.session.addr)) {
        sendRes(req, res, { 'msg': 'Vote received.'})
    } else {
      fail(req, res, err)
    }
  }
}

async function handlePostComments(req, res, postId) {
  if(req.method == 'POST') {
    if(await posts.commentPost(postId, req.body.comment, req.session.addr)) {
        sendRes(req, res, { 'msg': 'Comment received.'})
    } else {
      fail(req, res, err)
    }
  }
}

async function handleCommentVotes(req, res, commentId) {
  if(req.method == 'POST') {
    if(await posts.voteComment(commentId, req.body.up === 'true', req.session.addr)) {
        sendRes(req, res, { 'msg': 'Vote received.'})
    } else {
      fail(req, res, err)
    }
  }
}

async function handleCommentComments(req, res, commentId) {
  if(req.method == 'POST') {
    if(await posts.commentComment(commentId, req.body.comment, req.session.addr)) {
        sendRes(req, res, { 'msg': 'Comment received.'})
    } else {
      fail(req, res, err)
    }
  }
}

function processRequest(req, res) {
  const url = urlparser.parse(req.url, true)

  let m
  if(m = /\/api\/posts$/.exec(url.pathname))
    handlePosts(req, res)
  else if(m = /\/api\/posts\/(\d+)\/votes/.exec(url.pathname))
    handlePostVotes(req, res, m[1])
  else if(m = /\/api\/posts\/(\d+)\/comments/.exec(url.pathname))
    handlePostComments(req, res, m[1])
  else if(m = /\/api\/comments\/(\d+)\/votes/.exec(url.pathname))
    handleCommentVotes(req, res, m[1])
  else if(m = /\/api\/comments\/(\d+)\/comments/.exec(url.pathname))
    handleCommentComments(req, res, m[1])
  else sendRes(req, res, { 'user': req.session.user })

  /*
  if(url.pathname == '/api/activities') {
    if(req.method == 'POST') {
      sendRes(req, res, await coop.addActivity(
        req.session.addr,
        req.body.cost,
        req.body.title,
        req.body.description,
        req.body.global == 'true'
      ))
    } else if(url.query.actId) {
      sendRes(req, res, coop.getActivity(url.query.actId))
    } else {
      sendRes(req, res, coop.getActivities())
    } 
  } else if(url.pathname == '/api/budget') {
    if(req.method == 'POST') {
      sendRes(req, res, coop.distributeBudget(req.session.addr))
    } else {
      sendRes(req, res, coop.getBudget())
    }
  } else if(url.pathname == '/api/members') {
    if(req.method == 'POST') {
      sendRes(req, res, await coop.addMember(req.session.addr, req.body.name, req.body.addr))
    } else {
      sendRes(req, res, coop.getMembers())
    }
  } else if(url.pathname == '/api/members/delete') {
      sendRes(req, res, await coop.removeMember(req.session.addr, req.body.addr))
  } else if(url.pathname == '/api/participants') {
    if(req.method == 'POST') {
      sendRes(req, res, await coop.addParticipant(
        req.session.addr, req.body.memId, req.body.actId))
    } else {
      sendRes(req, res, coop.getParticipants(url.query.actId))
    }
  } else if(url.pathname == '/api/participants/delete') {
    sendRes(req, res, await coop.removeParticipant(
      req.session.addr, req.body.memId, req.body.actId))
  } else if(url.pathname == '/api/votes') {
    if(req.method == 'POST') {
      coop.unlockAccount(req.session.addr, req.session.pwd)
      sendRes(req, res, await coop.vote(
        req.session.addr,
        req.body.actId,
        req.body.prom,
        req.body.just))
    } else if(url.query.actId) {
      sendRes(req, res, coop.getVoteIds(url.query.actId))
    } else if(url.query.voteId) {
      sendRes(req, res, coop.getVote(url.query.voteId))
    }
  } else if(url.pathname == '/api/votes/delete') {
    sendRes(req, res, await coop.deleteVote(
      req.session.addr, req.body.voteId))
  } else if(url.pathname == '/api/finalize') {
    sendRes(req, res, await coop.finalize(req.session.addr, req.body.actId))
  */
//  } else {
//  }
}

var creds = credents.creds

var app = connect()

app.use(compression())

//app.use(session({
//    keys: ['secret1', 'secret2']
//}))

app.use(session({
  name: 'session',
  keys: ['secret1', 'secret2'],
  maxAge: 10 * 60 * 1000
}))

// This allows you to set req.session.maxAge to let certain sessions
// have a different value than the default.
app.use(function (req, res, next) {
  req.sessionOptions.maxAge = req.session.maxAge || req.sessionOptions.maxAge
  next()
})

app.use(bodyParser.urlencoded({extended: false}))

// Check user authentication - JBG
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

app.use((req, res) => {
  processRequest(req, res)
})

http.createServer(app).listen(3000)

